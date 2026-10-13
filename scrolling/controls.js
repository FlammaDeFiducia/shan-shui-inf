// Scrolling and menu controls: the animation loop that moves the view,
// the arrow buttons, and small helpers used by the menu markup.

// glide there over a few frames (buttons)
function xcroll(v) {
  MEM.glide += v;
}
// move immediately (wheel, auto-scroll)
function pan(v) {
  MEM.cursx += v;
}
var lastframe = 0;
// One animation frame at time t: applies auto-scroll and any glide in
// progress, keeps the view within what has been drawn, and moves it.
function frame(t) {
  var dt = lastframe ? Math.min(t - lastframe, 50) : 0;
  lastframe = t;
  if (ready) {
    // never show anything that hasn't been drawn yet
    var bounds = viewbounds();
    if (document.getElementById("AUTO_SCROLL").checked) {
      // INC_STEP is the distance covered every 2 seconds
      var v = parseFloat(document.getElementById("INC_STEP").value) || 0;
      pan((v / 2000) * dt);
    }
    if (MEM.glide != 0) {
      var d = MEM.glide * (1 - Math.exp(-dt / 90));
      if (Math.abs(MEM.glide) < 0.1) {
        d = MEM.glide;
      }
      MEM.glide -= d;
      MEM.cursx += d;
    }
    if (MEM.cursx < bounds[0] || MEM.cursx > bounds[1]) {
      MEM.cursx = Math.min(Math.max(MEM.cursx, bounds[0]), bounds[1]);
      MEM.glide = 0;
    }
    viewupdate();
  }
  update();
  requestAnimationFrame(frame);
}
// Styles arrow button `id` (L or R); b highlights it on hover.
function rstyle(id, b) {
  var a = b ? 0.1 : 0.0;
  document
    .getElementById(id)
    .setAttribute(
      "style",
      "\
  width: 32px; \
  text-align: center;\
  top: 0px;\
  color:rgba(0,0,0,0.4);\
  display:table;\
  cursor: pointer;\
  border: 1px solid rgba(0,0,0,0.4);\
  background-color:rgba(0,0,0," +
        a +
        ");\
" +
        "height:" +
        MEM.windy +
        "px"
    );
  document.getElementById(id + ".t").setAttribute(
    "style",
    "vertical-align:middle; display:table-cell"
    //"position:absolute; top:"+(MEM.windy/2-20)+"px; left:"+(MEM.windx+20)+"px;"
  );
}
// Shows or hides element `id`.
function toggleVisible(id) {
  var v = document.getElementById(id).style.display == "none";
  document.getElementById(id).style.display = v ? "block" : "none";
}
// Swaps the text of element `id` between a and b.
function toggleText(id, a, b) {
  var v = document.getElementById(id).innerHTML;
  document.getElementById(id).innerHTML = v == "" || v == b ? a : b;
}
// intro: pan the page itself in from the left edge
function present() {
  var t0 = 0;
  var last = -1;
  // One step of the intro pan.
  var tick = function(t) {
    t0 = t0 || t;
    var x = Math.max(0, (t - t0) / 4 - 10);
    // stop at the end of the page, or once the user scrolls it themselves
    if (last >= 0 && Math.abs(window.scrollX - last) > 2) {
      return;
    }
    document.body.scrollTo(x, window.scrollY);
    last = window.scrollX;
    if (last < x - 2) {
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
// Reloads the page with seed s.
function reloadWSeed(s) {
  var u = window.location.href.split("?")[0];
  window.location.href = u + "?seed=" + s;
  //window.location.reload(true)
}
var btnHoverCol = "rgba(0,0,0,0.1)";
