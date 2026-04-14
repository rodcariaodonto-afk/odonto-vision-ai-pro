import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { DrawingCanvas } from "./DrawingCanvas";
import { OdontogramaInterativo, TipoMarcacao, MarcacaoManual, TipoEstrutura, EstruturaManual } from "./OdontogramaInterativo";
import { RadiografiaInterativa } from "./RadiografiaInterativa";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, ZoomIn, ZoomOut, RotateCcw, Download, ExternalLink, User, Activity, Grid3X3, PenTool, Trash2, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { DentalProstheticsPanel, ProstheticItem } from "./DentalProsthetics";

// Ordem FDI padrão para garantir listagem correta de dentes
const FDI_ORDER = [
  "18", "17", "16", "15", "14", "13", "12", "11",
  "21", "22", "23", "24", "25", "26", "27", "28",
  "48", "47", "46", "45", "44", "43", "42", "41",
  "31", "32", "33", "34", "35", "36", "37", "38"
];

// Função para ordenar dentes na ordem FDI
const sortByFDI = (dentes: string[]): string[] => {
  return [...dentes].sort((a, b) => {
    const indexA = FDI_ORDER.indexOf(a);
    const indexB = FDI_ORDER.indexOf(b);
    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
};

// Interface para achados clínicos
interface AchadosClinicos {
  dentes_presentes: string[];
  dentes_ausentes: string[];
  caries_suspeitas: string[];
  lesoes_suspeitas: string[];
  implantes: string[];
  restauracoes: string[];
  tratamentos_endodonticos: string[];
  observacoes: string;
}

// Interface simplificada para análise visual
export interface AnaliseVisualSimplificada {
  seio_maxilar: {
    direito?: { contorno_normalizado: Array<[number, number]> };
    esquerdo?: { contorno_normalizado: Array<[number, number]> };
  };
  canal_mandibular: {
    direito?: Array<[number, number]>;
    esquerdo?: Array<[number, number]>;
  };
  achados_clinicos: {
    dentes_presentes: string[];
    dentes_ausentes: string[];
    caries_suspeitas: string[];
    lesoes_suspeitas: string[];
    implantes: string[];
    restauracoes: string[];
    tratamentos_endodonticos: string[];
    observacoes: string;
  };
  // Status conservador para terceiros molares
  terceiros_molares?: {
    status_geral: string;
    "18": string;
    "28": string;
    "38": string;
    "48": string;
    recomendacao: string;
  };
  avaliacao_periodontal: {
    perda_ossea: string;
    comentarios: string;
  };
  avaliacao_ortodontica: {
    alinhamento: string;
    observacoes: string;
  };
  resumo_para_paciente: string[];
}

// Manter interface antiga para compatibilidade
export interface Marcacao {
  id: string;
  tipo: "rect" | "circle" | "polygon" | "ellipse" | "path";
  coords: number[];
  label: string;
  descricao: string;
  cor: string;
  severidade: "baixa" | "media" | "alta" | "info";
  categoria: string;
}

export interface AnaliseVisualCompleta {
  estrutura_ossea_percentual?: string;
  avaliacao_periodontal?: any;
  avaliacao_ortodontica?: any;
  dentes?: Record<string, any>;
  ausencias?: string[];
  implantes?: any[];
  lesoes_suspeitas?: any[];
  caries?: any[];
  reabsorcoes?: any[];
  fraturas?: any[];
  seio_maxilar?: any;
  canal_mandibular?: any;
  resumo_para_paciente?: string[];
  marcacoes?: Marcacao[];
}

interface VisualAnalysisProps {
  imageUrl: string;
  marcacoes?: Marcacao[];
  resumo?: string;
  observacoes?: string;
  editable?: boolean;
  onMarcacoesChange?: (marcacoes: Marcacao[]) => void;
  onMarcacoesManualChange?: (marcacoes: MarcacaoManual[]) => void;
  marcacoesManuals?: MarcacaoManual[];
  analiseCompleta?: AnaliseVisualCompleta;
  analiseSimplificada?: AnaliseVisualSimplificada;
}

export function VisualAnalysis({ 
  imageUrl, 
  marcacoes = [], 
  resumo = "", 
  observacoes = "", 
  editable = false,
  onMarcacoesChange,
  onMarcacoesManualChange,
  marcacoesManuals: externalMarcacoesManuals,
  analiseCompleta,
  analiseSimplificada
}: VisualAnalysisProps) {
  const [zoom, setZoom] = useState(1);
  const [showAnatomicStructures, setShowAnatomicStructures] = useState(true);
  const [showPatientSummary, setShowPatientSummary] = useState(false);
  const [showClinicalDetails, setShowClinicalDetails] = useState(true);
  const [showOdontograma, setShowOdontograma] = useState(false);
  const [showDrawingMode, setShowDrawingMode] = useState(false);
  const [showMarcacoes, setShowMarcacoes] = useState(true);
  const [showProsthetics, setShowProsthetics] = useState(false);
  const [prostheticItems, setProstheticItems] = useState<ProstheticItem[]>([]);
  const [selectedProstheticId, setSelectedProstheticId] = useState<string | null>(null);
  const [modoAtivo, setModoAtivo] = useState<{ dente: string | null; tipo: TipoMarcacao | null }>({ dente: null, tipo: null });
  const [estruturaAtiva, setEstruturaAtiva] = useState<{ tipo: TipoEstrutura | null; lado: "direito" | "esquerdo" | null }>({ tipo: null, lado: null });
  const [estruturasManuais, setEstruturasManuais] = useState<EstruturaManual[]>([]);
  const [internalMarcacoesManuals, setInternalMarcacoesManuals] = useState<MarcacaoManual[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use external or internal marcacoes
  const marcacoesManuals = externalMarcacoesManuals ?? internalMarcacoesManuals;
  const setMarcacoesManuals = useCallback((newMarcacoes: MarcacaoManual[]) => {
    if (onMarcacoesManualChange) {
      onMarcacoesManualChange(newMarcacoes);
    } else {
      setInternalMarcacoesManuals(newMarcacoes);
    }
  }, [onMarcacoesManualChange]);

  // Usar análise simplificada como fonte principal
  const analise = analiseSimplificada;
  
  // Estado para achados modificados (combina IA + marcações manuais)
  const [achadosModificados, setAchadosModificados] = useState<AchadosClinicos | null>(null);
  
  // Inicializar achados modificados quando dados da IA estiverem disponíveis
  useEffect(() => {
    if (analise?.achados_clinicos && !achadosModificados) {
      setAchadosModificados({
        dentes_presentes: sortByFDI([...analise.achados_clinicos.dentes_presentes]),
        dentes_ausentes: sortByFDI([...analise.achados_clinicos.dentes_ausentes]),
        caries_suspeitas: [...analise.achados_clinicos.caries_suspeitas],
        lesoes_suspeitas: [...analise.achados_clinicos.lesoes_suspeitas],
        implantes: [...analise.achados_clinicos.implantes],
        restauracoes: [...analise.achados_clinicos.restauracoes],
        tratamentos_endodonticos: [...analise.achados_clinicos.tratamentos_endodonticos],
        observacoes: analise.achados_clinicos.observacoes || "",
      });
    }
  }, [analise?.achados_clinicos]);
  
  // Sincronizar marcações manuais com achados
  useEffect(() => {
    if (!analise?.achados_clinicos) return;
    
    // Criar cópia base dos achados originais da IA
    const baseAchados: AchadosClinicos = {
      dentes_presentes: [...analise.achados_clinicos.dentes_presentes],
      dentes_ausentes: [...analise.achados_clinicos.dentes_ausentes],
      caries_suspeitas: [...analise.achados_clinicos.caries_suspeitas],
      lesoes_suspeitas: [...analise.achados_clinicos.lesoes_suspeitas],
      implantes: [...analise.achados_clinicos.implantes],
      restauracoes: [...analise.achados_clinicos.restauracoes],
      tratamentos_endodonticos: [...analise.achados_clinicos.tratamentos_endodonticos],
      observacoes: analise.achados_clinicos.observacoes || "",
    };
    
    // Aplicar marcações manuais
    marcacoesManuals.forEach(m => {
      const denteNum = m.dente;
      
      switch (m.tipo) {
        case "ausente":
          // Adicionar a ausentes e remover de presentes
          if (!baseAchados.dentes_ausentes.includes(denteNum)) {
            baseAchados.dentes_ausentes.push(denteNum);
          }
          baseAchados.dentes_presentes = baseAchados.dentes_presentes.filter(d => d !== denteNum);
          break;
          
        case "carie":
          const cariesEntry = `Dente ${denteNum}: cárie (marcação manual)`;
          if (!baseAchados.caries_suspeitas.some(c => c.includes(`Dente ${denteNum}`))) {
            baseAchados.caries_suspeitas.push(cariesEntry);
          }
          break;
          
        case "restauracao":
          const restEntry = `Dente ${denteNum}: restauração (marcação manual)`;
          if (!baseAchados.restauracoes.some(r => r.includes(`Dente ${denteNum}`))) {
            baseAchados.restauracoes.push(restEntry);
          }
          break;
          
        case "endo":
          const endoEntry = `Dente ${denteNum}: tratamento endodôntico (marcação manual)`;
          if (!baseAchados.tratamentos_endodonticos.some(t => t.includes(`Dente ${denteNum}`))) {
            baseAchados.tratamentos_endodonticos.push(endoEntry);
          }
          break;
          
        case "implante":
          // Implante = dente ausente + implante
          if (!baseAchados.dentes_ausentes.includes(denteNum)) {
            baseAchados.dentes_ausentes.push(denteNum);
          }
          baseAchados.dentes_presentes = baseAchados.dentes_presentes.filter(d => d !== denteNum);
          const implEntry = `Região do ${denteNum}: implante (marcação manual)`;
          if (!baseAchados.implantes.some(i => i.includes(`${denteNum}`))) {
            baseAchados.implantes.push(implEntry);
          }
          break;
          
        case "lesao":
          const lesaoEntry = `Dente ${denteNum}: lesão periapical (marcação manual)`;
          if (!baseAchados.lesoes_suspeitas.some(l => l.includes(`Dente ${denteNum}`))) {
            baseAchados.lesoes_suspeitas.push(lesaoEntry);
          }
          break;
          
        case "protese":
          const proteseEntry = `Dente ${denteNum}: prótese (marcação manual)`;
          if (!baseAchados.restauracoes.some(r => r.includes(`Dente ${denteNum}`))) {
            baseAchados.restauracoes.push(proteseEntry);
          }
          break;
          
        case "fratura":
          const fraturaEntry = `Dente ${denteNum}: fratura (marcação manual)`;
          if (!baseAchados.lesoes_suspeitas.some(l => l.includes(`Dente ${denteNum}`))) {
            baseAchados.lesoes_suspeitas.push(fraturaEntry);
          }
          break;
      }
    });
    
    // Ordenar listas de dentes na ordem FDI
    baseAchados.dentes_presentes = sortByFDI(baseAchados.dentes_presentes);
    baseAchados.dentes_ausentes = sortByFDI(baseAchados.dentes_ausentes);
    
    setAchadosModificados(baseAchados);
  }, [marcacoesManuals, analise?.achados_clinicos]);
  
  // Fallback para dados do analiseCompleta se não houver simplificada
  const getSeioMaxilar = useCallback(() => {
    if (analise?.seio_maxilar) return analise.seio_maxilar;
    if (analiseCompleta?.seio_maxilar) {
      return {
        direito: analiseCompleta.seio_maxilar.direito?.contorno 
          ? { contorno_normalizado: analiseCompleta.seio_maxilar.direito.contorno }
          : undefined,
        esquerdo: analiseCompleta.seio_maxilar.esquerdo?.contorno
          ? { contorno_normalizado: analiseCompleta.seio_maxilar.esquerdo.contorno }
          : undefined,
      };
    }
    return undefined;
  }, [analise, analiseCompleta]);
  
  const getCanalMandibular = useCallback(() => {
    if (analise?.canal_mandibular) return analise.canal_mandibular;
    return analiseCompleta?.canal_mandibular || undefined;
  }, [analise, analiseCompleta]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

  // Marcações manuais handlers
  const handleAddMarcacao = useCallback((marcacao: MarcacaoManual) => {
    setMarcacoesManuals([...marcacoesManuals, marcacao]);
    toast.success(`${marcacao.tipo} adicionado ao dente ${marcacao.dente}`);
    // Reset mode after adding
    setModoAtivo({ dente: null, tipo: null });
  }, [marcacoesManuals, setMarcacoesManuals]);

  const handleMoveMarcacao = useCallback((id: string, x: number, y: number) => {
    setMarcacoesManuals(marcacoesManuals.map(m => 
      m.id === id ? { ...m, x, y } : m
    ));
  }, [marcacoesManuals, setMarcacoesManuals]);

  const handleDeleteMarcacao = useCallback((id: string) => {
    setMarcacoesManuals(marcacoesManuals.filter(m => m.id !== id));
    toast.success("Marcação removida");
  }, [marcacoesManuals, setMarcacoesManuals]);

  const handleResetMarcacoes = useCallback(() => {
    setMarcacoesManuals([]);
    setModoAtivo({ dente: null, tipo: null });
    toast.success("Todas as marcações foram removidas");
  }, [setMarcacoesManuals]);

  const handleModoChange = useCallback((dente: string | null, tipo: TipoMarcacao | null) => {
    setModoAtivo({ dente, tipo });
    // Desativar modo de estrutura quando selecionar modo de marcação
    if (dente && tipo) {
      setEstruturaAtiva({ tipo: null, lado: null });
    }
  }, []);

  const handleEstruturaChange = useCallback((tipo: TipoEstrutura, lado: "direito" | "esquerdo") => {
    // Toggle: se já está ativo, desativa
    if (estruturaAtiva.tipo === tipo && estruturaAtiva.lado === lado) {
      setEstruturaAtiva({ tipo: null, lado: null });
    } else {
      setEstruturaAtiva({ tipo, lado });
      // Desativar modo de marcação dentária
      setModoAtivo({ dente: null, tipo: null });
      toast.info(`Modo de desenho: ${tipo === "seio_maxilar" ? "Seio Maxilar" : "Canal Mandibular"} (${lado === "direito" ? "Direito" : "Esquerdo"}). Clique na radiografia para desenhar.`);
    }
  }, [estruturaAtiva]);

  // Handler para adicionar estrutura manual (desenho livre completo)
  const handleAddEstruturaManual = useCallback((estrutura: EstruturaManual) => {
    setEstruturasManuais(prev => {
      // Remover estrutura anterior do mesmo tipo/lado (substituir)
      const filtered = prev.filter(e => !(e.tipo === estrutura.tipo && e.lado === estrutura.lado));
      return [...filtered, estrutura];
    });
    setEstruturaAtiva({ tipo: null, lado: null });
    toast.success(`${estrutura.tipo === "seio_maxilar" ? "Seio Maxilar" : "Canal Mandibular"} (${estrutura.lado === "direito" ? "Direito" : "Esquerdo"}) desenhado!`);
  }, []);

  // Handler para resetar estrutura específica
  const handleResetEstrutura = useCallback((tipo: TipoEstrutura, lado: "direito" | "esquerdo") => {
    setEstruturasManuais(prev => prev.filter(e => !(e.tipo === tipo && e.lado === lado)));
    setEstruturaAtiva({ tipo: null, lado: null });
    toast.success(`${tipo === "seio_maxilar" ? "Seio Maxilar" : "Canal Mandibular"} (${lado === "direito" ? "Direito" : "Esquerdo"}) removido.`);
  }, []);
  const handleDownload = useCallback(async () => {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas não suportado");

      const img = new Image();
      img.crossOrigin = "anonymous";
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Desenhar estruturas anatômicas
      if (showAnatomicStructures) {
        const seio = getSeioMaxilar();
        const canal = getCanalMandibular();
        
        // Seio maxilar
        ctx.strokeStyle = "#FFD700";
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);
        ctx.fillStyle = "rgba(255, 215, 0, 0.15)";
        
        [seio?.direito?.contorno_normalizado, seio?.esquerdo?.contorno_normalizado].forEach(contorno => {
          if (contorno?.length >= 3) {
            ctx.beginPath();
            const first = contorno[0];
            ctx.moveTo((first[0] > 1 ? first[0] / 100 : first[0]) * canvas.width, 
                       (first[1] > 1 ? first[1] / 100 : first[1]) * canvas.height);
            contorno.slice(1).forEach((p: [number, number]) => {
              ctx.lineTo((p[0] > 1 ? p[0] / 100 : p[0]) * canvas.width, 
                         (p[1] > 1 ? p[1] / 100 : p[1]) * canvas.height);
            });
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
        });
        
        // Canal mandibular
        ctx.strokeStyle = "#00AEEF";
        ctx.lineWidth = 4;
        ctx.setLineDash([]);
        
        [canal?.direito, canal?.esquerdo].forEach(pontos => {
          if (pontos?.length >= 2) {
            ctx.beginPath();
            const first = pontos[0];
            ctx.moveTo((first[0] > 1 ? first[0] / 100 : first[0]) * canvas.width, 
                       (first[1] > 1 ? first[1] / 100 : first[1]) * canvas.height);
            pontos.slice(1).forEach((p: [number, number]) => {
              ctx.lineTo((p[0] > 1 ? p[0] / 100 : p[0]) * canvas.width, 
                         (p[1] > 1 ? p[1] / 100 : p[1]) * canvas.height);
            });
            ctx.stroke();
          }
        });
      }

      // Download
      const link = document.createElement("a");
      link.download = `analise-visual-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      
      toast.success("Imagem baixada com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar imagem:", error);
      toast.error("Erro ao baixar imagem");
    }
  }, [imageUrl, showAnatomicStructures, getSeioMaxilar, getCanalMandibular]);

  // Abrir em nova janela
  const handleOpenInNewWindow = useCallback(() => {
    // Usar achados modificados (que inclui marcações manuais)
    const achados = achadosModificados || analise?.achados_clinicos;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Análise Visual - OdontoVision</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; background: #1a1a2e; color: #fff; }
          .container { max-width: 1400px; margin: 0 auto; }
          h1 { color: #3F8CFF; margin-bottom: 20px; }
          .content { display: grid; grid-template-columns: 1fr 400px; gap: 20px; }
          .image-container { position: relative; background: #000; border-radius: 8px; overflow: hidden; }
          .image-container img { width: 100%; height: auto; display: block; }
          .findings { background: #2a2a4e; padding: 20px; border-radius: 8px; }
          .section { margin-bottom: 20px; }
          .section h3 { color: #4ADE80; margin-bottom: 10px; font-size: 14px; text-transform: uppercase; }
          .section ul { list-style: none; padding: 0; margin: 0; }
          .section li { padding: 6px 0; border-bottom: 1px solid #3a3a5e; font-size: 14px; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-right: 4px; }
          .badge-green { background: #22C55E20; color: #22C55E; }
          .badge-red { background: #EF444420; color: #EF4444; }
          .badge-yellow { background: #F59E0B20; color: #F59E0B; }
          .badge-blue { background: #3B82F620; color: #3B82F6; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Análise Visual - OdontoVision AI Pro</h1>
          <div class="content">
            <div class="image-container">
              <img src="${imageUrl}" alt="Radiografia" />
            </div>
            <div class="findings">
              ${achados ? `
                <div class="section">
                  <h3>Dentes Presentes (${achados.dentes_presentes?.length || 0})</h3>
                  <p>${achados.dentes_presentes?.join(", ") || "Nenhum identificado"}</p>
                </div>
                <div class="section">
                  <h3>Dentes Ausentes</h3>
                  <ul>${(achados.dentes_ausentes || []).map((d: string) => `<li><span class="badge badge-red">Ausente</span> ${d}</li>`).join("") || "<li>Nenhum</li>"}</ul>
                </div>
                <div class="section">
                  <h3>Cáries Suspeitas</h3>
                  <ul>${(achados.caries_suspeitas || []).map((c: string) => `<li><span class="badge badge-red">Cárie</span> ${c}</li>`).join("") || "<li>Nenhuma identificada</li>"}</ul>
                </div>
                <div class="section">
                  <h3>Lesões Suspeitas</h3>
                  <ul>${(achados.lesoes_suspeitas || []).map((l: string) => `<li><span class="badge badge-yellow">Lesão</span> ${l}</li>`).join("") || "<li>Nenhuma identificada</li>"}</ul>
                </div>
                <div class="section">
                  <h3>Implantes</h3>
                  <ul>${(achados.implantes || []).map((i: string) => `<li><span class="badge badge-blue">Implante</span> ${i}</li>`).join("") || "<li>Nenhum identificado</li>"}</ul>
                </div>
                <div class="section">
                  <h3>Restaurações</h3>
                  <ul>${(achados.restauracoes || []).map((r: string) => `<li><span class="badge badge-green">Restauração</span> ${r}</li>`).join("") || "<li>Nenhuma identificada</li>"}</ul>
                </div>
                <div class="section">
                  <h3>Tratamentos Endodônticos</h3>
                  <ul>${(achados.tratamentos_endodonticos || []).map((t: string) => `<li><span class="badge badge-blue">Endo</span> ${t}</li>`).join("") || "<li>Nenhum identificado</li>"}</ul>
                </div>
                ${achados.observacoes ? `<div class="section"><h3>Observações</h3><p>${achados.observacoes}</p></div>` : ""}
              ` : "<p>Nenhum achado disponível</p>"}
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const newWindow = window.open("", "_blank");
    if (newWindow) {
      newWindow.document.write(html);
      newWindow.document.close();
    }
  }, [imageUrl, achadosModificados, analise?.achados_clinicos]);

  // Usar achados modificados (sincronizados com marcações manuais) ou fallback para IA
  const achados = achadosModificados || analise?.achados_clinicos;

  return (
    <div className="space-y-4">
      {/* Resumo para Paciente */}
      {showPatientSummary && analise?.resumo_para_paciente?.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="w-4 h-4" />
              Resumo para o Paciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {analise.resumo_para_paciente.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAnatomicStructures(!showAnatomicStructures)}
            className="min-h-[44px]"
          >
            {showAnatomicStructures ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />}
            <span className="hidden xs:inline">Estruturas</span>
          </Button>
          
          <Button
            variant={showMarcacoes ? "outline" : "secondary"}
            size="sm"
            onClick={() => setShowMarcacoes(!showMarcacoes)}
            className="min-h-[44px]"
          >
            {showMarcacoes ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />}
            <span className="hidden xs:inline">Marcações</span>
            {marcacoesManuals.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">{marcacoesManuals.length}</Badge>
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPatientSummary(!showPatientSummary)}
            className="min-h-[44px]"
          >
            <User className="w-4 h-4 mr-1" />
            <span className="hidden xs:inline">Paciente</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowClinicalDetails(!showClinicalDetails)}
            className="min-h-[44px]"
          >
            <Activity className="w-4 h-4 mr-1" />
            <span className="hidden xs:inline">Achados</span>
          </Button>
          
          <Button
            variant={showOdontograma ? "default" : "outline"}
            size="sm"
            onClick={() => setShowOdontograma(!showOdontograma)}
            className="min-h-[44px]"
          >
            <Grid3X3 className="w-4 h-4 mr-1" />
            <span className="hidden xs:inline">Odontograma</span>
          </Button>
          
          {editable && (
            <Button
              variant={showDrawingMode ? "default" : "outline"}
              size="sm"
              onClick={() => setShowDrawingMode(!showDrawingMode)}
              className="min-h-[44px]"
            >
              <PenTool className="w-4 h-4 mr-1" />
              <span className="hidden xs:inline">Desenho</span>
            </Button>
          )}

          {editable && (
            <Button
              variant={showProsthetics ? "default" : "outline"}
              size="sm"
              onClick={() => setShowProsthetics(!showProsthetics)}
              className="min-h-[44px]"
            >
              <Stethoscope className="w-4 h-4 mr-1" />
              <span className="hidden xs:inline">Implantes & Coroas</span>
              {prostheticItems.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">{prostheticItems.length}</Badge>
              )}
            </Button>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={handleZoomOut} className="min-h-[44px] min-w-[44px]">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleResetZoom} className="min-h-[44px] min-w-[60px]">
            {Math.round(zoom * 100)}%
          </Button>
          <Button variant="outline" size="icon" onClick={handleZoomIn} className="min-h-[44px] min-w-[44px]">
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleDownload} className="min-h-[44px] min-w-[44px]">
            <Download className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleOpenInNewWindow} className="min-h-[44px] min-w-[44px]">
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Radiografia Interativa */}
      <RadiografiaInterativa
        imageUrl={imageUrl}
        zoom={zoom}
        marcacoesManuals={marcacoesManuals}
        onAddMarcacao={handleAddMarcacao}
        onMoveMarcacao={handleMoveMarcacao}
        onDeleteMarcacao={handleDeleteMarcacao}
        modoAtivo={modoAtivo}
        showMarcacoes={showMarcacoes}
        showAnatomicStructures={showAnatomicStructures}
        estruturaAtiva={estruturaAtiva}
        estruturasManuais={estruturasManuais}
        onAddEstruturaManual={handleAddEstruturaManual}
        onResetEstrutura={handleResetEstrutura}
        prostheticItems={prostheticItems}
        onMoveProsthetic={(id, x, y) =>
          setProstheticItems(prev => prev.map(i => i.id === id ? { ...i, x, y } : i))
        }
        selectedProstheticId={selectedProstheticId}
        onSelectProsthetic={setSelectedProstheticId}
      />
      
      {/* Modo de desenho */}
      {showDrawingMode && editable && (
        <DrawingCanvas imageUrl={imageUrl} />
      )}

      {/* Painel de implantes e coroas */}
      {showProsthetics && editable && (
        <DentalProstheticsPanel
          items={prostheticItems}
          onItemsChange={(items) => {
            setProstheticItems(items);
            if (items.length > 0) {
              setSelectedProstheticId(items[items.length - 1].id);
            }
          }}
        />
      )}

      {/* Legenda das estruturas */}
      {showAnatomicStructures && (
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-2 bg-[#FFD700]/30 border border-[#FFD700] border-dashed" />
            <span className="text-muted-foreground">Seio Maxilar</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-[#00AEEF]" />
            <span className="text-muted-foreground">Canal Mandibular</span>
          </div>
        </div>
      )}

      {/* Odontograma Interativo */}
      {showOdontograma && (
        <OdontogramaInterativo
          modoAtivo={modoAtivo}
          onModoChange={handleModoChange}
          onResetMarcacoes={handleResetMarcacoes}
          achadosClinicos={achadosModificados || analise?.achados_clinicos}
          onEstruturaChange={handleEstruturaChange}
          estruturaAtiva={estruturaAtiva}
        />
      )}

      {/* Achados Clínicos (textual) */}
      {showClinicalDetails && achados && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Dentes */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                Dentes Identificados
                <Badge variant="secondary">{achados.dentes_presentes?.length || 0}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="text-muted-foreground">
                {achados.dentes_presentes?.length > 0 
                  ? achados.dentes_presentes.join(", ")
                  : "Nenhum dente identificado"}
              </p>
              {achados.dentes_ausentes?.length > 0 && (
                <div className="mt-2 pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Ausentes:</p>
                  <div className="flex flex-wrap gap-1">
                    {achados.dentes_ausentes.map((d, i) => (
                      <Badge key={i} variant="destructive" className="text-xs">{d}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Terceiros Molares - Status Conservador */}
          {analise?.terceiros_molares && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-amber-600">
                  <span>⚠️</span>
                  Terceiros Molares (Sisos)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground font-medium text-xs">
                  {analise.terceiros_molares.status_geral}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {(["18", "28", "38", "48"] as const).map((siso) => (
                    <div key={siso} className="flex items-center gap-1 p-1.5 bg-muted/50 rounded">
                      <Badge variant="outline" className="text-[10px] px-1">{siso}</Badge>
                      <span className="text-muted-foreground truncate">
                        {analise.terceiros_molares?.[siso] || "Indeterminado"}
                      </span>
                    </div>
                  ))}
                </div>
                {analise.terceiros_molares.recomendacao && (
                  <div className="pt-2 border-t border-amber-500/20">
                    <p className="text-xs text-amber-600 font-medium">
                      📋 {analise.terceiros_molares.recomendacao}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Patologias */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-destructive">Achados Patológicos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {achados.caries_suspeitas?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-destructive mb-1">Cáries Suspeitas:</p>
                  <ul className="space-y-1">
                    {achados.caries_suspeitas.map((c, i) => (
                      <li key={i} className="text-muted-foreground">{c}</li>
                    ))}
                  </ul>
                </div>
              )}
              {achados.lesoes_suspeitas?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-orange-500 mb-1">Lesões Suspeitas:</p>
                  <ul className="space-y-1">
                    {achados.lesoes_suspeitas.map((l, i) => (
                      <li key={i} className="text-muted-foreground">{l}</li>
                    ))}
                  </ul>
                </div>
              )}
              {!achados.caries_suspeitas?.length && !achados.lesoes_suspeitas?.length && (
                <p className="text-muted-foreground text-xs">Nenhum achado patológico identificado</p>
              )}
            </CardContent>
          </Card>

          {/* Tratamentos */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-green-500">Tratamentos Existentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {achados.restauracoes?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-green-500 mb-1">Restaurações:</p>
                  <ul className="space-y-1">
                    {achados.restauracoes.map((r, i) => (
                      <li key={i} className="text-muted-foreground">{r}</li>
                    ))}
                  </ul>
                </div>
              )}
              {achados.tratamentos_endodonticos?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-blue-500 mb-1">Endodontias:</p>
                  <ul className="space-y-1">
                    {achados.tratamentos_endodonticos.map((t, i) => (
                      <li key={i} className="text-muted-foreground">{t}</li>
                    ))}
                  </ul>
                </div>
              )}
              {achados.implantes?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-purple-500 mb-1">Implantes:</p>
                  <ul className="space-y-1">
                    {achados.implantes.map((im, i) => (
                      <li key={i} className="text-muted-foreground">{im}</li>
                    ))}
                  </ul>
                </div>
              )}
              {!achados.restauracoes?.length && !achados.tratamentos_endodonticos?.length && !achados.implantes?.length && (
                <p className="text-muted-foreground text-xs">Nenhum tratamento identificado</p>
              )}
            </CardContent>
          </Card>

          {/* Avaliações */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Avaliações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {analise?.avaliacao_periodontal && (
                <div>
                  <p className="text-xs font-medium mb-1">Periodontal:</p>
                  <Badge variant={
                    analise.avaliacao_periodontal.perda_ossea === "grave" ? "destructive" :
                    analise.avaliacao_periodontal.perda_ossea === "moderada" ? "secondary" : "outline"
                  }>
                    {analise.avaliacao_periodontal.perda_ossea}
                  </Badge>
                  {analise.avaliacao_periodontal.comentarios && (
                    <p className="text-muted-foreground text-xs mt-1">{analise.avaliacao_periodontal.comentarios}</p>
                  )}
                </div>
              )}
              {analise?.avaliacao_ortodontica && (
                <div>
                  <p className="text-xs font-medium mb-1">Ortodôntica:</p>
                  <Badge variant="outline">{analise.avaliacao_ortodontica.alinhamento}</Badge>
                  {analise.avaliacao_ortodontica.observacoes && (
                    <p className="text-muted-foreground text-xs mt-1">{analise.avaliacao_ortodontica.observacoes}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Observações */}
      {achados?.observacoes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Observações Gerais</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{achados.observacoes}</p>
          </CardContent>
        </Card>
      )}

      {/* Lista de Marcações Manuais */}
      {marcacoesManuals.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              Marcações Manuais
              <div className="flex gap-2">
                <Badge variant="secondary">{marcacoesManuals.length}</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetMarcacoes}
                  className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Limpar
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {marcacoesManuals.map((m) => (
                <Badge
                  key={m.id}
                  variant="outline"
                  className="cursor-pointer hover:bg-destructive/10"
                  onClick={() => handleDeleteMarcacao(m.id)}
                >
                  {m.tipo} - Dente {m.dente}
                  <span className="ml-1 text-destructive">×</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
