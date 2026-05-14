const PptxGenJS = require("pptxgenjs");
const path = require("path");

const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_WIDE";
pptx.title = "EduSound Metrics";
pptx.author = "EduSound Metrics";
pptx.company = "EduSound Metrics";
pptx.subject = "Educational acoustics — proof of concept";

const BRAND = "EduSound Metrics";

const C = {
  primary: "1E3A8A",
  primaryDeep: "0F1E5C",
  primarySoft: "3B82F6",
  accent:  "F59E0B",
  accentDeep: "B45309",
  bg:      "F8FAFC",
  panel:   "FFFFFF",
  text:    "0F172A",
  textSoft:"475569",
  green:   "10B981",
  greenSoft: "D1FAE5",
  yellow:  "F59E0B",
  yellowSoft: "FEF3C7",
  red:     "EF4444",
  redSoft: "FEE2E2",
  border:  "E2E8F0",
  borderDeep: "CBD5E1",
};

const FOTOS = path.join(__dirname, "..", "fotos");
const DOCS  = path.join(__dirname, "..");
const photo = (f) => path.join(FOTOS, f);
const docFile = (f) => path.join(DOCS, f);
const PH = {
  dashboardLive:  photo("IMG_20260511_175247_125.jpg"),
  dashboardDay:   photo("IMG_20260511_175247_131.jpg"),
  fivePCBs:       photo("IMG_20260511_175247_136.jpg"),
  ceiling:        photo("IMG_20260511_175247_163.jpg"),
  ceiling2:       photo("IMG_20260511_175247_168.jpg"),
  powerDiagram:   photo("IMG_20260511_175247_119.jpg"),
  wiringDiagram:  photo("IMG_20260511_175247_113.jpg"),
  singleMic:      photo("IMG_20260511_175247_174.jpg"),
  pcbDetail:      photo("IMG_20260511_175247_144.jpg"),
  pcbRejected:    photo("IMG_20260511_175247_179.jpg"),
  workshop:       photo("IMG_20260511_175247_151.jpg"),
  sketch:         photo("IMG_20260511_175247_156.jpg"),
  firmwareIDE:    photo("IMG_20260511_175247_159.jpg"),
  schemaRejected: docFile("schema_pcb_no_valido.png"),
  schemaClean:    docFile("schema_pcb_final.png"),
};

// ---------- Master ----------
pptx.defineSlideMaster({
  title: "BASE",
  background: { color: C.bg },
  objects: [
    { rect: { x: 0, y: 0, w: 13.33, h: 0.18, fill: { color: C.primary } } },
    {
      text: {
        text: BRAND,
        options: {
          x: 0.5, y: 7.05, w: 6, h: 0.25,
          fontSize: 10, bold: true, fontFace: "Calibri", color: C.textSoft,
        },
      },
    },
    {
      text: {
        text: "Proof of concept  ·  May 2026",
        options: {
          x: 7, y: 7.05, w: 5.8, h: 0.25,
          fontSize: 9, fontFace: "Calibri", color: C.textSoft, align: "right",
        },
      },
    },
  ],
  slideNumber: { x: 12.85, y: 7.05, fontSize: 9, color: C.textSoft, fontFace: "Calibri" },
});

// ---------- Helpers ----------
function title(slide, text) {
  slide.addText(text, {
    x: 0.6, y: 0.45, w: 12, h: 0.7,
    fontSize: 32, bold: true, fontFace: "Calibri", color: C.primary,
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.6, y: 1.18, w: 0.6, h: 0.08,
    fill: { color: C.accent }, line: { color: C.accent },
  });
}

function panel(slide, x, y, w, h, fill = C.panel) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h,
    fill: { color: fill },
    line: { color: C.border, width: 0.75 },
    rectRadius: 0.1,
    shadow: { type: "outer", color: "94A3B8", blur: 8, offset: 2, opacity: 0.18 },
  });
}

function photoFramed(slide, src, x, y, w, h, caption) {
  panel(slide, x, y, w, h);
  slide.addImage({
    path: src,
    x: x + 0.12, y: y + 0.12,
    w: w - 0.24, h: caption ? h - 0.55 : h - 0.24,
    sizing: { type: "contain", w: w - 0.24, h: caption ? h - 0.55 : h - 0.24 },
  });
  if (caption) {
    slide.addText(caption, {
      x: x + 0.15, y: y + h - 0.5, w: w - 0.3, h: 0.4,
      fontSize: 10, italic: true, color: C.textSoft, fontFace: "Calibri", align: "center",
    });
  }
}

function bigStat(slide, x, y, w, h, statNumber, statUnit, label, color = C.primary) {
  panel(slide, x, y, w, h);
  slide.addText([
    { text: statNumber, options: { fontSize: 72, bold: true, color, fontFace: "Calibri" } },
    { text: statUnit ? "  " + statUnit : "", options: { fontSize: 28, color, fontFace: "Calibri" } },
  ], {
    x: x + 0.2, y: y + 0.3, w: w - 0.4, h: h * 0.55,
    align: "center", valign: "middle",
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: x + w / 2 - 0.4, y: y + h * 0.65, w: 0.8, h: 0.04,
    fill: { color: C.accent }, line: { color: C.accent },
  });
  slide.addText(label, {
    x: x + 0.25, y: y + h * 0.7, w: w - 0.5, h: h * 0.27,
    fontSize: 14, color: C.text, fontFace: "Calibri", align: "center", valign: "top",
  });
}

// ===============================================================
// SLIDE 1 — Title
// ===============================================================
{
  const s = pptx.addSlide({ masterName: "BASE" });
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0.18, w: 13.33, h: 7.14,
    fill: { color: C.primary }, line: { color: C.primary },
  });
  // big decorative element — sound wave bars
  for (let i = 0; i < 22; i++) {
    const h = 0.3 + Math.abs(Math.sin(i * 0.7)) * 1.4;
    s.addShape(pptx.ShapeType.rect, {
      x: 9.6 + i * 0.16, y: 5.7 - h / 2, w: 0.08, h,
      fill: { color: C.accent }, line: { color: C.accent },
    });
  }

  s.addText("EduSound", {
    x: 0.8, y: 2.2, w: 11.7, h: 1.0,
    fontSize: 72, bold: true, color: "FFFFFF", fontFace: "Calibri",
  });
  s.addText("Metrics", {
    x: 0.8, y: 3.1, w: 11.7, h: 1.0,
    fontSize: 72, bold: true, color: C.accent, fontFace: "Calibri",
  });
  s.addShape(pptx.ShapeType.rect, {
    x: 0.85, y: 4.4, w: 1.2, h: 0.08, fill: { color: "FFFFFF" }, line: { color: "FFFFFF" },
  });
  s.addText("Listening to classrooms, not to people.", {
    x: 0.8, y: 4.65, w: 11.7, h: 0.6,
    fontSize: 22, color: "BFDBFE", fontFace: "Calibri", italic: true,
  });

  s.addText("Proof-of-concept demonstration  ·  May 2026", {
    x: 0.8, y: 6.4, w: 11.7, h: 0.4,
    fontSize: 14, color: "93C5FD", fontFace: "Calibri",
  });
}

// ===============================================================
// SLIDE 2 — Why noise matters (big stats)
// ===============================================================
{
  const s = pptx.addSlide({ masterName: "BASE" });
  title(s, "Why classroom noise matters");
  s.addText("Sound shapes attention, well-being and learning — silently.", {
    x: 0.6, y: 1.4, w: 12, h: 0.4,
    fontSize: 16, fontFace: "Calibri", color: C.textSoft, italic: true,
  });

  bigStat(s, 0.6,  2.1, 3.95, 4.5, "55", "dB", "Threshold above which comprehension drops", C.red);
  bigStat(s, 4.7,  2.1, 3.95, 4.5, "60", "%", "of teachers report voice strain at work", C.accent);
  bigStat(s, 8.8,  2.1, 3.95, 4.5, "2×", "",  "louder rooms hit students with hearing aids hardest", C.primary);
}

// ===============================================================
// SLIDE 3 — Four-verb pipeline
// ===============================================================
{
  const s = pptx.addSlide({ masterName: "BASE" });
  title(s, "What EduSound Metrics does");
  s.addText("One simple loop, repeated all day, every day.", {
    x: 0.6, y: 1.4, w: 12, h: 0.4,
    fontSize: 16, fontFace: "Calibri", color: C.textSoft, italic: true,
  });

  const verbs = [
    { x: 0.6,  v: "MEASURE",   c: C.primary,     line: "Six tiny mics per room, every few seconds." },
    { x: 3.85, v: "SHOW",      c: C.primarySoft, line: "An LED in the room, a dashboard on any device." },
    { x: 7.1,  v: "COMPARE",   c: C.accent,      line: "Across rooms, across days, across the year." },
    { x: 10.35,v: "DECIDE",    c: C.green,       line: "Evidence for teachers and school leadership." },
  ];
  verbs.forEach((it, i) => {
    panel(s, it.x, 2.1, 2.65, 4.6);
    s.addShape(pptx.ShapeType.roundRect, {
      x: it.x + 0.25, y: 2.3, w: 2.15, h: 0.7,
      fill: { color: it.c }, line: { color: it.c }, rectRadius: 0.06,
    });
    s.addText(it.v, {
      x: it.x + 0.25, y: 2.34, w: 2.15, h: 0.62,
      fontSize: 18, bold: true, color: "FFFFFF", fontFace: "Calibri", align: "center", valign: "middle",
    });
    s.addText((i + 1).toString().padStart(2, "0"), {
      x: it.x + 0.25, y: 3.15, w: 2.15, h: 1.2,
      fontSize: 64, bold: true, color: it.c, fontFace: "Calibri", align: "center",
    });
    s.addShape(pptx.ShapeType.rect, {
      x: it.x + 1.0, y: 4.5, w: 0.65, h: 0.05,
      fill: { color: C.accent }, line: { color: C.accent },
    });
    s.addText(it.line, {
      x: it.x + 0.2, y: 4.7, w: 2.25, h: 1.8,
      fontSize: 13, color: C.text, fontFace: "Calibri", align: "center",
    });
  });
}

// ===============================================================
// SLIDE 4 — Two architectures
// ===============================================================
{
  const s = pptx.addSlide({ masterName: "BASE" });
  title(s, "Two architectures, one choice");
  s.addText("One central mic vs. a swarm of tiny ones.", {
    x: 0.6, y: 1.4, w: 12, h: 0.4,
    fontSize: 16, fontFace: "Calibri", color: C.textSoft, italic: true,
  });

  // Option A
  panel(s, 0.6, 2.0, 6.0, 4.9);
  s.addText("A", {
    x: 0.8, y: 2.15, w: 0.7, h: 0.7,
    fontSize: 32, bold: true, color: C.primary, fontFace: "Calibri",
  });
  s.addText("One central mic", {
    x: 1.55, y: 2.2, w: 4.4, h: 0.6,
    fontSize: 22, bold: true, color: C.text, fontFace: "Calibri",
  });
  // visual
  s.addShape(pptx.ShapeType.rect, {
    x: 0.95, y: 3.0, w: 5.3, h: 1.4,
    fill: { color: "EFF6FF" }, line: { color: C.borderDeep, width: 0.75 },
  });
  s.addShape(pptx.ShapeType.ellipse, {
    x: 3.25, y: 3.3, w: 0.9, h: 0.9,
    fill: { color: C.primarySoft }, line: { color: C.primarySoft },
  });
  // pros/cons
  s.addText("+ Simple install", {
    x: 0.85, y: 4.6, w: 5.4, h: 0.4, fontSize: 14, color: C.green, fontFace: "Calibri", bold: true,
  });
  s.addText("− One viewpoint of the room", {
    x: 0.85, y: 5.05, w: 5.4, h: 0.4, fontSize: 14, color: C.red, fontFace: "Calibri", bold: true,
  });
  s.addText("− Single point of failure", {
    x: 0.85, y: 5.5, w: 5.4, h: 0.4, fontSize: 14, color: C.red, fontFace: "Calibri", bold: true,
  });
  s.addText("− Skewed by closest table", {
    x: 0.85, y: 5.95, w: 5.4, h: 0.4, fontSize: 14, color: C.red, fontFace: "Calibri", bold: true,
  });

  // Option B — chosen
  panel(s, 6.7, 2.0, 6.1, 4.9, C.greenSoft);
  s.addShape(pptx.ShapeType.roundRect, {
    x: 11.55, y: 2.15, w: 1.15, h: 0.4,
    fill: { color: C.green }, line: { color: C.green }, rectRadius: 0.05,
  });
  s.addText("CHOSEN", {
    x: 11.55, y: 2.19, w: 1.15, h: 0.32,
    fontSize: 11, bold: true, color: "FFFFFF", align: "center", fontFace: "Calibri",
  });
  s.addText("B", {
    x: 6.9, y: 2.15, w: 0.7, h: 0.7,
    fontSize: 32, bold: true, color: "065F46", fontFace: "Calibri",
  });
  s.addText("Six distributed mini-mics", {
    x: 7.65, y: 2.2, w: 3.9, h: 0.6,
    fontSize: 22, bold: true, color: "065F46", fontFace: "Calibri",
  });
  s.addShape(pptx.ShapeType.rect, {
    x: 7.05, y: 3.0, w: 5.6, h: 1.4,
    fill: { color: "A7F3D0" }, line: { color: C.green, width: 0.75 },
  });
  const dots = [
    [7.55, 3.15], [9.6, 3.15], [11.7, 3.15],
    [7.55, 3.85], [9.6, 3.85], [11.7, 3.85],
  ];
  dots.forEach(([dx, dy]) => {
    s.addShape(pptx.ShapeType.ellipse, {
      x: dx, y: dy, w: 0.45, h: 0.45,
      fill: { color: C.green }, line: { color: C.green },
    });
  });
  s.addText("+ Real spatial coverage", {
    x: 6.95, y: 4.6, w: 5.6, h: 0.4, fontSize: 14, color: "065F46", fontFace: "Calibri", bold: true,
  });
  s.addText("+ Median filters out one loud table", {
    x: 6.95, y: 5.05, w: 5.6, h: 0.4, fontSize: 14, color: "065F46", fontFace: "Calibri", bold: true,
  });
  s.addText("+ Graceful degradation if a mic fails", {
    x: 6.95, y: 5.5, w: 5.6, h: 0.4, fontSize: 14, color: "065F46", fontFace: "Calibri", bold: true,
  });
  s.addText("+ Opens the door to heatmaps", {
    x: 6.95, y: 5.95, w: 5.6, h: 0.4, fontSize: 14, color: "065F46", fontFace: "Calibri", bold: true,
  });
}

// ===============================================================
// SLIDE 5 — How it works (pipeline only, no paragraphs)
// ===============================================================
{
  const s = pptx.addSlide({ masterName: "BASE" });
  title(s, "How it works");
  s.addText("From the ceiling of the classroom to a phone anywhere in the world.", {
    x: 0.6, y: 1.4, w: 12, h: 0.4,
    fontSize: 16, fontFace: "Calibri", color: C.textSoft, italic: true,
  });

  const boxes = [
    { x: 0.6,  label: "Mics",      sub: "ESP32-S3",            color: C.primary },
    { x: 3.35, label: "MQTT",      sub: "broker.hivemq.com",    color: C.primarySoft },
    { x: 6.1,  label: "Backend",   sub: "Node.js + SQLite",     color: C.primarySoft },
    { x: 8.85, label: "Dashboard", sub: "Next.js",              color: C.primarySoft },
    { x: 11.6, label: "Public URL",sub: "Cloudflare Tunnel",    color: C.accent },
  ];
  boxes.forEach((b, i) => {
    s.addShape(pptx.ShapeType.roundRect, {
      x: b.x, y: 2.9, w: 1.6, h: 1.9,
      fill: { color: b.color }, line: { color: b.color }, rectRadius: 0.1,
    });
    s.addText(b.label, {
      x: b.x, y: 3.15, w: 1.6, h: 0.6,
      fontSize: 16, bold: true, color: "FFFFFF", fontFace: "Calibri", align: "center",
    });
    s.addText(b.sub, {
      x: b.x, y: 3.8, w: 1.6, h: 0.6,
      fontSize: 11, color: "E2E8F0", fontFace: "Calibri", align: "center", italic: true,
    });
    if (i < boxes.length - 1) {
      const arrowX = b.x + 1.6;
      const nextX = boxes[i + 1].x;
      s.addShape(pptx.ShapeType.rightArrow, {
        x: arrowX + 0.05, y: 3.7, w: nextX - arrowX - 0.1, h: 0.45,
        fill: { color: C.textSoft }, line: { color: C.textSoft },
      });
    }
  });

  // three benefit pills
  const pills = [
    { x: 0.6,  label: "No school IT changes" },
    { x: 4.95, label: "No open ports" },
    { x: 9.3,  label: "Works from any phone" },
  ];
  pills.forEach((p) => {
    s.addShape(pptx.ShapeType.roundRect, {
      x: p.x, y: 5.6, w: 3.8, h: 0.85,
      fill: { color: C.panel }, line: { color: C.accent, width: 1.5 }, rectRadius: 0.4,
    });
    s.addText(p.label, {
      x: p.x, y: 5.65, w: 3.8, h: 0.75,
      fontSize: 16, bold: true, color: C.primary, fontFace: "Calibri", align: "center", valign: "middle",
    });
  });
}

// ===============================================================
// SLIDE 6 — Hardware
// ===============================================================
{
  const s = pptx.addSlide({ masterName: "BASE" });
  title(s, "The listening node");
  s.addText("Each node = step-down PCB (fuse + TSR) + soldered USB-C pigtail + M5Stack ATOM Echo S3R.", {
    x: 0.6, y: 1.4, w: 12, h: 0.4,
    fontSize: 16, fontFace: "Calibri", color: C.textSoft, italic: true,
  });

  photoFramed(s, PH.fivePCBs, 0.6, 1.95, 6.2, 4.9, "Five complete listening nodes — each ATOM Echo wired to its own step-down PCB through a soldered pigtail.");

  // 3 stat tiles
  bigStat(s, 7.0, 1.95, 6.0, 1.55, "2", "comp.", "soldered on the PCB (fuse + TSR 1-2450)", C.primary);
  bigStat(s, 7.0, 3.65, 6.0, 1.55, "6",  "",   "nodes per classroom (mesh)", C.accent);
  bigStat(s, 7.0, 5.35, 6.0, 1.55, "1", "bus", "single 24 V line per room", C.green);
}

// ===============================================================
// SLIDE 7 — From sketch to circuit (design iteration)
// ===============================================================
{
  const s = pptx.addSlide({ masterName: "BASE" });
  title(s, "From sketch to circuit");
  s.addText("Three steps from a pencil drawing to a board on the ceiling.", {
    x: 0.6, y: 1.4, w: 12, h: 0.4,
    fontSize: 16, fontFace: "Calibri", color: C.textSoft, italic: true,
  });

  const steps = [
    {
      x: 0.6,  badge: "01", title: "Sketch",
      src: PH.sketch,
      cap: "Pencil on graph paper — first attempt at the perfboard layout.",
      color: C.primary,
    },
    {
      x: 3.6,  badge: "02", title: "Review",
      src: PH.schemaRejected,
      cap: "First digital pass with an Adafruit USB-C breakout — CC pull-ups spotted as wrong. Discarded.",
      color: C.red,
    },
    {
      x: 6.6,  badge: "03", title: "Diagram",
      src: PH.schemaClean,
      cap: "Corrected as-built schematic on 19×31 perfboard — only a 1 A fuse and a Traco TSR 1-2450, all soldered.",
      color: C.accent,
    },
    {
      x: 9.6,  badge: "04", title: "Build",
      src: PH.pcbDetail,
      cap: "Real board from IMG_144 — fuse + TSR soldered, 24 V wires up, USB-C pigtail down.",
      color: C.green,
    },
  ];
  steps.forEach((it) => {
    // step badge
    s.addShape(pptx.ShapeType.roundRect, {
      x: it.x, y: 1.95, w: 0.8, h: 0.5,
      fill: { color: it.color }, line: { color: it.color }, rectRadius: 0.06,
    });
    s.addText(it.badge, {
      x: it.x, y: 1.95, w: 0.8, h: 0.5,
      fontSize: 17, bold: true, color: "FFFFFF", fontFace: "Calibri", align: "center", valign: "middle",
    });
    s.addText(it.title, {
      x: it.x + 0.85, y: 1.95, w: 2.0, h: 0.5,
      fontSize: 18, bold: true, color: C.primary, fontFace: "Calibri", valign: "middle",
    });

    // image panel
    panel(s, it.x, 2.55, 2.95, 3.85);
    s.addImage({
      path: it.src,
      x: it.x + 0.12, y: 2.67,
      w: 2.71, h: 3.61,
      sizing: { type: "contain", w: 2.71, h: 3.61 },
    });

    // caption
    s.addText(it.cap, {
      x: it.x, y: 6.5, w: 2.95, h: 0.75,
      fontSize: 11, color: C.text, fontFace: "Calibri", align: "center", italic: true,
    });
  });
}

// ===============================================================
// SLIDE 8 — Building the network (photos)
// ===============================================================
{
  const s = pptx.addSlide({ masterName: "BASE" });
  title(s, "Built and installed");
  s.addText("Custom step-down PCB, single 24 V bus, mounted on the ceiling.", {
    x: 0.6, y: 1.4, w: 12, h: 0.4,
    fontSize: 16, fontFace: "Calibri", color: C.textSoft, italic: true,
  });

  photoFramed(s, PH.pcbDetail, 0.6, 2.0, 4.2, 4.85, "Per-node PCB (close-up).");
  photoFramed(s, PH.ceiling,   5.0, 2.0, 3.6, 4.85, "Mounted on the ceiling.");
  photoFramed(s, PH.ceiling2,  8.8, 2.0, 4.0, 4.85, "Ceiling junction box with 24 V terminal block.");
}

// ===============================================================
// SLIDE 8 — Power & wiring (big diagram)
// ===============================================================
{
  const s = pptx.addSlide({ masterName: "BASE" });
  title(s, "From wall socket to ceiling mic");
  s.addText("A repeatable wiring scheme — every classroom is identical.", {
    x: 0.6, y: 1.4, w: 12, h: 0.4,
    fontSize: 16, fontFace: "Calibri", color: C.textSoft, italic: true,
  });

  photoFramed(s, PH.powerDiagram, 0.6, 2.0, 9.4, 4.85);

  panel(s, 10.2, 2.0, 2.6, 4.85);
  s.addText("24 V", {
    x: 10.2, y: 2.3, w: 2.6, h: 0.8,
    fontSize: 42, bold: true, color: C.primary, fontFace: "Calibri", align: "center",
  });
  s.addText("supply", {
    x: 10.2, y: 3.1, w: 2.6, h: 0.4,
    fontSize: 12, color: C.textSoft, fontFace: "Calibri", align: "center", italic: true,
  });
  s.addShape(pptx.ShapeType.line, {
    x: 10.5, y: 3.7, w: 2.0, h: 0,
    line: { color: C.border, width: 1 },
  });
  s.addText("5 V", {
    x: 10.2, y: 3.9, w: 2.6, h: 0.8,
    fontSize: 42, bold: true, color: C.accent, fontFace: "Calibri", align: "center",
  });
  s.addText("per node", {
    x: 10.2, y: 4.7, w: 2.6, h: 0.4,
    fontSize: 12, color: C.textSoft, fontFace: "Calibri", align: "center", italic: true,
  });
  s.addShape(pptx.ShapeType.line, {
    x: 10.5, y: 5.3, w: 2.0, h: 0,
    line: { color: C.border, width: 1 },
  });
  s.addText("USB-C", {
    x: 10.2, y: 5.5, w: 2.6, h: 0.8,
    fontSize: 32, bold: true, color: C.green, fontFace: "Calibri", align: "center",
  });
  s.addText("to ATOM Echo", {
    x: 10.2, y: 6.25, w: 2.6, h: 0.4,
    fontSize: 12, color: C.textSoft, fontFace: "Calibri", align: "center", italic: true,
  });
}

// ===============================================================
// SLIDE 9 — Traffic light (already visual, larger)
// ===============================================================
{
  const s = pptx.addSlide({ masterName: "BASE" });
  title(s, "The room speaks for itself");
  s.addText("Each mic glows. The class regulates the class.", {
    x: 0.6, y: 1.4, w: 12, h: 0.4,
    fontSize: 16, fontFace: "Calibri", color: C.textSoft, italic: true,
  });

  const lights = [
    { x: 1.2,  color: C.green,  label: "CALM",     range: "< 50 dB" },
    { x: 5.4,  color: C.yellow, label: "WORKING",  range: "50–70 dB" },
    { x: 9.6,  color: C.red,    label: "TOO LOUD", range: "> 70 dB" },
  ];
  lights.forEach((l) => {
    s.addShape(pptx.ShapeType.ellipse, {
      x: l.x, y: 2.0, w: 2.5, h: 2.5,
      fill: { color: l.color }, line: { color: l.color },
      shadow: { type: "outer", color: "94A3B8", blur: 18, offset: 3, opacity: 0.35 },
    });
    s.addText(l.range, {
      x: l.x, y: 2.85, w: 2.5, h: 0.8,
      fontSize: 24, bold: true, color: "FFFFFF", align: "center", fontFace: "Calibri",
    });
    s.addText(l.label, {
      x: l.x - 0.5, y: 4.8, w: 3.5, h: 0.5,
      fontSize: 22, bold: true, color: C.primary, align: "center", fontFace: "Calibri",
    });
  });

  s.addText("No teacher voice required.", {
    x: 0.6, y: 6.0, w: 12, h: 0.5,
    fontSize: 18, color: C.textSoft, fontFace: "Calibri", align: "center", italic: true,
  });
}

// ===============================================================
// SLIDE 10 — Dashboard live
// ===============================================================
{
  const s = pptx.addSlide({ masterName: "BASE" });
  title(s, "Live view");
  s.addText("One classroom, five active mics, real time.", {
    x: 0.6, y: 1.4, w: 12, h: 0.4,
    fontSize: 16, fontFace: "Calibri", color: C.textSoft, italic: true,
  });

  photoFramed(s, PH.dashboardLive, 0.6, 1.95, 9.4, 4.95);

  const pills = [
    { y: 2.05, label: "Room average",    val: "44.7 dB", color: C.green },
    { y: 3.65, label: "Active mics",     val: "5 / 5",   color: C.primary },
    { y: 5.25, label: "Update latency",  val: "<1 s",    color: C.accent },
  ];
  pills.forEach((p) => {
    panel(s, 10.2, p.y, 2.6, 1.45);
    s.addText(p.val, {
      x: 10.2, y: p.y + 0.15, w: 2.6, h: 0.75,
      fontSize: 26, bold: true, color: p.color, fontFace: "Calibri", align: "center",
    });
    s.addText(p.label, {
      x: 10.2, y: p.y + 0.9, w: 2.6, h: 0.4,
      fontSize: 11, color: C.textSoft, fontFace: "Calibri", align: "center", italic: true,
    });
  });
}

// ===============================================================
// SLIDE 11 — Dashboard history
// ===============================================================
{
  const s = pptx.addSlide({ masterName: "BASE" });
  title(s, "History — by lesson, by day");
  s.addText("Slots align with the school timetable.", {
    x: 0.6, y: 1.4, w: 12, h: 0.4,
    fontSize: 16, fontFace: "Calibri", color: C.textSoft, italic: true,
  });

  photoFramed(s, PH.dashboardDay, 0.6, 1.95, 9.4, 4.95);

  bigStat(s, 10.2, 1.95, 2.6, 1.55, "14", "d", "raw 5-s samples",  C.primary);
  bigStat(s, 10.2, 3.65, 2.6, 1.55, "6",  "mo","per-minute rollup", C.accent);
  bigStat(s, 10.2, 5.35, 2.6, 1.55, "∞",  "",  "per-hour rollup",   C.green);
}

// ===============================================================
// SLIDE 12 — Pedagogy 1: Awareness
// ===============================================================
{
  const s = pptx.addSlide({ masterName: "BASE" });
  title(s, "Awareness, not authority");
  s.addText("The LED becomes the impartial referee.", {
    x: 0.6, y: 1.4, w: 12, h: 0.4,
    fontSize: 16, fontFace: "Calibri", color: C.textSoft, italic: true,
  });

  // big pull quote
  panel(s, 0.6, 2.1, 12.1, 2.4, C.yellowSoft);
  s.addText("“The class regulates the class.”", {
    x: 0.8, y: 2.3, w: 11.7, h: 1.4,
    fontSize: 38, bold: true, color: C.accentDeep, fontFace: "Calibri", align: "center", italic: true,
  });
  s.addText("From “who is shouting?” to “what does our room sound like right now?”", {
    x: 0.8, y: 3.65, w: 11.7, h: 0.7,
    fontSize: 16, color: C.accentDeep, fontFace: "Calibri", align: "center",
  });

  // three short rituals
  const rituals = [
    { x: 0.6,  title: "Agree a target",     line: "Class & teacher set a dB goal for each activity." },
    { x: 4.85, title: "Reflect together",   line: "End of lesson, the curve becomes a conversation." },
    { x: 9.1,  title: "De-escalate",        line: "The LED, not the teacher, says “too loud”." },
  ];
  rituals.forEach((r) => {
    panel(s, r.x, 4.85, 3.6, 2.0);
    s.addText(r.title, {
      x: r.x + 0.2, y: 5.0, w: 3.2, h: 0.5,
      fontSize: 18, bold: true, color: C.primary, fontFace: "Calibri",
    });
    s.addShape(pptx.ShapeType.rect, {
      x: r.x + 0.2, y: 5.5, w: 0.5, h: 0.05,
      fill: { color: C.accent }, line: { color: C.accent },
    });
    s.addText(r.line, {
      x: r.x + 0.2, y: 5.6, w: 3.2, h: 1.2,
      fontSize: 13, color: C.text, fontFace: "Calibri",
    });
  });
}

// ===============================================================
// SLIDE 13 — Pedagogy 2: Data to decisions
// ===============================================================
{
  const s = pptx.addSlide({ masterName: "BASE" });
  title(s, "From data to decisions");
  s.addText("Objective measurements replace opinions.", {
    x: 0.6, y: 1.4, w: 12, h: 0.4,
    fontSize: 16, fontFace: "Calibri", color: C.textSoft, italic: true,
  });

  const cases = [
    { x: 0.6,  y: 2.0, icon: "01", title: "Spot problem rooms",       line: "Find rooms that are loud regardless of who occupies them." },
    { x: 6.85, y: 2.0, icon: "02", title: "Test interventions",       line: "Measure before & after acoustic panels, carpets, blinds." },
    { x: 0.6,  y: 4.5, icon: "03", title: "Reshape the timetable",    line: "Identify the loudest slots — sometimes it's scheduling, not behavior." },
    { x: 6.85, y: 4.5, icon: "04", title: "Catch anomalies early",    line: "A sudden baseline shift often signals a broken HVAC unit." },
  ];
  cases.forEach((c) => {
    panel(s, c.x, c.y, 5.85, 2.3);
    s.addShape(pptx.ShapeType.roundRect, {
      x: c.x + 0.3, y: c.y + 0.3, w: 1.3, h: 1.7,
      fill: { color: C.primary }, line: { color: C.primary }, rectRadius: 0.08,
    });
    s.addText(c.icon, {
      x: c.x + 0.3, y: c.y + 0.55, w: 1.3, h: 1.2,
      fontSize: 36, bold: true, color: "FFFFFF", fontFace: "Calibri", align: "center", valign: "middle",
    });
    s.addText(c.title, {
      x: c.x + 1.8, y: c.y + 0.35, w: 3.85, h: 0.55,
      fontSize: 18, bold: true, color: C.primary, fontFace: "Calibri",
    });
    s.addText(c.line, {
      x: c.x + 1.8, y: c.y + 0.95, w: 3.85, h: 1.2,
      fontSize: 13, color: C.text, fontFace: "Calibri",
    });
  });
}

// ===============================================================
// SLIDE 14 — Pedagogy 3: Data literacy (as questions)
// ===============================================================
{
  const s = pptx.addSlide({ masterName: "BASE" });
  title(s, "Their data, their questions");
  s.addText("Data literacy with a dataset students actually care about.", {
    x: 0.6, y: 1.4, w: 12, h: 0.4,
    fontSize: 16, fontFace: "Calibri", color: C.textSoft, italic: true,
  });

  const questions = [
    "When is our room loudest — and why?",
    "Do Fridays sound different from Mondays?",
    "Did the new seating plan really change anything?",
    "Is the room next door noisier than ours?",
  ];
  questions.forEach((q, i) => {
    const y = 2.1 + i * 1.05;
    panel(s, 0.6, y, 12.1, 0.85);
    s.addText("?", {
      x: 0.7, y: y + 0.05, w: 0.7, h: 0.75,
      fontSize: 36, bold: true, color: C.accent, fontFace: "Calibri", align: "center", valign: "middle",
    });
    s.addText(q, {
      x: 1.5, y, w: 11.0, h: 0.85,
      fontSize: 20, color: C.text, fontFace: "Calibri", valign: "middle", italic: true,
    });
  });

  s.addText("Every chart is also a JSON endpoint — export to Excel, Sheets, Python, R or Scratch.", {
    x: 0.6, y: 6.45, w: 12.1, h: 0.4,
    fontSize: 13, color: C.textSoft, fontFace: "Calibri", align: "center", italic: true,
  });
}

// ===============================================================
// SLIDE 15 — Privacy (two columns, very short)
// ===============================================================
{
  const s = pptx.addSlide({ masterName: "BASE" });
  title(s, "Privacy by design");
  s.addText("Measure the room, not the people in it.", {
    x: 0.6, y: 1.4, w: 12, h: 0.4,
    fontSize: 16, fontFace: "Calibri", color: C.textSoft, italic: true,
  });

  // YES
  panel(s, 0.6, 2.0, 6.0, 4.85, C.greenSoft);
  s.addText("YES", {
    x: 0.6, y: 2.15, w: 6.0, h: 0.7,
    fontSize: 36, bold: true, color: "065F46", fontFace: "Calibri", align: "center",
  });
  const yes = ["dB level (every few seconds)", "min / max / avg per minute", "Anonymous room label"];
  yes.forEach((t, i) => {
    s.addText("✓  " + t, {
      x: 0.85, y: 3.1 + i * 1.0, w: 5.5, h: 0.7,
      fontSize: 18, color: "065F46", fontFace: "Calibri", valign: "middle",
    });
  });

  // NO
  panel(s, 6.7, 2.0, 6.1, 4.85, C.redSoft);
  s.addText("NEVER", {
    x: 6.7, y: 2.15, w: 6.1, h: 0.7,
    fontSize: 36, bold: true, color: "991B1B", fontFace: "Calibri", align: "center",
  });
  const no = ["Audio recording", "Speech / transcription", "Names, faces, identifiers", "Location data"];
  no.forEach((t, i) => {
    s.addText("✗  " + t, {
      x: 6.95, y: 3.0 + i * 0.85, w: 5.6, h: 0.7,
      fontSize: 18, color: "991B1B", fontFace: "Calibri", valign: "middle",
    });
  });
}

// ===============================================================
// SLIDE 16 — Findings from the data collected so far
// ===============================================================
{
  const s = pptx.addSlide({ masterName: "BASE" });
  title(s, "What the data is already telling us");
  s.addText("21 days of continuous monitoring in one classroom — 7 microphones, 24/7.", {
    x: 0.6, y: 1.4, w: 12, h: 0.4,
    fontSize: 16, fontFace: "Calibri", color: C.textSoft, italic: true,
  });

  // 6 stat tiles, 3 across × 2 down
  const findings = [
    {
      x: 0.6,  y: 1.95, value: "21",   unit: "days",
      label: "of continuous recording, no dropouts",
      color: C.primary,
    },
    {
      x: 4.95, y: 1.95, value: "42k",  unit: "samples",
      label: "captured in one school day, 7 mics",
      color: C.primary,
    },
    {
      x: 9.3,  y: 1.95, value: "14.6", unit: "dB",
      label: "instantaneous spread across mics in the same room — the distributed model earns its keep",
      color: C.accent,
    },
    {
      x: 0.6,  y: 4.55, value: "47",   unit: "dB",
      label: "loudest lesson average (5th period, just after lunch)",
      color: C.red,
    },
    {
      x: 4.95, y: 4.55, value: "25",   unit: "dB",
      label: "quietest moment of the day — the break, when the room is empty",
      color: C.green,
    },
    {
      x: 9.3,  y: 4.55, value: "0",    unit: "%",
      label: "of the day above 70 dB — the room never tipped into red",
      color: C.green,
    },
  ];
  findings.forEach((f) => {
    panel(s, f.x, f.y, 3.85, 2.5);
    s.addText([
      { text: f.value, options: { fontSize: 56, bold: true, color: f.color, fontFace: "Calibri" } },
      { text: " " + f.unit, options: { fontSize: 18, color: f.color, fontFace: "Calibri" } },
    ], {
      x: f.x + 0.2, y: f.y + 0.2, w: 3.5, h: 1.1,
      align: "center", valign: "middle",
    });
    s.addShape(pptx.ShapeType.rect, {
      x: f.x + 1.62, y: f.y + 1.35, w: 0.6, h: 0.04,
      fill: { color: C.accent }, line: { color: C.accent },
    });
    s.addText(f.label, {
      x: f.x + 0.2, y: f.y + 1.45, w: 3.45, h: 1.0,
      fontSize: 12, color: C.text, fontFace: "Calibri", align: "center", valign: "top",
    });
  });
}

// ===============================================================
// SLIDE 17 — What this PoC has shown
// ===============================================================
{
  const s = pptx.addSlide({ masterName: "BASE" });
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0.18, w: 13.33, h: 7.14,
    fill: { color: C.primary }, line: { color: C.primary },
  });

  // sound wave again
  for (let i = 0; i < 22; i++) {
    const h = 0.3 + Math.abs(Math.sin(i * 0.7 + 1)) * 1.4;
    s.addShape(pptx.ShapeType.rect, {
      x: 9.6 + i * 0.16, y: 1.5 - h / 2, w: 0.08, h,
      fill: { color: C.accent }, line: { color: C.accent },
    });
  }

  s.addText("What this PoC has shown", {
    x: 0.8, y: 1.0, w: 8.5, h: 0.8,
    fontSize: 32, bold: true, color: "FFFFFF", fontFace: "Calibri",
  });

  const findings = [
    { x: 0.8,  y: 2.4, big: "Stable",      sub: "weeks of continuous monitoring" },
    { x: 4.9,  y: 2.4, big: "Off-the-shelf", sub: "ESP32 + open software is enough" },
    { x: 9.0,  y: 2.4, big: "Behavioral",  sub: "the LED changes the room" },
    { x: 0.8,  y: 4.8, big: "Year-long",   sub: "rollups keep history meaningful" },
    { x: 4.9,  y: 4.8, big: "Versatile",   sub: "teach, regulate, manage" },
    { x: 9.0,  y: 4.8, big: "Open",        sub: "MIT-licensed, replicable" },
  ];
  findings.forEach((f) => {
    s.addShape(pptx.ShapeType.roundRect, {
      x: f.x, y: f.y, w: 3.8, h: 2.1,
      fill: { color: C.primaryDeep }, line: { color: C.accent, width: 1 }, rectRadius: 0.1,
    });
    s.addText(f.big, {
      x: f.x, y: f.y + 0.2, w: 3.8, h: 0.9,
      fontSize: 28, bold: true, color: C.accent, fontFace: "Calibri", align: "center",
    });
    s.addText(f.sub, {
      x: f.x + 0.2, y: f.y + 1.15, w: 3.4, h: 0.8,
      fontSize: 13, color: "BFDBFE", fontFace: "Calibri", align: "center", italic: true,
    });
  });

  s.addText("EduSound Metrics  ·  Thank you", {
    x: 0.8, y: 7.0, w: 11.7, h: 0.3,
    fontSize: 14, color: "93C5FD", fontFace: "Calibri", italic: true,
  });
}

// ---------- Save ----------
pptx.writeFile({ fileName: "EduSoundMetrics_EN_v8.pptx" }).then((f) => {
  console.log("Wrote:", f);
});
