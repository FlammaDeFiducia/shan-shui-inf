// Polygon helpers: midpoints and triangulation. Triangulation is what
// lets a shape be filled with many small, individually shaded pieces.

var PolyTools = new function() {
  // Average of a list of points, given as one array or as separate
  // arguments.
  this.midPt = function() {
    var plist =
      arguments.length == 1 ? arguments[0] : Array.apply(null, arguments);
    return plist.reduce(
      function(acc, v) {
        /*       if (v == undefined || acc == undefined){
      console.log("ERRR");
      console.log(plist)
      return [0,0]
    } */
        return [v[0] / plist.length + acc[0], v[1] / plist.length + acc[1]];
      },
      [0, 0],
    );
  };
  // Splits polygon plist into triangles by ear clipping, then subdivides
  // any triangle larger than args.area. args.convex skips the inside test;
  // args.optimize picks the least sliver-like ear each time.
  this.triangulate = function(plist, args) {
    //return []
    var args = args != undefined ? args : {};
    var area = args.area != undefined ? args.area : 100;
    var convex = args.convex != undefined ? args.convex : false;
    var optimize = args.optimize != undefined ? args.optimize : true;
    // Slope and intercept [m, k] of the line through two points.
    function lineExpr(pt0, pt1) {
      var den = pt1[0] - pt0[0];
      var m = den == 0 ? Infinity : (pt1[1] - pt0[1]) / den;
      var k = pt0[1] - m * pt0[0];
      return [m, k];
    }
    // Where two segments cross, or false if they don't.
    function intersect(ln0, ln1) {
      var le0 = lineExpr(...ln0);
      var le1 = lineExpr(...ln1);
      var den = le0[0] - le1[0];
      if (den == 0) {
        return false;
      }
      var x = (le1[1] - le0[1]) / den;
      var y = le0[0] * x + le0[1];
      // Whether point p lies within the bounding box of segment ln.
      function onSeg(p, ln) {
        //non-inclusive
        return (
          Math.min(ln[0][0], ln[1][0]) <= p[0] &&
          p[0] <= Math.max(ln[0][0], ln[1][0]) &&
          Math.min(ln[0][1], ln[1][1]) <= p[1] &&
          p[1] <= Math.max(ln[0][1], ln[1][1])
        );
      }
      if (onSeg([x, y], ln0) && onSeg([x, y], ln1)) {
        return [x, y];
      }
      return false;
    }
    // Whether pt is inside the polygon (ray casting).
    function ptInPoly(pt, plist) {
      var scount = 0;
      for (var i = 0; i < plist.length; i++) {
        var np = plist[i != plist.length - 1 ? i + 1 : 0];
        var sect = intersect(
          [plist[i], np],
          [pt, [pt[0] + 999, pt[1] + 999]],
        );
        if (sect != false) {
          scount++;
        }
      }
      return scount % 2 == 1;
    }
    // Whether segment ln lies wholly inside the polygon.
    function lnInPoly(ln, plist) {
      var lnc = [[0, 0], [0, 0]];
      var ep = 0.01;

      lnc[0][0] = ln[0][0] * (1 - ep) + ln[1][0] * ep;
      lnc[0][1] = ln[0][1] * (1 - ep) + ln[1][1] * ep;
      lnc[1][0] = ln[0][0] * ep + ln[1][0] * (1 - ep);
      lnc[1][1] = ln[0][1] * ep + ln[1][1] * (1 - ep);

      for (var i = 0; i < plist.length; i++) {
        var pt = plist[i];
        var np = plist[i != plist.length - 1 ? i + 1 : 0];
        if (intersect(lnc, [pt, np]) != false) {
          return false;
        }
      }
      var mid = PolyTools.midPt(ln);
      if (ptInPoly(mid, plist) == false) {
        return false;
      }
      return true;
    }

    // Lengths of the polygon's sides.
    function sidesOf(plist) {
      var slist = [];
      for (var i = 0; i < plist.length; i++) {
        var pt = plist[i];
        var np = plist[i != plist.length - 1 ? i + 1 : 0];
        var s = Math.sqrt(
          Math.pow(np[0] - pt[0], 2) + Math.pow(np[1] - pt[1], 2),
        );
        slist.push(s);
      }
      return slist;
    }
    // Area of a triangle (Heron's formula).
    function areaOf(plist) {
      var slist = sidesOf(plist);
      var a = slist[0],
        b = slist[1],
        c = slist[2];
      var s = (a + b + c) / 2;
      return Math.sqrt(s * (s - a) * (s - b) * (s - c));
    }
    // Area over perimeter: low for thin, sliver-like triangles.
    function sliverRatio(plist) {
      var A = areaOf(plist);
      var P = sidesOf(plist).reduce(function(m, n) {
        return m + n;
      }, 0);
      return A / P;
    }
    // Finds an ear to clip. Returns [the ear triangle, the remaining
    // polygon].
    function bestEar(plist) {
      var cuts = [];
      for (var i = 0; i < plist.length; i++) {
        var pt = plist[i];
        var lp = plist[i != 0 ? i - 1 : plist.length - 1];
        var np = plist[i != plist.length - 1 ? i + 1 : 0];
        var qlist = plist.slice();
        qlist.splice(i, 1);
        if (convex || lnInPoly([lp, np], plist)) {
          var c = [[lp, pt, np], qlist];
          if (!optimize) return c;
          cuts.push(c);
        }
      }
      var best = [plist, []];
      var bestRatio = 0;
      for (var i = 0; i < cuts.length; i++) {
        var r = sliverRatio(cuts[i][0]);
        if (r >= bestRatio) {
          best = cuts[i];
          bestRatio = r;
        }
      }
      return best;
    }
    // Recursively halves a triangle across its longest side until each
    // piece is smaller than area a.
    function shatter(plist, a) {
      if (plist.length == 0) {
        return [];
      }
      if (areaOf(plist) < a) {
        return [plist];
      } else {
        var slist = sidesOf(plist);
        var ind = slist.reduce(
          (iMax, x, i, arr) => (x > arr[iMax] ? i : iMax),
          0,
        );
        var nind = (ind + 1) % plist.length;
        var lind = (ind + 2) % plist.length;
        try {
          var mid = PolyTools.midPt([plist[ind], plist[nind]]);
        } catch (err) {
          console.log(plist);
          console.log(err);
          return [];
        }
        return shatter([plist[ind], mid, plist[lind]], a).concat(
          shatter([plist[lind], plist[nind], mid], a),
        );
      }
    }
    if (plist.length <= 3) {
      return shatter(plist, area);
    } else {
      var cut = bestEar(plist);
      return shatter(cut[0], area).concat(
        PolyTools.triangulate(cut[1], args),
      );
    }
  };
}();
