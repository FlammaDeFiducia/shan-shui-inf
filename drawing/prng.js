// Seedable pseudo-random numbers (Blum Blum Shub). Replaces Math.random
// so that everything drawn is reproducible from the seed.

var Prng = new function() {
  this.s = 1234;
  this.p = 999979; //9887//983
  this.q = 999983; //9967//991
  this.m = this.p * this.q;
  // Turns any JSON-serializable value into one large number.
  this.hash = function(x) {
    var y = window.btoa(JSON.stringify(x));
    var z = 0;
    for (var i = 0; i < y.length; i++) {
      z += y.charCodeAt(i) * Math.pow(128, i);
    }
    return z;
  };
  // Seeds the generator from x (the current time if omitted), nudging the
  // hash until it is a usable starting state.
  this.seed = function(x) {
    if (x == undefined) {
      x = new Date().getTime();
    }
    var y = 0;
    var z = 0;
    // Tries the next candidate state derived from the hash.
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
  // Returns the next random number in [0, 1).
  this.next = function() {
    Prng.s = (Prng.s * Prng.s) % Prng.m;
    return Prng.s / Prng.m;
  };
  // Prints how evenly ten million samples of f (default: this generator)
  // fall into ten buckets, and how long that took.
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
// Routes Math.random through the seeded generator.
Math.random = function() {
  return Prng.next();
};
// Seeds Math.random.
Math.seed = function(x) {
  return Prng.seed(x);
};
