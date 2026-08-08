import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(root, "temporary screenshots");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function nextIndex() {
  const files = fs.readdirSync(outDir).filter((f) => f.startsWith("screenshot-"));
  const nums = files.map((f) => parseInt(f.split("-")[1], 10)).filter((n) => !isNaN(n));
  return nums.length ? Math.max(...nums) + 1 : 1;
}

function findChrome() {
  const cacheDir = path.join(process.env.HOME, ".cache/puppeteer/chrome");
  if (!fs.existsSync(cacheDir)) throw new Error("No cached chrome found at " + cacheDir);
  const versions = fs.readdirSync(cacheDir).sort();
  const latest = versions[versions.length - 1];
  return path.join(cacheDir, latest, "chrome-linux64", "chrome");
}

const url = process.argv[2] || "http://localhost:3000";
const label = process.argv[3] || "";
const width = parseInt(process.argv[4] || "1440", 10);
const height = parseInt(process.argv[5] || "900", 10);

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width, height });
await page.goto(url, { waitUntil: "networkidle0" });

// trigger any loading="lazy" images before capturing full-page
await page.evaluate(async () => {
  const distance = window.innerHeight;
  let total = 0;
  while (total < document.body.scrollHeight) {
    window.scrollBy(0, distance);
    total += distance;
    await new Promise((r) => setTimeout(r, 60));
  }
  window.scrollTo(0, 0);
});
await new Promise((r) => setTimeout(r, 400));

const idx = nextIndex();
const filename = label ? `screenshot-${idx}-${label}.png` : `screenshot-${idx}.png`;
const filePath = path.join(outDir, filename);
await page.screenshot({ path: filePath, fullPage: true });

await browser.close();
console.log("Saved " + filePath);
