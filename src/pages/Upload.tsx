import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload as UploadIcon, FileImage, FileText, X, Loader2, CheckCircle, AlertCircle, Sparkles, Save, Download, FileCheck, User, Copy, Eye } from "lucide-react";
import { VisualAnalysis, Marcacao } from "@/components/visual-analysis";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";

type ExamCategory = "radiografia" | "tomografia" | "foto" | "laboratorial";

interface LaudoImagem {
  tipo_imagem?: string;
  achados?: string[];
  diagnosticos_diferenciais?: string[];
  riscos_alertas_imagem?: string[];
  recomendacoes_imagem?: string[];
}

interface ExameLab {
  nome: string;
  valor: string;
  referencia: string;
  status: "NORMAL" | "ALTERADO LEVE" | "ALTERADO MODERADO" | "ALTERADO GRAVE";
  relevancia_odontologica: string;
}

interface LaudoLaboratorial {
  exames?: ExameLab[];
  classificacao_cirurgica?: string;
  justificativa_classificacao?: string;
  riscos_alertas_lab?: string[];
  recomendacoes_lab?: string[];
}

interface CorrelacaoIntegrada {
  correlacoes?: string[];
  diagnostico_consolidado?: string;
  urgencia?: "ROTINA" | "PRIORITÁRIO" | "URGENTE";
  conduta_recomendada?: string;
}

interface AnalysisResult {
  identificacao_paciente: {
    nome: string;
    data_nascimento: string;
    data_analise: string;
  };
  tipo_exame: string;
  qualidade_imagem: string;
  achados_radiograficos: string[];
  interpretacao_clinica: string;
  diagnosticos_diferenciais: string[];
  riscos_alertas: string[];
  recomendacoes_clinicas: string[];
  observacoes: string;
  // Campos de análise mista — presentes quando múltiplos tipos foram enviados
  laudo_imagem?: LaudoImagem | null;
  laudo_laboratorial?: LaudoLaboratorial | null;
  correlacao_integrada?: CorrelacaoIntegrada | null;
}

interface PatientData {
  nome: string;
  dataNascimento: string;
  dataLaudo: string;
}

interface ClinicalContext {
  queixa: string;
  regiao: string;
  observacao: string;
}

interface VisualAnalysisResult {
  marcacoes: Marcacao[];
  resumo?: string;
  observacoes?: string;
  estrutura_ossea_percentual?: string;
  // Estruturas visuais (com coordenadas)
  seio_maxilar?: {
    direito?: { contorno_normalizado: Array<[number, number]> };
    esquerdo?: { contorno_normalizado: Array<[number, number]> };
  };
  canal_mandibular?: {
    direito?: Array<[number, number]>;
    esquerdo?: Array<[number, number]>;
  };
  // Achados clínicos (textuais - estrutura simplificada)
  achados_clinicos?: {
    dentes_presentes: string[];
    dentes_ausentes: string[];
    caries_suspeitas: string[];
    lesoes_suspeitas: string[];
    implantes: string[];
    restauracoes: string[];
    tratamentos_endodonticos: string[];
    observacoes: string;
  };
  // Avaliações
  avaliacao_periodontal?: {
    perda_ossea: string;
    comentarios: string;
  };
  avaliacao_ortodontica?: {
    alinhamento: string;
    observacoes: string;
  };
  resumo_para_paciente?: string[];
}

const EXAM_CATEGORIES: { id: ExamCategory; label: string; description: string; icon: string }[] = [
  { id: "radiografia", label: "Radiografia", description: "Periapical, panorâmica, bitewing", icon: "🦷" },
  { id: "tomografia", label: "Tomografia", description: "CBCT, tomografia computadorizada", icon: "📡" },
  { id: "foto", label: "Foto Clínica", description: "Intraoral, extraoral, documentação", icon: "📷" },
  { id: "laboratorial", label: "Exames Laboratoriais", description: "Hemograma, coagulograma, glicemia", icon: "🧪" },
];

const STORAGE_KEY = "odontovision_draft";
const RESULT_STORAGE_KEY = "odontovision_analysis_result";

// Helper to format today's date as DD/MM/AAAA
const getTodayFormatted = (): string => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `${day}/${month}/${year}`;
};

// Helper to capitalize each word in a name
const capitalizeFullName = (name: string): string => {
  return name
    .toLowerCase()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// Load draft from localStorage
const loadDraft = (): PatientData | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Erro ao carregar rascunho:", e);
  }
  return null;
};

// Save draft to localStorage
const saveDraft = (data: PatientData): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Erro ao salvar rascunho:", e);
  }
};

// Clear draft from localStorage
const clearDraft = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(RESULT_STORAGE_KEY); // agora usa localStorage
  } catch (e) {
    console.error("Erro ao limpar rascunho:", e);
  }
};

// Save analysis result to localStorage
const saveAnalysisResult = (
  result: AnalysisResult,
  rawContent: string | null,
  patientData: PatientData,
  examCategories: ExamCategory[],
  visualAnalysis?: VisualAnalysisResult | null,
  previewUrls?: string[]
): void => {
  try {
    // previewUrls podem ser grandes (base64) — truncar para evitar quota
    const safeUrls = (previewUrls || []).map(u =>
      u && u.length > 200_000 ? u.substring(0, 200_000) : u
    );
    localStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify({
      result,
      rawContent,
      patientData,
      examCategories,
      visualAnalysis: visualAnalysis || null,
      previewUrls: safeUrls,
      savedAt: Date.now(),
    }));
  } catch (e) {
    // Se quota exceder, salvar sem previewUrls
    try {
      localStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify({
        result, rawContent, patientData, examCategories,
        visualAnalysis: visualAnalysis || null,
        previewUrls: [],
        savedAt: Date.now(),
      }));
    } catch {
      console.error("Erro ao salvar resultado:", e);
    }
  }
};

// Load analysis result from localStorage
const loadAnalysisResult = (): {
  result: AnalysisResult;
  rawContent: string | null;
  patientData: PatientData;
  examCategories: ExamCategory[];
  visualAnalysis: VisualAnalysisResult | null;
  previewUrls: string[];
} | null => {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(RESULT_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object' && parsed.result) {
        const age = Date.now() - (parsed.savedAt || 0);
        if (age > 24 * 60 * 60 * 1000) {
          localStorage.removeItem(RESULT_STORAGE_KEY);
          return null;
        }
        // Compatibilidade retroativa: examCategory (string) → examCategories (array)
        const cats: ExamCategory[] = parsed.examCategories ||
          (parsed.examCategory ? [parsed.examCategory] : []);
        return {
          result: parsed.result,
          rawContent: parsed.rawContent || null,
          patientData: parsed.patientData || { nome: "", dataNascimento: "", dataLaudo: "" },
          examCategories: cats,
          visualAnalysis: parsed.visualAnalysis || null,
          previewUrls: parsed.previewUrls || [],
        };
      }
    }
  } catch (e) {
    console.error("Erro ao carregar resultado:", e);
    try { localStorage.removeItem(RESULT_STORAGE_KEY); } catch {}
  }
  return null;
};

// Load draft from localStorage (safe version)
const loadDraftSafe = (): PatientData | null => {
  if (typeof window === 'undefined') return null;
  return loadDraft();
};

export default function Upload() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [rawContent, setRawContent] = useState<string | null>(null);
  const [examCategories, setExamCategories] = useState<ExamCategory[]>([]);
  
  // Patient data state - use defaults initially
  const [patientData, setPatientData] = useState<PatientData>({
    nome: "",
    dataNascimento: "",
    dataLaudo: getTodayFormatted(),
  });

  // Clinical context state
  const [clinicalContext, setClinicalContext] = useState<ClinicalContext>({
    queixa: "",
    regiao: "",
    observacao: "",
  });

  // Visual analysis states
  const [isAnalyzingVisual, setIsAnalyzingVisual] = useState(false);
  const [visualAnalysisResult, setVisualAnalysisResult] = useState<VisualAnalysisResult | null>(null);
  const [showVisualAnalysis, setShowVisualAnalysis] = useState(false);

  // Estados do revisor (Solução 3)
  const [reviewerFlags, setReviewerFlags] = useState<string[]>([]);
  const [reviewScore, setReviewScore] = useState<number | null>(null);
  const [showReviewerPanel, setShowReviewerPanel] = useState(false);

  // Estados do feedback/correção (Solução 2)
  const [feedbackMode, setFeedbackMode] = useState(false);
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [feedbackField, setFeedbackField] = useState<string | null>(null);
  const [feedbackValue, setFeedbackValue] = useState("");
  const [feedbackType, setFeedbackType] = useState<"correction" | "addition" | "removal">("correction");
  const [savedCaseId, setSavedCaseId] = useState<string | null>(null);

  // Load saved data on mount (client-side only)
  useEffect(() => {
    const savedResult = loadAnalysisResult();
    
    if (savedResult) {
      // Load exam category
      if (savedResult.examCategories?.length) {
        setExamCategories(savedResult.examCategories);
      }
      
      // Load patient data
      if (savedResult.patientData) {
        setPatientData(savedResult.patientData);
      }
      
      // Load analysis result
      if (savedResult.result) {
        setResult(savedResult.result);
        setRawContent(savedResult.rawContent);
        setReportGenerated(true);
      }
      
      // Load visual analysis
      if (savedResult.visualAnalysis) {
        setVisualAnalysisResult(savedResult.visualAnalysis);
        setShowVisualAnalysis(true);
      }
      
      // Load preview URLs
      if (savedResult.previewUrls && savedResult.previewUrls.length > 0) {
        setPreviewUrls(savedResult.previewUrls);
      }
      
      toast.info("Análise anterior restaurada");
    } else {
      // Try to load draft if no saved result
      const draft = loadDraftSafe();
      if (draft) {
        setPatientData(draft);
      }
    }
  }, []);

  // Auto-save draft when patient data changes
  useEffect(() => {
    saveDraft(patientData);
  }, [patientData]);

  // Auto-save visual analysis and preview URLs when they change
  useEffect(() => {
    if (result && examCategories.length > 0) {
      saveAnalysisResult(
        result,
        rawContent,
        patientData,
        examCategories,
        visualAnalysisResult,
        previewUrls
      );
    }
  }, [visualAnalysisResult, previewUrls]);

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

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const getExamType = (fileName: string, fileType: string): string => {
    const lowerName = fileName.toLowerCase();
    if (lowerName.includes("periapical")) return "Periapical";
    if (lowerName.includes("panoram")) return "Panorâmica";
    if (lowerName.includes("bitewing")) return "Bitewing";
    if (lowerName.includes("tomo")) return "Tomografia";
    if (fileType === "application/pdf") return "PDF/Laudo";
    return "Radiografia";
  };

  const handleFiles = (files: File[]) => {
    const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    const maxFiles = 10;
    
    // Filter valid files
    const validFiles = files.filter(file => {
      if (!validTypes.includes(file.type)) {
        toast.error(`${file.name}: Formato não suportado. Use JPG, PNG ou PDF.`);
        return false;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name}: Arquivo muito grande. Máximo 20MB.`);
        return false;
      }
      return true;
    });

    // Check total files limit
    const totalFiles = selectedFiles.length + validFiles.length;
    if (totalFiles > maxFiles) {
      toast.error(`Máximo de ${maxFiles} arquivos permitido.`);
      const availableSlots = maxFiles - selectedFiles.length;
      validFiles.splice(availableSlots);
    }

    if (validFiles.length === 0) return;

    // Add to existing files
    setSelectedFiles(prev => [...prev, ...validFiles]);
    setResult(null);
    setRawContent(null);

    // Create previews for images
    validFiles.forEach(file => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrls(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      } else {
        setPreviewUrls(prev => [...prev, "pdf"]);
      }
    });

    // Scroll to submit button on Android after a brief delay
    setTimeout(() => {
      const submitBtn = document.getElementById("submit-analysis-btn");
      if (submitBtn) {
        submitBtn.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 300);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const validatePatientData = (): boolean => {
    if (!patientData.nome.trim()) {
      toast.error("Por favor, informe o nome do paciente.");
      return false;
    }
    if (!patientData.dataNascimento) {
      toast.error("Por favor, informe a data de nascimento do paciente.");
      return false;
    }
    if (!patientData.dataLaudo) {
      toast.error("Por favor, informe a data do laudo.");
      return false;
    }
    return true;
  };

  const handleAnalyze = async () => {
    if (selectedFiles.length === 0) return;
    if (examCategories.length === 0) {
      toast.error("Por favor, selecione pelo menos um tipo de exame.");
      return;
    }
    if (!validatePatientData()) return;

    setIsAnalyzing(true);

    try {
      // Convert all files to base64
      const imagesData = await Promise.all(
        selectedFiles.map(async (file) => {
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          return {
            imageBase64: await base64Promise,
            imageType: file.type,
            fileName: file.name,
          };
        })
      );

      const formattedName = capitalizeFullName(patientData.nome);

      // Categoria primária = primeira selecionada; lista completa para o prompt
      const primaryCategory = examCategories[0];
      const isMixed = examCategories.length > 1;
      const categoriesLabel = examCategories
        .map(c => EXAM_CATEGORIES.find(x => x.id === c)?.label || c)
        .join(" + ");

      toast.info(`Analisando ${imagesData.length} arquivo(s) [${categoriesLabel}]... Aguarde.`);

      const { data, error } = await supabase.functions.invoke("analyze-exam", {
        body: {
          images: imagesData,
          examCategory: primaryCategory,
          examCategories,           // array completo para o prompt
          isMixedAnalysis: isMixed, // flag de análise mista
          patientData: {
            nome: formattedName,
            dataNascimento: patientData.dataNascimento,
            dataLaudo: patientData.dataLaudo,
          },
          clinicalContext: {
            queixa: clinicalContext.queixa || undefined,
            regiao: clinicalContext.regiao || undefined,
            observacao: clinicalContext.observacao || undefined,
          },
        },
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);

      setResult(data.analysis);
      setRawContent(data.rawContent);

      // Solução 3: capturar dados do revisor
      if (data.reviewerFlags?.length > 0) {
        setReviewerFlags(data.reviewerFlags);
        setShowReviewerPanel(true);
      }
      if (data.reviewScore !== null && data.reviewScore !== undefined) {
        setReviewScore(data.reviewScore);
      }

      saveAnalysisResult(data.analysis, data.rawContent, {
        nome: formattedName,
        dataNascimento: patientData.dataNascimento,
        dataLaudo: patientData.dataLaudo,
      }, examCategories, null, previewUrls);

      // Toast com score do revisor se disponível
      if (data.reviewScore !== null && data.reviewScore !== undefined) {
        const scoreEmoji = data.reviewScore >= 90 ? "✅" : data.reviewScore >= 70 ? "⚠️" : "🔴";
        toast.success(`Análise concluída! ${scoreEmoji} Score do revisor: ${data.reviewScore}/100`);
      } else {
        toast.success("Análise concluída com sucesso!");
      }
    } catch (error) {
      console.error("Erro na análise:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao processar análise");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!result) return;
    
    setIsGeneratingReport(true);
    
    // Simulate brief processing for UX
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setReportGenerated(true);
    setIsGeneratingReport(false);
    toast.success("Laudo gerado com sucesso!");
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return "";
    // If already in DD/MM/YYYY format, return as is
    if (dateStr.includes("/")) return dateStr;
    // If in YYYY-MM-DD format, convert
    const [year, month, day] = dateStr.split("-");
    if (year && month && day) {
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  };

  const handleDownloadPDF = async () => {
    if (!result) return;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const PW = doc.internal.pageSize.getWidth();   // 210mm
    const PH = doc.internal.pageSize.getHeight();  // 297mm
    const ML = 16;
    const MR = 16;
    const TW = PW - ML - MR;
    const BOTTOM_LIMIT = 268; // reserva espaço para footer (14mm)
    const HEADER_H = 28;

    // ── Paleta ────────────────────────────────────────────────────────────────
    const C = {
      blue:    [26, 86, 219]  as [number,number,number],
      dark:    [17, 24, 39]   as [number,number,number],
      gray:    [107,114,128]  as [number,number,number],
      light:   [241,245,255]  as [number,number,number],
      line:    [226,232,240]  as [number,number,number],
      white:   [255,255,255]  as [number,number,number],
      green:   [22, 163, 74]  as [number,number,number],
      yellow:  [202,138,  4]  as [number,number,number],
      orange:  [234, 88, 12]  as [number,number,number],
      red:     [185, 28, 28]  as [number,number,number],
      redLight:[254,242,242]  as [number,number,number],
    };

    let y = 0;

    // ── cleanText: preserva acentos, remove só lixo ─────────────────────────
    const clean = (text: string): string => {
      if (!text) return "";
      return text
        // Remove caracteres de controle e lixo unicode específico
        .replace(/[&þØÜËðÿ\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
        // Remove emojis compostos e flags
        .replace(/[\u{1F600}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, "")
        // Remove notas internas do revisor (todas as variações)
        .replace(/^\s*[\-–]?\s*REVISOR\s*:.*$/gim, "")
        .replace(/NOTA DO REVISOR\s*:.*?(\n|$)/gi, "")
        .replace(/^\s*REVISOR\s*:.*$/gim, "")
        // Substitui bullet unicode por hífen limpo
        .replace(/[•·⦁◆▪▸►]/g, "-")
        // Remove emojis de status
        .replace(/⚠️|✅|🔴|🟡|⚡|ℹ️|📋|🔍|❓/g, "")
        // μ (U+03BC) e µ (U+00B5) — ambos os micro-símbolos → u
        .replace(/[\u03BC\u00B5]/g, "u")
        // Múltiplos espaços
        .replace(/  +/g, " ")
        .trim();
    };

    // ── Helpers de texto ──────────────────────────────────────────────────────
    const txt = (
      text: string, x: number, w: number, size: number,
      weight: "normal"|"bold"|"italic" = "normal",
      color: [number,number,number] = C.dark
    ): void => {
      const t = clean(text);
      if (!t) return;
      doc.setFont("helvetica", weight);
      doc.setFontSize(size);
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(t, w);
      const lh = size * 0.41;
      lines.forEach((l: string) => {
        if (y > BOTTOM_LIMIT) { newPage(); }
        doc.text(l, x, y);
        y += lh + 0.6;
      });
    };

    const checkBreak = (h: number) => { if (y + h > BOTTOM_LIMIT) newPage(); };

    const divider = () => {
      y += 3;
      doc.setDrawColor(...C.line); doc.setLineWidth(0.25);
      doc.line(ML, y, PW - MR, y);
      y += 4;
    };

    // Seção: faixa azul clara com barra lateral + label numérico
    const section = (num: string, title: string) => {
      checkBreak(12);
      y += 3;
      doc.setFillColor(...C.light);
      doc.rect(ML, y - 4, TW, 8, "F");
      doc.setFillColor(...C.blue);
      doc.rect(ML, y - 4, 2.5, 8, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
      doc.setTextColor(...C.blue);
      doc.text(`${num}  ${title}`, ML + 6, y + 0.5);
      y += 7;
    };

    // Bullet azul
    const bullet = (text: string) => {
      const t = clean(text);
      if (!t || t.length < 3) return;
      checkBreak(7);
      doc.setFillColor(...C.blue);
      doc.rect(ML + 2, y - 2.2, 1.5, 1.5, "F");
      doc.setFont("helvetica", "normal"); doc.setFontSize(9);
      doc.setTextColor(...C.dark);
      const lines = doc.splitTextToSize(t, TW - 9);
      lines.forEach((l: string) => {
        if (y > BOTTOM_LIMIT) newPage();
        doc.text(l, ML + 6, y);
        y += 4.8;
      });
    };

    // Bullet vermelho (riscos)
    const bulletRed = (text: string) => {
      const t = clean(text);
      if (!t || t.length < 3) return;
      checkBreak(7);
      doc.setFillColor(...C.red);
      doc.rect(ML + 2, y - 2.2, 1.5, 1.5, "F");
      doc.setFont("helvetica", "normal"); doc.setFontSize(9);
      doc.setTextColor(...C.dark);
      const lines = doc.splitTextToSize(t, TW - 9);
      lines.forEach((l: string) => {
        if (y > BOTTOM_LIMIT) newPage();
        doc.text(l, ML + 6, y);
        y += 4.8;
      });
    };

    // ── Header ────────────────────────────────────────────────────────────────
    const drawHeader = () => {
      doc.setFillColor(...C.dark);
      doc.rect(0, 0, PW, HEADER_H, "F");
      // Linha azul inferior do header
      doc.setFillColor(...C.blue);
      doc.rect(0, HEADER_H, PW, 1.2, "F");

      // Logo
      if (logoBase64) {
        try { doc.addImage(logoBase64, "JPEG", ML, 4, 26, 18); } catch {}
      }

      // Textos do header — ao lado da logo
      const hx = logoBase64 ? ML + 30 : ML;
      doc.setFont("helvetica", "bold"); doc.setFontSize(12);
      doc.setTextColor(...C.white);
      doc.text("OdontoVision AI Pro", hx, 13);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
      doc.setTextColor(180, 200, 235);
      doc.text("Laudo Radiologico com Inteligencia Artificial", hx, 19);
      doc.setFontSize(7.5);
      doc.text(`Emitido em: ${patientData.dataLaudo}`, PW - MR, 13, { align: "right" });

      y = HEADER_H + 8;
    };

    // ── Footer ────────────────────────────────────────────────────────────────
    const drawFooter = (pg: number) => {
      doc.setFillColor(...C.dark);
      doc.rect(0, PH - 12, PW, 12, "F");
      doc.setFont("helvetica", "italic"); doc.setFontSize(6.5);
      doc.setTextColor(150, 165, 200);
      doc.text(
        "Este laudo foi gerado por IA e NAO substitui avaliacao clinica profissional. Responsabilidade final do dentista.",
        PW / 2, PH - 5.5, { align: "center" }
      );
      doc.setFont("helvetica", "normal"); doc.setFontSize(6.5);
      doc.setTextColor(130, 150, 190);
      doc.text(`${pg}`, PW - MR, PH - 5.5, { align: "right" });
    };

    // ── Nova página ───────────────────────────────────────────────────────────
    const newPage = () => {
      doc.addPage();
      y = 0;
      drawHeader();
      drawFooter(doc.getNumberOfPages());
    };

    // ── Carregar logo ─────────────────────────────────────────────────────────
    let logoBase64: string | null = null;
    try {
      const resp = await fetch(new URL("../assets/logo-odontovision-pro.jpeg", import.meta.url).href);
      const blob = await resp.blob();
      logoBase64 = await new Promise<string>((res) => {
        const r = new FileReader();
        r.onloadend = () => res((r.result as string).split(",")[1]);
        r.readAsDataURL(blob);
      });
    } catch {}

    // ══════════════════════════════════════════════════════════════════════════
    // PÁGINA 1
    // ══════════════════════════════════════════════════════════════════════════
    drawHeader();
    drawFooter(1);

    // ── Card Paciente ─────────────────────────────────────────────────────────
    doc.setFillColor(...C.light);
    doc.roundedRect(ML, y, TW, 22, 1.5, 1.5, "F");
    doc.setFillColor(...C.blue);
    doc.rect(ML, y, 2.5, 22, "F");

    // Label
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
    doc.setTextColor(...C.gray);
    doc.text("PACIENTE", ML + 7, y + 6);

    // Nome
    const nomeP = capitalizeFullName(result.identificacao_paciente?.nome || patientData.nome);
    doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.setTextColor(...C.dark);
    doc.text(nomeP, ML + 7, y + 13);

    // Datas em linha
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.setTextColor(...C.gray);
    const dnStr = `Nasc.: ${formatDate(result.identificacao_paciente?.data_nascimento || patientData.dataNascimento)}`;
    const daStr = `Analise: ${formatDate(result.identificacao_paciente?.data_analise || patientData.dataLaudo)}`;
    doc.text(dnStr, ML + 7, y + 19);
    doc.text(daStr, ML + 90, y + 19);

    y += 28;
    divider();

    // ── Seção 2: Tipo de Exame ────────────────────────────────────────────────
    section("2", "Tipo de Exame");
    y += 1;
    txt(result.tipo_exame || "Nao identificado", ML + 6, TW - 8, 9);
    y += 2;
    divider();

    // ── Seção 3: Qualidade ────────────────────────────────────────────────────
    const qLabel = examCategories.includes("laboratorial") && examCategories.length === 1
      ? "Qualidade do Documento" : "Qualidade da Imagem";
    section("3", qLabel);
    y += 1;
    txt(result.qualidade_imagem || "Nao avaliada", ML + 6, TW - 8, 9);
    y += 2;
    divider();

    // ── Seção 4A: Laudo Radiológico ───────────────────────────────────────────
    if (result.laudo_imagem) {
      section("4A", `Laudo Radiologico — ${clean(result.laudo_imagem.tipo_imagem || "Imagem")}`);
      y += 1;
      (result.laudo_imagem.achados || []).forEach(a => bullet(a));

      if (result.laudo_imagem.diagnosticos_diferenciais?.length) {
        y += 2;
        doc.setFont("helvetica", "bold"); doc.setFontSize(8);
        doc.setTextColor(...C.gray);
        doc.text("Diagnosticos Diferenciais:", ML + 6, y); y += 5;
        result.laudo_imagem.diagnosticos_diferenciais.forEach(d => bullet(d));
      }
      y += 2; divider();
    }

    // ── Seção 4B: Laudo Laboratorial ─────────────────────────────────────────
    if (result.laudo_laboratorial) {
      section("4B", "Laudo Laboratorial");
      y += 2;

      (result.laudo_laboratorial.exames || []).forEach(ex => {
        checkBreak(14);
        const sc: [number,number,number] =
          ex.status === "NORMAL"            ? C.green  :
          ex.status === "ALTERADO LEVE"     ? C.yellow :
          ex.status === "ALTERADO MODERADO" ? C.orange : C.red;

        // Linha de exame
        doc.setFillColor(248, 250, 255);
        doc.roundedRect(ML + 2, y - 1, TW - 4, 11, 1, 1, "F");

        doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
        doc.setTextColor(...C.dark);
        doc.text(clean(ex.nome), ML + 5, y + 4);

        doc.setFont("helvetica", "bold"); doc.setFontSize(8);
        doc.setTextColor(...sc);
        doc.text(ex.status, PW - MR - 4, y + 4, { align: "right" });

        doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
        doc.setTextColor(...C.gray);
        // μ → u para não corromper
        const valStr = `${clean(ex.valor)}   Ref: ${clean(ex.referencia)}`;
        doc.text(valStr, ML + 5, y + 9);
        y += 13;

        if (ex.status !== "NORMAL" && ex.relevancia_odontologica) {
          checkBreak(7);
          doc.setFont("helvetica", "italic"); doc.setFontSize(8);
          doc.setTextColor(...C.orange);
          const rel = doc.splitTextToSize(`  Relevancia: ${clean(ex.relevancia_odontologica)}`, TW - 10);
          rel.forEach((l: string) => { doc.text(l, ML + 5, y); y += 4.2; });
          y += 1;
        }
      });

      // Badge liberação cirúrgica
      if (result.laudo_laboratorial.classificacao_cirurgica) {
        checkBreak(12);
        y += 2;
        const cls = result.laudo_laboratorial.classificacao_cirurgica;
        const bc: [number,number,number] =
          cls === "LIBERADO"                  ? C.green  :
          cls === "LIBERADO COM RESSALVAS"    ? C.yellow :
          cls === "AGUARDAR AVALIACAO MEDICA" ? C.orange : C.red;
        doc.setFillColor(...bc);
        doc.roundedRect(ML + 20, y, TW - 40, 9, 2, 2, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(9);
        doc.setTextColor(...C.white);
        doc.text(`Liberacao Cirurgica: ${cls}`, PW / 2, y + 6, { align: "center" });
        y += 13;
      }
      divider();
    }

    // ── Achados simples (sem análise mista) ───────────────────────────────────
    if (!result.laudo_imagem && result.achados_radiograficos?.length > 0) {
      const aLabel =
        examCategories.includes("laboratorial") && examCategories.length === 1 ? "Resultados dos Exames" :
        examCategories.includes("foto") && examCategories.length === 1         ? "Achados Clinicos" :
        examCategories.length > 1 ? "Achados Integrados" : "Achados Radiograficos";
      section("4", aLabel);
      y += 1;
      result.achados_radiograficos.forEach(a => bullet(a));
      y += 2; divider();
    }

    // ── Correlação integrada ─────────────────────────────────────────────────
    if (result.correlacao_integrada) {
      section("4C", "Correlacao Clinica Integrada");
      y += 1;
      (result.correlacao_integrada.correlacoes || []).forEach(c => bullet(c));
      if (result.correlacao_integrada.diagnostico_consolidado) {
        y += 2;
        doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...C.dark);
        const dcl = doc.splitTextToSize(
          `Diagnostico consolidado: ${clean(result.correlacao_integrada.diagnostico_consolidado)}`, TW - 8
        );
        dcl.forEach((l: string) => { checkBreak(6); doc.text(l, ML + 6, y); y += 4.8; });
      }
      y += 2; divider();
    }

    // ── Seção 5: Interpretação Clínica ────────────────────────────────────────
    if (result.interpretacao_clinica) {
      section("5", "Interpretacao Clinica");
      y += 1;
      txt(result.interpretacao_clinica, ML + 6, TW - 8, 9);
      y += 2; divider();
    }

    // ── Seção 6: Diagnósticos Diferenciais ───────────────────────────────────
    if (!result.laudo_imagem && result.diagnosticos_diferenciais?.length > 0) {
      section("6", "Diagnosticos Diferenciais");
      y += 1;
      result.diagnosticos_diferenciais.forEach(d => bullet(d));
      y += 2; divider();
    }

    // ── Seção 7: Riscos ───────────────────────────────────────────────────────
    const riscos = (result.riscos_alertas || [])
      .filter(r => !r.startsWith("& þ") && !r.startsWith("Ø=") && !r.trim().startsWith("-") && r.length > 5)
      .map(r => r.replace(/^[\-\s]*REVISOR:.*$/gm, "").trim())
      .filter(r => r.length > 5 && !r.includes("nao relatados:"));

    // Adicionar riscos do laudo_imagem se existir
    const riscosImg = result.laudo_imagem?.riscos_alertas_imagem || [];
    const riscosLab = result.laudo_laboratorial?.riscos_alertas_lab || [];
    const todosRiscos = [...riscos, ...riscosImg, ...riscosLab].filter(r => clean(r).length > 5);

    if (todosRiscos.length > 0) {
      section("7", "Riscos, Alertas e Pontos de Atencao");
      y += 1;
      todosRiscos.forEach(r => bulletRed(r));
      y += 2; divider();
    }

    // ── Seção 8: Recomendações ────────────────────────────────────────────────
    const recs = [
      ...(result.recomendacoes_clinicas || []),
      ...(result.laudo_imagem?.recomendacoes_imagem || []),
      ...(result.laudo_laboratorial?.recomendacoes_lab || []),
      ...(result.correlacao_integrada?.conduta_recomendada
          ? [result.correlacao_integrada.conduta_recomendada] : []),
    ].filter(r => clean(r).length > 5);

    if (recs.length > 0) {
      section("8", "Recomendacoes Clinicas");
      y += 1;
      recs.forEach(r => bullet(r));
      y += 2; divider();
    }

    // ── Seção 9: Observações ──────────────────────────────────────────────────
    const obsLimpa = clean(result.observacoes || "")
      .replace(/NOTA DO REVISOR:.*?(\n|$)/gi, "")
      .replace(/^\s*-?\s*REVISOR:.*/gm, "")
      .trim();

    if (obsLimpa.length > 10) {
      section("9", "Observacoes");
      y += 1;
      txt(obsLimpa, ML + 6, TW - 8, 8.5, "italic", C.gray);
      y += 2; divider();
    }

    // ── Score do revisor ──────────────────────────────────────────────────────
    if (reviewScore !== null) {
      checkBreak(14);
      y += 2;
      doc.setFillColor(...C.light);
      doc.roundedRect(ML, y, TW, 10, 1.5, 1.5, "F");
      doc.setFillColor(...C.blue);
      doc.rect(ML, y, 2.5, 10, "F");
      doc.setFont("helvetica", "normal"); doc.setFontSize(8);
      doc.setTextColor(...C.gray);
      doc.text("Revisao critica pelo segundo modelo de IA:", ML + 7, y + 6.5);
      const sc: [number,number,number] = reviewScore >= 90 ? C.green : reviewScore >= 70 ? C.yellow : C.red;
      doc.setFont("helvetica", "bold"); doc.setFontSize(9);
      doc.setTextColor(...sc);
      doc.text(`${reviewScore}/100`, PW - MR - 4, y + 6.5, { align: "right" });
      y += 14;
    }

    // ── Aviso Legal ───────────────────────────────────────────────────────────
    checkBreak(42);
    y += 6;
    doc.setFillColor(...C.redLight);
    doc.setDrawColor(...C.red);
    doc.setLineWidth(0.5);
    doc.roundedRect(ML, y, TW, 36, 2, 2, "FD");
    doc.setFillColor(...C.red);
    doc.rect(ML, y, 3, 36, "F");

    doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    doc.setTextColor(...C.red);
    doc.text("AVISO LEGAL E ETICO — LEIA COM ATENCAO", ML + 7, y + 7);

    doc.setDrawColor(220, 180, 180); doc.setLineWidth(0.3);
    doc.line(ML + 5, y + 10, PW - MR - 3, y + 10);

    doc.setFont("helvetica", "bold"); doc.setFontSize(8);
    doc.setTextColor(160, 30, 30);
    doc.text("Este laudo foi gerado automaticamente por Inteligencia Artificial (OdontoVision AI Pro).", ML + 7, y + 15);

    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
    doc.setTextColor(100, 30, 30);
    const avisoTxt =
      "O laudo e uma ferramenta de APOIO ao raciocinio clinico e NAO substitui, em nenhuma hipotese, " +
      "o exame clinico presencial, o diagnostico e o julgamento profissional do cirurgiao-dentista responsavel. " +
      "Todos os achados DEVEM ser validados pelo profissional antes de qualquer conduta clinica. " +
      "A responsabilidade pelo diagnostico final e EXCLUSIVAMENTE do dentista responsavel.";
    const avisoLines = doc.splitTextToSize(avisoTxt, TW - 12);
    avisoLines.forEach((l: string, i: number) => {
      doc.text(l, ML + 7, y + 20 + i * 3.8);
    });
    y += 42;

    // ── Linha de assinatura ───────────────────────────────────────────────────
    checkBreak(20);
    y += 8;
    doc.setDrawColor(...C.line); doc.setLineWidth(0.4);
    doc.line(ML, y, ML + 72, y);
    doc.line(PW - MR - 55, y, PW - MR, y);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
    doc.setTextColor(...C.gray);
    doc.text("Assinatura do Cirurgiao-Dentista / CRO", ML, y + 4.5);
    doc.text("Data", PW - MR - 55, y + 4.5);

    // ── Atualizar footers ─────────────────────────────────────────────────────
    const total = doc.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      doc.setPage(p);
      drawFooter(p);
    }

    // ── Download ───────────────────────────────────────────────────────────────
    const nomeLimpo = patientData.nome.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30);
    doc.save(`laudo-${nomeLimpo}-${patientData.dataLaudo}.pdf`);
    toast.success("PDF gerado com sucesso!");
  };

    // ── Helpers ────────────────────────────────────────────────────────────────
    let y = 0;

    const newPage = () => {
      doc.addPage();
      y = 0;
      drawHeader();
      drawFooter(doc.getNumberOfPages());
    };

    const checkBreak = (needed: number) => {
      if (y + needed > BOTTOM_LIMIT) newPage();
    };

    // Limpa texto removendo caracteres problemáticos e emojis
    const cleanText = (text: string): string => {
      return (text || "")
        .replace(/[&þØÜËð\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
        .replace(/[\u{1F300}-\u{1FFFF}]/gu, "")  // emojis
        .replace(/⚠️|✅|🔴|🟡|⚡|ℹ️|📋|🔍|❓|✓|•/g, "-")
        .replace(/\s{2,}/g, " ")
        .trim();
    };

    // Adiciona texto com quebra automática, retorna novo Y
    const addText = (
      text: string,
      x: number,
      maxW: number,
      fontSize: number,
      style: "normal" | "bold" | "italic" = "normal",
      rR = DARK_R, rG = DARK_G, rB = DARK_B
    ): number => {
      const clean = cleanText(text);
      if (!clean) return y;
      doc.setFont("helvetica", style);
      doc.setFontSize(fontSize);
      doc.setTextColor(rR, rG, rB);
      const lines = doc.splitTextToSize(clean, maxW);
      const lineH = fontSize * 0.42;
      lines.forEach((line: string) => {
        if (y + lineH > BOTTOM_LIMIT) { newPage(); }
        doc.text(line, x, y);
        y += lineH + 0.8;
      });
      return y;
    };

    // Seção com faixa colorida no título
    const drawSection = (num: string, title: string) => {
      checkBreak(14);
      y += 4;
      // Fundo azul claro
      doc.setFillColor(235, 242, 255);
      doc.roundedRect(ML - 2, y - 5, TW + 4, 9, 1, 1, "F");
      // Barra lateral azul
      doc.setFillColor(BLUE_R, BLUE_G, BLUE_B);
      doc.rect(ML - 2, y - 5, 3, 9, "F");
      // Texto
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(BLUE_R, BLUE_G, BLUE_B);
      doc.text(`${num}  ${title}`, ML + 4, y);
      y += 6;
    };

    // Linha de divisão suave
    const divider = () => {
      doc.setDrawColor(LINE_R, LINE_G, LINE_B);
      doc.setLineWidth(0.3);
      doc.line(ML, y, PW - MR, y);
      y += 4;
    };

    // Item de lista com bullet quadrado
    const addBullet = (text: string) => {
      checkBreak(8);
      // bullet
      doc.setFillColor(BLUE_R, BLUE_G, BLUE_B);
      doc.rect(ML + 1, y - 2.5, 1.8, 1.8, "F");
      const clean = cleanText(text);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(DARK_R, DARK_G, DARK_B);
      const lines = doc.splitTextToSize(clean, TW - 8);
      lines.forEach((line: string, i: number) => {
        if (y > BOTTOM_LIMIT) newPage();
        doc.text(line, ML + 5, y);
        y += 5;
      });
    };

    // ── Header (executado em cada página) ──────────────────────────────────────
    const drawHeader = () => {
      // Fundo escuro do header
      doc.setFillColor(DARK_R, DARK_G, DARK_B);
      doc.rect(0, 0, PW, 30, "F");

      // Logo — carregada como base64
      try {
        const logoData = (logoBase64 as string);
        if (logoData) {
          doc.addImage(logoData, "JPEG", ML, 5, 32, 20);
        }
      } catch {}

      // Nome do sistema
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(255, 255, 255);
      doc.text("OdontoVision AI Pro", ML + 36, 15);

      // Subtítulo
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(160, 180, 220);
      doc.text("Laudo Radiológico com Inteligência Artificial", ML + 36, 21);

      // Data no canto direito
      doc.setFontSize(8);
      doc.setTextColor(160, 180, 220);
      doc.text(`Emitido em: ${patientData.dataLaudo}`, PW - MR, 15, { align: "right" });

      // Linha separadora azul brilhante
      doc.setFillColor(BLUE_R, BLUE_G, BLUE_B);
      doc.rect(0, 30, PW, 1.5, "F");

      y = 38;
    };

    // ── Footer ──────────────────────────────────────────────────────────────────
    const drawFooter = (pageNum: number) => {
      const totalPages = doc.getNumberOfPages();
      doc.setFillColor(DARK_R, DARK_G, DARK_B);
      doc.rect(0, PH - 14, PW, 14, "F");
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      doc.setTextColor(130, 150, 190);
      doc.text(
        "Este laudo é gerado por IA como apoio ao cirurgião-dentista e NÃO substitui avaliação clínica profissional.",
        PW / 2, PH - 8, { align: "center" }
      );
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(120, 140, 180);
      doc.text(`Página ${pageNum}`, PW - MR, PH - 8, { align: "right" });
    };

    // ── Carregar logo em base64 ─────────────────────────────────────────────────
    let logoBase64: string | null = null;
    try {
      const resp = await fetch(
        new URL("../assets/logo-odontovision-pro.jpeg", import.meta.url).href
      );
      const blob = await resp.blob();
      logoBase64 = await new Promise<string>((res) => {
        const r = new FileReader();
        r.onloadend = () => res((r.result as string).split(",")[1]);
        r.readAsDataURL(blob);
      });
    } catch {}

    // ── PÁGINA 1 ───────────────────────────────────────────────────────────────
    drawHeader();
    drawFooter(1);

    // Card de identificação do paciente
    doc.setFillColor(LIGHT_R, LIGHT_G, LIGHT_B);
    doc.roundedRect(ML - 2, y - 2, TW + 4, 24, 2, 2, "F");
    doc.setFillColor(BLUE_R, BLUE_G, BLUE_B);
    doc.rect(ML - 2, y - 2, 3, 24, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(DARK_R, DARK_G, DARK_B);
    doc.text("PACIENTE", ML + 5, y + 4);

    const nome = capitalizeFullName(result.identificacao_paciente?.nome || patientData.nome);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(DARK_R, DARK_G, DARK_B);
    doc.text(nome, ML + 5, y + 11);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(GRAY_R, GRAY_G, GRAY_B);
    const dn = `Nascimento: ${formatDate(result.identificacao_paciente?.data_nascimento || patientData.dataNascimento)}`;
    const da = `Análise: ${formatDate(result.identificacao_paciente?.data_analise || patientData.dataLaudo)}`;
    doc.text(dn, ML + 5, y + 18);
    doc.text(da, ML + 80, y + 18);

    y += 30;
    divider();

    // Tipo de exame
    drawSection("2", "Tipo de Exame");
    addText(result.tipo_exame || "Não identificado", ML + 5, TW - 5, 9.5);
    y += 2;
    divider();

    // Qualidade
    const qLabel = examCategories.includes("laboratorial") && examCategories.length === 1
      ? "Qualidade do Documento" : "Qualidade da Imagem";
    drawSection("3", qLabel);
    addText(result.qualidade_imagem || "Não avaliada", ML + 5, TW - 5, 9.5);
    y += 2;
    divider();

    // Achados (laudo misto ou simples)
    if (result.laudo_imagem) {
      drawSection("4A", `Laudo Radiológico — ${cleanText(result.laudo_imagem.tipo_imagem || "Imagem")}`);
      (result.laudo_imagem.achados || []).forEach(a => addBullet(a));
      y += 2;

      if (result.laudo_imagem.diagnosticos_diferenciais?.length) {
        y += 2;
        doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(GRAY_R, GRAY_G, GRAY_B);
        doc.text("Diagnósticos Diferenciais:", ML + 5, y); y += 5;
        result.laudo_imagem.diagnosticos_diferenciais.forEach(d => addBullet(d));
      }
      divider();
    }

    if (result.laudo_laboratorial) {
      drawSection("4B", "Laudo Laboratorial");
      const exames = result.laudo_laboratorial.exames || [];
      exames.forEach(ex => {
        checkBreak(12);
        const statusColor: [number, number, number] =
          ex.status === "NORMAL"         ? [34, 197, 94] :
          ex.status === "ALTERADO LEVE"  ? [234, 179, 8] :
          ex.status === "ALTERADO MODERADO" ? [249, 115, 22] :
          [239, 68, 68];

        doc.setFillColor(248, 250, 255);
        doc.roundedRect(ML, y, TW, 10, 1, 1, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(DARK_R, DARK_G, DARK_B);
        doc.text(cleanText(ex.nome), ML + 3, y + 4);
        doc.setFont("helvetica", "normal"); doc.setFontSize(9);
        doc.setTextColor(...statusColor);
        doc.text(ex.status, PW - MR - 3, y + 4, { align: "right" });
        doc.setTextColor(GRAY_R, GRAY_G, GRAY_B);
        doc.text(`${cleanText(ex.valor)}  (ref: ${cleanText(ex.referencia)})`, ML + 3, y + 8.5);
        y += 12;

        if (ex.status !== "NORMAL" && ex.relevancia_odontologica) {
          addText(`  Relevância: ${cleanText(ex.relevancia_odontologica)}`, ML + 5, TW - 10, 8.5, "italic", GRAY_R, GRAY_G, GRAY_B);
        }
      });

      if (result.laudo_laboratorial.classificacao_cirurgica) {
        checkBreak(14);
        y += 3;
        const cls = result.laudo_laboratorial.classificacao_cirurgica;
        const clsColor: [number, number, number] =
          cls === "LIBERADO"               ? [34, 197, 94] :
          cls === "LIBERADO COM RESSALVAS" ? [234, 179, 8] :
          cls === "AGUARDAR AVALIAÇÃO MÉDICA" ? [249, 115, 22] :
          [239, 68, 68];
        doc.setFillColor(...clsColor);
        doc.roundedRect(ML, y, TW, 10, 2, 2, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
        doc.text(`Liberação Cirúrgica: ${cls}`, PW / 2, y + 6.5, { align: "center" });
        y += 14;
      }
      divider();
    }

    // Achados radiográficos simples (quando não é misto)
    if (!result.laudo_imagem && result.achados_radiograficos?.length > 0) {
      const aLabel = examCategories.includes("laboratorial") && examCategories.length === 1
        ? "Resultados dos Exames"
        : examCategories.includes("foto") && examCategories.length === 1
          ? "Achados Clínicos"
          : examCategories.length > 1 ? "Achados Integrados" : "Achados Radiográficos";
      drawSection("4", aLabel);
      result.achados_radiograficos.forEach(a => addBullet(cleanText(a)));
      y += 2;
      divider();
    }

    // Correlação integrada
    if (result.correlacao_integrada) {
      drawSection("4C", "Correlação Clínica Integrada");
      (result.correlacao_integrada.correlacoes || []).forEach(c => addBullet(cleanText(c)));
      if (result.correlacao_integrada.diagnostico_consolidado) {
        y += 2;
        addText(`Diagnóstico consolidado: ${cleanText(result.correlacao_integrada.diagnostico_consolidado)}`, ML + 5, TW - 5, 9.5, "bold");
      }
      divider();
    }

    // Interpretação Clínica
    if (result.interpretacao_clinica) {
      drawSection("5", "Interpretação Clínica");
      addText(cleanText(result.interpretacao_clinica), ML + 5, TW - 5, 9.5);
      y += 2;
      divider();
    }

    // Diagnósticos Diferenciais
    if (!result.laudo_imagem && result.diagnosticos_diferenciais?.length > 0) {
      drawSection("6", "Diagnósticos Diferenciais");
      result.diagnosticos_diferenciais.forEach(d => addBullet(cleanText(d)));
      y += 2;
      divider();
    }

    // Riscos e Alertas — filtrar itens do revisor com chars corrompidos
    const riscosFiltrados = (result.riscos_alertas || [])
      .filter(r => !r.startsWith("& þ") && !r.startsWith("Ø=") && !r.startsWith("&") )
      .map(r => cleanText(r))
      .filter(r => r.length > 5);

    if (riscosFiltrados.length > 0) {
      drawSection("7", "Riscos, Alertas e Pontos de Atencao");
      riscosFiltrados.forEach(r => {
        checkBreak(8);
        // Bullet vermelho para riscos
        doc.setFillColor(239, 68, 68);
        doc.rect(ML + 1, y - 2.5, 1.8, 1.8, "F");
        doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
        doc.setTextColor(DARK_R, DARK_G, DARK_B);
        const lines = doc.splitTextToSize(r, TW - 8);
        lines.forEach((line: string) => {
          if (y > BOTTOM_LIMIT) newPage();
          doc.text(line, ML + 5, y); y += 5;
        });
      });
      y += 2;
      divider();
    }

    // Recomendações
    if (result.recomendacoes_clinicas?.length > 0) {
      drawSection("8", "Recomendacoes Clinicas");
      result.recomendacoes_clinicas.forEach(r => addBullet(cleanText(r)));
      y += 2;
      divider();
    }

    // Observações — filtrar notas do revisor com chars corrompidos
    const obsLimpa = cleanText(result.observacoes || "")
      .replace(/NOTA DO REVISOR:.*?(?=\n|$)/gi, "")
      .replace(/Ø=.*?(?=\n|$)/g, "")
      .trim();

    if (obsLimpa.length > 10) {
      drawSection("9", "Observacoes");
      addText(obsLimpa, ML + 5, TW - 5, 9.5, "italic", GRAY_R, GRAY_G, GRAY_B);
      y += 2;
      divider();
    }

    // Score do revisor (se disponível)
    if (reviewScore !== null) {
      checkBreak(16);
      y += 3;
      doc.setFillColor(245, 247, 252);
      doc.roundedRect(ML - 2, y, TW + 4, 12, 2, 2, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(BLUE_R, BLUE_G, BLUE_B);
      doc.text("Revisao pelo segundo modelo:", ML + 5, y + 7);
      const scoreColor: [number, number, number] = reviewScore >= 90 ? [34, 197, 94] : reviewScore >= 70 ? [234, 179, 8] : [239, 68, 68];
      doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...scoreColor);
      doc.text(`${reviewScore}/100`, PW - MR - 5, y + 7, { align: "right" });
      y += 16;
    }

    // Atualizar footers de todas as páginas
    const total = doc.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      doc.setPage(p);
      drawFooter(p);
    }

    // ── Aviso Legal — inserir na última página antes do footer ────────────────
    // Vai para a última página e insere o bloco de aviso
    doc.setPage(total);
    checkBreak(38);
    y += 6;

    // Borda e fundo do bloco
    doc.setDrawColor(200, 60, 60);
    doc.setLineWidth(0.6);
    doc.setFillColor(255, 248, 248);
    doc.roundedRect(ML - 2, y - 2, TW + 4, 32, 2, 2, "FD");

    // Faixa vermelha lateral
    doc.setFillColor(200, 60, 60);
    doc.rect(ML - 2, y - 2, 3, 32, "F");

    // Ícone e título
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(180, 30, 30);
    doc.text("AVISO LEGAL E ETICO — LEIA COM ATENCAO", ML + 6, y + 5);

    // Linha separadora interna
    doc.setDrawColor(220, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(ML + 4, y + 8, PW - MR - 2, y + 8);

    // Texto do aviso
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 20, 20);
    doc.text("Este laudo foi gerado automaticamente por Inteligencia Artificial (OdontoVision AI Pro).", ML + 6, y + 13);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(80, 40, 40);
    const avisoLinhas = doc.splitTextToSize(
      "O laudo gerado pela IA e uma ferramenta de APOIO ao raciocinio clinico e NAO substitui, em nenhuma hipotese, o exame clinico presencial, o diagnostico e o julgamento profissional do cirurgiao-dentista responsavel. " +
      "Todos os achados, diagnosticos e recomendacoes descritos neste documento DEVEM ser validados, confirmados ou refutados pelo profissional habilitado antes de qualquer conduta clinica ou terapeutica. " +
      "A responsabilidade pelo diagnostico final e pela decisao de tratamento e EXCLUSIVAMENTE do dentista responsavel pelo paciente.",
      TW - 10
    );
    avisoLinhas.forEach((linha: string, i: number) => {
      doc.text(linha, ML + 6, y + 18 + i * 4.2);
    });

    y += 38;

    // Linha de assinatura
    checkBreak(22);
    y += 8;
    doc.setDrawColor(180, 190, 210);
    doc.setLineWidth(0.4);
    doc.line(ML, y, ML + 70, y);
    doc.line(PW - MR - 70, y, PW - MR, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(GRAY_R, GRAY_G, GRAY_B);
    doc.text("Assinatura do Cirurgiao-Dentista", ML, y + 5);
    doc.text("CRO / Data", PW - MR - 70, y + 5);

    // Download
    const patientNameClean = patientData.nome.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30);
    doc.save(`laudo-${patientNameClean}-${patientData.dataLaudo}.pdf`);
    toast.success("PDF gerado com sucesso!");
  };

  const handleCopyToClipboard = () => {
    if (!result) return;

    const formatText = (text: string) => text.replace(/\\n\\n/g, '\n\n').replace(/\\n/g, '\n');

    const achadosLabel = examCategories.includes("laboratorial") && examCategories.length === 1
      ? "Resultados dos Exames"
      : examCategories.includes("foto") && examCategories.length === 1
        ? "Achados Clínicos"
        : examCategories.length > 1
          ? "Achados Integrados"
          : "Achados Radiográficos";

    const reportText = `LAUDO RADIOLÓGICO – ODONTOVISION AI PRO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1) IDENTIFICAÇÃO DO PACIENTE
• Nome: ${capitalizeFullName(result.identificacao_paciente?.nome || patientData.nome)}
• Data de Nascimento: ${formatDate(result.identificacao_paciente?.data_nascimento || patientData.dataNascimento)}
• Data da Análise: ${formatDate(result.identificacao_paciente?.data_analise || patientData.dataLaudo)}

2) TIPO DE EXAME
${result.tipo_exame || "Não identificado"}

3) QUALIDADE DA IMAGEM
${result.qualidade_imagem || "Não avaliada"}

4) ${achadosLabel.toUpperCase()}
${result.achados_radiograficos?.map(item => `• ${item}`).join('\n') || "Nenhum achado registrado"}

5) INTERPRETAÇÃO CLÍNICA / RADIOLÓGICA
${formatText(result.interpretacao_clinica || "Não disponível")}

6) DIAGNÓSTICOS DIFERENCIAIS
${result.diagnosticos_diferenciais?.map(item => `• ${item}`).join('\n') || "Nenhum diagnóstico listado"}

7) RISCOS, ALERTAS E PONTOS DE ATENÇÃO
${result.riscos_alertas?.map(item => `• ${item}`).join('\n') || "Nenhum risco identificado"}

8) RECOMENDAÇÕES CLÍNICAS
${result.recomendacoes_clinicas?.map(item => `• ${item}`).join('\n') || "Nenhuma recomendação"}

9) OBSERVAÇÕES
${formatText(result.observacoes || "Nenhuma observação")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ AVISO LEGAL E ÉTICO
Este laudo é gerado automaticamente por inteligência artificial como ferramenta de apoio ao cirurgião-dentista. Ele NÃO substitui exame clínico, diagnóstico presencial ou julgamento profissional. A interpretação final é sempre responsabilidade do dentista responsável.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    navigator.clipboard.writeText(reportText).then(() => {
      toast.success("Laudo copiado para a área de transferência!");
    }).catch(() => {
      toast.error("Erro ao copiar o laudo");
    });
  };

  const handleSaveCase = async () => {
    if (!result || !user) {
      console.error("Missing data:", { result: !!result, user: !!user });
      toast.error("Dados incompletos para salvar o caso");
      return;
    }

    setIsSaving(true);

    try {
      // Label do tipo: concatena múltiplos se necessário
      const examTypeLabel = examCategories.length > 1
        ? examCategories.map(c => EXAM_CATEGORIES.find(x => x.id === c)?.label || c).join(" + ")
        : EXAM_CATEGORIES.find(c => c.id === examCategories[0])?.label || "Exame";
      const firstFile = selectedFiles[0];
      const examType = firstFile ? getExamType(firstFile.name, firstFile.type) : examTypeLabel;
      const fileNames = selectedFiles.length > 0 ? selectedFiles.map(f => f.name).join(", ") : "Restaurado da sessão";
      const fileType = firstFile?.type || "application/octet-stream";
      
      console.log("Saving case with user_id:", user.id);
      
      const { data, error } = await supabase.from("cases").insert([{
        user_id: user.id,
        name: `${capitalizeFullName(patientData.nome)} - ${examType}`,
        exam_type: examType,
        file_name: fileNames,
        file_type: fileType,
        status: "completed",
        analysis: result as unknown as Json,
        raw_content: rawContent,
        visual_analysis: visualAnalysisResult as unknown as Json,
      }]).select();

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      // Salvar reviewer_analysis se disponível
      if (data?.[0]?.id && reviewerFlags.length > 0) {
        setSavedCaseId(data[0].id);
        await supabase.from("cases").update({
          reviewer_flags: reviewerFlags,
          review_score: reviewScore,
        }).eq("id", data[0].id);
      } else if (data?.[0]?.id) {
        setSavedCaseId(data[0].id);
      }

      toast.success("Caso salvo! Você pode baixar o PDF ou iniciar uma nova análise.", {
        action: {
          label: "Ver Meus Casos",
          onClick: () => navigate("/cases"),
        },
        duration: 6000,
      });
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar o caso. Verifique o console para detalhes.");
    } finally {
      setIsSaving(false);
    }
  };

  // Solução 2: Salvar correção/feedback do dentista
  const handleSaveFeedback = async (
    fieldName: string,
    originalValue: string,
    correctedValue: string,
    type: "correction" | "addition" | "removal",
    notes?: string
  ) => {
    if (!user || !correctedValue.trim()) return;
    setSavingFeedback(true);
    try {
      const primaryCategory = examCategories[0] || null;
      const { error } = await supabase.from("case_feedback").insert([{
        case_id: savedCaseId || null,
        user_id: user.id,
        field_name: fieldName,
        original_value: originalValue,
        corrected_value: correctedValue.trim(),
        feedback_type: type,
        exam_category: primaryCategory,
        notes: notes || null,
      }]);
      if (error) throw error;
      toast.success("Correção salva! Obrigado — isso treina o sistema.");
      setFeedbackField(null);
      setFeedbackValue("");
    } catch (err) {
      console.error("Erro ao salvar feedback:", err);
      toast.error("Erro ao salvar correção");
    } finally {
      setSavingFeedback(false);
    }
  };

  const clearFiles = () => {
    setSelectedFiles([]);
    setPreviewUrls([]);
    setResult(null);
    setRawContent(null);
    setReportGenerated(false);
    setExamCategories([]);
    setVisualAnalysisResult(null);
    setShowVisualAnalysis(false);
    setReviewerFlags([]);
    setReviewScore(null);
    setShowReviewerPanel(false);
    setFeedbackMode(false);
    setSavedCaseId(null);
    clearDraft();
    setPatientData({
      nome: "",
      dataNascimento: "",
      dataLaudo: getTodayFormatted(),
    });
    setClinicalContext({
      queixa: "",
      regiao: "",
      observacao: "",
    });
  };

  const handleVisualAnalysis = async () => {
    if (examCategories.length > 0 && examCategories.every(c => c === "laboratorial")) {
      toast.error("Análise visual disponível apenas para imagens");
      return;
    }
    
    // Try to find image from files first, then from previewUrls
    let imageBase64 = "";
    let imageType = "image/jpeg";
    
    // Procurar imagem de exame de imagem (radiografia/foto/tomografia)
    // excluindo arquivos laboratoriais (PDF de hemograma, etc.)
    // Critério: arquivo de imagem cujo índice NÃO corresponde a um tipo laboratorial
    const imageFileIndex = selectedFiles.findIndex(f => f.type.startsWith("image/"));
    const imageFile = imageFileIndex !== -1 ? selectedFiles[imageFileIndex] : null;

    // Verificar se o arquivo de imagem encontrado é de fato uma imagem clínica
    // (não um PDF de exame laboratorial convertido para imagem)
    // Usar o arquivo de imagem se existir, priorizando arquivos que não sejam PDFs
    const radiographyFile = selectedFiles.find(f =>
      f.type.startsWith("image/") &&
      !f.name.toLowerCase().includes("hemograma") &&
      !f.name.toLowerCase().includes("laboratorial") &&
      !f.name.toLowerCase().includes("exame")
    ) || imageFile;
    if (radiographyFile) {
      // Usar o arquivo de imagem de radiografia/foto encontrado
      const reader = new FileReader();
      imageBase64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(radiographyFile);
      });
      imageType = radiographyFile.type;
    } else {
      // Use previewUrl if available (restored from session)
      const imagePreview = previewUrls.find(p => p !== "pdf" && p.startsWith("data:image"));
      if (imagePreview) {
        imageBase64 = imagePreview;
        // Extract type from data URL
        const match = imagePreview.match(/^data:([^;]+);/);
        if (match) imageType = match[1];
      }
    }
    
    if (!imageBase64) {
      toast.error("Nenhuma imagem encontrada para análise visual");
      return;
    }
    
    setIsAnalyzingVisual(true);
    toast.info("Iniciando análise visual...");
    try {
      const { data, error } = await supabase.functions.invoke("visual-analyze", {
        body: {
          imageBase64,
          imageType,
          examCategory: examCategories[0] || "radiografia",
          clinicalContext: {
            queixa: clinicalContext.queixa || undefined,
            regiao: clinicalContext.regiao || undefined,
          },
        },
      });
      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);
      
      // Preservar estrutura simplificada com achados_clinicos
      const normalizedResult: VisualAnalysisResult = {
        marcacoes: [],
        resumo: "",
        observacoes: "",
        // Estruturas visuais
        seio_maxilar: data.seio_maxilar || {},
        canal_mandibular: data.canal_mandibular || {},
        // Achados clínicos (PRESERVAR da resposta da IA!)
        achados_clinicos: data.achados_clinicos || {
          dentes_presentes: [],
          dentes_ausentes: [],
          caries_suspeitas: [],
          lesoes_suspeitas: [],
          implantes: [],
          restauracoes: [],
          tratamentos_endodonticos: [],
          observacoes: ""
        },
        // Avaliações
        avaliacao_periodontal: data.avaliacao_periodontal,
        avaliacao_ortodontica: data.avaliacao_ortodontica,
        resumo_para_paciente: Array.isArray(data.resumo_para_paciente) ? data.resumo_para_paciente : [],
      };
      
      console.log("Visual analysis result normalized:", normalizedResult);
      
      setVisualAnalysisResult(normalizedResult);
      setShowVisualAnalysis(true);
      toast.success(`${normalizedResult.marcacoes.length} estruturas identificadas!`);
    } catch (error) {
      console.error("Erro na análise visual:", error);
      toast.error(error instanceof Error ? error.message : "Erro na análise visual");
    } finally {
      setIsAnalyzingVisual(false);
    }
  };

  const isFormValid = patientData.nome.trim() && patientData.dataNascimento && patientData.dataLaudo && examCategories.length > 0 && selectedFiles.length > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Enviar Exame</h1>
        <p className="text-muted-foreground mt-1">
          Preencha os dados do paciente e faça upload do exame para análise
        </p>
      </div>

      {/* Patient Data Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Dados do Paciente
          </CardTitle>
          <CardDescription>
            Informe os dados do paciente antes de enviar o exame
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Paciente *</Label>
              <Input
                id="nome"
                placeholder="Nome completo do paciente"
                value={patientData.nome}
                onChange={(e) => setPatientData({ ...patientData, nome: e.target.value })}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataNascimento">Data de Nascimento *</Label>
              <Input
                id="dataNascimento"
                type="text"
                inputMode="numeric"
                placeholder="DD/MM/AAAA"
                value={patientData.dataNascimento}
                onChange={(e) => {
                  // Auto-format date with slashes
                  let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                  if (value.length > 8) value = value.slice(0, 8);
                  
                  let formatted = '';
                  if (value.length > 0) {
                    formatted = value.slice(0, 2);
                    if (value.length > 2) {
                      formatted += '/' + value.slice(2, 4);
                      if (value.length > 4) {
                        formatted += '/' + value.slice(4, 8);
                      }
                    }
                  }
                  setPatientData({ ...patientData, dataNascimento: formatted });
                }}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataLaudo">Data do Laudo *</Label>
              <Input
                id="dataLaudo"
                type="text"
                inputMode="numeric"
                placeholder="DD/MM/AAAA"
                value={patientData.dataLaudo}
                onChange={(e) => {
                  // Auto-format date with slashes
                  let value = e.target.value.replace(/\D/g, '');
                  if (value.length > 8) value = value.slice(0, 8);
                  
                  let formatted = '';
                  if (value.length > 0) {
                    formatted = value.slice(0, 2);
                    if (value.length > 2) {
                      formatted += '/' + value.slice(2, 4);
                      if (value.length > 4) {
                        formatted += '/' + value.slice(4, 8);
                      }
                    }
                  }
                  setPatientData({ ...patientData, dataLaudo: formatted });
                }}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clinical Context */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Contexto Clínico
            <span className="text-xs font-normal text-muted-foreground ml-1">(opcional — melhora muito a precisão do laudo)</span>
          </CardTitle>
          <CardDescription>
            Quanto mais contexto, mais preciso e direcionado será o diagnóstico da IA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="queixa">Queixa Principal</Label>
              <Input
                id="queixa"
                placeholder="Ex: dor espontânea no elemento 36, sensibilidade ao frio..."
                value={clinicalContext.queixa}
                onChange={(e) => setClinicalContext({ ...clinicalContext, queixa: e.target.value })}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="regiao">Região de Interesse</Label>
              <select
                id="regiao"
                value={clinicalContext.regiao}
                onChange={(e) => setClinicalContext({ ...clinicalContext, regiao: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Selecionar região (opcional)</option>
                <option value="Arcada completa">Arcada completa</option>
                <option value="Maxila direita">Maxila direita</option>
                <option value="Maxila esquerda">Maxila esquerda</option>
                <option value="Mandíbula direita">Mandíbula direita</option>
                <option value="Mandíbula esquerda">Mandíbula esquerda</option>
                <option value="Região anterior superior">Região anterior superior</option>
                <option value="Região anterior inferior">Região anterior inferior</option>
                <option value="ATM direita">ATM direita</option>
                <option value="ATM esquerda">ATM esquerda</option>
                <option value="Seios maxilares">Seios maxilares</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="observacao">Observação Clínica Relevante</Label>
            <textarea
              id="observacao"
              placeholder="Ex: histórico de tratamento endodôntico há 2 anos, paciente diabético, uso de bisfosfonatos..."
              value={clinicalContext.observacao}
              onChange={(e) => setClinicalContext({ ...clinicalContext, observacao: e.target.value })}
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Exam Type Selection — multi-select */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-primary" />
            Tipo de Exame
            {examCategories.length > 1 && (
              <span className="ml-1 text-xs font-normal text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {examCategories.length} tipos selecionados — análise integrada
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Selecione um ou mais tipos para análise integrada (ex: Radiografia + Exame Laboratorial)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {EXAM_CATEGORIES.map((cat) => {
              const isSelected = examCategories.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setExamCategories(prev =>
                      prev.includes(cat.id)
                        ? prev.filter(c => c !== cat.id)
                        : [...prev, cat.id]
                    );
                  }}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 touch-manipulation min-h-[100px] relative",
                    isSelected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50 hover:bg-muted/50 active:bg-muted"
                  )}
                >
                  {/* Checkmark quando selecionado */}
                  {isSelected && (
                    <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                      ✓
                    </span>
                  )}
                  <span className="text-2xl">{cat.icon}</span>
                  <span className="font-medium text-sm">{cat.label}</span>
                  <span className="text-xs text-muted-foreground text-center">{cat.description}</span>
                </button>
              );
            })}
          </div>
          {examCategories.length === 0 && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Selecione pelo menos um tipo de exame
            </p>
          )}
          {examCategories.length > 1 && (
            <div className="mt-3 p-2 bg-primary/5 rounded-lg border border-primary/20 text-xs text-primary">
              💡 A IA analisará todos os arquivos de forma integrada, correlacionando os achados entre os diferentes tipos de exame.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UploadIcon className="w-5 h-5 text-primary" />
            Upload de Arquivo
          </CardTitle>
          <CardDescription>
            Arraste e solte ou clique para selecionar. Suportamos radiografias, panorâmicas, tomografias, PDFs de laudos e fotos clínicas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Drop zone - always visible when less than 10 files */}
          {selectedFiles.length < 10 && (
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer",
                selectedFiles.length > 0 ? "mb-4" : "",
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
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFiles(Array.from(e.target.files));
                  }
                }}
              />
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 rounded-full bg-muted">
                  <UploadIcon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {selectedFiles.length === 0 
                      ? "Arraste os arquivos aqui ou clique para selecionar"
                      : "Adicionar mais arquivos"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    JPG, PNG ou PDF (máx. 20MB cada, até 10 arquivos)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Files list */}
          {selectedFiles.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">
                  {selectedFiles.length} arquivo{selectedFiles.length > 1 ? 's' : ''} selecionado{selectedFiles.length > 1 ? 's' : ''}
                </p>
                <Button variant="ghost" size="sm" onClick={clearFiles}>
                  <X className="w-4 h-4 mr-1" />
                  Limpar todos
                </Button>
              </div>
              
              <div className="grid gap-3">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    {previewUrls[index] && previewUrls[index] !== "pdf" ? (
                      <img
                        src={previewUrls[index]}
                        alt={`Preview ${index + 1}`}
                        className="w-16 h-16 object-cover rounded-md"
                      />
                    ) : file.type === "application/pdf" ? (
                      <div className="w-16 h-16 bg-destructive/10 rounded-md flex items-center justify-center">
                        <FileText className="w-8 h-8 text-destructive" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-primary/10 rounded-md flex items-center justify-center">
                        <FileImage className="w-8 h-8 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeFile(index)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {!result && (
                <div className="pt-4 pb-2">
                  <Button
                    id="submit-analysis-btn"
                    variant="hero"
                    size="lg"
                    className="w-full min-h-[56px] text-base touch-manipulation"
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !isFormValid}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Analisando {selectedFiles.length} arquivo{selectedFiles.length > 1 ? 's' : ''} com IA...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Enviar para Análise
                      </>
                    )}
                  </Button>
                  {!isFormValid && (
                    <p className="text-sm text-muted-foreground text-center mt-3">
                      Preencha todos os dados do paciente e selecione o tipo de exame
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis Result */}
      {result && (
        <div className="space-y-4 animate-slide-up">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-success" />
              Resultado da Análise
            </h2>
            <div className="flex items-center gap-2">
              {/* Score do revisor */}
              {reviewScore !== null && (
                <div className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold",
                  reviewScore >= 90 ? "bg-green-500/15 text-green-600" :
                  reviewScore >= 70 ? "bg-yellow-500/15 text-yellow-600" :
                  "bg-destructive/15 text-destructive"
                )}>
                  <span>{reviewScore >= 90 ? "✅" : reviewScore >= 70 ? "⚠️" : "🔴"}</span>
                  <span>Score revisor: {reviewScore}/100</span>
                </div>
              )}
              {/* Botão modo correção */}
              <Button
                variant={feedbackMode ? "default" : "outline"}
                size="sm"
                onClick={() => setFeedbackMode(v => !v)}
                className="gap-1.5"
              >
                <span>{feedbackMode ? "✏️ Corrigindo" : "✏️ Corrigir Laudo"}</span>
              </Button>
            </div>
          </div>

          {/* Painel do Revisor */}
          {reviewerFlags.length > 0 && showReviewerPanel && (
            <Card className={cn(
              "border-2",
              reviewScore !== null && reviewScore < 70
                ? "border-destructive/50 bg-destructive/5"
                : "border-yellow-500/50 bg-yellow-500/5"
            )}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    🔍 Revisão Crítica do Segundo Modelo
                    {reviewScore !== null && (
                      <span className={cn(
                        "text-sm font-bold px-2 py-0.5 rounded-full",
                        reviewScore >= 90 ? "bg-green-500/20 text-green-600" :
                        reviewScore >= 70 ? "bg-yellow-500/20 text-yellow-600" :
                        "bg-destructive/20 text-destructive"
                      )}>
                        {reviewScore}/100
                      </span>
                    )}
                  </span>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"
                    onClick={() => setShowReviewerPanel(false)}>
                    Fechar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Um segundo modelo de IA revisou este laudo de forma independente e identificou os seguintes pontos:
                </p>
                <ul className="space-y-1.5">
                  {reviewerFlags.map((flag, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 flex-shrink-0">
                        {flag.startsWith("OMISSÃO") ? "🔍" :
                         flag.startsWith("QUESTIONÁVEL") ? "❓" :
                         flag.startsWith("INTERPOLAÇÃO") ? "⚠️" : "📋"}
                      </span>
                      <span>{flag}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground mt-2 italic">
                  Esta revisão é um auxílio adicional. A decisão clínica final é sempre do dentista responsável.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Aviso modo correção */}
          {feedbackMode && (
            <Card className="border-primary/40 bg-primary/5">
              <CardContent className="py-3">
                <p className="text-sm text-primary flex items-center gap-2">
                  ✏️ <strong>Modo Correção ativo.</strong> Clique em qualquer item do laudo para corrigi-lo. Suas correções treinam o sistema.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4">
            {/* Identificação do Paciente */}
            <Card className="bg-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">1) Identificação do Paciente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="text-foreground">• Nome: {result.identificacao_paciente?.nome || patientData.nome}</p>
                <p className="text-foreground">• Data de Nascimento: {formatDate(result.identificacao_paciente?.data_nascimento || patientData.dataNascimento)}</p>
                <p className="text-foreground">• Data da Análise: {formatDate(result.identificacao_paciente?.data_analise || patientData.dataLaudo)}</p>
              </CardContent>
            </Card>

            {/* Tipo de Exame */}
            {result.tipo_exame && (
              <Card className="bg-muted/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">2) Tipo de Exame</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground leading-relaxed">{result.tipo_exame}</p>
                </CardContent>
              </Card>
            )}

            {/* Qualidade da Imagem */}
            {result.qualidade_imagem && (
              <Card className="bg-muted/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">3) Qualidade da Imagem</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground leading-relaxed">{result.qualidade_imagem}</p>
                </CardContent>
              </Card>
            )}

            {/* ── ANÁLISE MISTA: Laudo Radiológico separado ── */}
            {result.laudo_imagem && (
              <Card className="border-primary/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2 text-primary">
                    <FileImage className="w-5 h-5" />
                    4A) Laudo Radiológico / Imaginológico
                    {result.laudo_imagem.tipo_imagem && (
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        — {result.laudo_imagem.tipo_imagem}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {result.laudo_imagem.achados && result.laudo_imagem.achados.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Achados</p>
                      <ul className="space-y-2">
                        {result.laudo_imagem.achados.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="mt-1.5 w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.laudo_imagem.diagnosticos_diferenciais && result.laudo_imagem.diagnosticos_diferenciais.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Diagnósticos Diferenciais</p>
                      <ul className="space-y-1">
                        {result.laudo_imagem.diagnosticos_diferenciais.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="mt-1.5 w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.laudo_imagem.riscos_alertas_imagem && result.laudo_imagem.riscos_alertas_imagem.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-destructive uppercase tracking-wide mb-2">Riscos e Alertas</p>
                      <ul className="space-y-1">
                        {result.laudo_imagem.riscos_alertas_imagem.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-destructive/90">
                            <span className="mt-1.5 w-2 h-2 rounded-full bg-destructive flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ── ANÁLISE MISTA: Laudo Laboratorial separado ── */}
            {result.laudo_laboratorial && (
              <Card className="border-amber-500/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2 text-amber-600">
                    <FileText className="w-5 h-5" />
                    4B) Laudo Laboratorial
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Tabela de exames */}
                  {result.laudo_laboratorial.exames && result.laudo_laboratorial.exames.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Resultados dos Exames</p>
                      {result.laudo_laboratorial.exames.map((exame, i) => (
                        <div key={i} className="p-3 rounded-lg border bg-muted/30 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{exame.nome}</span>
                            <span className={cn(
                              "text-xs font-bold px-2 py-0.5 rounded-full",
                              exame.status === "NORMAL"
                                ? "bg-green-500/20 text-green-600"
                                : exame.status === "ALTERADO LEVE"
                                ? "bg-yellow-500/20 text-yellow-600"
                                : exame.status === "ALTERADO MODERADO"
                                ? "bg-orange-500/20 text-orange-600"
                                : "bg-destructive/20 text-destructive"
                            )}>
                              {exame.status}
                            </span>
                          </div>
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span>Valor: <strong className="text-foreground">{exame.valor}</strong></span>
                            <span>Ref: {exame.referencia}</span>
                          </div>
                          {exame.relevancia_odontologica && exame.status !== "NORMAL" && (
                            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                              ⚠️ {exame.relevancia_odontologica}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Classificação cirúrgica */}
                  {result.laudo_laboratorial.classificacao_cirurgica && (
                    <div className={cn(
                      "p-3 rounded-lg border-2 font-semibold text-sm flex items-center gap-2",
                      result.laudo_laboratorial.classificacao_cirurgica === "LIBERADO"
                        ? "border-green-500 bg-green-500/10 text-green-600"
                        : result.laudo_laboratorial.classificacao_cirurgica === "LIBERADO COM RESSALVAS"
                        ? "border-yellow-500 bg-yellow-500/10 text-yellow-600"
                        : result.laudo_laboratorial.classificacao_cirurgica === "AGUARDAR AVALIAÇÃO MÉDICA"
                        ? "border-orange-500 bg-orange-500/10 text-orange-600"
                        : "border-destructive bg-destructive/10 text-destructive"
                    )}>
                      <span className="text-lg">
                        {result.laudo_laboratorial.classificacao_cirurgica === "LIBERADO" ? "✅" :
                         result.laudo_laboratorial.classificacao_cirurgica === "LIBERADO COM RESSALVAS" ? "⚠️" :
                         result.laudo_laboratorial.classificacao_cirurgica === "AGUARDAR AVALIAÇÃO MÉDICA" ? "🟡" : "🔴"}
                      </span>
                      <div>
                        <p>Liberação Cirúrgica: {result.laudo_laboratorial.classificacao_cirurgica}</p>
                        {result.laudo_laboratorial.justificativa_classificacao && (
                          <p className="font-normal text-xs mt-0.5 opacity-80">
                            {result.laudo_laboratorial.justificativa_classificacao}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ── ANÁLISE MISTA: Correlação integrada ── */}
            {result.correlacao_integrada && (
              <Card className="border-purple-500/30 bg-purple-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2 text-purple-600">
                    <Sparkles className="w-5 h-5" />
                    4C) Correlação Clínica Integrada
                    {result.correlacao_integrada.urgencia && (
                      <span className={cn(
                        "ml-auto text-xs font-bold px-2 py-0.5 rounded-full",
                        result.correlacao_integrada.urgencia === "ROTINA"
                          ? "bg-green-500/20 text-green-600"
                          : result.correlacao_integrada.urgencia === "PRIORITÁRIO"
                          ? "bg-orange-500/20 text-orange-600"
                          : "bg-destructive/20 text-destructive"
                      )}>
                        {result.correlacao_integrada.urgencia}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {result.correlacao_integrada.correlacoes && result.correlacao_integrada.correlacoes.length > 0 && (
                    <ul className="space-y-2">
                      {result.correlacao_integrada.correlacoes.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="mt-1.5 w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {result.correlacao_integrada.diagnostico_consolidado && (
                    <div className="p-3 bg-background rounded-lg border border-purple-500/20">
                      <p className="text-xs font-semibold text-purple-600 mb-1">Diagnóstico Consolidado</p>
                      <p className="text-sm">{result.correlacao_integrada.diagnostico_consolidado}</p>
                    </div>
                  )}
                  {result.correlacao_integrada.conduta_recomendada && (
                    <div className="p-3 bg-background rounded-lg border border-purple-500/20">
                      <p className="text-xs font-semibold text-purple-600 mb-1">Conduta Recomendada</p>
                      <p className="text-sm">{result.correlacao_integrada.conduta_recomendada}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Achados Radiográficos — só mostra quando NÃO é análise mista */}
            {!result.laudo_imagem && result.achados_radiograficos && result.achados_radiograficos.length > 0 && (
              <ResultCard
                title="4) Achados Radiográficos"
                items={result.achados_radiograficos}
                icon={<AlertCircle className="w-5 h-5" />}
                color="text-primary"
                feedbackMode={feedbackMode}
                fieldName="achados_radiograficos"
                reviewerSuggestions={reviewerFlags
                  .filter(f => f.startsWith("OMISSÃO:") || f.startsWith("🔍"))
                  .map(f => f.replace(/^(OMISSÃO:|🔍)\s*/, "").trim())
                }
                onCorrect={(original, corrected, type) =>
                  handleSaveFeedback("achados_radiograficos", original, corrected, type)
                }
              />
            )}

            {/* Interpretação Clínica */}
            {result.interpretacao_clinica && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    5) Interpretação Clínica / Radiológica
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-foreground leading-relaxed space-y-3">
                    {result.interpretacao_clinica.split(/\\n\\n|\n\n/).map((paragraph, index) => (
                      <p key={index} className="text-justify">
                        {paragraph.split(/\\n|\n/).map((line, lineIndex, arr) => (
                          <span key={lineIndex}>
                            {line}
                            {lineIndex < arr.length - 1 && <br />}
                          </span>
                        ))}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Diagnósticos Diferenciais */}
            {result.diagnosticos_diferenciais && result.diagnosticos_diferenciais.length > 0 && (
              <ResultCard
                title="6) Diagnósticos Diferenciais"
                items={result.diagnosticos_diferenciais}
                icon={<Sparkles className="w-5 h-5" />}
                color="text-success"
                feedbackMode={feedbackMode}
                fieldName="diagnosticos_diferenciais"
                reviewerSuggestions={reviewerFlags
                  .filter(f => f.startsWith("QUESTIONÁVEL:") || f.startsWith("❓"))
                  .map(f => f.replace(/^(QUESTIONÁVEL:|❓)\s*/, "").trim())
                }
                onCorrect={(original, corrected, type) =>
                  handleSaveFeedback("diagnosticos_diferenciais", original, corrected, type)
                }
              />
            )}

            {/* Riscos e Alertas */}
            {result.riscos_alertas && result.riscos_alertas.length > 0 && (
              <ResultCard
                title="7) Riscos, Alertas e Pontos de Atenção"
                items={result.riscos_alertas}
                icon={<AlertCircle className="w-5 h-5" />}
                color="text-destructive"
                feedbackMode={feedbackMode}
                fieldName="riscos_alertas"
                reviewerSuggestions={reviewerFlags
                  .filter(f =>
                    f.startsWith("INTERPOLAÇÃO SUSPEITA:") ||
                    f.startsWith("⚠️") ||
                    f.includes("FLAG") ||
                    f.includes("OMISSÃO LABORATORIAL")
                  )
                  .map(f => f.replace(/^(INTERPOLAÇÃO SUSPEITA:|⚠️|FLAG\s*\d+:\s*)/i, "").trim())
                }
                onCorrect={(original, corrected, type) =>
                  handleSaveFeedback("riscos_alertas", original, corrected, type)
                }
              />
            )}

            {/* Recomendações Clínicas */}
            {result.recomendacoes_clinicas && result.recomendacoes_clinicas.length > 0 && (
              <ResultCard
                title="8) Recomendações Clínicas"
                items={result.recomendacoes_clinicas}
                icon={<CheckCircle className="w-5 h-5" />}
                color="text-primary"
                feedbackMode={feedbackMode}
                fieldName="recomendacoes_clinicas"
                reviewerSuggestions={[]}
                onCorrect={(original, corrected, type) =>
                  handleSaveFeedback("recomendacoes_clinicas", original, corrected, type)
                }
              />
            )}

            {/* Observações */}
            {result.observacoes && (
              <Card className="bg-muted/50 border-l-4 border-l-primary">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">9) Observações</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-muted-foreground leading-relaxed italic space-y-3">
                    {result.observacoes.split(/\\n\\n|\n\n/).map((paragraph, index) => (
                      <p key={index} className="text-justify">
                        {paragraph.split(/\\n|\n/).map((line, lineIndex, arr) => (
                          <span key={lineIndex}>
                            {line}
                            {lineIndex < arr.length - 1 && <br />}
                          </span>
                        ))}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Aviso Legal */}
            <Card className="bg-destructive/5 border-destructive/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-destructive flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  ⚠️ Aviso Legal e Ético
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Este laudo é gerado automaticamente por inteligência artificial como ferramenta de apoio ao cirurgião-dentista. 
                  Ele <strong>não substitui exame clínico, diagnóstico presencial ou julgamento profissional</strong>. 
                  A interpretação final é sempre responsabilidade do dentista responsável.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Visual Analysis Button and Component */}
          {!examCategories.every(c => c === "laboratorial") && previewUrls.some(p => p !== "pdf" && (p.startsWith("data:image") || p.startsWith("blob:"))) && (
            <div className="space-y-4">
              <Button
                variant={showVisualAnalysis ? "default" : "outline"}
                size="lg"
                className="w-full min-h-[56px] text-base touch-manipulation active:bg-muted"
                onClick={() => visualAnalysisResult ? setShowVisualAnalysis(!showVisualAnalysis) : handleVisualAnalysis()}
                disabled={isAnalyzingVisual}
              >
                {isAnalyzingVisual ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Analisando estruturas...</span>
                  </>
                ) : visualAnalysisResult ? (
                  <>
                    <Eye className="w-5 h-5" />
                    <span>{showVisualAnalysis ? "Ocultar" : "Ver"} Análise Visual</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-5 h-5" />
                    <span>Gerar Análise Visual</span>
                  </>
                )}
              </Button>

              {showVisualAnalysis && visualAnalysisResult && (() => {
                // Encontrar a primeira URL de imagem real (radiografia/foto)
                // Excluindo hemogramas e PDFs
                const imageUrlForVisual = previewUrls.find((p, idx) => {
                  if (!p || p === "pdf" || !p.startsWith("data:image")) return false;
                  // Verificar se o arquivo correspondente não é laboratorial
                  const file = selectedFiles[idx];
                  if (file) {
                    const name = file.name.toLowerCase();
                    if (name.includes("hemograma") || name.includes("laboratorial") || name.includes("exame")) return false;
                  }
                  return true;
                }) || previewUrls.find(p => p && p !== "pdf" && p.startsWith("data:image"));

                if (!imageUrlForVisual) return null;
                return (
                  <VisualAnalysis
                    imageUrl={imageUrlForVisual}
                    marcacoes={visualAnalysisResult.marcacoes || []}
                    resumo={visualAnalysisResult.resumo || visualAnalysisResult.resumo_para_paciente?.join(" ") || ""}
                    observacoes={visualAnalysisResult.observacoes || ""}
                    editable={true}
                    onMarcacoesChange={(newMarcacoes) => {
                      setVisualAnalysisResult(prev => prev ? {
                        ...prev,
                        marcacoes: newMarcacoes
                      } : null);
                    }}
                    analiseCompleta={visualAnalysisResult as any}
                    analiseSimplificada={visualAnalysisResult as any}
                  />
                );
              })()}
            </div>
          )}

          <div className="flex flex-col gap-3">
            {/* Botões de Download e Copiar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="hero"
                size="lg"
                className="flex-1 min-h-[52px] touch-manipulation active:opacity-80"
                onClick={handleDownloadPDF}
              >
                <Download className="w-5 h-5" />
                <span>Baixar PDF</span>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="flex-1 min-h-[52px] touch-manipulation active:bg-muted"
                onClick={handleCopyToClipboard}
              >
                <Copy className="w-5 h-5" />
                <span>Copiar Texto</span>
              </Button>
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant={savedCaseId ? "outline" : "success"}
                size="lg"
                className="flex-1 min-h-[52px] touch-manipulation active:opacity-80"
                onClick={savedCaseId ? () => navigate("/cases") : handleSaveCase}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : savedCaseId ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Salvo — Ver Meus Casos</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>Salvar Caso</span>
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="flex-1 min-h-[52px] touch-manipulation active:bg-muted"
                onClick={clearFiles}
              >
                Nova Análise
              </Button>
            </div>
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
  feedbackMode = false,
  fieldName = "",
  onCorrect,
  reviewerSuggestions = [],
}: {
  title: string;
  items: string[];
  icon: React.ReactNode;
  color: string;
  feedbackMode?: boolean;
  fieldName?: string;
  onCorrect?: (original: string, corrected: string, type: "correction" | "addition" | "removal") => void;
  reviewerSuggestions?: string[];
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editType, setEditType] = useState<"correction" | "removal">("correction");

  const startEdit = (item: string, idx: number) => {
    if (!feedbackMode) return;
    setEditingIndex(idx);
    setEditValue(item);
    setEditType("correction");
  };

  const commitEdit = (original: string) => {
    if (!onCorrect) return;
    if (editType === "removal") {
      onCorrect(original, `[REMOVIDO] ${original}`, "removal");
    } else {
      onCorrect(original, editValue, "correction");
    }
    setEditingIndex(null);
    setEditValue("");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className={cn("text-lg flex items-center gap-2", color)}>
          {icon}
          {title}
          {feedbackMode && (
            <span className="ml-auto text-xs font-normal text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              clique para corrigir
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li key={index}>
              {editingIndex === index ? (
                <div className="space-y-2 p-3 bg-primary/5 rounded-lg border border-primary/30">
                  <div className="flex gap-2 text-xs mb-1">
                    <button onClick={() => setEditType("correction")}
                      className={cn("px-2 py-1 rounded", editType === "correction" ? "bg-primary text-white" : "bg-muted")}>
                      ✏️ Corrigir
                    </button>
                    <button onClick={() => setEditType("removal")}
                      className={cn("px-2 py-1 rounded", editType === "removal" ? "bg-destructive text-white" : "bg-muted")}>
                      🗑️ Remover
                    </button>
                  </div>
                  {editType === "correction" && (
                    <textarea
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      className="w-full text-sm p-2 rounded border bg-background resize-none"
                      rows={3}
                      autoFocus
                    />
                  )}
                  {editType === "removal" && (
                    <p className="text-sm text-destructive">Este item será marcado como incorreto/inexistente.</p>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => commitEdit(item)}
                      className="px-3 py-1.5 bg-primary text-white text-xs rounded hover:bg-primary/80">
                      Salvar correção
                    </button>
                    <button onClick={() => setEditingIndex(null)}
                      className="px-3 py-1.5 bg-muted text-xs rounded hover:bg-muted/80">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => startEdit(item, index)}
                  className={cn(
                    "flex items-start gap-3 rounded-lg px-2 py-1",
                    feedbackMode && "cursor-pointer hover:bg-primary/5 hover:border hover:border-primary/20 transition-colors"
                  )}
                >
                  <span className={cn("mt-1.5 w-2 h-2 rounded-full flex-shrink-0",
                    color === "text-success" ? "bg-success" :
                    color === "text-destructive" ? "bg-destructive" : "bg-primary"
                  )} />
                  <span className="text-foreground leading-relaxed text-sm">{item}</span>
                  {feedbackMode && <span className="ml-auto text-xs text-muted-foreground flex-shrink-0">✏️</span>}
                </div>
              )}
            </li>
          ))}
        </ul>

        {/* Botão adicionar novo achado (modo correção) */}
        {feedbackMode && onCorrect && (
          <AddFeedbackItem
            fieldName={fieldName}
            reviewerSuggestions={reviewerSuggestions}
            onAdd={(val) => onCorrect?.("", val, "addition")}
          />
        )}
      </CardContent>
    </Card>
  );
}

function AddFeedbackItem({
  fieldName,
  reviewerSuggestions = [],
  onAdd,
}: {
  fieldName: string;
  reviewerSuggestions?: string[];
  onAdd: (val: string) => void;
}) {
  const [adding, setAdding]   = useState(false);
  const [val, setVal]         = useState("");
  const [saved, setSaved]     = useState<string[]>([]);

  const handleAdd = (text: string) => {
    if (!text.trim()) return;
    onAdd(text.trim());
    setSaved(prev => [...prev, text.trim()]);
    setVal("");
  };

  // Sugestões ainda não inseridas
  const pendingSuggestions = reviewerSuggestions.filter(s => !saved.includes(s));

  return adding ? (
    <div className="mt-2 space-y-3 p-3 bg-green-500/5 rounded-lg border border-green-500/30">
      <p className="text-xs text-green-600 font-semibold">
        Adicionar achado que a IA não identificou:
      </p>

      {/* ── Sugestões do revisor ── */}
      {pendingSuggestions.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            🔍 <span>Sugestões do revisor — clique para inserir:</span>
          </p>
          {pendingSuggestions.map((sug, i) => (
            <button
              key={i}
              onClick={() => handleAdd(sug)}
              className="w-full text-left text-xs px-3 py-2 rounded-lg border border-green-500/30 bg-green-500/5 hover:bg-green-500/15 hover:border-green-500/60 transition-colors flex items-start gap-2 group"
            >
              <span className="text-green-600 flex-shrink-0 mt-0.5">+</span>
              <span className="text-foreground leading-relaxed">{sug}</span>
              <span className="ml-auto flex-shrink-0 text-green-600 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium">
                inserir ✓
              </span>
            </button>
          ))}

          {/* Itens já inseridos */}
          {saved.length > 0 && (
            <div className="space-y-1 pt-1">
              {saved.map((s, i) => (
                <div key={i} className="text-xs text-green-600 flex items-center gap-1 px-2 opacity-70">
                  <span>✅</span>
                  <span className="truncate">{s}</span>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-green-500/20 pt-2">
            <p className="text-xs text-muted-foreground mb-1.5">Ou escreva manualmente:</p>
          </div>
        </div>
      )}

      {/* ── Campo livre ── */}
      <textarea
        value={val}
        onChange={e => setVal(e.target.value)}
        className="w-full text-sm p-2 rounded border bg-background resize-none"
        rows={2}
        autoFocus={pendingSuggestions.length === 0}
        placeholder="Descreva o achado que a IA não identificou..."
      />
      <div className="flex gap-2">
        <button
          onClick={() => handleAdd(val)}
          disabled={!val.trim()}
          className="px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-500 disabled:opacity-40"
        >
          ✅ Salvar
        </button>
        <button
          onClick={() => { setAdding(false); setVal(""); }}
          className="px-3 py-1.5 bg-muted text-xs rounded hover:bg-muted/80"
        >
          Fechar
        </button>
      </div>
    </div>
  ) : (
    <button
      onClick={() => setAdding(true)}
      className="mt-2 w-full text-xs text-green-600 border border-dashed border-green-500/40 rounded-lg py-2 hover:bg-green-500/5 transition-colors flex items-center justify-center gap-1.5"
    >
      <span>+</span>
      <span>Adicionar achado que a IA não identificou</span>
      {pendingSuggestions.length > 0 && (
        <span className="ml-1 bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
          {pendingSuggestions.length} sugestões do revisor
        </span>
      )}
    </button>
  );
}
