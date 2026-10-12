import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
//#region stream/chrome.ts
var chromePaths = (platform, env) => {
	if (env.CHROME_PATH) return [env.CHROME_PATH];
	if (platform === "darwin") return ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"];
	if (platform === "win32") return [
		env.LOCALAPPDATA,
		env.PROGRAMFILES,
		env["PROGRAMFILES(X86)"]
	].flatMap((base) => base ? [path.win32.join(base, "Google", "Chrome", "Application", "chrome.exe")] : []);
	return [
		"/opt/google/chrome/chrome",
		"/usr/bin/google-chrome",
		"/usr/bin/google-chrome-stable"
	];
};
var chromeArgs = (profileDir, url) => [
	"--headless",
	"--remote-debugging-pipe",
	`--user-data-dir=${profileDir}`,
	"--no-first-run",
	"--no-default-browser-check",
	"--disable-background-networking",
	"--disable-background-timer-throttling",
	"--disable-backgrounding-occluded-windows",
	"--disable-renderer-backgrounding",
	"--disable-component-update",
	"--disable-extensions",
	"--disable-sync",
	"--mute-audio",
	"--password-store=basic",
	"--use-mock-keychain",
	url
];
//#endregion
//#region stream/files.ts
var TYPES = new Map(Object.entries({
	".css": "text/css",
	".html": "text/html; charset=utf-8",
	".js": "text/javascript",
	".json": "application/json",
	".png": "image/png",
	".svg": "image/svg+xml",
	".wasm": "application/wasm"
}));
var contentType = (file) => TYPES.get(path.extname(file)) ?? "application/octet-stream";
var assetPath = (root, url) => {
	const { pathname } = new URL(url, "http://world");
	const file = path.join(root, decodeURIComponent(pathname === "/" ? "/index.html" : pathname));
	return file.startsWith(`${root}${path.sep}`) ? file : null;
};
//#endregion
//#region stream/frame.ts
var CELL_ASPECT = 2.1;
var PER_COLUMN = {
	cells: 4,
	image: 6
};
var MAX_WIDTH = 640;
var frameSize = (columns, rows, mode) => {
	const width = Math.min(MAX_WIDTH, Math.round(columns * PER_COLUMN[mode] / 2) * 2);
	return {
		height: Math.max(2, Math.round(width * rows * CELL_ASPECT / columns / 2) * 2),
		width
	};
};
var flipRows = (rgba, width, height) => {
	const flipped = new Uint8Array(rgba.length);
	const stride = width * 4;
	for (let y = 0; y < height; y += 1) flipped.set(rgba.subarray((height - 1 - y) * stride, (height - y) * stride), y * stride);
	return flipped;
};
var QUADRANTS = [
	32,
	9624,
	9629,
	9600,
	9622,
	9612,
	9630,
	9627,
	9623,
	9626,
	9616,
	9628,
	9604,
	9625,
	9631,
	9608
];
var average = (rgba, width, height, box) => {
	const [x0, y0, x1, y1] = box;
	let r = 0;
	let g = 0;
	let b = 0;
	let n = 0;
	for (let y = y0; y < y1; y += 1) {
		const row = (height - 1 - y) * width * 4;
		for (let x = x0; x < x1; x += 1) {
			const i = row + x * 4;
			r += rgba[i] ?? 0;
			g += rgba[i + 1] ?? 0;
			b += rgba[i + 2] ?? 0;
			n += 1;
		}
	}
	return n === 0 ? [
		0,
		0,
		0
	] : [
		r / n,
		g / n,
		b / n
	];
};
var pack = ([r, g, b]) => Math.round(r) * 65536 + Math.round(g) * 256 + Math.round(b);
var mean = (colors) => {
	const sum = [
		0,
		0,
		0
	];
	for (const color of colors) {
		sum[0] += color[0];
		sum[1] += color[1];
		sum[2] += color[2];
	}
	const n = Math.max(1, colors.length);
	return [
		sum[0] / n,
		sum[1] / n,
		sum[2] / n
	];
};
var spread = (colors, center) => colors.reduce((total, c) => total + (c[0] - center[0]) ** 2 + (c[1] - center[1]) ** 2 + (c[2] - center[2]) ** 2, 0);
var isSet = (mask, bit) => Math.floor(mask / 2 ** bit) % 2 === 1;
var bestSplit = (quarters) => {
	let best = {
		bg: mean(quarters),
		error: Number.POSITIVE_INFINITY,
		fg: mean(quarters),
		mask: 0
	};
	best.error = spread(quarters, best.bg);
	for (let mask = 1; mask < 15; mask += 1) {
		const front = quarters.filter((_, i) => isSet(mask, i));
		const back = quarters.filter((_, i) => !isSet(mask, i));
		const fg = mean(front);
		const bg = mean(back);
		const error = spread(front, fg) + spread(back, bg);
		if (error < best.error) best = {
			bg,
			error,
			fg,
			mask
		};
	}
	return best;
};
var toCells = (rgba, width, height, columns, rows) => {
	const cells = new Uint32Array(columns * rows * 3);
	const across = columns * 2;
	const down = rows * 2;
	const xAt = (i) => Math.min(width, Math.floor(i * width / across));
	const yAt = (i) => Math.min(height, Math.floor(i * height / down));
	for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) {
		const { bg, fg, mask } = bestSplit([
			0,
			1,
			2,
			3
		].map((q) => {
			const sx = column * 2 + q % 2;
			const sy = row * 2 + Math.floor(q / 2);
			return average(rgba, width, height, [
				xAt(sx),
				yAt(sy),
				Math.max(xAt(sx) + 1, xAt(sx + 1)),
				Math.max(yAt(sy) + 1, yAt(sy + 1))
			]);
		}));
		const i = (row * columns + column) * 3;
		cells[i] = QUADRANTS[mask] ?? 32;
		cells[i + 1] = pack(fg);
		cells[i + 2] = pack(bg);
	}
	return cells;
};
//#endregion
//#region stream/stream.ts
var ABANDONED_MS = 15e3;
var { values } = parseArgs({ options: {
	image: { type: "string" },
	socket: { type: "string" },
	world: { type: "string" }
} });
var { image: imagePath, socket: socketPath, world: worldDir } = values;
if (!imagePath || !socketPath || !worldDir) {
	process.stderr.write("usage: stream.js --world <dir> --socket <path> --image <path>\n");
	process.exit(2);
}
var want = {
	columns: 80,
	isActive: false,
	mode: "cells",
	rows: 24,
	tokens: 0
};
var latest = null;
var lastAsked = Date.now();
var chrome = null;
var profileDir = mkdtempSync(path.join(os.tmpdir(), "mod-surfer-chrome-"));
var readBody = async (request) => {
	const chunks = [];
	for await (const chunk of request) chunks.push(Buffer.from(chunk));
	return Buffer.concat(chunks);
};
var header = (request, name) => Number(request.headers[name] ?? 0);
var takeFrame = async (request, response) => {
	const body = await readBody(request);
	const width = header(request, "x-width");
	const height = header(request, "x-height");
	if (width > 0 && height > 0 && body.length === width * height * 4) {
		const rgba = new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
		const { columns, rows } = want;
		const frame = (latest?.frame ?? 0) + 1;
		let cells = "";
		if (want.mode === "image") {
			writeFileSync(`${imagePath}.tmp`, flipRows(rgba, width, height));
			renameSync(`${imagePath}.tmp`, imagePath);
		} else {
			const words = toCells(rgba, width, height, columns, rows);
			cells = Buffer.from(words.buffer, words.byteOffset, words.byteLength).toString("base64");
		}
		const tally = {
			coins: header(request, "x-coins"),
			crashes: header(request, "x-crashes"),
			jumps: header(request, "x-jumps")
		};
		latest = {
			cells,
			columns,
			frame,
			height,
			rows,
			width,
			...tally
		};
		if (frame === 1) process.stdout.write("ready\n");
	}
	const size = frameSize(want.columns, want.rows, want.mode);
	response.setHeader("x-width", size.width);
	response.setHeader("x-height", size.height);
	response.setHeader("x-active", want.isActive ? "1" : "0");
	response.setHeader("x-mode", want.mode);
	response.setHeader("x-tokens", want.tokens);
	response.end();
};
var answer = (request, response) => {
	const url = new URL(request.url ?? "/", "http://surfer");
	if (url.pathname !== "/frame") {
		response.statusCode = 404;
		response.end();
		return;
	}
	lastAsked = Date.now();
	const columns = Number(url.searchParams.get("columns"));
	const rows = Number(url.searchParams.get("rows"));
	if (columns > 0 && rows > 0) {
		want.columns = columns;
		want.rows = rows;
	}
	want.mode = url.searchParams.get("mode") === "image" ? "image" : "cells";
	want.isActive = url.searchParams.get("active") === "1";
	want.tokens = Math.max(0, Math.floor(Number(url.searchParams.get("tokens")) || 0));
	const since = Number(url.searchParams.get("since") ?? -1);
	if (!latest || latest.frame <= since) {
		response.statusCode = 204;
		response.end();
		return;
	}
	const { cells, ...numbers } = latest;
	for (const [name, value] of Object.entries(numbers)) response.setHeader(`x-${name}`, value);
	response.end(cells);
};
var world = path.resolve(worldDir);
var serveWorld = (request, response) => {
	const file = assetPath(world, request.url ?? "/");
	if (!file || !existsSync(file)) {
		response.statusCode = 404;
		response.end();
		return;
	}
	response.setHeader("content-type", contentType(file));
	response.end(readFileSync(file));
};
var page = http.createServer(async (request, response) => {
	if (request.method !== "POST" || request.url !== "/frame") {
		serveWorld(request, response);
		return;
	}
	try {
		await takeFrame(request, response);
	} catch (error) {
		process.stderr.write(`frame: ${String(error)}\n`);
		response.statusCode = 500;
		response.end();
	}
});
page.listen(0, "127.0.0.1");
await once(page, "listening");
var address = page.address();
var port = address instanceof Object ? address.port : 0;
rmSync(socketPath, { force: true });
var hooks = http.createServer(answer);
hooks.listen(socketPath);
await once(hooks, "listening");
var shutdown = async (code) => {
	hooks.close();
	page.close();
	for (const file of [
		socketPath,
		imagePath,
		`${imagePath}.tmp`
	]) rmSync(file, { force: true });
	if (chrome && chrome.exitCode === null) {
		chrome.removeAllListeners("exit");
		chrome.kill();
		await once(chrome, "exit");
	}
	rmSync(profileDir, {
		force: true,
		recursive: true
	});
	process.exit(code);
};
process.on("SIGTERM", async () => {
	await shutdown(0);
});
process.on("SIGINT", async () => {
	await shutdown(0);
});
setInterval(async () => {
	if (Date.now() - lastAsked > ABANDONED_MS) await shutdown(0);
}, 1e3);
var executable = chromePaths(process.platform, process.env).find((file) => existsSync(file));
if (executable) {
	chrome = spawn(executable, chromeArgs(profileDir, `http://127.0.0.1:${port}/?stream`), { stdio: [
		"ignore",
		"ignore",
		"ignore",
		"pipe",
		"pipe"
	] });
	chrome.once("exit", async (code) => {
		process.stderr.write(`chrome: exited (${code ?? "signal"})\n`);
		await shutdown(1);
	});
} else {
	process.stderr.write("chrome: Google Chrome not found; set CHROME_PATH to its executable\n");
	await shutdown(1);
}
//#endregion
export {};
