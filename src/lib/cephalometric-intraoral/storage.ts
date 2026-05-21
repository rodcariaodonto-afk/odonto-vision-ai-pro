/**
 * Cephalometric Intraoral Photos — Camada de Storage
 *
 * Bucket PRIVADO 'intraoral-photos'. Leitura só via createSignedUrl
 * (dado clínico de paciente não vai para URL pública).
 *
 * CONVENÇÃO DE PATH (acoplada à storage policy da migration):
 *   intraoral/{user_id}/{analysis_id}/{uuid}.{ext}
 *
 * A storage policy checa (storage.foldername(name))[2] = auth.uid().
 * Para o path acima, foldername retorna {intraoral, user_id, analysis_id},
 * logo [2] = user_id. NÃO alterar a posição do user_id no path sem
 * atualizar a policy correspondente na migration.
 */

import { supabase } from "@/integrations/supabase/client";
import type { IntraoralCategory, IntraoralPhotoRow } from "./types";
import { extFromMime } from "./validation";

const BUCKET = "intraoral-photos";
const SIGNED_URL_TTL_SECONDS = 3600;

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function buildStoragePath(
  userId: string,
  analysisId: string,
  mime: string,
): string {
  return `intraoral/${userId}/${analysisId}/${uuid()}.${extFromMime(mime)}`;
}

export async function uploadIntraoralPhoto(params: {
  file: File;
  userId: string;
  analysisId: string;
  category: IntraoralCategory;
}): Promise<IntraoralPhotoRow> {
  const { file, userId, analysisId, category } = params;
  const mime = (file.type || "image/jpeg").toLowerCase();
  const path = buildStoragePath(userId, analysisId, mime);

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: mime, upsert: false });
  if (upErr) throw new Error(`Falha no upload: ${upErr.message}`);

  const { data, error: insErr } = await supabase
    .from("ceph_intraoral_photos")
    .insert({
      analysis_id: analysisId,
      user_id: userId,
      category,
      storage_path: path,
      file_name: file.name,
      mime_type: mime,
      file_size: file.size,
    })
    .select()
    .single();

  if (insErr) {
    await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
    throw new Error(`Falha ao registrar foto: ${insErr.message}`);
  }

  return data as IntraoralPhotoRow;
}

export async function getSignedUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function getSignedUrls(
  storagePaths: string[],
): Promise<Record<string, string | null>> {
  const out: Record<string, string | null> = {};
  await Promise.all(
    storagePaths.map(async (p) => {
      out[p] = await getSignedUrl(p);
    }),
  );
  return out;
}

export async function deleteIntraoralPhoto(params: {
  id: string;
  storagePath: string;
}): Promise<void> {
  const { id, storagePath } = params;
  const { error: delErr } = await supabase
    .from("ceph_intraoral_photos")
    .delete()
    .eq("id", id);
  if (delErr) throw new Error(`Falha ao remover registro: ${delErr.message}`);

  await supabase.storage.from(BUCKET).remove([storagePath]).catch(() => {});
}

export async function updatePhotoCategory(params: {
  id: string;
  category: IntraoralCategory;
}): Promise<void> {
  const { id, category } = params;
  const { error } = await supabase
    .from("ceph_intraoral_photos")
    .update({ category })
    .eq("id", id);
  if (error) throw new Error(`Falha ao atualizar categoria: ${error.message}`);
}

export async function listPhotosByAnalysis(
  analysisId: string,
): Promise<IntraoralPhotoRow[]> {
  const { data, error } = await supabase
    .from("ceph_intraoral_photos")
    .select("*")
    .eq("analysis_id", analysisId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Falha ao carregar fotos: ${error.message}`);
  return (data ?? []) as IntraoralPhotoRow[];
}
