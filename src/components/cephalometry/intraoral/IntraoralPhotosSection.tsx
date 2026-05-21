/**
 * IntraoralPhotosSection — Documentação Clínica Complementar / Fotos Intrabucais
 *
 * Componente autocontido. Recebe analysisId + userId e resolve tudo:
 * upload imediato (persiste ao anexar), miniaturas com signed URL,
 * reclassificação de categoria, remoção. Carrega fotos existentes ao montar
 * (cobre reabertura do histórico).
 *
 * As fotos são documentação complementar. NUNCA entram no pipeline de
 * detecção de landmarks/medidas (analyze-cephalometry).
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ImagePlus, Trash2, Loader2, AlertCircle } from "lucide-react";
import {
  INTRAORAL_CATEGORIES,
  categoryLabel,
  validateImageFile,
  ACCEPT_ATTR,
  uploadIntraoralPhoto,
  listPhotosByAnalysis,
  getSignedUrls,
  deleteIntraoralPhoto,
  updatePhotoCategory,
  type IntraoralCategory,
  type IntraoralPhoto,
} from "@/lib/cephalometric-intraoral";

interface Props {
  analysisId: string;
  userId: string;
}

export default function IntraoralPhotosSection({ analysisId, userId }: Props) {
  const [photos, setPhotos] = useState<IntraoralPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingCount, setUploadingCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Carrega fotos existentes ao montar (reabertura do histórico)
  const loadPhotos = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listPhotosByAnalysis(analysisId);
      const urls = await getSignedUrls(rows.map((r) => r.storage_path));
      setPhotos(rows.map((r) => ({ ...r, signedUrl: urls[r.storage_path] ?? null })));
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao carregar fotos");
    } finally {
      setLoading(false);
    }
  }, [analysisId]);

  useEffect(() => {
    if (analysisId) loadPhotos();
  }, [analysisId, loadPhotos]);

  // Upload imediato ao selecionar arquivos
  async function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);

    // valida tudo antes de subir; rejeita inválidos com mensagem
    const valid: File[] = [];
    for (const f of list) {
      const v = validateImageFile(f);
      if (!v.valid) {
        toast.error(`${f.name}: ${v.error}`);
      } else {
        valid.push(f);
      }
    }
    if (valid.length === 0) return;

    setUploadingCount((n) => n + valid.length);
    for (const file of valid) {
      try {
        const row = await uploadIntraoralPhoto({
          file,
          userId,
          analysisId,
          category: "complementar", // categoria padrão; usuário reclassifica
        });
        const urls = await getSignedUrls([row.storage_path]);
        setPhotos((prev) => [
          ...prev,
          { ...row, signedUrl: urls[row.storage_path] ?? null },
        ]);
      } catch (e: any) {
        toast.error(`${file.name}: ${e?.message ?? "falha no upload"}`);
      } finally {
        setUploadingCount((n) => Math.max(0, n - 1));
      }
    }
    // limpa o input para permitir re-selecionar o mesmo arquivo
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleCategoryChange(id: string, category: IntraoralCategory) {
    const prev = photos;
    // otimista
    setPhotos((p) => p.map((ph) => (ph.id === id ? { ...ph, category } : ph)));
    try {
      await updatePhotoCategory({ id, category });
    } catch (e: any) {
      setPhotos(prev); // rollback
      toast.error(e?.message ?? "Falha ao atualizar categoria");
    }
  }

  async function handleDelete(photo: IntraoralPhoto) {
    const prev = photos;
    setPhotos((p) => p.filter((ph) => ph.id !== photo.id)); // otimista
    try {
      await deleteIntraoralPhoto({ id: photo.id, storagePath: photo.storage_path });
      toast.success("Foto removida");
    } catch (e: any) {
      setPhotos(prev); // rollback
      toast.error(e?.message ?? "Falha ao remover foto");
    }
  }

  // Agrupa por categoria, na ordem canônica
  const grouped = INTRAORAL_CATEGORIES.map((cat) => ({
    ...cat,
    items: photos.filter((p) => p.category === cat.value),
  })).filter((g) => g.items.length > 0);

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base">Documentação Clínica Complementar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-medium">Fotos Intrabucais</p>
              <p className="text-xs text-muted-foreground max-w-prose mt-0.5">
                Fotos clínicas intrabucais utilizadas na documentação ortodôntica.
                Essas imagens apoiam a avaliação complementar, o planejamento e a
                geração da sugestão de tratamento. A telerradiografia cefalométrica
                permanece o exame principal da análise de pontos e medidas.
              </p>
            </div>
            <div className="shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT_ATTR}
                multiple
                className="hidden"
                onChange={(e) => handleFilesSelected(e.target.files)}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingCount > 0}
              >
                {uploadingCount > 0 ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Enviando ({uploadingCount})
                  </>
                ) : (
                  <>
                    <ImagePlus className="h-4 w-4 mr-1.5" />
                    Adicionar fotos
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando fotos…
          </div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 text-center text-sm text-muted-foreground border border-dashed rounded-lg py-8">
            <AlertCircle className="h-5 w-5 opacity-60" />
            <span>Nenhuma foto intrabucal anexada.</span>
            <span className="text-xs">JPG, JPEG, PNG ou WEBP · até 10 MB cada</span>
          </div>
        ) : (
          <div className="space-y-5">
            {grouped.map((group) => (
              <div key={group.value}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  {group.label}{" "}
                  <span className="font-normal normal-case">({group.items.length})</span>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {group.items.map((photo) => (
                    <div
                      key={photo.id}
                      className="group relative rounded-lg border overflow-hidden bg-muted/30"
                    >
                      <div className="aspect-square w-full bg-muted flex items-center justify-center overflow-hidden">
                        {photo.signedUrl ? (
                          <img
                            src={photo.signedUrl}
                            alt={photo.file_name ?? "foto intrabucal"}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-muted-foreground text-xs p-2 text-center">
                            <AlertCircle className="h-4 w-4" />
                            imagem indisponível
                          </div>
                        )}
                      </div>
                      <div className="p-2 space-y-1.5">
                        <Select
                          value={photo.category}
                          onValueChange={(v) =>
                            handleCategoryChange(photo.id, v as IntraoralCategory)
                          }
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {INTRAORAL_CATEGORIES.map((c) => (
                              <SelectItem key={c.value} value={c.value} className="text-xs">
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-full text-xs text-destructive hover:text-destructive"
                          onClick={() => handleDelete(photo)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Remover
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
