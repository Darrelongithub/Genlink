/**
 * ADAPT's production front door.
 *
 * Next serves the learner UI and this small Node server proxies API and voice
 * traffic to FastAPI. Browser clients never need direct access to the API.
 * Provider credentials are neither loaded by env.mjs nor accepted in ADAPT_API.
 */
import { createServer } from "node:http";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { BlockList, isIP } from "node:net";
import next from "next";
import "./env.mjs";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);
const backend = process.env.ADAPT_API ?? "http://127.0.0.1:8000";
const offline = backend === "offline";

function integerEnv(name, fallback, { min, max }) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

const maxBodyBytes = integerEnv("ADAPT_MAX_BODY_BYTES", 8 * 1024 * 1024, {
  min: 1024,
  max: 64 * 1024 * 1024,
});
const proxyTimeoutMs = integerEnv("ADAPT_PROXY_TIMEOUT_MS", 120_000, {
  min: 1_000,
  max: 600_000,
});
const shutdownTimeoutMs = integerEnv("ADAPT_SHUTDOWN_TIMEOUT_MS", 5_000, {
  min: 1_000,
  max: 120_000,
});

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535");
}

function parsedHost(value) {
  const text = String(value ?? "").trim();
  if (!text || /[\s/]/.test(text) || text.includes("*")) return null;
  try {
    const parsed = new URL(`http://${text}`);
    if (parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/") {
      return null;
    }
    const bracketed = parsed.hostname.startsWith("[") && parsed.hostname.endsWith("]");
    const hostname = (bracketed ? parsed.hostname.slice(1, -1) : parsed.hostname)
      .toLowerCase()
      .replace(/\.$/, "");
    return hostname ? { hostname, port: parsed.port } : null;
  } catch {
    return null;
  }
}

const allowedHosts = new Set();
for (const entry of (process.env.ADAPT_ALLOWED_HOSTS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean)) {
  const parsed = parsedHost(entry);
  if (!parsed || parsed.port) {
    throw new Error("ADAPT_ALLOWED_HOSTS must contain exact host names without schemes, ports or wildcards");
  }
  allowedHosts.add(parsed.hostname);
}

function hostAllowed(req) {
  // Empty preserves the local/LAN launchers. Public production assets set an
  // exact list because the API proxy intentionally replaces Host with its target.
  if (!allowedHosts.size) return true;
  const parsed = parsedHost(req.headers.host);
  return Boolean(parsed && allowedHosts.has(parsed.hostname));
}

process.env.NEXT_TELEMETRY_DISABLED ??= "1";

function makeTarget(value) {
  if (value === "offline") return null;
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("ADAPT_API must be an absolute HTTP(S) URL or 'offline'");
  }
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    (parsed.pathname && parsed.pathname !== "/")
  ) {
    throw new Error(
      "ADAPT_API must be an origin-only HTTP(S) URL without credentials, a path, query or fragment",
    );
  }
  return parsed;
}

const target = makeTarget(backend);
const transport = target?.protocol === "https:" ? httpsRequest : httpRequest;
const targetPort = target?.port || (target?.protocol === "https:" ? 443 : 80);

const proxyNetworks = new BlockList();
for (const entry of (process.env.ADAPT_TRUSTED_PROXIES ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean)) {
  const [address, prefixText] = entry.split("/");
  const family = isIP(address);
  if (!family) throw new Error("ADAPT_TRUSTED_PROXIES must contain only IP addresses or CIDR networks");
  if (prefixText === undefined) {
    proxyNetworks.addAddress(address, family === 4 ? "ipv4" : "ipv6");
    continue;
  }
  const prefix = Number(prefixText);
  const max = family === 4 ? 32 : 128;
  if (!Number.isInteger(prefix) || prefix < 1 || prefix > max || (prefix === 0)) {
    throw new Error("ADAPT_TRUSTED_PROXIES cannot contain an invalid or world-wide network");
  }
  proxyNetworks.addSubnet(address, prefix, family === 4 ? "ipv4" : "ipv6");
}

function normalizedIP(value) {
  const text = String(value ?? "").trim();
  if (text.startsWith("::ffff:") && isIP(text.slice(7)) === 4) return text.slice(7);
  return text;
}

function trustedPeer(req) {
  const address = normalizedIP(req.socket.remoteAddress);
  const family = isIP(address);
  if (!family) return false;
  return proxyNetworks.check(address, family === 4 ? "ipv4" : "ipv6");
}

function validForwardedChain(value) {
  if (typeof value !== "string" || !value.trim()) return [];
  const values = value.split(",").map((part) => normalizedIP(part));
  return values.every((part) => isIP(part)) ? values : [];
}

function forwardedHeaders(req) {
  const headers = { ...req.headers };
  delete headers.host;
  delete headers.connection;
  delete headers["accept-encoding"];
  delete headers.forwarded;
  const peer = normalizedIP(req.socket.remoteAddress);
  const trusted = trustedPeer(req);
  const prior = trusted ? validForwardedChain(req.headers["x-forwarded-for"]) : [];
  headers["x-forwarded-for"] = [...prior, peer].filter(Boolean).join(", ");

  let protocol = "http";
  if (trusted && typeof req.headers["x-forwarded-proto"] === "string") {
    const chain = req.headers["x-forwarded-proto"]
      .split(",")
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean);
    if (chain.length && chain.every((value) => ["http", "https"].includes(value))) {
      protocol = chain.at(-1);
    }
  }
  // Direct clients cannot claim HTTPS merely by sending this header to Node.
  headers["x-forwarded-proto"] = protocol;
  headers["x-forwarded-host"] = req.headers.host ?? "";
  if (target) headers.host = target.host;
  return headers;
}

function jsonResponse(res, status, body) {
  if (res.headersSent || res.destroyed) return;
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "cache-control": "no-store",
  });
  res.end(payload);
}

const activeUpstreams = new Set();

function proxy(req, res) {
  if (offline) {
    jsonResponse(res, 503, {
      error: "api_offline",
      detail: "the frontend was started with ADAPT_API=offline; start the backend and reload",
    });
    return;
  }

  const declared = Number(req.headers["content-length"] ?? 0);
  if (Number.isFinite(declared) && declared > maxBodyBytes) {
    jsonResponse(res, 413, { error: "request_too_large", max_body_bytes: maxBodyBytes });
    req.resume();
    return;
  }

  const chunks = [];
  let size = 0;
  let refused = false;
  req.on("data", (chunk) => {
    if (refused) return;
    size += chunk.length;
    if (size > maxBodyBytes) {
      refused = true;
      chunks.length = 0;
      jsonResponse(res, 413, { error: "request_too_large", max_body_bytes: maxBodyBytes });
      return;
    }
    chunks.push(chunk);
  });
  req.on("end", () => {
    if (refused || res.destroyed) return;
    const body = Buffer.concat(chunks);
    const upstream = transport(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: targetPort,
        method: req.method,
        path: req.url,
        headers: forwardedHeaders(req),
      },
      (up) => {
        res.writeHead(up.statusCode ?? 502, { ...up.headers });
        up.pipe(res);
      },
    );
    activeUpstreams.add(upstream);
    upstream.on("close", () => activeUpstreams.delete(upstream));
    upstream.setTimeout(proxyTimeoutMs, () => {
      upstream.destroy(Object.assign(new Error("upstream timeout"), { code: "ADAPT_UPSTREAM_TIMEOUT" }));
    });
    upstream.on("error", (error) => {
      // Never return the internal URL, socket error text or a credential-bearing
      // configuration value to the browser.
      if (res.headersSent) {
        res.destroy();
        return;
      }
      jsonResponse(res, error.code === "ADAPT_UPSTREAM_TIMEOUT" ? 504 : 502, {
        error: error.code === "ADAPT_UPSTREAM_TIMEOUT" ? "api_timeout" : "api_unreachable",
        detail: "the learning service did not answer; retry after it recovers",
      });
    });
    upstream.end(body);
  });
  req.on("aborted", () => {
    refused = true;
    chunks.length = 0;
  });
}

const app = next({ dev, hostname });
const handle = app.getRequestHandler();
await app.prepare();

const server = createServer((req, res) => {
  if (!hostAllowed(req)) {
    return jsonResponse(res, 400, {
      error: "untrusted_host",
      detail: "the requested host is not configured for this deployment",
    });
  }
  const path = (req.url ?? "/").split("?", 1)[0];
  if (path.startsWith("/api/") || ["/healthz", "/readyz"].includes(path)) {
    return proxy(req, res);
  }
  return handle(req, res);
});

// Bound slow clients as well as upstream model/resource calls. WebSockets are
// explicitly taken out of the timeout path after their handshake.
server.headersTimeout = 15_000;
server.requestTimeout = Math.max(15_000, proxyTimeoutMs + 5_000);
server.keepAliveTimeout = 5_000;

const sockets = new Set();
server.on("connection", (socket) => {
  sockets.add(socket);
  socket.on("close", () => sockets.delete(socket));
});
server.on("clientError", (_error, socket) => {
  if (socket.writable) socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
});

server.on("upgrade", (req, socket, head) => {
  const path = (req.url ?? "").split("?", 1)[0];
  if (!hostAllowed(req)) {
    socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
    return;
  }
  if (offline || !path.startsWith("/ws/")) {
    socket.destroy();
    return;
  }
  const headers = {
    ...forwardedHeaders(req),
    connection: "Upgrade",
    upgrade: req.headers.upgrade ?? "websocket",
  };
  const proxyReq = transport({
    protocol: target.protocol,
    hostname: target.hostname,
    port: targetPort,
    method: "GET",
    path: req.url,
    headers,
  });
  activeUpstreams.add(proxyReq);
  proxyReq.on("close", () => activeUpstreams.delete(proxyReq));
  proxyReq.setTimeout(proxyTimeoutMs, () => proxyReq.destroy());
  proxyReq.on("upgrade", (upReq, upSocket, upHead) => {
    proxyReq.setTimeout(0);
    const lines = ["HTTP/1.1 101 Switching Protocols"];
    for (const [name, value] of Object.entries(upReq.headers)) {
      lines.push(`${name}: ${Array.isArray(value) ? value.join(", ") : value}`);
    }
    socket.write(lines.join("\r\n") + "\r\n\r\n");
    socket.setTimeout(0);
    upSocket.setTimeout(0);
    if (head?.length) upSocket.write(head);
    if (upHead?.length) socket.write(upHead);
    upSocket.pipe(socket);
    socket.pipe(upSocket);
  });
  proxyReq.on("error", () => socket.destroy());
  proxyReq.on("response", (up) => {
    const chunks = [];
    up.on("data", (chunk) => chunks.push(chunk));
    up.on("end", () => {
      const status = up.statusCode === 101 ? 502 : up.statusCode ?? 502;
      const body = JSON.stringify({
        error: "ws_handshake_refused",
        detail: "the voice service refused the socket; sign in and reconnect",
      });
      socket.write(
        `HTTP/1.1 ${status} Bad Gateway\r\n` +
          "content-type: application/json\r\ncontent-length: " +
          Buffer.byteLength(body) +
          "\r\nconnection: close\r\n\r\n" +
          body,
      );
      socket.destroy();
    });
  });
  proxyReq.end();
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) {
    for (const socket of sockets) socket.destroy();
    return;
  }
  shuttingDown = true;
  console.log(JSON.stringify({ event: "web_shutdown", signal }));
  const closed = new Promise((resolve) => server.close(resolve));
  server.closeIdleConnections?.();
  const force = setTimeout(() => {
    for (const upstream of activeUpstreams) upstream.destroy();
    for (const socket of sockets) socket.destroy();
  }, shutdownTimeoutMs);
  await closed;
  clearTimeout(force);
  await app.close().catch(() => undefined);
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

server.listen(port, hostname, () => {
  console.log(JSON.stringify({ event: "web_listen", host: hostname, port, dev }));
});
