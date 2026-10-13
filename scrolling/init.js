// Startup: positions the fixed buttons, sizes the picture, starts the
// view and the animation loop, and wires up the mouse wheel.

window.addEventListener("scroll", function(e) {
  document.getElementById("SETTING").style.left = Math.max(
    4,
    40 - window.scrollX
  );
});

window.addEventListener("scroll", function(e) {
  document.getElementById("SOURCE_BTN").style.left = Math.max(
    41,
    77 - window.scrollX
  );
});

rstyle("L", false);

rstyle("R", false);

document.getElementById("INP_SEED").value = SEED;
document
  .getElementById("BG")
  .setAttribute(
    "style",
    "position:relative;overflow:hidden;width:" +
      MEM.windx +
      "px;height:" +
      MEM.windy +
      "px;"
  );
viewinit();
viewupdate();
document.getElementById("BG").addEventListener(
  "wheel",
  function(e) {
    var d =
      Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (e.deltaMode == 1) {
      d *= 16;
    }
    e.preventDefault();
    pan(d);
  },
  { passive: false }
);
requestAnimationFrame(frame);
document.body.scrollTo(0, 0);
console.log(["SCROLLX", window.scrollX]);
present();
//draw();
