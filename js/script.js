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

function comparePF(a, b) {
  for (let i = a.length - 1; i >= 0; i--) {
    if (a[i] !== b[i]) return a[i] < b[i];
  }
  return true;
}

function primeForm(pcs) {
  const nf = transposeZero(normalForm(pcs));
  const inv = transposeZero(normalForm(invert(pcs)));
  return comparePF(nf, inv) ? nf : inv;
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

function complementSet(pcs) {
  const s = new Set(pcs);
  const out = [];
  for (let i = 0; i < 12; i++) {
    if (!s.has(i)) out.push(i);
  }
  return out;
}

// loaded at startup
let FORTE_MAP = {};
let Z_REL = {};

async function loadData() {
  FORTE_MAP = await fetch("./data/forteMap.json").then(r => r.json());
  Z_REL = await fetch("./data/zRelations.json").then(r => r.json());
}

function forteLookup(pf) {
  return FORTE_MAP[pf.join(",")] || "Unknown";
}

function forteInfo(pcs) {
  const pf = primeForm(pcs);
  const forte = forteLookup(pf);

  const comp = complementSet(pcs);
  const compPF = primeForm(comp);
  const compForte =
    forte !== "Unknown"
      ? forte.replace(/^(\d+)-/, (_, n) => `${12 - n}-`)
      : "Unknown";

  const zMate = Z_REL[forte] || null;

  return { forte, zMate, complement: compForte };
}

function pcToAngle(pc) {
  // put 0 at top, then go clockwise like a clock
  // angle in radians
  return (Math.PI / 2) - (2 * Math.PI * (pc / 12));
}

function drawClock(pcs, { highlight = null } = {}) {
  const svg = $("pcClock");
  if (!svg) return;

  // Clear previous drawing
  svg.innerHTML = "";

  const cx = 120, cy = 120;
  const rOuter = 92;
  const rDot = 8;

  const NS = "http://www.w3.org/2000/svg";

  function make(tag, attrs = {}) {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  }

  // Outer circle
  svg.appendChild(make("circle", {
    cx, cy, r: rOuter,
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "2",
    opacity: "0.5"
  }));

  // Tick marks + labels
  for (let pc = 0; pc < 12; pc++) {
    const a = pcToAngle(pc);
    const x1 = cx + (rOuter - 6) * Math.cos(a);
    const y1 = cy - (rOuter - 6) * Math.sin(a);
    const x2 = cx + (rOuter + 6) * Math.cos(a);
    const y2 = cy - (rOuter + 6) * Math.sin(a);

    svg.appendChild(make("line", {
      x1, y1, x2, y2,
      stroke: "currentColor",
      "stroke-width": "2",
      opacity: "0.35"
    }));

    const lx = cx + (rOuter + 22) * Math.cos(a);
    const ly = cy - (rOuter + 22) * Math.sin(a);

    const label = make("text", {
      x: lx, y: ly,
      "text-anchor": "middle",
      "dominant-baseline": "middle",
      "font-size": "12",
      fill: "currentColor",
      opacity: "0.8"
    });
    label.textContent = pc;
    svg.appendChild(label);
  }

  // Optional polygon connecting set points (nice for shape)
  if (pcs.length >= 2) {
    const pts = pcs
      .slice()
      .sort((a, b) => a - b)
      .map(pc => {
        const a = pcToAngle(pc);
        const x = cx + (rOuter - 24) * Math.cos(a);
        const y = cy - (rOuter - 24) * Math.sin(a);
        return `${x},${y}`;
      })
      .join(" ");

    svg.appendChild(make("polygon", {
      points: pts,
      fill: "currentColor",
      opacity: "0.08",
      stroke: "currentColor",
      "stroke-width": "2",
      "stroke-linejoin": "round",
      "stroke-linecap": "round",
      "vector-effect": "non-scaling-stroke"
    }));
  }

  // Dots for pitch classes
  const set = new Set(pcs);

  for (let pc = 0; pc < 12; pc++) {
    const a = pcToAngle(pc);
    const x = cx + (rOuter - 24) * Math.cos(a);
    const y = cy - (rOuter - 24) * Math.sin(a);

    const isOn = set.has(pc);
    const isHi = highlight && highlight.has(pc);

    svg.appendChild(make("circle", {
      cx: x,
      cy: y,
      r: isOn ? rDot : (isHi ? 6 : 4),
      fill: isOn ? "currentColor" : "none",
      stroke: "currentColor",
      "stroke-width": isOn ? 2 : (isHi ? 3 : 1),
      opacity: isOn ? 1 : (isHi ? 0.8 : 0.2)
    }));
  }
}

function drawEmptyClock() {
  drawClock([]);
}

async function analyze() {
  try {
    const pcs = parseSet($("pcs").value);
    if (!pcs.length) return;

    const nf = normalForm(pcs);
    const pf = primeForm(pcs);
    const icv = icVector(pcs);
    const info = forteInfo(pcs);

    $("outParsed").textContent = `{ ${pcs.join(", ")} }`;
    $("outNormal").textContent = `{ ${nf.join(", ")} }`;
    $("outPrime").textContent = `{ ${pf.join(", ")} }`;
    $("outICV").textContent = `[${icv.join(" ")}]`;

    let forteText = info.forte;
    if (info.zMate) forteText += ` (Z ↔ ${info.zMate})`;

    $("outForte").textContent = forteText;
    $("outComplement").textContent = info.complement;

    const showComp = $("showComplement")?.checked;
    drawClock(
      pcs,
      showComp ? { highlight: new Set(complementSet(pcs)) } : {}
    );

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
  drawEmptyClock();
};

$("showComplement").onchange = analyze;

loadData().then(() => {
  $("analyzeBtn").disabled = false;
  drawEmptyClock();
});


