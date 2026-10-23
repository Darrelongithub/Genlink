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
  url.port = import.meta.env.VITE_ADAPT_PORT?.trim() || DEFAULT_ADAPT_PORT;
  url.pathname = path;
  url.search = "";
  url.hash = "";
  return url.toString();
}

export const ADAPT_ENGINE_NAME = "ADAPT Engine";
