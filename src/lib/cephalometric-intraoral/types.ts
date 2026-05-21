/**
 * Cephalometric Intraoral Photos — Tipos do domínio
 *
 * Documentação clínica complementar à cefalometria.
 * As fotos NUNCA entram no pipeline de detecção de landmarks/medidas
 * (analyze-cephalometry). São anexos visuais de documentação ortodôntica.
 */

export type IntraoralCategory =
  | "frontal"
  | "lateral_direita"
  | "lateral_esquerda"
  | "oclusal_superior"
  | "oclusal_inferior"
  | "complementar";

export const INTRAORAL_CATEGORIES: { value: IntraoralCategory; label: string }[] = [
  { value: "frontal", label: "Frontal" },
  { value: "lateral_direita", label: "Lateral Direita" },
  { value: "lateral_esquerda", label: "Lateral Esquerda" },
  { value: "oclusal_superior", label: "Oclusal Superior" },
  { value: "oclusal_inferior", label: "Oclusal Inferior" },
  { value: "complementar", label: "Complementar" },
];

export function categoryLabel(c: IntraoralCategory): string {
  return INTRAORAL_CATEGORIES.find((x) => x.value === c)?.label ?? c;
}

export interface IntraoralPhotoRow {
  id: string;
  analysis_id: string;
  user_id: string;
  category: IntraoralCategory;
  storage_path: string;
  file_name: string | null;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
}

export interface IntraoralPhoto extends IntraoralPhotoRow {
  signedUrl: string | null;
}

export interface UploadingPhoto {
  tempId: string;
  file: File;
  category: IntraoralCategory;
  status: "uploading" | "error";
  errorMessage?: string;
  localPreview: string;
}
