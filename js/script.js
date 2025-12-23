const NOTE_TO_PC = {
  C:0, "B#":0,
  "C#":1, DB:1,
  D:2,
  "D#":3, EB:3,
  E:4, FB:4,
  F:5, "E#":5,
  "F#":6, GB:6,
  G:7,
  "G#":8, AB:8,
  A:9,
  "A#":10, BB:10,
  B:11, CB:11
};

const $ = id => document.getElementById(id);

function mod12(n) {
  return ((n % 12) + 12) % 12;
}

function parseSet(str) {
  const tokens = str.split(/[\s,]+/).filter(Boolean);
  const pcs = tokens.map(tok => {
    const t = tok.toUpperCase();
    if (!isNaN(t)) return mod12(+t);
    if (NOTE_TO_PC[t] !== undefined) return NOTE_TO_PC[t];
    throw `Bad token: ${tok}`;
  });
  return [...new Set(pcs)].sort((a,b)=>a-b);
}

function rotate(pcs, i) {
  const out = pcs.slice(i).concat(pcs.slice(0,i));
  for (let j = 1; j < out.length; j++) {
    while (out[j] < out[j-1]) out[j] += 12;
  }
  return out;
}

function span(seq) {
  return seq[seq.length-1] - seq[0];
}

function normalForm(pcs) {
  let best = null;
  for (let i = 0; i < pcs.length; i++) {
    const r = rotate(pcs, i);
    if (!best || span(r) < span(best)) best = r;
  }
  return best.map(mod12);
}

function transposeZero(seq) {
  return seq.map(x => mod12(x - seq[0]));
}

function invert(pcs) {
  return pcs.map(x => mod12(12 - x)).sort((a,b)=>a-b);
}

function primeForm(pcs) {
  const nf = transposeZero(normalForm(pcs));
  const inv = transposeZero(normalForm(invert(pcs)));
  return nf.join() <= inv.join() ? nf : inv;
}

function icVector(pcs) {
  const v = [0,0,0,0,0,0];
  for (let i=0;i<pcs.length;i++) {
    for (let j=i+1;j<pcs.length;j++) {
      const d = mod12(pcs[j]-pcs[i]);
      const ic = Math.min(d,12-d);
      if (ic>0) v[ic-1]++;
    }
  }
  return v;
}

async function forteLookup(pf) {
  const res = await fetch(
    `https://all-the-sets.onrender.com/pcs/${pf.join(",")}`
  );
  if (!res.ok) throw "Forte lookup failed";
  return (await res.text()).trim();
}

async function analyze() {
  try {
    const pcs = parseSet($("pcs").value);
    if (!pcs.length) return;

    const nf = normalForm(pcs);
    const pf = primeForm(pcs);
    const icv = icVector(pcs);

    $("outParsed").textContent = `{ ${pcs.join(", ")} }`;
    $("outNormal").textContent = `{ ${nf.join(", ")} }`;
    $("outPrime").textContent = `{ ${pf.join(", ")} }`;
    $("outICV").textContent = `[${icv.join(" ")}]`;
    $("outForte").textContent = "…";

    $("outForte").textContent = await forteLookup(pf);
    $("statusText").textContent = "Done";
  } catch (e) {
    $("statusText").textContent = e;
  }
}

$("analyzeBtn").onclick = analyze;
$("exampleBtn").onclick = () => {
  $("pcs").value = "C Eb G Bb";
  analyze();
};
$("clearBtn").onclick = () => {
  $("pcs").value = "";
};
