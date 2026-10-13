// Small shared helpers: number mapping, random choices, curves, and
// poly(), which emits the svg markup everything is ultimately drawn with.

// Replaces NaN/undefined/null with 0 throughout a nested list.
function unNan(plist) {
  if (typeof plist != "object" || plist == null) {
    return plist || 0;
  } else {
    return plist.map(unNan);
  }
}
//console.log(unNan([[undefined,[NaN,NaN],null],false,1]))

// Distance between two points.
function distance(p0, p1) {
  return Math.sqrt(Math.pow(p0[0] - p1[0], 2) + Math.pow(p0[1] - p1[1], 2));
}

// Maps value from the range istart..istop onto ostart..ostop.
function mapval(value, istart, istop, ostart, ostop) {
  return (
    ostart + (ostop - ostart) * (((value - istart) * 1.0) / (istop - istart))
  );
}
// Adjusts a list of noise values in place so that it ends where it
// starts (for closed outlines) and spans exactly 0..1.
function loopNoise(nslist) {
  var dif = nslist[nslist.length - 1] - nslist[0];
  var bds = [100, -100];
  for (var i = 0; i < nslist.length; i++) {
    nslist[i] += (dif * (nslist.length - 1 - i)) / (nslist.length - 1);
    if (nslist[i] < bds[0]) bds[0] = nslist[i];
    if (nslist[i] > bds[1]) bds[1] = nslist[i];
  }
  for (var i = 0; i < nslist.length; i++) {
    nslist[i] = mapval(nslist[i], bds[0], bds[1], 0, 1);
  }
}

// A random element of arr.
function randChoice(arr) {
  return arr[Math.floor(arr.length * Math.random())];
}

// A random number between m and M.
function normRand(m, M) {
  return mapval(Math.random(), 0, 1, m, M);
}

// A random number in [0, 1) distributed according to weight function
// func (rejection sampling).
function wtrand(func) {
  var x = Math.random();
  var y = Math.random();
  if (y < func(x)) {
    return x;
  } else {
    return wtrand(func);
  }
}

// A roughly bell-distributed random number in [-1, 1).
function randGaussian() {
  return (
    wtrand(function(x) {
      return Math.pow(Math.E, -24 * Math.pow(x - 0.5, 2));
    }) *
      2 -
    1
  );
}

// Smooths control points P into a curve of rational quadratic bezier
// segments; w is the weight of the control points.
function bezmh(P, w) {
  w = w == undefined ? 1 : w;
  if (P.length == 2) {
    P = [P[0], PolyTools.midPt(P[0], P[1]), P[1]];
  }
  var plist = [];
  for (var j = 0; j < P.length - 2; j++) {
    var p0;
    var p1;
    var p2;
    if (j == 0) {
      p0 = P[j];
    } else {
      p0 = PolyTools.midPt(P[j], P[j + 1]);
    }
    p1 = P[j + 1];
    if (j == P.length - 3) {
      p2 = P[j + 2];
    } else {
      p2 = PolyTools.midPt(P[j + 1], P[j + 2]);
    }
    var pl = 20;
    for (var i = 0; i < pl + (j == P.length - 3); i += 1) {
      var t = i / pl;
      var u = Math.pow(1 - t, 2) + 2 * t * (1 - t) * w + t * t;
      plist.push([
        (Math.pow(1 - t, 2) * p0[0] +
          2 * t * (1 - t) * p1[0] * w +
          t * t * p2[0]) /
          u,
        (Math.pow(1 - t, 2) * p0[1] +
          2 * t * (1 - t) * p1[1] * w +
          t * t * p2[1]) /
          u,
      ]);
    }
  }
  return plist;
}

// Svg markup for a polyline through plist. args: xof/yof offset, fil
// fill, str stroke, wid stroke width.
function poly(plist, args) {
  var args = args != undefined ? args : {};
  var xof = args.xof != undefined ? args.xof : 0;
  var yof = args.yof != undefined ? args.yof : 0;
  var fil = args.fil != undefined ? args.fil : "rgba(0,0,0,0)";
  var str = args.str != undefined ? args.str : fil;
  var wid = args.wid != undefined ? args.wid : 0;

  var canv = "<polyline points='";
  for (var i = 0; i < plist.length; i++) {
    canv +=
      " " +
      (plist[i][0] + xof).toFixed(1) +
      "," +
      (plist[i][1] + yof).toFixed(1);
  }
  canv +=
    "' style='fill:" +
    fil +
    ";stroke:" +
    str +
    ";stroke-width:" +
    wid +
    "'/>";
  return canv;
}
