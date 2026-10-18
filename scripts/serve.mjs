// Tiny static server for the demo and the Playwright tests (no extra dependency).
// Serves the repo root on http://localhost:4173 . localhost counts as a secure context,
// so SubtleCrypto (device hash) and crypto.randomUUID work as they would on https.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const port = Number(process.env.PORT) || 4173;
const types = { ".html": "text/html", ".js": "text/javascript", ".map": "application/json", ".css": "text/css" };

createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (path.includes("..")) return void res.writeHead(400).end();
  try {
    const body = await readFile(join(root, path.endsWith("/") ? path + "index.html" : path));
    res.writeHead(200, { "Content-Type": types[extname(path)] || "application/octet-stream" }).end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
}).listen(port, () => console.log(`serving ${root} on http://localhost:${port}`));
