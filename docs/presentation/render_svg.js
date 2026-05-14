const fs = require("fs");
const path = require("path");
const { Resvg } = require("@resvg/resvg-js");

const svgPath = path.join(__dirname, "..", "schema_pcb_no_valido.svg");
const outPng  = path.join(__dirname, "..", "schema_pcb_no_valido.png");

const svg = fs.readFileSync(svgPath, "utf-8");
const resvg = new Resvg(svg, {
  fitTo: { mode: "width", value: 1800 },
  background: "#ffffff",
  font: { loadSystemFonts: true },
});
const png = resvg.render().asPng();
fs.writeFileSync(outPng, png);
console.log("Wrote", outPng, png.length, "bytes");
