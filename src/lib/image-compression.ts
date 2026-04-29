/**
 * Compress / downscale an image for upload to AI vision endpoints.
 * Works in all browsers (Safari iOS, Chrome, Firefox, Edge) using canvas.
 * Returns a base64 data URL.
 *
 * - Skips compression if file is already small (<1.5MB) and dimensions are reasonable.
 * - Downscales to maxDim on the longest side to keep payload tractable on mobile.
 * - Re-encodes as JPEG with given quality (default 0.85).
 */
export async function compressImageForAnalysis(
  source: File | string,
  opts: { maxDim?: number; quality?: number; maxBytes?: number } = {}
): Promise<{ base64: string; mimeType: string }> {
  const { maxDim = 2048, quality = 0.85, maxBytes = 6_000_000 } = opts;

  // Build object URL from File OR use the data URL directly.
  let srcUrl: string;
  let revoke: (() => void) | null = null;
  let originalType = "image/jpeg";
  let originalSize = 0;

  if (typeof source === "string") {
    srcUrl = source;
    if (source.startsWith("data:")) {
      const m = source.match(/^data:([^;]+);base64,(.*)$/);
      if (m) {
        originalType = m[1];
        // approx bytes from base64 length
        originalSize = Math.floor((m[2].length * 3) / 4);
      }
    }
  } else {
    srcUrl = URL.createObjectURL(source);
    revoke = () => URL.revokeObjectURL(srcUrl);
    originalType = source.type || "image/jpeg";
    originalSize = source.size;
  }

  // Fast path: small file already → return as-is
  if (originalSize > 0 && originalSize < 1_500_000) {
    const dataUrl = typeof source === "string"
      ? source
      : await fileToDataUrl(source as File);
    revoke?.();
    return { base64: dataUrl, mimeType: originalType };
  }

  try {
    const img = await loadImage(srcUrl);
    const longest = Math.max(img.naturalWidth, img.naturalHeight);
    const scale = longest > maxDim ? maxDim / longest : 1;
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas não suportado neste navegador");
    // White background prevents transparent PNG → black JPEG conversion
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    // Iteratively reduce quality until under maxBytes
    let q = quality;
    let dataUrl = canvas.toDataURL("image/jpeg", q);
    let bytes = approxBytesFromDataUrl(dataUrl);
    while (bytes > maxBytes && q > 0.4) {
      q -= 0.1;
      dataUrl = canvas.toDataURL("image/jpeg", q);
      bytes = approxBytesFromDataUrl(dataUrl);
    }

    return { base64: dataUrl, mimeType: "image/jpeg" };
  } finally {
    revoke?.();
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível carregar a imagem"));
    img.src = src;
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Falha ao ler arquivo"));
    r.readAsDataURL(file);
  });
}

function approxBytesFromDataUrl(dataUrl: string): number {
  const i = dataUrl.indexOf("base64,");
  if (i === -1) return dataUrl.length;
  return Math.floor(((dataUrl.length - i - 7) * 3) / 4);
}