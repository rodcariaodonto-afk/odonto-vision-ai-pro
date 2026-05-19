import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Upload, Brain, Loader2, CheckCircle, FileText,
  Activity, Download, History, Trash2, Lock,
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import {
  ALL_ANALYSES, ANALYSES_BY_ID, AnalysisType,
  getStatus, formatRange,
} from "@/types/cephalometric-analyses";
import {
  Landmark, Measurements, recalcAll,
} from "@/lib/cephalometric-math";
import AnalysisResultTabs from "@/components/cephalometry/AnalysisResultTabs";
import { CephalometricPlanningPanel } from "@/components/cephalometric-planning";
import type { AnalysisResultsMap } from "@/lib/cephalometric-planning";

interface HistoryItem {
  id: string; patient_name: string | null; patient_id: string;
  landmarks: Landmark[]; measurements: Measurements;
  interpretation: string | null; status: string; created_at: string;
  analysis_type?: AnalysisType;
  analysis_types?: AnalysisType[];
  image_storage_path: string; image_url: string;
}

interface ResultState {
  analysisId: string;
  landmarks: Landmark[];
  selectedTypes: AnalysisType[];
  results: Partial<Record<AnalysisType, { measurements: Measurements; interpretation: string }>>;
}

const DRAFT_KEY = "cephalo_draft_v2";

/** Load image and return its natural dimensions */
function getImageDimensions(src: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => {
      const i2 = new Image();
      i2.onload = () => resolve({ w: i2.naturalWidth, h: i2.naturalHeight });
      i2.onerror = () => resolve({ w: 1000, h: 1000 });
      i2.src = src;
    };
    img.src = src;
  });
}

export default function Cephalometry() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [selectedTypes, setSelectedTypes] = useState<AnalysisType[]>(["steiner"]);
  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [result, setResult] = useState<ResultState | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [savingCase, setSavingCase] = useState(false);
  const [caseSaved, setCaseSaved] = useState(false);
  const [savingLandmarks, setSavingLandmarks] = useState(false);
  const landmarkDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Estados elevados do CephalometricPlanningPanel para incluir no PDF
  const [planningContext, setPlanningContext] = useState<Record<string, unknown>>({});
  const [planningSuggestion, setPlanningSuggestion] = useState<Record<string, unknown> | null>(null);

  // ── Nova análise: limpa tudo incluindo draft ─────────────────────────────
  const handleNewAnalysis = () => {
    sessionStorage.removeItem(DRAFT_KEY);
    setSelectedTypes(["steiner"]);
    setPatientId("");
    setPatientName("");
    setSelectedFile(null);
    setImagePreview("");
    setResult(null);
    setSavingCase(false);
    setCaseSaved(false);
  };

  // ── Gate de assinatura: Cefalometria exige plano de 50 exames ou superior ──
  const [accessChecked, setAccessChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const ADMIN_EMAILS = ["rodcaria.odonto@gmail.com", "servmaisdigital@gmail.com"];

  useEffect(() => {
    (async () => {
      if (!user?.id) return;
      // Admins têm acesso irrestrito
      if (user.email && ADMIN_EMAILS.includes(user.email)) {
        setHasAccess(true);
        setAccessChecked(true);
        return;
      }
      try {
        const { data } = await supabase
          .from("user_subscriptions")
          .select("analyses_limit, status")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const limit = data?.analyses_limit ?? 0;
        setHasAccess(limit >= 50);
      } catch {
        setHasAccess(false);
      } finally {
        setAccessChecked(true);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Per-analysis canvases for PDF export
  const canvasMap = useRef<Map<AnalysisType, HTMLCanvasElement>>(new Map());

  // ── Restore draft from sessionStorage on mount ─────────────────────
  useEffect(() => {
    // Sempre inicia em branco — usuario pediu para nao voltar ao ultimo caso
    try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
    loadHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persist draft on changes ───────────────────────────────────────
  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
        patientId, patientName, selectedTypes, imagePreview, result,
      }));
    } catch {}
  }, [patientId, patientName, selectedTypes, imagePreview, result]);

  async function loadHistory() {
    if (!user?.id) return;
    setLoadingHistory(true);
    try {
      const { data } = await supabase
        .from("cephalometric_analyses").select("id, patient_name, patient_id, landmarks, measurements, interpretation, status, created_at, analysis_type, image_storage_path, image_url")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
      if (data) setHistory(data as unknown as HistoryItem[]);
    } catch {} finally { setLoadingHistory(false); }
  }

  function toggleType(t: AnalysisType) {
    setSelectedTypes((cur) => {
      if (cur.includes(t)) {
        const next = cur.filter((x) => x !== t);
        return next.length ? next : cur; // keep at least 1
      }
      return [...cur, t];
    });
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Imagem maior que 10MB"); return; }
    setSelectedFile(file);
    setResult(null); setCaseSaved(false);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleAnalyze() {
    if (!selectedFile || !patientId.trim()) {
      toast.error("Selecione uma imagem e informe o ID do paciente");
      return;
    }
    if (!selectedTypes.length) { toast.error("Selecione ao menos uma análise"); return; }
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
          analysisTypes: selectedTypes,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      // Backend returns NORMALIZED landmarks (0-1). Scale them to pixels of the
      // uploaded image so the viewer (which assumes image-space coords) draws
      // them correctly.
      const dims = await getImageDimensions(imagePreview);
      const scaledLandmarks: Landmark[] = (data.landmarks ?? []).map((l: Landmark) => ({
        ...l,
        x: l.x <= 1.0001 ? l.x * dims.w : l.x,
        y: l.y <= 1.0001 ? l.y * dims.h : l.y,
      }));
      setResult({
        analysisId: data.analysisId,
        landmarks: scaledLandmarks,
        selectedTypes: (data.analysisTypes ?? selectedTypes) as AnalysisType[],
        results: data.results ?? {},
      });
      toast.success(`Análise concluída em ${selectedTypes.length} método(s)!`);
      loadHistory();
    } catch (err: any) {
      toast.error("Erro: " + (err?.message ?? "falha na análise"));
    } finally { setLoading(false); }
  }

  // Recalculate measurements when user drags landmarks + persist com debounce
  const handleLandmarksChange = useCallback((lm: Landmark[]) => {
    setResult((cur) => {
      if (!cur) return cur;
      const recalc = recalcAll(lm, cur.selectedTypes);
      const merged: ResultState["results"] = {};
      cur.selectedTypes.forEach((t) => {
        merged[t] = {
          measurements: recalc[t] ?? {},
          interpretation: cur.results[t]?.interpretation ?? "",
        };
      });

      // Debounce: salva landmarks corrigidos 1.5s apos parar de arrastar
      if (landmarkDebounceRef.current) clearTimeout(landmarkDebounceRef.current);
      landmarkDebounceRef.current = setTimeout(async () => {
        if (!cur.analysisId) return;
        setSavingLandmarks(true);
        try {
          const recalcFinal = recalcAll(lm, cur.selectedTypes);
          const measurementsFinal: Record<string, number | undefined> = {};
          cur.selectedTypes.forEach((t) => {
            Object.assign(measurementsFinal, recalcFinal[t] ?? {});
          });
          await supabase
            .from("cephalometric_analyses")
            .update({
              landmarks: lm as any,
              measurements: measurementsFinal as any,
              updated_at: new Date().toISOString(),
            } as any)
            .eq("id", cur.analysisId);
        } catch (err) {
          console.warn("Erro ao salvar landmarks:", err);
        } finally {
          setSavingLandmarks(false);
        }
      }, 1500);

      return { ...cur, landmarks: lm, results: merged };
    });
  }, []);

  const registerCanvas = useCallback((t: AnalysisType, c: HTMLCanvasElement | null) => {
    if (c) canvasMap.current.set(t, c);
    else canvasMap.current.delete(t);
  }, []);

  async function handleSaveToCases() {
    if (!result || !user) return;
    setSavingCase(true);
    try {
      const analyses = result.selectedTypes.map((t) => {
        const def = ANALYSES_BY_ID[t]; const r = result.results[t];
        const measurementsList = def.measures.map((m) => {
          const v = r?.measurements[m.key];
          if (v === undefined || v === null) return `${m.name}: —`;
          const s = getStatus(m, v);
          const status = s === "normal" ? "Normal" : s === "high" ? "Aumentado" : "Reduzido";
          return `${m.name}: ${v}${m.unit} (ref: ${formatRange(m)}) — ${status}`;
        });
        return {
          analysis_type: t,
          analysis_name: def.name,
          measurements: measurementsList,
          interpretation: r?.interpretation ?? "",
        };
      });
      const names = result.selectedTypes.map((t) => ANALYSES_BY_ID[t].name).join(" + ");
      const caseName = `${patientName.trim() || patientId.trim()} - Cefalometria (${names})`;
      // Montar checklist clínico com apenas campos preenchidos
      const checklistFilled: Record<string, unknown> = {};
      Object.entries(planningContext).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "" && v !== false) {
          checklistFilled[k] = v;
        }
      });

      const { error } = await supabase.from("cases").insert({
        user_id: user.id, name: caseName,
        exam_type: "cefalometria",
        file_name: selectedFile?.name ?? null,
        file_type: selectedFile?.type ?? "image/jpeg",
        status: "completed",
        analysis: {
          identificacao_paciente: {
            nome: patientName.trim() || patientId.trim(),
            data_analise: new Date().toLocaleDateString("pt-BR"),
          },
          tipo_exame: `Telerradiografia / Cefalometria (${names})`,
          analyses,
          analysis_types: result.selectedTypes,
          // Checklist clínico A009 (apenas campos preenchidos)
          checklist_clinico: Object.keys(checklistFilled).length > 0 ? checklistFilled : null,
          // Planejamento gerado pela IA (se existir)
          planejamento_ortodontico: planningSuggestion ? {
            summary: (planningSuggestion as Record<string, unknown>).summary,
            prioritized_problems: (planningSuggestion as Record<string, unknown>).prioritizedProblems,
            therapeutic_objectives: (planningSuggestion as Record<string, unknown>).therapeuticObjectives,
            treatment_alternatives: (planningSuggestion as Record<string, unknown>).treatmentAlternatives,
            alerts: (planningSuggestion as Record<string, unknown>).alertsAndLimitations,
            final_text: (planningSuggestion as Record<string, unknown>).approvedFinalText
              || (planningSuggestion as Record<string, unknown>).clinicianEditedText
              || (planningSuggestion as Record<string, unknown>).aiOriginalText,
            status: (planningSuggestion as Record<string, unknown>).status,
            confidence: (planningSuggestion as Record<string, unknown>).confidenceLevel,
          } : null,
        },
      } as any);
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

      result.selectedTypes.forEach((t, idx) => {
        if (idx > 0) doc.addPage();
        const def = ANALYSES_BY_ID[t]; const r = result.results[t];
        let y = 15;

        // header
        doc.setFillColor(13, 43, 78);
        doc.rect(0, 0, pageW, 25, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16); doc.setFont("helvetica", "bold");
        doc.text("LAUDO CEFALOMÉTRICO", pageW / 2, 12, { align: "center" });
        doc.setFontSize(9); doc.setFont("helvetica", "normal");
        doc.text(`OdontoVision AI Pro · ${def.name} (${def.year})`, pageW / 2, 19, { align: "center" });
        doc.setTextColor(0, 0, 0); y = 35;

        doc.setFontSize(11); doc.setFont("helvetica", "bold");
        doc.text("Identificação do Paciente", 15, y); y += 6;
        doc.setFont("helvetica", "normal"); doc.setFontSize(10);
        doc.text(`Nome: ${patientName.trim() || "—"}`, 15, y); y += 5;
        doc.text(`ID: ${patientId.trim()}`, 15, y); y += 5;
        doc.text(`Data da análise: ${new Date().toLocaleDateString("pt-BR")}`, 15, y); y += 8;

        if (y > 220) { doc.addPage(); y = 15; }
        doc.setFontSize(11); doc.setFont("helvetica", "bold");
        doc.text(`Medidas — ${def.name}`, 15, y); y += 6;
        doc.setFontSize(9); doc.setFont("helvetica", "bold");
        doc.text("Medida", 15, y); doc.text("Valor", 80, y);
        doc.text("Referência", 115, y); doc.text("Status", 165, y);
        y += 2; doc.line(15, y, pageW - 15, y); y += 5;
        doc.setFont("helvetica", "normal");
        def.measures.forEach((m) => {
          const v = r?.measurements[m.key];
          if (v === undefined || v === null) return;
          if (y > 275) { doc.addPage(); y = 15; }
          const s = getStatus(m, v);
          const status = s === "normal" ? "Normal" : s === "high" ? "Aumentado" : "Reduzido";
          doc.text(m.name, 15, y);
          doc.text(`${v}${m.unit}`, 80, y);
          doc.text(formatRange(m), 115, y);
          if (s === "normal") doc.setTextColor(34, 139, 34);
          else if (s === "high") doc.setTextColor(200, 0, 0);
          else doc.setTextColor(200, 130, 0);
          doc.text(status, 165, y);
          doc.setTextColor(0, 0, 0);
          y += 6;
        });
        y += 4;

        if (r?.interpretation) {
          if (y > 240) { doc.addPage(); y = 15; }
          doc.setFontSize(11); doc.setFont("helvetica", "bold");
          doc.text("Interpretação Clínica (IA)", 15, y); y += 6;
          doc.setFontSize(10); doc.setFont("helvetica", "normal");
          const lines = doc.splitTextToSize(r.interpretation, pageW - 30);
          doc.text(lines, 15, y); y += lines.length * 5 + 6;
        }

        doc.setFontSize(8); doc.setTextColor(100, 100, 100);
        const disc = "Análise gerada por IA. Ferramenta de apoio ao raciocínio clínico — diagnóstico final é responsabilidade do cirurgião-dentista.";
        const dlines = doc.splitTextToSize(disc, pageW - 30);
        doc.text(dlines, 15, 285);
      });

      // ── Página: Checklist Clínico A009 ──────────────────────────────────
      const ctx = planningContext as Record<string, unknown>;
      const hasCtx = Object.keys(ctx).some(k => ctx[k] !== undefined && ctx[k] !== "");
      if (hasCtx) {
        doc.addPage();
        let yc = 15;
        doc.setFillColor(13, 43, 78);
        doc.rect(0, 0, doc.internal.pageSize.getWidth(), 25, "F");
        doc.setTextColor(255,255,255);
        doc.setFontSize(16); doc.setFont("helvetica","bold");
        doc.text("CHECKLIST CLÍNICO", doc.internal.pageSize.getWidth()/2, 12, { align: "center" });
        doc.setFontSize(9); doc.setFont("helvetica","normal");
        doc.text("Formulário Clínico — OdontoVision AI Pro", doc.internal.pageSize.getWidth()/2, 19, { align: "center" });
        doc.setTextColor(0,0,0); yc = 35;

        const labelMap: Record<string, string> = {
          patientAge: "Idade", patientSex: "Sexo",
          padraoFacial: "Padrão Facial", indiceVert: "Índice de Vert",
          assimetriaFacial: "Assimetria Facial", linhaDeSorriso: "Linha de Sorriso",
          vedamentoLabial: "Vedamento Labial Passivo", corredorBucalAumentado: "Corredor Bucal Aumentado",
          classeDentariaDireita: "Classe Dentária Direita", classeDentariaEsquerda: "Classe Dentária Esquerda",
          linhaMedia: "Linha Média", mordida: "Mordida Vertical", giroversoes: "Giroversões",
          classeEsqueletica: "Classe Esquelética", diagnosticoEsqueletico: "Diagnóstico Esquelético",
          apinhamentoSuperiorAnterior: "Apinhamento Sup. Anterior", apinhamentoSuperiorPosterior: "Apinhamento Sup. Posterior",
          apinhamentoInferiorAnterior: "Apinhamento Inf. Anterior", apinhamentoInferiorPosterior: "Apinhamento Inf. Posterior",
          reabsorcaoRadicular: "Reabsorção Radicular", necessidadeExodontia: "Necessidade de Exodontia",
          faseTratamento: "Fase do Tratamento", queixaPrincipal: "Queixa Principal",
        };

        doc.setFontSize(11); doc.setFont("helvetica","bold");
        doc.text("Dados Clínicos Preenchidos pelo Dentista", 15, yc); yc += 8;
        doc.setFont("helvetica","normal"); doc.setFontSize(10);

        Object.entries(labelMap).forEach(([key, label]) => {
          const v = ctx[key];
          if (v === undefined || v === null || v === "" || v === false) return;
          if (yc > 270) { doc.addPage(); yc = 15; }
          const val = typeof v === "boolean" ? "Sim" : String(v).replace(/_/g, " ");
          doc.setFont("helvetica","bold"); doc.text(`${label}:`, 15, yc);
          doc.setFont("helvetica","normal"); doc.text(val, 80, yc); yc += 6;
        });
      }

      // ── Página: Planejamento Gerado pela IA ─────────────────────────────
      if (planningSuggestion) {
        const ps = planningSuggestion as Record<string, unknown>;
        doc.addPage();
        let yp = 15;
        const pw = doc.internal.pageSize.getWidth();
        doc.setFillColor(13, 43, 78);
        doc.rect(0, 0, pw, 25, "F");
        doc.setTextColor(255,255,255);
        doc.setFontSize(16); doc.setFont("helvetica","bold");
        doc.text("PLANEJAMENTO ORTODÔNTICO", pw/2, 12, { align: "center" });
        doc.setFontSize(9); doc.setFont("helvetica","normal");
        doc.text("Sugestão de Apoio à Decisão Clínica — OdontoVision AI Pro", pw/2, 19, { align: "center" });
        doc.setTextColor(0,0,0); yp = 35;

        const addSection = (title: string, text: string | string[]) => {
          if (yp > 250) { doc.addPage(); yp = 15; }
          doc.setFontSize(11); doc.setFont("helvetica","bold");
          doc.text(title, 15, yp); yp += 6;
          doc.setFont("helvetica","normal"); doc.setFontSize(10);
          const items = Array.isArray(text) ? text : [text];
          items.forEach(line => {
            if (!line) return;
            if (yp > 270) { doc.addPage(); yp = 15; }
            const lines = doc.splitTextToSize(`• ${line}`, pw - 35);
            doc.text(lines, 20, yp); yp += lines.length * 5 + 2;
          });
          yp += 4;
        };

        if (ps.summary) addSection("Resumo Diagnóstico", String(ps.summary));
        if (Array.isArray(ps.prioritizedProblems) && ps.prioritizedProblems.length) addSection("Problemas Priorizados", ps.prioritizedProblems as string[]);
        if (Array.isArray(ps.therapeuticObjectives) && ps.therapeuticObjectives.length) addSection("Objetivos Terapêuticos", ps.therapeuticObjectives as string[]);
        if (Array.isArray(ps.treatmentAlternatives) && ps.treatmentAlternatives.length) addSection("Alternativas de Tratamento", ps.treatmentAlternatives as string[]);
        if (Array.isArray(ps.alertsAndLimitations) && ps.alertsAndLimitations.length) addSection("Alertas e Limitações", ps.alertsAndLimitations as string[]);

        const finalText = (ps.approvedFinalText || ps.clinicianEditedText || ps.aiOriginalText) as string | undefined;
        if (finalText) addSection("Texto Final do Plano", finalText);

        if (yp > 270) { doc.addPage(); yp = 15; }
        doc.setFontSize(8); doc.setTextColor(100,100,100);
        const disclaimer = "AVISO: Esta sugestão é gerada por IA como apoio à decisão clínica. NÃO substitui o julgamento profissional. Requer validação por dentista habilitado.";
        const dls = doc.splitTextToSize(disclaimer, pw - 30);
        doc.text(dls, 15, yp);
      }

      const fileName = `cefalometria-${(patientName.trim() || patientId.trim()).replace(/\s+/g, "_")}-${Date.now()}.pdf`;
      doc.save(fileName);
      toast.success("PDF exportado!");
    } catch (err: any) {
      toast.error("Erro ao gerar PDF: " + err.message);
    }
  }

  async function handleReopen(item: HistoryItem) {
    try {
      // Suporta múltiplos tipos (análises modernas) e tipo único (legado)
      const types: AnalysisType[] = (() => {
        if (Array.isArray(item.analysis_types) && item.analysis_types.length > 0) {
          return item.analysis_types;
        }
        return [(item.analysis_type ?? "steiner") as AnalysisType];
      })();

      // URL pública da imagem no Storage
      const { data: urlData } = supabase.storage
        .from("cephalometric-images").getPublicUrl(item.image_storage_path);
      const url = urlData.publicUrl;

      // Recalcular TODOS os tipos a partir dos landmarks salvos
      const landmarks = item.landmarks ?? [];
      const recalc = recalcAll(landmarks, types);

      // Montar results para cada tipo
      const results: ResultState["results"] = {};
      types.forEach((t) => {
        results[t] = {
          measurements: recalc[t] ?? (types.length === 1 ? (item.measurements as Measurements) ?? {} : {}),
          interpretation: types.length === 1 ? (item.interpretation ?? "") : "",
        };
      });

      setSelectedTypes(types);
      setPatientId(item.patient_id);
      setPatientName(item.patient_name ?? "");
      setImagePreview(url);
      setCaseSaved(false);
      setResult({
        analysisId: item.id,
        landmarks,
        selectedTypes: types,
        results,
      });
      toast.success(`Análise restaurada (${types.length} método(s))`);
    } catch (err: any) {
      toast.error("Erro ao reabrir: " + err.message);
    }
  }

  async function handleDelete(item: HistoryItem) {
    if (!confirm("Excluir esta análise do histórico?")) return;
    try {
      const { error } = await supabase.from("cephalometric_analyses").delete().eq("id", item.id);
      if (error) throw error;
      toast.success("Excluída");
      loadHistory();
    } catch (err: any) {
      toast.error("Erro ao excluir: " + err.message);
    }
  }

  // ── Bloqueio: requer plano de 50 exames ou superior ────────────────
  if (accessChecked && !hasAccess) {
    return (
      <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="w-7 h-7 text-primary" />
            Análise Cefalométrica
          </h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="w-5 h-5 text-primary" />
              Recurso exclusivo para planos a partir de 50 exames
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              A <strong>Análise Cefalométrica</strong> está disponível apenas para assinantes
              dos planos <strong>50 Exames</strong>, <strong>100 Exames</strong>,{" "}
              <strong>200 Exames</strong> ou <strong>Clínica</strong>.
            </p>
            <p className="text-sm text-muted-foreground">
              Faça upgrade do seu plano para liberar Steiner, Jarabak, McNamara, Ricketts, Tweed e Downs.
            </p>
            <div className="flex gap-3 pt-2">
              <Button onClick={() => navigate("/plans")} className="flex-1">
                Ver Planos
              </Button>
              <Button variant="outline" onClick={() => navigate("/dashboard")} className="flex-1">
                Voltar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!accessChecked) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Activity className="w-8 h-8 text-primary" />
            Análise Cefalométrica
          </h1>
          <p className="text-muted-foreground mt-1">
            Steiner · Jarabak · McNamara · Ricketts · Tweed · Downs
          </p>
        </div>
        {result && (
          <Button variant="outline" size="sm" onClick={handleNewAnalysis} className="gap-2 shrink-0">
            <Trash2 className="w-4 h-4" />
            Nova Análise
          </Button>
        )}
      </div>

      <Tabs defaultValue="new">
        <TabsList className="grid grid-cols-2 w-full max-w-sm">
          <TabsTrigger value="new">Nova Análise</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="mt-6 space-y-6">
          {/* Multi-select analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Brain className="w-4 h-4 text-primary" />
                1. Selecione uma ou mais análises
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {ALL_ANALYSES.map((a) => {
                  const active = selectedTypes.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggleType(a.id)}
                      className={`text-left p-3 rounded-lg border transition-all min-h-[100px] relative ${
                        active
                          ? "border-primary bg-primary/10 ring-2 ring-primary/30 shadow-md"
                          : "border-border hover:border-primary/40 hover:bg-muted/40"
                      }`}
                    >
                      <div className="absolute top-2 right-2">
                        <Checkbox checked={active} onCheckedChange={() => toggleType(a.id)} />
                      </div>
                      <div className="flex items-center gap-2 pr-6">
                        <span className="font-bold text-sm">{a.name}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{a.year}</Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{a.author}</div>
                      <div className="text-xs mt-1.5 leading-snug">{a.shortDescription}</div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                {selectedTypes.length} análise(s) selecionada(s) · Os landmarks são detectados uma vez e reutilizados.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Upload className="w-4 h-4 text-primary" />
                2. Dados do Paciente e Imagem
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pid">ID do Paciente *</Label>
                  <Input id="pid" value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="Ex: PAC-001" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pname">Nome do Paciente</Label>
                  <Input id="pname" value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Nome completo" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="img">Telerradiografia (máx 10MB) *</Label>
                <Input id="img" type="file" accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileSelect} className="cursor-pointer" />
              </div>
              {imagePreview && !result && (
                <div className="rounded-lg overflow-hidden border">
                  <img src={imagePreview} alt="Preview" className="w-full max-h-64 object-contain bg-black" />
                </div>
              )}
              <Button className="w-full" onClick={handleAnalyze}
                disabled={loading || !selectedFile || !patientId.trim() || !selectedTypes.length}>
                {loading
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Detectando landmarks com IA...</>
                  : <><Brain className="w-4 h-4 mr-2" />Analisar com {selectedTypes.length} análise(s)</>}
              </Button>
              {loading && (
                <p className="text-center text-xs text-muted-foreground">
                  Detectando 19 pontos cefalométricos via Lovable AI · Calculando medidas…
                </p>
              )}
            </CardContent>
          </Card>

          {result && imagePreview && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base flex-wrap gap-2">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Resultados
                    {savingLandmarks && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />salvando pontos…
                      </span>
                    )}
                  </span>
                  <div className="flex gap-2 flex-wrap justify-end">
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
                    <Button size="sm" onClick={() => document.getElementById("planning-panel")?.scrollIntoView({ behavior: "smooth" })}>
                      <Brain className="w-4 h-4 mr-2" />Avançar para Planejamento
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AnalysisResultTabs
                  imageSrc={imagePreview}
                  landmarks={result.landmarks}
                  onLandmarksChange={handleLandmarksChange}
                  results={result.results}
                  selectedTypes={result.selectedTypes}
                  registerCanvas={registerCanvas}
                />
              </CardContent>
            </Card>
          )}

          {/* Sugestão de Planeamento Clínico (apoio à decisão) */}
          {result?.analysisId && (
            <div id="planning-panel">
            <CephalometricPlanningPanel
              cephalometricAnalysisId={result.analysisId}
              results={result.results as AnalysisResultsMap}
              patientName={patientName || undefined}
              patientId={patientId || undefined}
              onContextChange={(ctx) => setPlanningContext(ctx as Record<string, unknown>)}
              onSuggestionChange={(s) => setPlanningSuggestion(s as unknown as Record<string, unknown> | null)}
            />
            </div>
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
                <div className="space-y-2">
                  {history.map((a) => {
                    const aType = (a.analysis_type ?? "steiner") as AnalysisType;
                    const def = ANALYSES_BY_ID[aType];
                    return (
                      <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary/40 hover:bg-muted/30 transition-colors">
                        <button
                          type="button"
                          onClick={() => handleReopen(a)}
                          className="flex-1 min-w-0 text-left"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm truncate">
                              {a.patient_name || "Paciente"} — {a.patient_id}
                            </p>
                            <Badge variant="outline" className="text-[10px]">{def?.name ?? aType}</Badge>
                            <Badge className={
                              a.status === "completed" ? "bg-green-100 text-green-700 text-[10px]" :
                              a.status === "failed"    ? "bg-red-100 text-red-700 text-[10px]" :
                              "bg-amber-100 text-amber-700 text-[10px]"
                            }>
                              {a.status === "completed" ? "Concluída" : a.status === "failed" ? "Falhou" : a.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(a.created_at).toLocaleDateString("pt-BR", {
                              day: "2-digit", month: "2-digit", year: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </p>
                        </button>
                        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDelete(a); }} title="Excluir">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
