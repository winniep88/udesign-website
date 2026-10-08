import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { gzipSync } from "node:zlib";

const root = process.cwd();
const exportDir = join(root, "out");
const manifest = join(root, ".openai", "hosting.json");
const workerSource = join(root, "worker", "index.js");
const output = join(root, "dist");

if (!existsSync(join(exportDir, "index.html"))) throw new Error("Build the Next static export first: out/index.html is missing.");
if (!existsSync(manifest)) throw new Error(".openai/hosting.json is missing.");
const hosting = JSON.parse(readFileSync(manifest, "utf8"));
if (hosting.static || hosting.r2 !== "BUCKET" || !hosting.project_id) throw new Error("Worker hosting manifest needs project_id and r2 BUCKET, without static.");

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlink is not allowed in export: ${path}`);
    if (entry.isDirectory()) return walk(path);
    if (!entry.isFile()) throw new Error(`Unsupported export entry: ${path}`);
    return [path];
  });
}

const assets = {};
for (const file of walk(exportDir)) {
  const urlPath = `/${relative(exportDir, file).split(sep).join("/")}`;
  const extension = urlPath.slice(urlPath.lastIndexOf(".")).toLowerCase();
  const type = types[extension];
  if (!type) throw new Error(`Unknown export file type: ${urlPath}`);
  assets[urlPath] = [type, gzipSync(readFileSync(file), { level: 9 }).toString("base64")];
}

mkdirSync(join(output, "server"), { recursive: true });
mkdirSync(join(output, ".openai"), { recursive: true });
const catalog = JSON.parse(readFileSync(join(root, "data", "catalog.json"), "utf8"));
const topperPrices = JSON.parse(readFileSync(join(root, "data", "topper-prices.json"), "utf8"));
const topperFonts = JSON.parse(readFileSync(join(root, "data", "topper-fonts.json"), "utf8"));
if (topperFonts.length !== 88 || new Set(topperFonts).size !== 88) throw new Error("The topper font picker must contain exactly 88 distinct styles.");
writeFileSync(join(output, "server", "index.js"), `const ASSETS = ${JSON.stringify(assets)};\nconst CATALOG = ${JSON.stringify(catalog)};\nconst TOPPER_PRICES = ${JSON.stringify(topperPrices)};\nconst TOPPER_FONTS = ${JSON.stringify(topperFonts)};\n${readFileSync(workerSource, "utf8")}`);
writeFileSync(join(output, ".openai", "hosting.json"), `${JSON.stringify(hosting)}\n`);
console.log(`Built ${Object.keys(assets).length} static files and the reference image service.`);
