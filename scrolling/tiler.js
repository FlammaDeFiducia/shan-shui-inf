// Turns generated chunks into bitmap tiles, so that scrolling is just
// sliding finished pictures around. Runs in scrolling/worker.js, or on
// the main thread where workers aren't available (e.g. file://).

var TILE = 512; // tile width in css px
// how far generation must be past a tile before the tile can be drawn:
// shapes reach up to ~1500 beyond the strip that planned them
var GENPAD = 2048;
var AHEADPAD = 2048; // extra generated in advance when otherwise idle
var tilesent = {};
var tilever = -1;

var shapere = /<polyline points='([^']*)' style='fill:([^;]*);stroke:([^;]*);stroke-width:([^']*)'\/>|<text font-size='([^']*)'[^>]*transform='translate\(([^,]*),([^)]*)\) rotate\(([^)]*)\)'>([^<]*)<\/text>|<g class='(\w+)'>|<\/g>/g;

// svg markup -> list of shapes with bounds and the kind of thing each
// belongs to (see color_swatch/swatch.js), sorted into MEM.chunks by depth
function chunkparse(nch) {
  var shapes = [];
  var xmin = Infinity;
  var xmax = -Infinity;
  var kinds = [nch.tag == "boat" ? "arch" : "mount"];
  var m;
  shapere.lastIndex = 0;
  while ((m = shapere.exec(nch.canv))) {
    var sh;
    if (m[10] != undefined) {
      kinds.push(m[10]);
      continue;
    } else if (m[0] == "</g>") {
      kinds.pop();
      continue;
    } else if (m[1] != undefined) {
      var s = m[1].trim().split(/[ ,]+/);
      var pts = new Float32Array(s.length);
      var a = Infinity;
      var b = -Infinity;
      var ya = Infinity;
      var yb = -Infinity;
      for (var i = 0; i < s.length; i++) {
        pts[i] = +s[i];
        if (i % 2 == 0) {
          if (pts[i] < a) a = pts[i];
          if (pts[i] > b) b = pts[i];
        } else {
          if (pts[i] < ya) ya = pts[i];
          if (pts[i] > yb) yb = pts[i];
        }
      }
      var wid = parseFloat(m[4]) || 0;
      sh = { pts: pts, fil: m[2], str: m[3], wid: wid };
      sh.a = a - wid;
      sh.b = b + wid;
      sh.ya = ya;
      sh.yb = yb;
    } else {
      var size = parseFloat(m[5]);
      sh = {
        txt: m[9],
        raw: m[0],
        size: size,
        x: parseFloat(m[6]),
        y: parseFloat(m[7]),
        rot: parseFloat(m[8]),
      };
      sh.a = sh.x - size * m[9].length;
      sh.b = sh.x + size * m[9].length;
    }
    sh.kind = kinds[kinds.length - 1];
    if (sh.a < xmin) xmin = sh.a;
    if (sh.b > xmax) xmax = sh.b;
    shapes.push(sh);
  }
  var ch = { tag: nch.tag, y: nch.y, a: xmin, b: xmax, shapes: shapes };
  var j = MEM.chunks.length;
  while (j > 0 && MEM.chunks[j - 1].y > ch.y) {
    j--;
  }
  MEM.chunks.splice(j, 0, ch);
}

// Whether a fill or stroke colour paints anything.
function visible(col) {
  return col != "none" && col != "rgba(0,0,0,0)";
}

// draw world range [x0, x0 + canvas.width / sx) onto the canvas
function tiledraw(canvas, x0, sx, sy) {
  var ctx = canvas.getContext("2d");
  var x1 = x0 + canvas.width / sx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // match svg stroking
  ctx.miterLimit = 4;
  for (var i = 0; i < MEM.chunks.length; i++) {
    var ch = MEM.chunks[i];
    if (ch.b < x0 || ch.a > x1) {
      continue;
    }
    for (var j = 0; j < ch.shapes.length; j++) {
      var sh = ch.shapes[j];
      if (sh.b < x0 || sh.a > x1) {
        continue;
      }
      if (sh.pts) {
        var p = sh.pts;
        // subtract the origin here rather than in the transform so
        // precision holds up far from x = 0
        ctx.setTransform(sx, 0, 0, sy, 0, 0);
        ctx.beginPath();
        ctx.moveTo(p[0] - x0, p[1]);
        for (var k = 2; k < p.length; k += 2) {
          ctx.lineTo(p[k] - x0, p[k + 1]);
        }
        if (visible(sh.fil)) {
          var wash = Swatch.wash(sh.kind, sh.fil);
          if (wash) {
            var grad = ctx.createLinearGradient(0, sh.ya, 0, sh.yb);
            grad.addColorStop(0, wash[0]);
            grad.addColorStop(1, wash[1]);
            ctx.fillStyle = grad;
          } else {
            ctx.fillStyle = Swatch.color(sh.kind, sh.fil);
          }
          ctx.fill();
        }
        if (sh.wid > 0 && visible(sh.str)) {
          ctx.strokeStyle = Swatch.color(sh.kind, sh.str);
          ctx.lineWidth = sh.wid;
          ctx.stroke();
        }
      } else {
        ctx.setTransform(sx, 0, 0, sy, (sh.x - x0) * sx, sh.y * sy);
        ctx.rotate((sh.rot * Math.PI) / 180);
        ctx.font = sh.size + "px Verdana";
        ctx.textAlign = "center";
        ctx.fillStyle = Swatch.color(sh.kind, "rgba(100,100,100,0.9)");
        ctx.fillText(sh.txt, 0, 0);
      }
    }
  }
}

// req: {k0, k1, kc, dpr, pal, ver} - main wants tiles k0..k1, nearest to
// kc first, painted with swatches pal; ver changes whenever pal does.
// Does one unit of work: draws a tile into newcanvas(w, h) and returns
// {k, canvas}, or generates one item and returns true. false when idle.
function tilerstep(req, newcanvas) {
  var wpt = TILE / MEM.zoom; // world units per tile
  if (req.ver != tilever) {
    tilever = req.ver;
    tilesent = {};
    Swatch.use(req.pal);
  }
  for (var k in tilesent) {
    if (k < req.k0 || k > req.k1) {
      delete tilesent[k];
    }
  }
  var best = null;
  for (var k = req.k0; k <= req.k1; k++) {
    if (
      !tilesent[k] &&
      MEM.xmin <= k * wpt - GENPAD &&
      MEM.xmax >= (k + 1) * wpt + GENPAD &&
      (best == null || Math.abs(k - req.kc) < Math.abs(best - req.kc))
    ) {
      best = k;
    }
  }
  if (best != null) {
    var w = Math.round(TILE * req.dpr);
    var h = Math.round(MEM.windy * req.dpr);
    var canvas = newcanvas(w, h);
    tiledraw(canvas, best * wpt, w / wpt, (h * MEM.zoom) / MEM.windy);
    tilesent[best] = true;
    return { k: best, ver: req.ver, canvas: canvas };
  }
  var lo = req.k0 * wpt - GENPAD;
  var hi = (req.k1 + 1) * wpt + GENPAD;
  var r = chunkstep(lo, hi) || chunkstep(lo - AHEADPAD, hi + AHEADPAD);
  if (!r) {
    return false;
  }
  r.chunks.forEach(chunkparse);
  return true;
}

// world range [x0, x1] as standalone svg markup, in the current swatches
// (flat washes only; the graded ones and the sky aren't reproduced)
function tilersvg(x0, x1) {
  var canv = "";
  for (var i = 0; i < MEM.chunks.length; i++) {
    var ch = MEM.chunks[i];
    if (ch.b < x0 || ch.a > x1) {
      continue;
    }
    for (var j = 0; j < ch.shapes.length; j++) {
      var sh = ch.shapes[j];
      if (sh.raw) {
        canv += sh.raw.replace(
          "rgba(100,100,100,0.9)",
          Swatch.color(sh.kind, "rgba(100,100,100,0.9)")
        );
        continue;
      }
      canv += "<polyline points='";
      for (var k = 0; k < sh.pts.length; k += 2) {
        canv += " " + sh.pts[k].toFixed(1) + "," + sh.pts[k + 1].toFixed(1);
      }
      canv +=
        "' style='fill:" +
        Swatch.color(sh.kind, sh.fil) +
        ";stroke:" +
        Swatch.color(sh.kind, sh.str) +
        ";stroke-width:" +
        sh.wid +
        "'/>";
    }
  }
  return (
    "<svg id='SVG' xmlns='http://www.w3.org/2000/svg' width='" +
    MEM.windx +
    "' height='" +
    MEM.windy +
    "' style='mix-blend-mode:multiply;'" +
    "viewBox = '" +
    x0 +
    " 0 " +
    (x1 - x0) +
    " " +
    MEM.windy / MEM.zoom +
    "'" +
    "><g id='G'>" +
    canv +
    "</g></svg>"
  );
}
