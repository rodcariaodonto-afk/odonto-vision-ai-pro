/**
 * Cephalometric Intraoral Photos — Helper de exportação para PDF
 *
 * Busca as fotos de uma análise e converte para base64, pronto para
 * jsPDF.addImage. Como o bucket é privado, usa signed URL → fetch → base64.
 *
 * Robustez: se uma foto falhar (URL expirada, rede), ela é PULADA — nunca
 * derruba a geração do PDF inteiro.
 */

import type { IntraoralCategory } from "./types";
import { categoryLabel } from "./types";
import { listPhotosByAnalysis, getSignedUrl } from "./storage";

export interface PhotoForPdf {
  category: IntraoralCategory;
  categoryLabel: string;
  dataUrl: string;
  format: "JPEG" | "PNG" | "WEBP";
}

function fmtFromMime(mime: string | null): "JPEG" | "PNG" | "WEBP" {
  const m = (mime || "").toLowerCase();
  if (m.includes("png")) return "PNG";
  if (m.includes("webp")) return "WEBP";
  return "JPEG";
}

async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function fetchPhotosForPdf(analysisId: string): Promise<PhotoForPdf[]> {
  const rows = await listPhotosByAnalysis(analysisId);
  if (rows.length === 0) return [];

  const out: PhotoForPdf[] = [];
  for (const row of rows) {
    const signed = await getSignedUrl(row.storage_path);
    if (!signed) continue;
    const dataUrl = await urlToDataUrl(signed);
    if (!dataUrl) continue;
    out.push({
      category: row.category,
      categoryLabel: categoryLabel(row.category),
      dataUrl,
      format: fmtFromMime(row.mime_type),
    });
  }
  return out;
}
