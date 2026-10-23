/**
 * Resolve the public Adapt web address without coupling Genlink to Adapt's
 * internals. Adapt is a separate UI and process in this preparation round.
 *
 * Local default: both apps are opened on the same hostname and Adapt's host
 * command listens on port 3000. A deployment can set VITE_ADAPT_URL to a
 * complete HTTPS origin instead.
 */
const DEFAULT_ADAPT_PORT = "3000";

function configuredAdaptOrigin(): string | null {
  const value = import.meta.env.VITE_ADAPT_URL?.trim();
  return value ? value : null;
}

/**
 * Arena exposes a process as a port-prefixed hostname, for example
 * `https://8080-sandbox.e2b.app`, rather than as `https://sandbox.e2b.app:8080`.
 * Setting `url.port` in that environment produces the invalid
 * `https://8080-sandbox.e2b.app:3000`. Replace the prefix instead. On a local
 * or LAN URL the normal port replacement remains the right thing to do.
 */
function isPreviewHostname(hostname: string): boolean {
  return /^(?:\d+)-.+\.(?:e2b\.app|e2b\.dev)$/i.test(hostname);
}

function withAdaptPort(url: URL, adaptPort: string): URL {
  if (isPreviewHostname(url.hostname)) {
    url.hostname = url.hostname.replace(/^\d+-/, `${adaptPort}-`);
    url.port = "";
  } else {
    url.port = adaptPort;
  }
  return url;
}

export function getAdaptUrl(path = "/"): string {
  const configured = configuredAdaptOrigin();
  if (configured) {
    try {
      return new URL(path, configured.endsWith("/") ? configured : `${configured}/`).toString();
    } catch {
      // Fall back to the same-host development address if a local env file has
      // a typo. The link remains usable instead of crashing the Genlink shell.
    }
  }

  if (typeof window === "undefined") return path;

  const url = new URL(window.location.href);
  const adaptPort = import.meta.env.VITE_ADAPT_PORT?.trim() || DEFAULT_ADAPT_PORT;
  withAdaptPort(url, adaptPort);
  url.pathname = path;
  url.search = "";
  url.hash = "";
  return url.toString();
}

/** Genlink's Adapt entry opens the consent-first, three-game demo. */
export const ADAPT_ENTRY_PATH = "/demo";
export const ADAPT_ENGINE_NAME = "Try ADAPT demo";
