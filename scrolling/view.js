document.addEventListener("mousemove", onMouseUpdate, false);
document.addEventListener("mouseenter", onMouseUpdate, false);
mouseX = 0;
mouseY = 0;
function onMouseUpdate(e) {
  mouseX = e.pageX;
  mouseY = e.pageY;
}

// The landscape is shown as a row of pre-drawn bitmap tiles (see
// tiler.js) inside #VIEW. Scrolling only moves #VIEW, so a frame costs
// one transform no matter how much ink is on screen.
var ready = false;
var gen = null;
var tiles = {};
var req = { k0: 0, k1: -1, kc: 0, dpr: 1 };
var viewbase = 0;
var tilepad = 1024; // css px of tiles kept beyond each edge of the view

function viewinit() {
  document.getElementById("BG").innerHTML =
    "<div id='VIEW' style='position:absolute;left:0;top:0;" +
    "will-change:transform;mix-blend-mode:multiply;" +
    "opacity:0;transition:opacity 1s;'></div>";
  req.dpr = window.devicePixelRatio || 1;
  try {
    gen = new Worker("scrolling/worker.js?seed=" + encodeURIComponent(SEED));
    gen.onmessage = function(e) {
      if (e.data.svg) {
        download("" + Math.random() + ".svg", e.data.svg);
      } else {
        ontile(e.data.k, e.data.bmp);
      }
    };
    gen.onerror = function(e) {
      console.log("worker failed, drawing on the main thread instead");
      gen = null;
    };
  } catch (e) {
    gen = null;
  }
}

function tileplace(k) {
  tiles[k].style.left = k * TILE - viewbase + "px";
}

function ontile(k, src) {
  if (k < req.k0 || k > req.k1 || tiles[k]) {
    if (src.close) {
      src.close();
    }
    return;
  }
  var c = src;
  if (!c.style) {
    c = document.createElement("canvas");
    c.width = src.width;
    c.height = src.height;
    var ctx = c.getContext("bitmaprenderer");
    if (ctx) {
      ctx.transferFromImageBitmap(src);
    } else {
      c.getContext("2d").drawImage(src, 0, 0);
      src.close();
    }
  }
  c.setAttribute(
    "style",
    "position:absolute;top:0;width:" + TILE + "px;height:" + MEM.windy + "px;"
  );
  tiles[k] = c;
  tileplace(k);
  document.getElementById("VIEW").appendChild(c);
}

function viewupdate() {
  var x = MEM.cursx * MEM.zoom;
  // keep offsets small enough to stay exact however far we've travelled
  if (Math.abs(x - viewbase) > 100000) {
    viewbase = Math.floor(x / TILE) * TILE;
    for (var k in tiles) {
      tileplace(k);
    }
  }
  // whole device pixels, so line work stays crisp while moving
  var px = Math.round((x - viewbase) * req.dpr) / req.dpr;
  document.getElementById("VIEW").style.transform =
    "translate3d(" + -px + "px,0,0)";
}

// the range of world x the view may currently move within: the
// unbroken run of finished tiles around it (null if there's a gap)
function viewbounds() {
  var x = MEM.cursx * MEM.zoom;
  var ka = Math.floor(x / TILE);
  var kb = Math.floor((x + MEM.windx - 1) / TILE);
  for (var k = ka; k <= kb; k++) {
    if (!tiles[k]) {
      return null;
    }
  }
  while (tiles[ka - 1]) {
    ka--;
  }
  while (tiles[kb + 1]) {
    kb++;
  }
  return [(ka * TILE) / MEM.zoom, ((kb + 1) * TILE - MEM.windx) / MEM.zoom];
}

// ask for the tiles around the view and drop the ones left behind
function update() {
  var x = MEM.cursx * MEM.zoom;
  var a = Math.floor((x - tilepad) / TILE);
  var b = Math.floor((x + MEM.windx + tilepad) / TILE);
  // a tile of slack either side, so hovering on a boundary doesn't thrash
  var k0 = Math.max(a - 1, Math.min(req.k0, a));
  var k1 = Math.min(b + 1, Math.max(req.k1, b));
  var kc = Math.floor((x + MEM.windx / 2) / TILE);
  if (k0 != req.k0 || k1 != req.k1 || kc != req.kc) {
    req = { k0: k0, k1: k1, kc: kc, dpr: req.dpr };
    for (var k in tiles) {
      if (k < k0 || k > k1) {
        tiles[k].remove();
        delete tiles[k];
      }
    }
    if (gen) {
      gen.postMessage(req);
    }
  }
  if (!gen) {
    var r = tilerstep(req, function(w, h) {
      var c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      return c;
    });
    if (r && r.canvas) {
      ontile(r.k, r.canvas);
    }
  }
  if (!ready && viewbounds()) {
    ready = true;
    document.getElementById("VIEW").style.opacity = 1;
  }
}

function savesvg() {
  var x0 = MEM.cursx;
  var x1 = MEM.cursx + MEM.windx / MEM.zoom;
  if (gen) {
    gen.postMessage({ svg: [x0, x1] });
  } else {
    download("" + Math.random() + ".svg", tilersvg(x0, x1));
  }
}
