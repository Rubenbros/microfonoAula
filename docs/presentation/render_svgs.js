const fs = require("fs");
const path = require("path");
const { Resvg } = require("@resvg/resvg-js");

function render(svgRelPath, pngRelPath, widthPx = 1800) {
  const svgPath = path.join(__dirname, "..", svgRelPath);
  const outPng  = path.join(__dirname, "..", pngRelPath);
  const svg = fs.readFileSync(svgPath, "utf-8");
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: widthPx },
    background: "#ffffff",
    font: { loadSystemFonts: true },
  });
  const png = resvg.render().asPng();
  fs.writeFileSync(outPng, png);
  console.log("Wrote", outPng, png.length, "bytes");
}

render("schema_pcb_no_valido.svg", "schema_pcb_no_valido.png", 1800);
render("schema_pcb_final.svg",     "schema_pcb_final.png",     1800);
