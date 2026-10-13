// The COLOR section of the settings menu: a preset picker and one
// swatch per kind, plus the washes behind the drawing (sky, water).
var swatchcur = null;

// Builds the preset picker and the six colour inputs, and applies the
// initial preset.
function swatchinit() {
  var html = "<select id='SWATCH_PRESET' title='preset'>";
  for (var name in Swatch.presets) {
    html += "<option>" + name + "</option>";
  }
  html += "<option hidden>custom</option></select>";
  for (var i = 0; i < Swatch.kinds.length; i++) {
    html +=
      "<pre style='margin:4px 0 0 0'><input type='color' id='SWATCH_" +
      Swatch.kinds[i][0] +
      "' style='width:32px;height:20px;padding:0;vertical-align:middle'> " +
      Swatch.kinds[i][1] +
      "</pre>";
  }
  document.getElementById("SWATCHES").innerHTML = html;

  document.getElementById("SWATCH_PRESET").onchange = function() {
    swatchapply(Swatch.presets[this.value]);
  };
  Swatch.kinds.forEach(function(kind) {
    document.getElementById("SWATCH_" + kind[0]).onchange = function() {
      var pal = {};
      for (var i = 0; i < Swatch.kinds.length; i++) {
        var k = Swatch.kinds[i][0];
        pal[k] = document.getElementById("SWATCH_" + k).value;
      }
      document.getElementById("SWATCH_PRESET").value = "custom";
      swatchapply(pal);
    };
  });

  document.getElementById("SWATCH_PRESET").value = Swatch.initial;
  swatchapply(Swatch.presets[Swatch.initial]);
}

// Switches to swatches pal (null for plain ink): repaints the tiles,
// updates the inputs, and washes the background.
function swatchapply(pal) {
  if (pal != swatchcur) {
    swatchcur = pal;
    setswatch(pal);
  }
  for (var i = 0; i < Swatch.kinds.length; i++) {
    var k = Swatch.kinds[i][0];
    // plain ink shows as its grey
    document.getElementById("SWATCH_" + k).value = pal ? pal[k] : "#646464";
  }
  // sky washes down from the top of the paper, water up from the bottom
  var bg = paperimg;
  if (pal) {
    var sky = Swatch.rgb(pal.sky).join(",");
    var water = Swatch.rgb(pal.water).join(",");
    bg =
      "linear-gradient(to bottom, rgba(" +
      sky +
      ",0.6), rgba(" +
      sky +
      ",0) 60%), linear-gradient(to top, rgba(" +
      water +
      ",0.35), rgba(" +
      water +
      ",0) 45%), " +
      paperimg;
  }
  document.getElementById("BG").style.backgroundImage = bg;
}

swatchinit();
