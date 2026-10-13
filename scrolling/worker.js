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
  "tiler.js"
);

var req = null;
var busy = false;
var canvas = null;
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
    postMessage({ k: r.k, bmp: bmp }, [bmp]);
  }
  // yield so a newer request can arrive between steps
  setTimeout(pump, 0);
}
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
