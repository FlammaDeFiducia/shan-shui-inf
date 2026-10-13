// Generates and rasterizes off the main thread so scrolling never waits
// on it. The page's seed arrives in this script's query string, which
// is where seed.js looks for it.
self.window = self;
importScripts(
  "../drawing/prng.js",
  "../drawing/seed.js",
  "../drawing/perlin.js",
  "../drawing/polytools.js",
  "../drawing/util.js",
  "../drawing/brush.js",
  "../drawing/tree.js",
  "../drawing/mount.js",
  "../drawing/arch.js",
  "../drawing/man.js",
  "../drawing/water.js",
  "../drawing/planner.js",
  "../drawing/chunks.js",
  "../color_swatch/swatch.js",
  "tiler.js"
);

var req = null;
var busy = false;
var canvas = null;
// Does one unit of work for the latest request and, if there is more,
// schedules the next. Finished tiles are sent back as bitmaps.
function pump() {
  var r = tilerstep(req, function(w, h) {
    canvas = canvas || new OffscreenCanvas(w, h);
    canvas.width = w;
    canvas.height = h;
    return canvas;
  });
  if (!r) {
    busy = false;
    return;
  }
  if (r.canvas) {
    var bmp = r.canvas.transferToImageBitmap();
    postMessage({ k: r.k, ver: r.ver, bmp: bmp }, [bmp]);
  }
  // yield so a newer request can arrive between steps
  setTimeout(pump, 0);
}
// A message is either a tile request (see tilerstep) or {svg: [x0, x1]}
// asking for that range as svg markup.
onmessage = function(e) {
  if (e.data.svg) {
    postMessage({ svg: tilersvg(e.data.svg[0], e.data.svg[1]) });
    return;
  }
  req = e.data;
  if (!busy) {
    busy = true;
    pump();
  }
};
