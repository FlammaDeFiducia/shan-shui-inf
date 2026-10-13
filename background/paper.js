var canvas = document.getElementById("bgcanv");
var ctx = canvas.getContext("2d");
var reso = 512;

for (var i = 0; i < reso / 2 + 1; i++) {
  for (var j = 0; j < reso / 2 + 1; j++) {
    var c = 245 + Noise.noise(i * 0.1, j * 0.1) * 10;
    c -= Math.random() * 20;

    var r = c.toFixed(0);
    var g = (c * 0.95).toFixed(0);
    var b = (c * 0.85).toFixed(0);
    ctx.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
    ctx.fillRect(i, j, 1, 1);
    ctx.fillRect(reso - i, j, 1, 1);
    ctx.fillRect(i, reso - j, 1, 1);
    ctx.fillRect(reso - i, reso - j, 1, 1);
  }
}
var img = canvas.toDataURL("image/png");
document.getElementById("BG").style.backgroundImage = "url(" + img + ")";
document.getElementsByTagName("body")[0].style.backgroundImage =
  "url(" + img + ")";
