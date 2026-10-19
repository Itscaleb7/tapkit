// Serves an Expo web export as a single-page app (SPA fallback to index.html).
import { createReadStream, existsSync, statSync } from "node:fs";
import http from "node:http";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? "dist");
const port = Number(process.argv[3] ?? 8081);
const types = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".ttf": "font/ttf", ".png": "image/png", ".ico": "image/x-icon", ".json": "application/json", ".svg": "image/svg+xml" };

http
  .createServer((req, res) => {
    const url = decodeURIComponent((req.url ?? "/").split("?")[0]);
    let file = path.join(root, url);
    if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) file = path.join(root, "index.html");
    res.writeHead(200, { "Content-Type": types[path.extname(file)] ?? "application/octet-stream" });
    createReadStream(file).pipe(res);
  })
  .listen(port, () => console.log(`static on :${port}`));
