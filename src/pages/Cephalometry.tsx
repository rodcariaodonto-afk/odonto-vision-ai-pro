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

interface Landmark { x: number; y: number; name: string; confidence: number; }
interface Measurements {
  SNA: number; SNB: number; ANB: number; "SN-GoGn": number;
  FMA: number; IMPA: number; "U1-NA": number; "L1-NB": number;
  Overjet: number; Overbite: number;
}
interface Analysis {
  id: string; patient_name: string; patient_id: string;
  landmarks: Landmark[]; measurements: Measurements;
  interpretation: string; status: string; created_at: string;
}

const REFERENCES: Record<string, { value: string; min: number; max: number; unit: string }> = {
  SNA:       { value: "82°",   min: 79, max: 85, unit: "°" },
  SNB:       { value: "80°",   min: 77, max: 83, unit: "°" },
  ANB:       { value: "2°",    min: 0,  max: 5,  unit: "°" },
  "SN-GoGn": { value: "32°",   min: 26, max: 38, unit: "°" },
  FMA:       { value: "25°",   min: 20, max: 30, unit: "°" },
  IMPA:      { value: "90°",   min: 85, max: 95, unit: "°" },
  "U1-NA":   { value: "22°",   min: 18, max: 26, unit: "°" },
  "L1-NB":   { value: "25°",   min: 21, max: 29, unit: "°" },
  Overjet:   { value: "2-3mm", min: 1,  max: 4,  unit: "mm" },
  Overbite:  { value: "2-3mm", min: 1,  max: 4,  unit: "mm" },
};

function getStatus(key: string, value: number): "normal" | "high" | "low" {
  const r = REFERENCES[key];
  if (!r) return "normal";
  if (value > r.max) return "high";
  if (value < r.min) return "low";
  return "normal";
}

export default function Cephalometry() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [result, setResult] = useState<{
    landmarks: Landmark[]; measurements: Measurements;
    interpretation: string; analysisId: string; usedFallback?: boolean;
  } | null>(null);
  const [history, setHistory] = useState<Analysis[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => { loadHistory(); }, []);
  useEffect(() => { if (result && imagePreview) drawLandmarks(); }, [result, imagePreview]);

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
    setLoading(true); setResult(null);
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
                  <Button size="sm" variant="outline" onClick={() => toast.info("PDF em desenvolvimento")}>
                    <Download className="w-4 h-4 mr-2" />Exportar PDF
                  </Button>
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
