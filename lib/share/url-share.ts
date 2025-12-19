import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";

const SHARE_PARAM = "d";
// URL length limit for safety (most browsers support ~2000, we use ~8000 for modern browsers)
const MAX_URL_LENGTH = 8000;

export interface ShareResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface DecodeResult {
  success: boolean;
  data?: string;
  error?: string;
}

/**
 * Encodes JSON content into a shareable URL
 */
export function encodeShareUrl(content: string): ShareResult {
  if (!content.trim()) {
    return { success: false, error: "No content to share" };
  }

  try {
    const compressed = compressToEncodedURIComponent(content);
    const url = `${window.location.origin}${window.location.pathname}#${SHARE_PARAM}=${compressed}`;

    if (url.length > MAX_URL_LENGTH) {
      return {
        success: false,
        error: `JSON too large to share via URL (${Math.round(url.length / 1000)}KB). Maximum is ~${Math.round(MAX_URL_LENGTH / 1000)}KB compressed.`,
      };
    }

    return { success: true, url };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to encode content",
    };
  }
}

/**
 * Decodes JSON content from a URL hash
 */
export function decodeShareUrl(hash: string): DecodeResult {
  if (!hash || hash.length < 2) {
    return { success: false };
  }

  // Remove leading #
  const hashContent = hash.startsWith("#") ? hash.slice(1) : hash;

  // Parse the hash as query params
  const params = new URLSearchParams(hashContent);
  const encoded = params.get(SHARE_PARAM);

  if (!encoded) {
    return { success: false };
  }

  try {
    const decoded = decompressFromEncodedURIComponent(encoded);
    if (!decoded) {
      return { success: false, error: "Failed to decompress data" };
    }
    return { success: true, data: decoded };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to decode content",
    };
  }
}

/**
 * Checks if the current URL has shared data
 */
export function hasSharedData(): boolean {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash;
  return hash.includes(`${SHARE_PARAM}=`);
}

/**
 * Clears the share data from the URL (without page reload)
 */
export function clearShareUrl(): void {
  if (typeof window === "undefined") return;
  // Use replaceState to update URL without adding to history
  window.history.replaceState(null, "", window.location.pathname);
}
