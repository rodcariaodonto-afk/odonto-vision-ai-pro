/**
 * Cephalometric Intraoral Photos — Validação client-side
 *
 * Validação de defesa em primeira linha (UX). A trava real de segurança
 * é o RLS + CHECK de mime_type na migration. Aqui é só feedback rápido.
 */

export const ACCEPTED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

export const ACCEPT_ATTR = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateImageFile(file: File): ValidationResult {
  const mime = (file.type || "").toLowerCase();

  if (!ACCEPTED_MIME_TYPES.includes(mime as (typeof ACCEPTED_MIME_TYPES)[number])) {
    return {
      valid: false,
      error: "Apenas imagens JPG, JPEG, PNG ou WEBP são aceitas.",
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const mb = (MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `Arquivo acima do limite de ${mb} MB.`,
    };
  }

  if (file.size === 0) {
    return { valid: false, error: "Arquivo vazio ou corrompido." };
  }

  return { valid: true };
}

export function extFromMime(mime: string): string {
  switch ((mime || "").toLowerCase()) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/jpeg":
    case "image/jpg":
    default:
      return "jpg";
  }
}
