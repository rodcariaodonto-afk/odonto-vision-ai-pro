import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload as UploadIcon, FileImage, FileText, X, Loader2, CheckCircle, AlertCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface AnalysisResult {
  identificacao: string;
  achados: string[];
  interpretacao: string;
  diagnosticos: string[];
  riscos: string[];
  condutas: string[];
  observacoes: string;
}

export default function Upload() {
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFile = (file: File) => {
    const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      toast.error("Formato não suportado. Use JPG, PNG ou PDF.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 20MB.");
      return;
    }
    setSelectedFile(file);
    setResult(null);

    // Create preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);

    try {
      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      const imageBase64 = await base64Promise;

      // Call the edge function
      const { data, error } = await supabase.functions.invoke("analyze-exam", {
        body: {
          imageBase64,
          imageType: selectedFile.type,
          fileName: selectedFile.name,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data.analysis);
      toast.success("Análise concluída com sucesso!");
    } catch (error) {
      console.error("Erro na análise:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao processar análise");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Enviar Exame</h1>
        <p className="text-muted-foreground mt-1">
          Faça upload do exame para análise da IA
        </p>
      </div>

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UploadIcon className="w-5 h-5 text-primary" />
            Upload de Arquivo
          </CardTitle>
          <CardDescription>
            Arraste e solte ou clique para selecionar. Suportamos radiografias, panorâmicas, tomografias e PDFs de laudos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedFile ? (
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 cursor-pointer",
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <input
                id="file-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFile(e.target.files[0]);
                }}
              />
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 rounded-full bg-muted">
                  <UploadIcon className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    Arraste o arquivo aqui ou clique para selecionar
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    JPG, PNG ou PDF (máx. 20MB)
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File Preview */}
              <div className="flex items-start gap-4 p-4 bg-muted rounded-xl">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                ) : selectedFile.type.startsWith("image/") ? (
                  <FileImage className="w-12 h-12 text-primary" />
                ) : (
                  <FileText className="w-12 h-12 text-primary" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedFile.type}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={clearFile}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {!result && (
                <Button
                  variant="hero"
                  size="lg"
                  className="w-full"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analisando com IA...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Enviar para Análise
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis Result */}
      {result && (
        <div className="space-y-4 animate-slide-up">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-success" />
            Resultado da Análise
          </h2>

          <div className="grid gap-4">
            {/* Identificação */}
            <Card className="bg-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Identificação do Exame</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground leading-relaxed">{result.identificacao}</p>
              </CardContent>
            </Card>

            {/* Achados */}
            {result.achados.length > 0 && (
              <ResultCard
                title="Achados Clínicos"
                items={result.achados}
                icon={<AlertCircle className="w-5 h-5" />}
                color="text-primary"
              />
            )}

            {/* Interpretação */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Interpretação Radiológica / Clínica
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground leading-relaxed">{result.interpretacao}</p>
              </CardContent>
            </Card>

            {/* Diagnósticos */}
            {result.diagnosticos.length > 0 && (
              <ResultCard
                title="Diagnósticos Prováveis / Diferenciais"
                items={result.diagnosticos}
                icon={<Sparkles className="w-5 h-5" />}
                color="text-success"
              />
            )}

            {/* Riscos */}
            {result.riscos.length > 0 && (
              <ResultCard
                title="Riscos ou Complicações Potenciais"
                items={result.riscos}
                icon={<AlertCircle className="w-5 h-5" />}
                color="text-destructive"
              />
            )}

            {/* Condutas */}
            {result.condutas.length > 0 && (
              <ResultCard
                title="Recomendações e Condutas Possíveis"
                items={result.condutas}
                icon={<CheckCircle className="w-5 h-5" />}
                color="text-primary"
              />
            )}

            {/* Observações */}
            <Card className="bg-muted/50 border-l-4 border-l-primary">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Observações Importantes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed italic">{result.observacoes}</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-4">
            <Button variant="success" className="flex-1">
              Salvar Caso
            </Button>
            <Button variant="outline" onClick={clearFile}>
              Nova Análise
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultCard({
  title,
  items,
  icon,
  color,
}: {
  title: string;
  items: string[];
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className={cn("text-lg flex items-center gap-2", color)}>
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li key={index} className="flex items-start gap-3">
              <span className={cn("mt-1.5 w-2 h-2 rounded-full flex-shrink-0", 
                color === "text-success" ? "bg-success" : 
                color === "text-destructive" ? "bg-destructive" : "bg-primary"
              )} />
              <span className="text-foreground">{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
