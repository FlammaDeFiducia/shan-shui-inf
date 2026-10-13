// Decides what goes where: lays out mountains, distant ranges, plateaus
// and boats for a stretch of the scroll, from noise.

// Plans the strip xmin..xmax. Returns a list of {tag, x, y} items for
// chunks.js to draw; MEM.planmtx records where mountains already stand
// so plateaus fill the gaps.
function mountplanner(xmin, xmax) {
  // Whether f has a local maximum (above 0.3) at (x, y) within radius r.
  function locmax(x, y, f, r) {
    var z0 = f(x, y);
    if (z0 <= 0.3) {
      return false;
    }
    for (var i = x - r; i < x + r; i++) {
      for (var j = y - r; j < y + r; j++) {
        if (f(i, j) > z0) {
          return false;
        }
      }
    }
    return true;
  }

  // Adds item r to the plan unless another is within mind of it in x.
  // Returns whether it was added.
  function chadd(r, mind) {
    mind = mind == undefined ? 10 : mind;
    for (var k = 0; k < reg.length; k++) {
      if (Math.abs(reg[k].x - r.x) < mind) {
        return false;
      }
    }
    console.log("+");
    reg.push(r);
    return true;
  }

  var reg = [];
  var samp = 0.03;
  // Mountain likelihood at x.
  var ns = function(x, y) {
    return Math.max(Noise.noise(x * samp) - 0.55, 0) * 2;
  };
  // Inverse noise at x (unused).
  var nns = function(x) {
    return 1 - Noise.noise(x * samp);
  };
  // A second, finer likelihood field (unused).
  var nnns = function(x, y) {
    return Math.max(Noise.noise(x * samp * 2, 2) - 0.55, 0) * 2;
  };
  // How far down the picture mountains may reach at x.
  var yr = function(x) {
    return Noise.noise(x * 0.01, Math.PI);
  };

  var xstep = 5;
  var mwid = 200;
  for (var i = xmin; i < xmax; i += xstep) {
    var i1 = Math.floor(i / xstep);
    MEM.planmtx[i1] = MEM.planmtx[i1] || 0;
  }

  for (var i = xmin; i < xmax; i += xstep) {
    for (var j = 0; j < yr(i) * 480; j += 30) {
      if (locmax(i, j, ns, 2)) {
        var xof = i + 2 * (Math.random() - 0.5) * 500;
        var yof = j + 300;
        var r = { tag: "mount", x: xof, y: yof, h: ns(i, j) };
        var res = chadd(r);
        if (res) {
          for (
            var k = Math.floor((xof - mwid) / xstep);
            k < (xof + mwid) / xstep;
            k++
          ) {
            MEM.planmtx[k] += 1;
          }
        }
      }
    }
    if (Math.abs(i) % 1000 < Math.max(1, xstep - 1)) {
      var r = {
        tag: "distmount",
        x: i,
        y: 280 - Math.random() * 50,
        h: ns(i, j),
      };
      chadd(r);
    }
  }
  console.log([xmin, xmax]);
  for (var i = xmin; i < xmax; i += xstep) {
    if (MEM.planmtx[Math.floor(i / xstep)] == 0) {
      //var r = {tag:"redcirc",x:i,y:700}
      //console.log(i)
      if (Math.random() < 0.01) {
        for (var j = 0; j < 4 * Math.random(); j++) {
          var r = {
            tag: "flatmount",
            x: i + 2 * (Math.random() - 0.5) * 700,
            y: 700 - j * 50,
            h: ns(i, j),
          };
          chadd(r);
        }
      }
    } else {
      // var r = {tag:"greencirc",x:i,y:700}
      // chadd(r)
    }
  }

  for (var i = xmin; i < xmax; i += xstep) {
    if (Math.random() < 0.2) {
      var r = { tag: "boat", x: i, y: 300 + Math.random() * 390 };
      chadd(r, 400);
    }
  }

  return reg;
}
