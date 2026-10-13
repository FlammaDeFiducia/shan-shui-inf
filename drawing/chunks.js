MEM = {
  chunks: [],
  xmin: 0,
  xmax: 0,
  cwid: 512,
  cursx: 0,
  glide: 0,
  zoom: 1.142,
  windx: 3000,
  windy: 800,
  planmtx: [],
  plan: null,
  plani: 0,
  plandir: 1,
};

function chunkmake(p, i) {
  var out = [];
  if (p.tag == "mount") {
    out.push({
      tag: p.tag,
      x: p.x,
      y: p.y,
      canv: Mount.mountain(p.x, p.y, i * 2 * Math.random()),
      //{col:function(x){return "rgba(100,100,100,"+(0.5*Math.random()*plan[i].y/MEM.windy)+")"}}),
    });
    out.push({
      tag: p.tag,
      x: p.x,
      y: p.y - 10000,
      canv: water(p.x, p.y, i * 2),
    });
  } else if (p.tag == "flatmount") {
    out.push({
      tag: p.tag,
      x: p.x,
      y: p.y,
      canv: Mount.flatMount(p.x, p.y, 2 * Math.random() * Math.PI, {
        wid: 600 + Math.random() * 400,
        hei: 100,
        cho: 0.5 + Math.random() * 0.2,
      }),
    });
  } else if (p.tag == "distmount") {
    out.push({
      tag: p.tag,
      x: p.x,
      y: p.y,
      canv: Mount.distMount(p.x, p.y, Math.random() * 100, {
        hei: 150,
        len: randChoice([500, 1000, 1500]),
      }),
    });
  } else if (p.tag == "boat") {
    out.push({
      tag: p.tag,
      x: p.x,
      y: p.y,
      canv: Arch.boat01(p.x, p.y, Math.random(), {
        sca: p.y / 800,
        fli: randChoice([true, false]),
      }),
    });
  }
  for (var k = 0; k < out.length; k++) {
    if (out[k].canv.includes("NaN")) {
      console.log("gotcha:");
      console.log(out[k].tag);
      out[k].canv = out[k].canv.replace(/NaN/g, -1000);
    }
  }
  return out;
}

// Does one small unit of work (a single plan item) towards having
// [lo, hi] generated, so the caller can yield between items.
// Returns null once the range is covered.
function chunkstep(lo, hi) {
  if (MEM.plan == null) {
    if (hi > MEM.xmax) {
      MEM.plandir = 1;
      MEM.plan = mountplanner(MEM.xmax, MEM.xmax + MEM.cwid);
    } else if (lo < MEM.xmin) {
      MEM.plandir = -1;
      MEM.plan = mountplanner(MEM.xmin - MEM.cwid, MEM.xmin);
    } else {
      return null;
    }
    MEM.plani = 0;
  }
  var chunks = [];
  if (MEM.plani < MEM.plan.length) {
    chunks = chunkmake(MEM.plan[MEM.plani], MEM.plani);
    MEM.plani++;
  }
  if (MEM.plani >= MEM.plan.length) {
    MEM.plan = null;
    if (MEM.plandir > 0) {
      MEM.xmax += MEM.cwid;
    } else {
      MEM.xmin -= MEM.cwid;
    }
  }
  return { chunks: chunks, xmin: MEM.xmin, xmax: MEM.xmax };
}
