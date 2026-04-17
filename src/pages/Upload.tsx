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
      saveAnalysisResult(data.analysis, data.rawContent, {
        nome: formattedName,
        dataNascimento: patientData.dataNascimento,
        dataLaudo: patientData.dataLaudo,
      }, examCategories, null, previewUrls);
      toast.success("Análise concluída com sucesso!");
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

  const handleDownloadPDF = () => {
    if (!result) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let yPosition = 20;

    // Helper function to add text with word wrap and paragraph support
    const addWrappedText = (text: string, y: number, fontSize: number = 11): number => {
      doc.setFontSize(fontSize);
      
      // Split by double line breaks (paragraphs) - handle both escaped and actual
      const paragraphs = text.split(/\\n\\n|\n\n/).filter(p => p.trim());
      
      let currentY = y;
      paragraphs.forEach((paragraph, pIndex) => {
        // Split by single line breaks within paragraphs
        const subLines = paragraph.split(/\\n|\n/).filter(l => l.trim());
        
        subLines.forEach((subLine) => {
          const wrappedLines = doc.splitTextToSize(subLine.trim(), maxWidth);
          
          // Check if we need a new page
          if (currentY + (wrappedLines.length * fontSize * 0.4) > 270) {
            doc.addPage();
            currentY = 20;
          }
          
          doc.text(wrappedLines, margin, currentY);
          currentY += (wrappedLines.length * fontSize * 0.4) + 3;
        });
        
        // Add extra space between paragraphs
        if (pIndex < paragraphs.length - 1) {
          currentY += 4;
        }
      });
      
      return currentY + 3;
    };

    const checkPageBreak = (requiredSpace: number) => {
      if (yPosition + requiredSpace > 270) {
        doc.addPage();
        yPosition = 20;
      }
    };

    // Header
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("LAUDO RADIOLÓGICO – ODONTOVISION AI PRO", pageWidth / 2, yPosition, { align: "center" });
    yPosition += 12;

    // Separator
    doc.setDrawColor(100, 100, 100);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    // 1) Identificação do Paciente
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("1) Identificação do Paciente", margin, yPosition);
    yPosition += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`• Nome: ${capitalizeFullName(result.identificacao_paciente?.nome || patientData.nome)}`, margin, yPosition);
    yPosition += 6;
    doc.text(`• Data de Nascimento: ${formatDate(result.identificacao_paciente?.data_nascimento || patientData.dataNascimento)}`, margin, yPosition);
    yPosition += 6;
    doc.text(`• Data da Análise: ${formatDate(result.identificacao_paciente?.data_analise || patientData.dataLaudo)}`, margin, yPosition);
    yPosition += 10;

    // 2) Tipo de Exame
    checkPageBreak(25);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("2) Tipo de Exame", margin, yPosition);
    yPosition += 7;
    doc.setFont("helvetica", "normal");
    yPosition = addWrappedText(result.tipo_exame || "Não identificado", yPosition);

    // 3) Qualidade da Imagem/Documento
    checkPageBreak(25);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    const qualityLabel = examCategories.includes("laboratorial") ? "3) Qualidade do Documento" : "3) Qualidade da Imagem";
    doc.text(qualityLabel, margin, yPosition);
    yPosition += 7;
    doc.setFont("helvetica", "normal");
    yPosition = addWrappedText(result.qualidade_imagem || "Não avaliada", yPosition);

    // 4) Achados - título varia conforme tipos de exame
    if (result.achados_radiograficos?.length > 0) {
      checkPageBreak(30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      const achadosLabel = examCategories.includes("laboratorial") && examCategories.length === 1
        ? "4) Resultados dos Exames"
        : examCategories.includes("foto") && examCategories.length === 1
          ? "4) Achados Clínicos"
          : examCategories.length > 1
            ? "4) Achados Integrados"
            : "4) Achados Radiográficos";
      doc.text(achadosLabel, margin, yPosition);
      yPosition += 7;
      doc.setFont("helvetica", "normal");
      result.achados_radiograficos.forEach((item) => {
        checkPageBreak(15);
        yPosition = addWrappedText(`• ${item}`, yPosition);
      });
    }

    // 5) Interpretação Clínica / Radiológica
    if (result.interpretacao_clinica) {
      checkPageBreak(30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("5) Interpretação Clínica / Radiológica", margin, yPosition);
      yPosition += 7;
      doc.setFont("helvetica", "normal");
      yPosition = addWrappedText(result.interpretacao_clinica, yPosition);
    }

    // 6) Diagnósticos Diferenciais
    if (result.diagnosticos_diferenciais?.length > 0) {
      checkPageBreak(30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("6) Diagnósticos Diferenciais", margin, yPosition);
      yPosition += 7;
      doc.setFont("helvetica", "normal");
      result.diagnosticos_diferenciais.forEach((item) => {
        checkPageBreak(15);
        yPosition = addWrappedText(`• ${item}`, yPosition);
      });
    }

    // 7) Riscos, Alertas e Pontos de Atenção
    if (result.riscos_alertas?.length > 0) {
      checkPageBreak(30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("7) Riscos, Alertas e Pontos de Atenção", margin, yPosition);
      yPosition += 7;
      doc.setFont("helvetica", "normal");
      result.riscos_alertas.forEach((item) => {
        checkPageBreak(15);
        yPosition = addWrappedText(`• ${item}`, yPosition);
      });
    }

    // 8) Recomendações Clínicas
    if (result.recomendacoes_clinicas?.length > 0) {
      checkPageBreak(30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("8) Recomendações Clínicas", margin, yPosition);
      yPosition += 7;
      doc.setFont("helvetica", "normal");
      result.recomendacoes_clinicas.forEach((item) => {
        checkPageBreak(15);
        yPosition = addWrappedText(`• ${item}`, yPosition);
      });
    }

    // 9) Observações
    if (result.observacoes) {
      checkPageBreak(30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("9) Observações", margin, yPosition);
      yPosition += 7;
      doc.setFont("helvetica", "normal");
      yPosition = addWrappedText(result.observacoes, yPosition);
    }

    // 10) Análise Visual (if available)
    if (visualAnalysisResult && visualAnalysisResult.marcacoes.length > 0) {
      doc.addPage();
      yPosition = 20;
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("10) Análise Visual - Estruturas Identificadas", margin, yPosition);
      yPosition += 10;
      
      if (visualAnalysisResult.resumo) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        yPosition = addWrappedText(visualAnalysisResult.resumo, yPosition, 10);
        yPosition += 5;
      }
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Marcações Identificadas:", margin, yPosition);
      yPosition += 7;
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      
      visualAnalysisResult.marcacoes.forEach((m, index) => {
        checkPageBreak(20);
        const severidadeLabel = m.severidade === "alta" ? "⚠️ ALTA" : 
                                m.severidade === "media" ? "⚡ MÉDIA" : 
                                m.severidade === "baixa" ? "✓ BAIXA" : "ℹ️ INFO";
        doc.text(`${index + 1}. ${m.label} [${severidadeLabel}]`, margin, yPosition);
        yPosition += 5;
        yPosition = addWrappedText(`   ${m.descricao}`, yPosition, 9);
        yPosition += 2;
      });
      
      if (visualAnalysisResult.observacoes) {
        checkPageBreak(20);
        yPosition += 5;
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        yPosition = addWrappedText(`Observações: ${visualAnalysisResult.observacoes}`, yPosition, 9);
      }
    }

    // Footer disclaimer
    checkPageBreak(30);
    yPosition += 5;
    doc.setDrawColor(100, 100, 100);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text("⚠️ Aviso Legal e Ético", margin, yPosition);
    yPosition += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    const disclaimer = "Este laudo é gerado automaticamente por inteligência artificial como ferramenta de apoio ao cirurgião-dentista. Ele NÃO substitui exame clínico, diagnóstico presencial ou julgamento profissional. A interpretação final é sempre responsabilidade do dentista responsável.";
    const disclaimerLines = doc.splitTextToSize(disclaimer, maxWidth);
    doc.text(disclaimerLines, margin, yPosition);

    // Download
    const patientNameClean = patientData.nome.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30);
    doc.save(`laudo-${patientNameClean}-${patientData.dataLaudo}.pdf`);
    toast.success("PDF baixado com sucesso!");
    
    // Reset form after download
    setTimeout(() => {
      setSelectedFiles([]);
      setPreviewUrls([]);
      setResult(null);
      setRawContent(null);
      setReportGenerated(false);
      setExamCategories([]);
      clearDraft();
      setPatientData({
        nome: "",
        dataNascimento: "",
        dataLaudo: getTodayFormatted(),
      });
      toast.info("Formulário resetado para nova análise");
    }, 500);
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

      console.log("Case saved successfully:", data);
      toast.success("Caso salvo com sucesso!");
      navigate("/cases");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar o caso. Verifique o console para detalhes.");
    } finally {
      setIsSaving(false);
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
    
    const imageFile = selectedFiles.find(f => f.type.startsWith("image/"));
    if (imageFile) {
      // Use file directly
      const reader = new FileReader();
      imageBase64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });
      imageType = imageFile.type;
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
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-success" />
            Resultado da Análise
          </h2>

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
              />
            )}

            {/* Riscos e Alertas */}
            {result.riscos_alertas && result.riscos_alertas.length > 0 && (
              <ResultCard
                title="7) Riscos, Alertas e Pontos de Atenção"
                items={result.riscos_alertas}
                icon={<AlertCircle className="w-5 h-5" />}
                color="text-destructive"
              />
            )}

            {/* Recomendações Clínicas */}
            {result.recomendacoes_clinicas && result.recomendacoes_clinicas.length > 0 && (
              <ResultCard
                title="8) Recomendações Clínicas"
                items={result.recomendacoes_clinicas}
                icon={<CheckCircle className="w-5 h-5" />}
                color="text-primary"
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

              {showVisualAnalysis && visualAnalysisResult && previewUrls[0] && previewUrls[0] !== "pdf" && (
                <VisualAnalysis
                  imageUrl={previewUrls[0]}
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
              )}
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
                variant="success" 
                size="lg"
                className="flex-1 min-h-[52px] touch-manipulation active:opacity-80"
                onClick={handleSaveCase}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Salvando...</span>
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
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li key={index} className="flex items-start gap-3">
              <span className={cn("mt-1.5 w-2 h-2 rounded-full flex-shrink-0", 
                color === "text-success" ? "bg-success" : 
                color === "text-destructive" ? "bg-destructive" : "bg-primary"
              )} />
              <span className="text-foreground leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
