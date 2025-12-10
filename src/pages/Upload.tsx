import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload as UploadIcon, FileImage, FileText, X, Loader2, CheckCircle, AlertCircle, Sparkles, Save, Download, FileCheck, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";

type ExamCategory = "radiografia" | "tomografia" | "foto" | "laboratorial";

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
}

interface PatientData {
  nome: string;
  dataNascimento: string;
  dataLaudo: string;
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
    sessionStorage.removeItem(RESULT_STORAGE_KEY);
  } catch (e) {
    console.error("Erro ao limpar rascunho:", e);
  }
};

// Save analysis result to sessionStorage
const saveAnalysisResult = (result: AnalysisResult, rawContent: string | null, patientData: PatientData, examCategory: ExamCategory): void => {
  try {
    sessionStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify({ result, rawContent, patientData, examCategory }));
  } catch (e) {
    console.error("Erro ao salvar resultado:", e);
  }
};

// Load analysis result from sessionStorage
const loadAnalysisResult = (): { result: AnalysisResult; rawContent: string | null; patientData: PatientData; examCategory: ExamCategory } | null => {
  try {
    const saved = sessionStorage.getItem(RESULT_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Erro ao carregar resultado:", e);
  }
  return null;
};

export default function Upload() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [rawContent, setRawContent] = useState<string | null>(null);
  const [examCategory, setExamCategory] = useState<ExamCategory | null>(() => {
    const savedResult = loadAnalysisResult();
    return savedResult?.examCategory || null;
  });
  
  // Patient data state - load from draft or use defaults
  const [patientData, setPatientData] = useState<PatientData>(() => {
    const savedResult = loadAnalysisResult();
    if (savedResult?.patientData) {
      return savedResult.patientData;
    }
    const draft = loadDraft();
    return draft || {
      nome: "",
      dataNascimento: "",
      dataLaudo: getTodayFormatted(),
    };
  });

  // Load saved analysis result on mount
  useEffect(() => {
    const savedResult = loadAnalysisResult();
    if (savedResult?.result) {
      setResult(savedResult.result);
      setRawContent(savedResult.rawContent);
      setReportGenerated(true);
      toast.info("Análise anterior restaurada");
    }
  }, []);

  // Auto-save draft when patient data changes
  useEffect(() => {
    saveDraft(patientData);
  }, [patientData]);

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

  const getExamType = (fileName: string, fileType: string): string => {
    const lowerName = fileName.toLowerCase();
    if (lowerName.includes("periapical")) return "Periapical";
    if (lowerName.includes("panoram")) return "Panorâmica";
    if (lowerName.includes("bitewing")) return "Bitewing";
    if (lowerName.includes("tomo")) return "Tomografia";
    if (fileType === "application/pdf") return "PDF/Laudo";
    return "Radiografia";
  };

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
    setRawContent(null);

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
    if (!selectedFile) return;
    if (!examCategory) {
      toast.error("Por favor, selecione o tipo de exame.");
      return;
    }
    if (!validatePatientData()) return;

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

      // Format patient name with proper capitalization
      const formattedName = capitalizeFullName(patientData.nome);
      
      // Call the edge function with patient data and exam category
      const { data, error } = await supabase.functions.invoke("analyze-exam", {
        body: {
          imageBase64,
          imageType: selectedFile.type,
          fileName: selectedFile.name,
          examCategory,
          patientData: {
            nome: formattedName,
            dataNascimento: patientData.dataNascimento,
            dataLaudo: patientData.dataLaudo,
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data.analysis);
      setRawContent(data.rawContent);
      // Save result to prevent loss on refresh
      saveAnalysisResult(data.analysis, data.rawContent, {
        nome: formattedName,
        dataNascimento: patientData.dataNascimento,
        dataLaudo: patientData.dataLaudo,
      }, examCategory!);
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
    if (!result || !selectedFile) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let yPosition = 20;

    // Helper function to add text with word wrap
    const addWrappedText = (text: string, y: number, fontSize: number = 11): number => {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, margin, y);
      return y + (lines.length * fontSize * 0.4) + 5;
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
    const qualityLabel = examCategory === "laboratorial" ? "3) Qualidade do Documento" : "3) Qualidade da Imagem";
    doc.text(qualityLabel, margin, yPosition);
    yPosition += 7;
    doc.setFont("helvetica", "normal");
    yPosition = addWrappedText(result.qualidade_imagem || "Não avaliada", yPosition);

    // 4) Achados - título varia conforme tipo de exame
    if (result.achados_radiograficos?.length > 0) {
      checkPageBreak(30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      const achadosLabel = examCategory === "laboratorial" 
        ? "4) Resultados dos Exames" 
        : examCategory === "foto" 
          ? "4) Achados Clínicos" 
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

    // Footer disclaimer
    checkPageBreak(30);
    yPosition += 5;
    doc.setDrawColor(100, 100, 100);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
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
  };

  const handleSaveCase = async () => {
    if (!result || !selectedFile || !user) {
      console.error("Missing data:", { result: !!result, selectedFile: !!selectedFile, user: !!user });
      toast.error("Dados incompletos para salvar o caso");
      return;
    }

    setIsSaving(true);

    try {
      const examType = getExamType(selectedFile.name, selectedFile.type);
      
      console.log("Saving case with user_id:", user.id);
      
      const { data, error } = await supabase.from("cases").insert([{
        user_id: user.id,
        name: `${patientData.nome} - ${examType}`,
        exam_type: examType,
        file_name: selectedFile.name,
        file_type: selectedFile.type,
        status: "completed",
        analysis: result as unknown as Json,
        raw_content: rawContent,
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

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setRawContent(null);
    setReportGenerated(false);
    setExamCategory(null);
    clearDraft();
    setPatientData({
      nome: "",
      dataNascimento: "",
      dataLaudo: getTodayFormatted(),
    });
  };

  const isFormValid = patientData.nome.trim() && patientData.dataNascimento && patientData.dataLaudo && examCategory;

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
                placeholder="DD/MM/AAAA"
                value={patientData.dataNascimento}
                onChange={(e) => setPatientData({ ...patientData, dataNascimento: e.target.value })}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataLaudo">Data do Laudo *</Label>
              <Input
                id="dataLaudo"
                type="text"
                placeholder="DD/MM/AAAA"
                value={patientData.dataLaudo}
                onChange={(e) => setPatientData({ ...patientData, dataLaudo: e.target.value })}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exam Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-primary" />
            Tipo de Exame
          </CardTitle>
          <CardDescription>
            Selecione o tipo de exame para uma análise mais precisa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {EXAM_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setExamCategory(cat.id)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
                  examCategory === cat.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                <span className="text-2xl">{cat.icon}</span>
                <span className="font-medium text-sm">{cat.label}</span>
                <span className="text-xs text-muted-foreground text-center">{cat.description}</span>
              </button>
            ))}
          </div>
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
                ) : selectedFile.type === "application/pdf" ? (
                  <div className="w-24 h-24 bg-destructive/10 rounded-lg flex items-center justify-center">
                    <FileText className="w-12 h-12 text-destructive" />
                  </div>
                ) : (
                  <FileImage className="w-12 h-12 text-primary" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedFile.type === "application/pdf" ? "Documento PDF" : selectedFile.type}
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
                  disabled={isAnalyzing || !isFormValid}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {selectedFile.type === "application/pdf" ? "Analisando PDF..." : "Analisando com IA..."}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Enviar para Análise
                    </>
                  )}
                </Button>
              )}

              {!isFormValid && !result && (
                <p className="text-sm text-muted-foreground text-center">
                  Preencha todos os dados do paciente para enviar o exame
                </p>
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

            {/* Achados Radiográficos */}
            {result.achados_radiograficos && result.achados_radiograficos.length > 0 && (
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
                  <p className="text-foreground leading-relaxed">{result.interpretacao_clinica}</p>
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
                  <p className="text-muted-foreground leading-relaxed italic">{result.observacoes}</p>
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

          <div className="flex flex-col gap-4">
            {/* Botão de Download PDF */}
            <div className="flex gap-4">
              <Button 
                variant="hero"
                className="flex-1"
                onClick={handleDownloadPDF}
              >
                <Download className="w-4 h-4" />
                Baixar PDF do Laudo
              </Button>
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-4">
              <Button 
                variant="success" 
                className="flex-1"
                onClick={handleSaveCase}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar Caso
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={clearFile}>
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
