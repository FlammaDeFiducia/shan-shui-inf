var Prng = new function() {
  this.s = 1234;
  this.p = 999979; //9887//983
  this.q = 999983; //9967//991
  this.m = this.p * this.q;
  this.hash = function(x) {
    var y = window.btoa(JSON.stringify(x));
    var z = 0;
    for (var i = 0; i < y.length; i++) {
      z += y.charCodeAt(i) * Math.pow(128, i);
    }
    return z;
  };
  this.seed = function(x) {
    if (x == undefined) {
      x = new Date().getTime();
    }
    var y = 0;
    var z = 0;
    function redo() {
      y = (Prng.hash(x) + z) % Prng.m;
      z += 1;
    }
    while (y % Prng.p == 0 || y % Prng.q == 0 || y == 0 || y == 1) {
      redo();
    }
    Prng.s = y;
    console.log(["int seed", Prng.s]);
    for (var i = 0; i < 10; i++) {
      Prng.next();
    }
  };
  this.next = function() {
    Prng.s = (Prng.s * Prng.s) % Prng.m;
    return Prng.s / Prng.m;
  };
  this.test = function(f) {
    var F =
      f ||
      function() {
        return Prng.next();
      };
    var t0 = new Date().getTime();
    var chart = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (var i = 0; i < 10000000; i++) {
      chart[Math.floor(F() * 10)] += 1;
    }
    console.log(chart);
    console.log("finished in " + (new Date().getTime() - t0));
    return chart;
  };
}();
Math.random = function() {
  return Prng.next();
};
Math.seed = function(x) {
  return Prng.seed(x);
};
