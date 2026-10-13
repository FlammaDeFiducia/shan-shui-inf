// Picks the seed for this session: ?seed=... from the URL if present,
// otherwise the current time. Also run inside scrolling/worker.js, whose
// URL carries the page's seed.

// Calls key2f[key](value) for each key=value pair in the URL's query
// string.
function parseArgs(key2f) {
  var par = window.location.href.split("?")[1];
  if (par == undefined) {
    return;
  }
  par = par.split("&");
  for (var i = 0; i < par.length; i++) {
    var e = par[i].split("=");
    try {
      key2f[e[0]](e[1]);
    } catch (e) {
      console.log(e);
    }
  }
}
SEED = "" + new Date().getTime();
parseArgs({
  seed: function(x) {
    SEED = x == "" ? SEED : x;
  },
});
Math.seed(SEED);
console.log(Prng.seed);
