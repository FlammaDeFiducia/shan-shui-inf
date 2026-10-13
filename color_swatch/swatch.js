// Colour swatches: one pigment per kind of thing in the picture. The
// drawing code only ever emits greys, so its output is tagged with what
// it depicts and the greys are re-read as how thickly to lay that
// pigment: paper where it was white, a deeper glaze where it was dark.
// Shared by the page and scrolling/worker.js.
var Swatch = new function() {
  this.kinds = [
    ["tree", "Trees"],
    ["mount", "Mountains"],
    ["arch", "Buildings"],
    ["water", "Water"],
    ["dist", "Far mountains"],
    ["sky", "Sky"],
  ];

  // null leaves the original ink untouched
  this.presets = {
    watercolor: {
      tree: "#7fa487",
      mount: "#b4a591",
      arch: "#c98f7a",
      water: "#8fb3c9",
      dist: "#9aa9c7",
      sky: "#a9c9dc",
    },
    autumn: {
      tree: "#d08a4e",
      mount: "#b59c8a",
      arch: "#a8727a",
      water: "#8aa9b0",
      dist: "#b9a0b5",
      sky: "#f0c9a0",
    },
    blossom: {
      tree: "#e39ab0",
      mount: "#a3b59a",
      arch: "#c0a070",
      water: "#8cc0c0",
      dist: "#a8b8d8",
      sky: "#c8dcec",
    },
    dusk: {
      tree: "#5f8f8f",
      mount: "#8f86a8",
      arch: "#d09a6a",
      water: "#7f95c0",
      dist: "#b08fb5",
      sky: "#f0b8a0",
    },
    ink: null,
  };
  this.initial = "watercolor";

  var INK = 1.3; // density of an ordinary ink line (grey 100)
  var WASH = 0.25; // density of a flat fill
  var WASHTOP = 0.45; // mountains fade from this at the peak...
  var WASHBOT = 0.05; // ...to this at the foot

  var pal = null;
  var cache = {};

  // '#rrggbb' -> [r, g, b].
  this.rgb = function(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };

  // pigment at a density: 0 is bare paper, 1 the swatch colour itself
  var glaze = function(rgb, d) {
    return rgb
      .map(function(c) {
        return Math.round(255 * Math.pow(c / 255, d));
      })
      .join(",");
  };

  // Sets the swatches to paint with: {kind: '#rrggbb'}, or null for
  // plain ink.
  this.use = function(p) {
    pal = null;
    cache = {};
    if (p) {
      pal = {};
      for (var k in p) {
        pal[k] = Swatch.rgb(p[k]);
      }
    }
  };

  // the colour to paint with, given what the drawing code asked for
  this.color = function(kind, col) {
    if (!pal || !pal[kind]) {
      return col;
    }
    var key = kind + col;
    if (cache[key] == undefined) {
      var out = col;
      if (col == "white") {
        out = "rgb(" + glaze(pal[kind], WASH) + ")";
      } else {
        var m = /^rgba?\(\s*([\d.]+)\s*,[^,]*,\s*[\d.]+\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(
          col
        );
        if (m) {
          var d = ((255 - m[1]) / 155) * INK;
          var a = m[2] == undefined ? 1 : m[2];
          out = "rgba(" + glaze(pal[kind], d) + "," + a + ")";
        }
      }
      cache[key] = out;
    }
    return cache[key];
  };

  // [top, bottom] colours for the graded wash that fills a mountain,
  // or null where a flat fill will do
  this.wash = function(kind, col) {
    if (!pal || !pal[kind] || col != "white" || kind != "mount") {
      return null;
    }
    return [
      "rgb(" + glaze(pal[kind], WASHTOP) + ")",
      "rgb(" + glaze(pal[kind], WASHBOT) + ")",
    ];
  };

  // Wraps drawing function obj[name] so that its markup is enclosed in
  // <g class='kind'>, marking everything it draws as that kind.
  var tag = function(obj, name, kind) {
    var f = obj[name];
    obj[name] = function() {
      var r = f.apply(this, arguments);
      return typeof r == "string" ? "<g class='" + kind + "'>" + r + "</g>" : r;
    };
  };
  for (var i = 1; i <= 8; i++) {
    tag(Tree, "tree0" + i, "tree");
  }
  for (var i = 1; i <= 4; i++) {
    tag(Arch, "arch0" + i, "arch");
  }
  tag(Arch, "boat01", "arch");
  tag(Arch, "transmissionTower01", "arch");
  tag(Mount, "distMount", "dist");
  tag(Man, "man", "man");
  tag(self, "water", "water");
}();
