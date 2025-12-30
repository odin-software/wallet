import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");

const icons = [
  { svg: "pwa-192x192.svg", png: "pwa-192x192.png", size: 192 },
  { svg: "pwa-512x512.svg", png: "pwa-512x512.png", size: 512 },
  { svg: "apple-touch-icon-180x180.svg", png: "apple-touch-icon-180x180.png", size: 180 },
];

for (const icon of icons) {
  const svgPath = join(publicDir, icon.svg);
  const pngPath = join(publicDir, icon.png);

  console.log(`Converting ${icon.svg} to ${icon.png}...`);

  const svg = readFileSync(svgPath, "utf-8");
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: "width",
      value: icon.size,
    },
  });

  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  writeFileSync(pngPath, pngBuffer);
  console.log(`  Created ${icon.png} (${pngBuffer.length} bytes)`);
}

console.log("Done!");
