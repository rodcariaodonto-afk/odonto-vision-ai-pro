import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Upload, Brain, Loader2, CheckCircle, FileText, Activity, Ruler, Download, History } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import {
  ALL_ANALYSES, ANALYSES_BY_ID, AnalysisType,
  CephalometricAnalysisDefinition, getStatus, formatRange,
} from "@/types/cephalometric-analyses";

interface Landmark { x: number; y: number; name: string; confidence: number; }
type Measurements = Record<string, number>;
interface Analysis {
  id: string; patient_name: string; patient_id: string;
  landmarks: Landmark[]; measurements: Measurements;
  interpretation: string; status: string; created_at: string;
  analysis_type?: AnalysisType;
}

export default function Cephalometry() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisType>("steiner");
  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [result, setResult] = useState<{
    landmarks: Landmark[]; measurements: Measurements;
    interpretation: string; analysisId: string; usedFallback?: boolean;
    analysisType: AnalysisType;
  } | null>(null);
  const [history, setHistory] = useState<Analysis[]>([]);
  const [savingCase, setSavingCase] = useState(false);
  const [caseSaved, setCaseSaved] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const currentAnalysis: CephalometricAnalysisDefinition = ANALYSES_BY_ID[selectedAnalysis];

  useEffect(() => { loadHistory(); }, []);
  useEffect(() => { if (result && imagePreview) drawAnalysisOverlay(); }, [result, imagePreview]);

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const { data } = await supabase
        .from("cephalometric_analyses").select("*")
        .eq("user_id", user?.id).order("created_at", { ascending: false }).limit(20);
      if (data) setHistory(data as unknown as Analysis[]);
    } catch {} finally { setLoadingHistory(false); }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Imagem maior que 10MB"); return; }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleAnalyze() {
    if (!selectedFile || !patientId.trim()) {
      toast.error("Selecione uma imagem e informe o ID do paciente");
      return;
    }
    setLoading(true); setResult(null); setCaseSaved(false);
    try {
      const fileName = `${user!.id}/${Date.now()}-${selectedFile.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("cephalometric-images").upload(fileName, selectedFile);
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage
        .from("cephalometric-images").getPublicUrl(fileName);
      const { data, error } = await supabase.functions.invoke("analyze-cephalometry", {
        body: {
          imageUrl: urlData.publicUrl, imageStoragePath: fileName,
          userId: user!.id, patientId: patientId.trim(),
          patientName: patientName.trim() || undefined,
        },
      });
      if (error) throw error;
      setResult({
        landmarks: data.landmarks, measurements: data.measurements,
        interpretation: data.interpretation, analysisId: data.analysisId,
        usedFallback: data.usedFallback,
      });
      toast.success("Análise cefalométrica concluída!");
      loadHistory();
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally { setLoading(false); }
  }

  async function handleSaveToCases() {
    if (!result || !user) return;
    setSavingCase(true);
    try {
      const measurementsList = Object.entries(result.measurements).map(
        ([k, v]) => {
          const ref = REFERENCES[k];
          const s = getStatus(k, v as number);
          const status = s === "normal" ? "Normal" : s === "high" ? "Aumentado" : "Reduzido";
          return `${k}: ${v}${ref?.unit ?? "°"} (ref: ${ref?.value ?? "-"}) — ${status}`;
        }
      );
      const caseName = `${patientName.trim() || patientId.trim()} - Cefalometria`;
      const { error } = await supabase.from("cases").insert({
        user_id: user.id,
        name: caseName,
        exam_type: "cefalometria",
        file_name: selectedFile?.name ?? null,
        file_type: selectedFile?.type ?? "image/jpeg",
        status: "completed",
        analysis: {
          identificacao_paciente: {
            nome: patientName.trim() || patientId.trim(),
            data_analise: new Date().toLocaleDateString("pt-BR"),
          },
          tipo_exame: "Telerradiografia / Cefalometria",
          achados_radiograficos: measurementsList,
          interpretacao_clinica: result.interpretation,
          recomendacoes_clinicas: [
            "Validação clínica obrigatória pelo cirurgião-dentista responsável.",
          ],
        },
      });
      if (error) throw error;
      setCaseSaved(true);
      toast.success("Caso salvo em Meus Casos!");
    } catch (err: any) {
      toast.error("Erro ao salvar caso: " + err.message);
    } finally {
      setSavingCase(false);
    }
  }

  function handleExportPDF() {
    if (!result) return;
    try {
      const doc = new jsPDF();
      const pageW = doc.internal.pageSize.getWidth();
      let y = 15;

      // Header
      doc.setFillColor(13, 43, 78);
      doc.rect(0, 0, pageW, 25, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16); doc.setFont("helvetica", "bold");
      doc.text("LAUDO CEFALOMÉTRICO", pageW / 2, 12, { align: "center" });
      doc.setFontSize(9); doc.setFont("helvetica", "normal");
      doc.text("OdontoVision AI Pro · Steiner · McNamara · Ricketts", pageW / 2, 19, { align: "center" });

      doc.setTextColor(0, 0, 0);
      y = 35;

      // Patient
      doc.setFontSize(11); doc.setFont("helvetica", "bold");
      doc.text("Identificação do Paciente", 15, y); y += 6;
      doc.setFont("helvetica", "normal"); doc.setFontSize(10);
      doc.text(`Nome: ${patientName.trim() || "—"}`, 15, y); y += 5;
      doc.text(`ID: ${patientId.trim()}`, 15, y); y += 5;
      doc.text(`Data da análise: ${new Date().toLocaleDateString("pt-BR")}`, 15, y); y += 10;

      // Image
      if (canvasRef.current) {
        try {
          const img = canvasRef.current.toDataURL("image/jpeg", 0.85);
          const imgW = 110; const imgH = (canvasRef.current.height * imgW) / canvasRef.current.width;
          doc.addImage(img, "JPEG", (pageW - imgW) / 2, y, imgW, imgH);
          y += imgH + 8;
        } catch {}
      }

      // Measurements
      if (y > 220) { doc.addPage(); y = 15; }
      doc.setFontSize(11); doc.setFont("helvetica", "bold");
      doc.text("Medidas Cefalométricas", 15, y); y += 6;
      doc.setFontSize(9); doc.setFont("helvetica", "bold");
      doc.text("Medida", 15, y);
      doc.text("Valor", 80, y);
      doc.text("Referência", 115, y);
      doc.text("Status", 165, y);
      y += 2; doc.line(15, y, pageW - 15, y); y += 5;
      doc.setFont("helvetica", "normal");
      Object.entries(result.measurements).forEach(([k, v]) => {
        if (y > 275) { doc.addPage(); y = 15; }
        const ref = REFERENCES[k];
        const s = getStatus(k, v as number);
        const status = s === "normal" ? "Normal" : s === "high" ? "Aumentado" : "Reduzido";
        doc.text(k, 15, y);
        doc.text(`${v}${ref?.unit ?? "°"}`, 80, y);
        doc.text(ref?.value ?? "-", 115, y);
        if (s === "normal") doc.setTextColor(34, 139, 34);
        else if (s === "high") doc.setTextColor(200, 0, 0);
        else doc.setTextColor(200, 130, 0);
        doc.text(status, 165, y);
        doc.setTextColor(0, 0, 0);
        y += 6;
      });
      y += 4;

      // Interpretation
      if (result.interpretation) {
        if (y > 240) { doc.addPage(); y = 15; }
        doc.setFontSize(11); doc.setFont("helvetica", "bold");
        doc.text("Interpretação Clínica (IA)", 15, y); y += 6;
        doc.setFontSize(10); doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(result.interpretation, pageW - 30);
        doc.text(lines, 15, y); y += lines.length * 5 + 6;
      }

      // Disclaimer
      if (y > 260) { doc.addPage(); y = 15; }
      doc.setFontSize(8); doc.setTextColor(100, 100, 100);
      const disc = "Análise gerada por inteligência artificial. Ferramenta de apoio ao raciocínio clínico — o diagnóstico final e o plano de tratamento são de responsabilidade exclusiva do cirurgião-dentista.";
      const dlines = doc.splitTextToSize(disc, pageW - 30);
      doc.text(dlines, 15, 285);

      const fileName = `cefalometria-${(patientName.trim() || patientId.trim()).replace(/\s+/g, "_")}-${Date.now()}.pdf`;
      doc.save(fileName);
      toast.success("PDF exportado!");
    } catch (err: any) {
      toast.error("Erro ao gerar PDF: " + err.message);
    }
  }

  function drawLandmarks() {
    if (!canvasRef.current || !imagePreview || !result) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 580 / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      result.landmarks.forEach((lm, idx) => {
        const x = lm.x * scale, y = lm.y * scale;
        ctx.beginPath(); ctx.arc(x, y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = lm.confidence > 0.8 ? "#22C55E" : "#F59E0B";
        ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = "#fff"; ctx.font = "bold 9px Arial"; ctx.textAlign = "center";
        ctx.fillText((idx + 1).toString(), x, y + 3);
        if (["Sella turcica","Nasion","Subspinale (Point A)","Supramentale (Point B)","Gonion"].includes(lm.name)) {
          ctx.fillStyle = "rgba(0,0,0,0.75)"; ctx.font = "8px Arial"; ctx.textAlign = "left";
          ctx.fillText(lm.name.split(" ")[0], x + 8, y - 2);
        }
      });
    };
    img.src = imagePreview;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Activity className="w-8 h-8 text-primary" />
            Análise Cefalométrica
          </h1>
          <p className="text-muted-foreground mt-1">
            Detecção de 19 landmarks · Steiner · McNamara · Ricketts
          </p>
        </div>
      </div>

      <Tabs defaultValue="new">
        <TabsList className="grid grid-cols-2 w-full max-w-sm">
          <TabsTrigger value="new">Nova Análise</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Upload className="w-4 h-4 text-primary" />
                  Dados do Paciente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pid">ID do Paciente *</Label>
                  <Input id="pid" value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="Ex: PAC-001" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pname">Nome do Paciente</Label>
                  <Input id="pname" value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Nome completo" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="img">Telerradiografia (máx 10MB) *</Label>
                  <Input id="img" type="file" accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleFileSelect} className="cursor-pointer" />
                  <p className="text-xs text-muted-foreground">JPEG ou PNG — radiografia cefalométrica lateral</p>
                </div>
                {imagePreview && !result && (
                  <div className="rounded-lg overflow-hidden border">
                    <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-contain bg-black" />
                  </div>
                )}
                <Button className="w-full" onClick={handleAnalyze}
                  disabled={loading || !selectedFile || !patientId.trim()}>
                  {loading
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analisando landmarks...</>
                    : <><Brain className="w-4 h-4 mr-2" />Analisar com HRNet</>}
                </Button>
                {loading && (
                  <div className="text-center space-y-1">
                    <p className="text-sm text-muted-foreground">Detectando 19 pontos cefalométricos...</p>
                    <p className="text-xs text-muted-foreground">Calculando Steiner · McNamara · Ricketts</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {result && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Landmarks ({result.landmarks.length})
                    </span>
                    {result.usedFallback && <Badge variant="secondary" className="text-xs">Demo</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <canvas ref={canvasRef} className="w-full rounded-lg border bg-black" style={{ maxHeight: "350px" }} />
                  <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />Alta confiança
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />Média confiança
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-primary" />Medidas Cefalométricas
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleSaveToCases} disabled={savingCase || caseSaved}>
                      {savingCase
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>
                        : caseSaved
                          ? <><CheckCircle className="w-4 h-4 mr-2 text-green-600" />Salvo</>
                          : <><FileText className="w-4 h-4 mr-2" />Salvar Caso</>}
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleExportPDF}>
                      <Download className="w-4 h-4 mr-2" />Exportar PDF
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Medida</th>
                        <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Valor</th>
                        <th className="text-center py-2 px-3 font-semibold text-muted-foreground">Referência</th>
                        <th className="text-center py-2 px-3 font-semibold text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(result.measurements).map(([key, val]) => {
                        const ref = REFERENCES[key];
                        const s = getStatus(key, val as number);
                        return (
                          <tr key={key} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="py-2 px-3 font-medium">{key}</td>
                            <td className="py-2 px-3 text-right font-bold">{val}{ref?.unit ?? "°"}</td>
                            <td className="py-2 px-3 text-center text-muted-foreground text-xs">{ref?.value ?? "-"}</td>
                            <td className="py-2 px-3 text-center">
                              {s === "normal" && <Badge className="bg-green-100 text-green-700 text-xs">Normal</Badge>}
                              {s === "high"   && <Badge className="bg-red-100 text-red-700 text-xs">Aumentado</Badge>}
                              {s === "low"    && <Badge className="bg-amber-100 text-amber-700 text-xs">Reduzido</Badge>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {result?.interpretation && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="w-4 h-4 text-primary" />Interpretação Clínica (IA)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{result.interpretation}</p>
                <p className="text-xs text-muted-foreground mt-3 border-t pt-3">
                  Análise gerada por IA. Ferramenta de apoio ao raciocínio clínico — deve ser validada pelo cirurgião-dentista responsável.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="w-4 h-4 text-primary" />Análises Realizadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : history.length === 0 ? (
                <p className="text-center text-muted-foreground py-10">Nenhuma análise realizada ainda.</p>
              ) : (
                <div className="divide-y">
                  {history.map((a) => (
                    <div key={a.id} className="py-3 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{a.patient_name || "Paciente"} — {a.patient_id}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(a.created_at).toLocaleDateString("pt-BR", {
                            day: "2-digit", month: "2-digit", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <Badge className={
                        a.status === "completed" ? "bg-green-100 text-green-700" :
                        a.status === "failed"    ? "bg-red-100 text-red-700" :
                        "bg-amber-100 text-amber-700"
                      }>
                        {a.status === "completed" ? "Concluída" : a.status}
                      </Badge>
                      {a.status === "completed" && (
                        <div className="text-xs text-right text-muted-foreground hidden sm:block">
                          <div>SNA {(a.measurements as any)?.SNA}°</div>
                          <div>ANB {(a.measurements as any)?.ANB}°</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
