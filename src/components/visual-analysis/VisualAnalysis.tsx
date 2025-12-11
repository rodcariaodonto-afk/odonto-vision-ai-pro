import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { MarcacaoTooltip } from "./MarcacaoTooltip";
import { Odontograma } from "./Odontograma";
import { SvgLegend } from "./SvgLegend";
import { DrawingCanvas } from "./DrawingCanvas";
import { calculateLabelPositions, findMarcacaoByDente } from "./labelCollision";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, ZoomIn, ZoomOut, RotateCcw, Download, List, Plus, Trash2, Edit2, Move, ExternalLink, User, Activity, Stethoscope, Grid3X3, Crosshair, PenTool } from "lucide-react";
import { toast } from "sonner";

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
  estrutura_ossea_percentual: string;
  avaliacao_periodontal: {
    perda_ossea_global_percentual: string;
    comentarios: string;
  };
  avaliacao_ortodontica: {
    alinhamento: string;
    inclinacoes_relevantes: string[];
    sugestoes_iniciais: string[];
  };
  dentes: Record<string, {
    status: string;
    detalhes: string;
    posicao: [number, number];
  }>;
  ausencias: string[];
  implantes: Array<{
    dente: string;
    posicao: [number, number];
    detalhes?: string;
  }>;
  lesoes_suspeitas: Array<{
    dente: string;
    descricao: string;
    posicao: [number, number];
    tipo?: string;
  }>;
  caries: Array<{
    dente: string;
    superficie: string;
    posicao: [number, number];
  }>;
  reabsorcoes: Array<{
    dente: string;
    tipo: string;
    posicao: [number, number];
  }>;
  fraturas: Array<{
    dente: string;
    descricao: string;
    posicao: [number, number];
  }>;
  seio_maxilar: {
    direito?: { contorno: Array<[number, number]> };
    esquerdo?: { contorno: Array<[number, number]> };
  };
  canal_mandibular: {
    direito?: Array<[number, number]>;
    esquerdo?: Array<[number, number]>;
  };
  resumo_para_paciente: string[];
  marcacoes: Marcacao[];
}

interface VisualAnalysisProps {
  imageUrl: string;
  marcacoes: Marcacao[];
  resumo?: string;
  observacoes?: string;
  editable?: boolean;
  onMarcacoesChange?: (marcacoes: Marcacao[]) => void;
  analiseCompleta?: AnaliseVisualCompleta;
}

const severidadeOrder = ["alta", "media", "baixa", "info"];

const severidadeCores: Record<string, string> = {
  info: "#3B82F6",
  baixa: "#22C55E",
  media: "#F59E0B",
  alta: "#EF4444",
};

export function VisualAnalysis({ 
  imageUrl, 
  marcacoes, 
  resumo, 
  observacoes, 
  editable = false,
  onMarcacoesChange,
  analiseCompleta
}: VisualAnalysisProps) {
  const [selectedMarcacao, setSelectedMarcacao] = useState<Marcacao | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showMarcacoes, setShowMarcacoes] = useState(true);
  const [visibleMarcacoes, setVisibleMarcacoes] = useState<Set<string>>(new Set(marcacoes.map(m => m.id)));
  const [zoom, setZoom] = useState(1);
  const [showList, setShowList] = useState(false);
  const [showPatientSummary, setShowPatientSummary] = useState(false);
  const [showClinicalDetails, setShowClinicalDetails] = useState(false);
  const [showOdontograma, setShowOdontograma] = useState(false);
  const [showDrawingMode, setShowDrawingMode] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [editMode, setEditMode] = useState<"none" | "add" | "move">("none");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newMarcacao, setNewMarcacao] = useState<Partial<Marcacao>>({
    tipo: "rect",
    severidade: "info",
    categoria: "anatomia",
    coords: [10, 10, 10, 10],
  });
  const [movingMarcacao, setMovingMarcacao] = useState<string | null>(null);
  const [showAnatomicStructures, setShowAnatomicStructures] = useState(true);
  const [highlightedPosition, setHighlightedPosition] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const imageWrapperRef = useRef<HTMLDivElement>(null);

  // Sync visible marcacoes when marcacoes change
  useEffect(() => {
    setVisibleMarcacoes(new Set(marcacoes.map(m => m.id)));
  }, [marcacoes]);

  // Calculate label positions with collision detection
  const labelPositions = useMemo(() => {
    return calculateLabelPositions(marcacoes, visibleMarcacoes);
  }, [marcacoes, visibleMarcacoes]);

  // Handle tooth click from odontogram - scroll to and highlight position
  const handleToothClick = useCallback((denteNum: string) => {
    const position = findMarcacaoByDente(marcacoes, denteNum, analiseCompleta);
    
    if (position) {
      // Highlight the position
      setHighlightedPosition(position);
      
      // Scroll to the position
      if (containerRef.current && imageWrapperRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const wrapperRect = imageWrapperRef.current.getBoundingClientRect();
        
        const targetX = (position.x / 100) * wrapperRect.width * zoom;
        const targetY = (position.y / 100) * wrapperRect.height * zoom;
        
        containerRef.current.scrollTo({
          left: targetX - containerRect.width / 2,
          top: targetY - containerRect.height / 2,
          behavior: "smooth"
        });
      }
      
      toast.success(`Dente ${denteNum} localizado`, { duration: 2000 });
      
      // Clear highlight after animation
      setTimeout(() => setHighlightedPosition(null), 3000);
    } else {
      toast.info(`Posição do dente ${denteNum} não mapeada na análise`);
    }
  }, [marcacoes, analiseCompleta, zoom]);

  const handleMarcacaoClick = (marcacao: Marcacao, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (editMode === "move" && editable) {
      setMovingMarcacao(marcacao.id);
      toast.info("Clique na nova posição para mover a marcação");
      return;
    }
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      setTooltipPosition({ x, y });
    }
    setSelectedMarcacao(marcacao);
  };

  const handleBackgroundClick = (event: React.MouseEvent) => {
    if (editMode === "add" && editable) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        setNewMarcacao(prev => ({ ...prev, coords: [x, y, 10, 10] }));
        setIsAddDialogOpen(true);
      }
      return;
    }
    
    if (editMode === "move" && movingMarcacao && editable) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        
        const updatedMarcacoes = marcacoes.map(m => {
          if (m.id === movingMarcacao) {
            const newCoords = [...m.coords];
            newCoords[0] = x;
            newCoords[1] = y;
            return { ...m, coords: newCoords };
          }
          return m;
        });
        
        onMarcacoesChange?.(updatedMarcacoes);
        setMovingMarcacao(null);
        toast.success("Marcação movida com sucesso!");
      }
      return;
    }
    
    setSelectedMarcacao(null);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

  const handleAddMarcacao = () => {
    if (!newMarcacao.label || !newMarcacao.descricao) {
      toast.error("Preencha o nome e a descrição");
      return;
    }

    const marcacao: Marcacao = {
      id: `manual_${Date.now()}`,
      tipo: newMarcacao.tipo as Marcacao["tipo"],
      coords: newMarcacao.coords || [10, 10, 10, 10],
      label: newMarcacao.label,
      descricao: newMarcacao.descricao,
      cor: severidadeCores[newMarcacao.severidade || "info"],
      severidade: newMarcacao.severidade as Marcacao["severidade"],
      categoria: newMarcacao.categoria || "anatomia",
    };

    onMarcacoesChange?.([...marcacoes, marcacao]);
    setVisibleMarcacoes(prev => new Set([...prev, marcacao.id]));
    setIsAddDialogOpen(false);
    setNewMarcacao({
      tipo: "rect",
      severidade: "info",
      categoria: "anatomia",
      coords: [10, 10, 10, 10],
    });
    setEditMode("none");
    toast.success("Marcação adicionada!");
  };

  const handleDeleteMarcacao = (id: string) => {
    onMarcacoesChange?.(marcacoes.filter(m => m.id !== id));
    setVisibleMarcacoes(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
    setSelectedMarcacao(null);
    toast.success("Marcação removida!");
  };

  const toggleMarcacaoVisibility = (id: string) => {
    setVisibleMarcacoes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleAllMarcacoes = (visible: boolean) => {
    if (visible) {
      setVisibleMarcacoes(new Set(marcacoes.map(m => m.id)));
    } else {
      setVisibleMarcacoes(new Set());
    }
  };

  // Render seio maxilar contours - usando polyline como no exemplo do usuário
  const renderSeioMaxilar = () => {
    if (!analiseCompleta?.seio_maxilar || !showAnatomicStructures) return null;
    
    const elements: JSX.Element[] = [];
    
    // Seio maxilar direito
    if (analiseCompleta.seio_maxilar.direito?.contorno?.length >= 3) {
      const points = analiseCompleta.seio_maxilar.direito.contorno
        .map(([x, y]) => `${x},${y}`).join(" ");
      elements.push(
        <polyline
          key="seio-direito"
          points={points}
          fill="rgba(255, 215, 0, 0.15)"
          stroke="#FFD700"
          strokeWidth="0.5"
          strokeLinejoin="round"
        />
      );
      // Fechar o polígono conectando último ao primeiro ponto
      const firstPoint = analiseCompleta.seio_maxilar.direito.contorno[0];
      const lastPoint = analiseCompleta.seio_maxilar.direito.contorno[analiseCompleta.seio_maxilar.direito.contorno.length - 1];
      elements.push(
        <line
          key="seio-direito-close"
          x1={lastPoint[0]}
          y1={lastPoint[1]}
          x2={firstPoint[0]}
          y2={firstPoint[1]}
          stroke="#FFD700"
          strokeWidth="0.5"
        />
      );
    }
    
    // Seio maxilar esquerdo
    if (analiseCompleta.seio_maxilar.esquerdo?.contorno?.length >= 3) {
      const points = analiseCompleta.seio_maxilar.esquerdo.contorno
        .map(([x, y]) => `${x},${y}`).join(" ");
      elements.push(
        <polyline
          key="seio-esquerdo"
          points={points}
          fill="rgba(255, 215, 0, 0.15)"
          stroke="#FFD700"
          strokeWidth="0.5"
          strokeLinejoin="round"
        />
      );
      // Fechar o polígono
      const firstPoint = analiseCompleta.seio_maxilar.esquerdo.contorno[0];
      const lastPoint = analiseCompleta.seio_maxilar.esquerdo.contorno[analiseCompleta.seio_maxilar.esquerdo.contorno.length - 1];
      elements.push(
        <line
          key="seio-esquerdo-close"
          x1={lastPoint[0]}
          y1={lastPoint[1]}
          x2={firstPoint[0]}
          y2={firstPoint[1]}
          stroke="#FFD700"
          strokeWidth="0.5"
        />
      );
    }
    
    return elements;
  };

  // Render canal mandibular paths - usando polyline como no exemplo do usuário
  const renderCanalMandibular = () => {
    if (!analiseCompleta?.canal_mandibular || !showAnatomicStructures) return null;
    
    const elements: JSX.Element[] = [];
    
    // Canal mandibular direito
    if (analiseCompleta.canal_mandibular.direito?.length >= 2) {
      const points = analiseCompleta.canal_mandibular.direito
        .map(([x, y]) => `${x},${y}`).join(" ");
      elements.push(
        <polyline
          key="canal-direito"
          points={points}
          fill="none"
          stroke="#00AEEF"
          strokeWidth="0.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    }
    
    // Canal mandibular esquerdo
    if (analiseCompleta.canal_mandibular.esquerdo?.length >= 2) {
      const points = analiseCompleta.canal_mandibular.esquerdo
        .map(([x, y]) => `${x},${y}`).join(" ");
      elements.push(
        <polyline
          key="canal-esquerdo"
          points={points}
          fill="none"
          stroke="#00AEEF"
          strokeWidth="0.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    }
    
    return elements;
  };

  // Render caries directly from analiseCompleta
  const renderCaries = () => {
    if (!analiseCompleta?.caries?.length) return null;
    
    return analiseCompleta.caries.map((carie, i) => {
      if (!carie.posicao) return null;
      return (
        <circle
          key={`carie-${i}`}
          cx={carie.posicao[0]}
          cy={carie.posicao[1]}
          r="1.5"
          fill="#FF0000"
          fillOpacity="0.7"
          stroke="#FF0000"
          strokeWidth="0.3"
        />
      );
    });
  };

  // Render lesoes directly from analiseCompleta
  const renderLesoes = () => {
    if (!analiseCompleta?.lesoes_suspeitas?.length) return null;
    
    return analiseCompleta.lesoes_suspeitas.map((lesao, i) => {
      if (!lesao.posicao) return null;
      return (
        <circle
          key={`lesao-${i}`}
          cx={lesao.posicao[0]}
          cy={lesao.posicao[1]}
          r="2"
          fill="#FFA500"
          fillOpacity="0.7"
          stroke="#FFA500"
          strokeWidth="0.3"
        />
      );
    });
  };

  // Render implantes directly from analiseCompleta
  const renderImplantes = () => {
    if (!analiseCompleta?.implantes?.length) return null;
    
    return analiseCompleta.implantes.map((implante, i) => {
      if (!implante.posicao) return null;
      return (
        <rect
          key={`implante-${i}`}
          x={implante.posicao[0] - 1}
          y={implante.posicao[1] - 3}
          width="2"
          height="6"
          fill="#00FF00"
          fillOpacity="0.6"
          stroke="#00FF00"
          strokeWidth="0.3"
          rx="0.3"
        />
      );
    });
  };

  // Render dentes positions from analiseCompleta
  const renderDentes = () => {
    if (!analiseCompleta?.dentes) return null;
    
    return Object.entries(analiseCompleta.dentes).map(([num, dente]) => {
      if (!dente.posicao) return null;
      const isHealthy = dente.status?.toLowerCase().includes("saudável") || 
                       dente.status?.toLowerCase().includes("normal") ||
                       dente.status?.toLowerCase().includes("hígido");
      return (
        <g key={`dente-${num}`}>
          <circle
            cx={dente.posicao[0]}
            cy={dente.posicao[1]}
            r="1.8"
            fill={isHealthy ? "#3B82F6" : "#F59E0B"}
            fillOpacity="0.5"
            stroke={isHealthy ? "#3B82F6" : "#F59E0B"}
            strokeWidth="0.25"
          />
          <text
            x={dente.posicao[0]}
            y={dente.posicao[1] - 2.5}
            textAnchor="middle"
            fontSize="1.8"
            fill="white"
            fontWeight="bold"
            style={{ textShadow: "0 0 2px black" }}
          >
            {num}
          </text>
        </g>
      );
    });
  };

  // Render reabsorcoes
  const renderReabsorcoes = () => {
    if (!analiseCompleta?.reabsorcoes?.length) return null;
    
    return analiseCompleta.reabsorcoes.map((reab, i) => {
      if (!reab.posicao) return null;
      return (
        <circle
          key={`reab-${i}`}
          cx={reab.posicao[0]}
          cy={reab.posicao[1]}
          r="1.5"
          fill="#EF4444"
          fillOpacity="0.7"
          stroke="#EF4444"
          strokeWidth="0.3"
        />
      );
    });
  };

  // Render fraturas
  const renderFraturas = () => {
    if (!analiseCompleta?.fraturas?.length) return null;
    
    return analiseCompleta.fraturas.map((fratura, i) => {
      if (!fratura.posicao) return null;
      return (
        <line
          key={`fratura-${i}`}
          x1={fratura.posicao[0] - 1}
          y1={fratura.posicao[1] - 2}
          x2={fratura.posicao[0] + 1}
          y2={fratura.posicao[1] + 2}
          stroke="#EC4899"
          strokeWidth="0.5"
          strokeLinecap="round"
        />
      );
    });
  };

  const generateImageWithMarkers = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = containerRef.current?.querySelector("img");
      if (!img) {
        reject("Imagem não encontrada");
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || 1920;
      canvas.height = img.naturalHeight || 1080;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject("Erro ao criar canvas");
        return;
      }

      const tempImg = new Image();
      tempImg.crossOrigin = "anonymous";
      tempImg.onload = () => {
        ctx.drawImage(tempImg, 0, 0, canvas.width, canvas.height);
        
        if (showMarcacoes) {
          marcacoes.filter(m => visibleMarcacoes.has(m.id)).forEach(m => {
            ctx.strokeStyle = m.cor;
            ctx.lineWidth = 4;
            ctx.fillStyle = `${m.cor}33`;
            const x = (m.coords[0] / 100) * canvas.width;
            const y = (m.coords[1] / 100) * canvas.height;
            const w = (m.coords[2] / 100) * canvas.width;
            const h = (m.coords[3] / 100) * canvas.height;
            
            if (m.tipo === "rect") { 
              ctx.strokeRect(x, y, w, h); 
              ctx.fillRect(x, y, w, h); 
            } else if (m.tipo === "circle" || m.tipo === "ellipse") { 
              ctx.beginPath(); 
              ctx.ellipse(x, y, w, h, 0, 0, 2 * Math.PI); 
              ctx.stroke(); 
              ctx.fill(); 
            }
            
            ctx.font = "bold 16px sans-serif";
            const textWidth = ctx.measureText(m.label).width;
            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            ctx.fillRect(x, y - 22, textWidth + 8, 20);
            ctx.fillStyle = m.cor;
            ctx.fillText(m.label, x + 4, y - 7);
          });
        }
        
        resolve(canvas.toDataURL("image/png"));
      };
      tempImg.onerror = () => reject("Erro ao carregar imagem");
      tempImg.src = imageUrl;
    });
  };

  const handleDownload = async () => {
    if (!containerRef.current) return;
    
    try {
      toast.loading("Gerando imagem...", { id: "download" });
      const dataUrl = await generateImageWithMarkers();
      const link = document.createElement("a");
      link.download = "analise-visual-odontovision.png";
      link.href = dataUrl;
      link.click();
      toast.success("Imagem baixada com sucesso!", { id: "download" });
    } catch (error) {
      toast.error("Erro ao gerar imagem", { id: "download" });
    }
  };

  const handleOpenInNewWindow = async () => {
    if (!containerRef.current) return;
    
    try {
      toast.loading("Abrindo janela interativa...", { id: "newwindow" });
      
      const newWindow = window.open("", "_blank");
      if (newWindow) {
        const marcacoesData = JSON.stringify(marcacoes);
        const visibleIds = JSON.stringify(Array.from(visibleMarcacoes));
        const analiseData = analiseCompleta ? JSON.stringify(analiseCompleta) : "null";
        
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Análise Visual - OdontoVision AI Pro</title>
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                  background: #1a1a1a; 
                  min-height: 100vh; 
                  display: flex; 
                  flex-direction: column;
                  padding: 20px;
                  font-family: system-ui, -apple-system, sans-serif;
                  color: white;
                }
                .header {
                  text-align: center;
                  margin-bottom: 20px;
                }
                .header h1 {
                  font-size: 24px;
                  margin-bottom: 8px;
                  color: #3F8CFF;
                }
                .header p {
                  font-size: 14px;
                  color: #888;
                }
                .main-content {
                  display: flex;
                  gap: 20px;
                  flex: 1;
                  min-height: 0;
                }
                .image-section {
                  flex: 1;
                  display: flex;
                  flex-direction: column;
                  min-width: 0;
                }
                .image-container {
                  position: relative;
                  flex: 1;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  background: #111;
                  border-radius: 8px;
                  overflow: hidden;
                }
                .image-wrapper {
                  position: relative;
                  max-width: 100%;
                  max-height: calc(100vh - 200px);
                }
                .image-wrapper img {
                  max-width: 100%;
                  max-height: calc(100vh - 200px);
                  display: block;
                }
                .svg-overlay {
                  position: absolute;
                  top: 0;
                  left: 0;
                  width: 100%;
                  height: 100%;
                  pointer-events: none;
                }
                .controls-panel {
                  width: 380px;
                  background: #2a2a2a;
                  border-radius: 8px;
                  padding: 16px;
                  overflow-y: auto;
                  max-height: calc(100vh - 140px);
                }
                .panel-section {
                  margin-bottom: 16px;
                  padding-bottom: 12px;
                  border-bottom: 1px solid #3a3a3a;
                }
                .panel-section:last-child {
                  border-bottom: none;
                  margin-bottom: 0;
                }
                .section-title {
                  font-size: 14px;
                  font-weight: 600;
                  color: #3F8CFF;
                  margin-bottom: 12px;
                  display: flex;
                  align-items: center;
                  gap: 8px;
                }
                .clinical-stats {
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 8px;
                }
                .stat-card {
                  background: #333;
                  border-radius: 8px;
                  padding: 12px;
                }
                .stat-label {
                  font-size: 11px;
                  color: #888;
                  margin-bottom: 4px;
                }
                .stat-value {
                  font-size: 16px;
                  font-weight: 600;
                }
                .stat-value.good { color: #22C55E; }
                .stat-value.warning { color: #F59E0B; }
                .stat-value.danger { color: #EF4444; }
                .patient-summary {
                  background: #1e3a5f;
                  border-radius: 8px;
                  padding: 12px;
                }
                .patient-summary h4 {
                  font-size: 13px;
                  margin-bottom: 8px;
                  color: #60A5FA;
                }
                .patient-summary ul {
                  list-style: none;
                  padding: 0;
                }
                .patient-summary li {
                  font-size: 12px;
                  padding: 4px 0;
                  border-bottom: 1px solid #2a4a6f;
                  display: flex;
                  align-items: center;
                  gap: 8px;
                }
                .patient-summary li:last-child {
                  border-bottom: none;
                }
                .patient-summary li::before {
                  content: "•";
                  color: #60A5FA;
                }
                .controls-header {
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  margin-bottom: 12px;
                }
                .controls-header h3 {
                  font-size: 16px;
                  color: #3F8CFF;
                }
                .toggle-all-btns {
                  display: flex;
                  gap: 8px;
                }
                .toggle-all-btns button {
                  padding: 6px 12px;
                  font-size: 12px;
                  border: none;
                  border-radius: 4px;
                  cursor: pointer;
                  transition: background 0.2s;
                }
                .btn-show-all {
                  background: #3F8CFF;
                  color: white;
                }
                .btn-show-all:hover {
                  background: #2d7ae8;
                }
                .btn-hide-all {
                  background: #444;
                  color: white;
                }
                .btn-hide-all:hover {
                  background: #555;
                }
                .marcacao-item {
                  display: flex;
                  align-items: flex-start;
                  gap: 12px;
                  padding: 10px;
                  margin-bottom: 6px;
                  background: #333;
                  border-radius: 8px;
                  cursor: pointer;
                  transition: background 0.2s;
                }
                .marcacao-item:hover {
                  background: #3a3a3a;
                }
                .marcacao-item.hidden {
                  opacity: 0.5;
                }
                .checkbox-wrapper {
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  width: 20px;
                  height: 20px;
                  flex-shrink: 0;
                  margin-top: 2px;
                }
                .checkbox-wrapper input {
                  width: 18px;
                  height: 18px;
                  cursor: pointer;
                  accent-color: #3F8CFF;
                }
                .color-dot {
                  width: 12px;
                  height: 12px;
                  border-radius: 50%;
                  flex-shrink: 0;
                  margin-top: 3px;
                }
                .marcacao-info {
                  flex: 1;
                  min-width: 0;
                }
                .marcacao-label {
                  font-weight: 600;
                  font-size: 13px;
                  margin-bottom: 2px;
                }
                .marcacao-desc {
                  font-size: 11px;
                  color: #aaa;
                  line-height: 1.4;
                }
                .severity-badge {
                  font-size: 9px;
                  padding: 2px 6px;
                  border-radius: 4px;
                  font-weight: 600;
                  margin-left: 6px;
                }
                .severity-alta { background: #EF4444; color: white; }
                .severity-media { background: #F59E0B; color: white; }
                .severity-baixa { background: #22C55E; color: white; }
                .severity-info { background: #3B82F6; color: white; }
                .download-section {
                  margin-top: 16px;
                  padding-top: 16px;
                  border-top: 1px solid #3a3a3a;
                }
                .btn-download {
                  width: 100%;
                  padding: 12px;
                  background: #3F8CFF;
                  color: white;
                  border: none;
                  border-radius: 8px;
                  font-size: 14px;
                  font-weight: 600;
                  cursor: pointer;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 8px;
                  transition: background 0.2s;
                }
                .btn-download:hover {
                  background: #2d7ae8;
                }
                .footer {
                  margin-top: 20px;
                  color: #666;
                  font-size: 12px;
                  text-align: center;
                }
                .teeth-grid {
                  display: flex;
                  flex-wrap: wrap;
                  gap: 4px;
                  margin-top: 8px;
                }
                .tooth-badge {
                  font-size: 10px;
                  padding: 2px 6px;
                  border-radius: 4px;
                  background: #444;
                }
                .tooth-badge.healthy { background: #166534; color: #86efac; }
                .tooth-badge.problem { background: #7f1d1d; color: #fca5a5; }
                .tooth-badge.absent { background: #374151; color: #9ca3af; text-decoration: line-through; }
                .tooth-badge.implant { background: #5b21b6; color: #c4b5fd; }
                @media (max-width: 768px) {
                  .main-content {
                    flex-direction: column;
                  }
                  .controls-panel {
                    width: 100%;
                    max-height: 300px;
                  }
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>OdontoVision AI Pro</h1>
                <p>Análise Visual Avançada - ${new Date().toLocaleDateString('pt-BR')}</p>
              </div>
              
              <div class="main-content">
                <div class="image-section">
                  <div class="image-container">
                    <div class="image-wrapper" id="imageWrapper">
                      <img id="mainImage" src="${imageUrl}" alt="Análise Visual" />
                      <svg id="svgOverlay" class="svg-overlay" viewBox="0 0 100 100" preserveAspectRatio="none"></svg>
                    </div>
                  </div>
                </div>
                
                <div class="controls-panel">
                  <div class="panel-section" id="clinicalSection"></div>
                  <div class="panel-section" id="patientSection"></div>
                  <div class="panel-section">
                    <div class="controls-header">
                      <h3>Achados (${marcacoes.length})</h3>
                      <div class="toggle-all-btns">
                        <button class="btn-show-all" onclick="toggleAll(true)">Todos</button>
                        <button class="btn-hide-all" onclick="toggleAll(false)">Nenhum</button>
                      </div>
                    </div>
                    <div id="marcacoesList"></div>
                  </div>
                  
                  <div class="download-section">
                    <button class="btn-download" onclick="downloadImage()">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7,10 12,15 17,10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                      Baixar Imagem com Marcações
                    </button>
                  </div>
                </div>
              </div>
              
              <div class="footer">
                Este documento é gerado automaticamente pelo OdontoVision AI Pro e serve apenas como apoio diagnóstico.
              </div>
              
              <script>
                const marcacoes = ${marcacoesData};
                let visibleMarcacoes = new Set(${visibleIds});
                const analise = ${analiseData};
                const severidadeOrder = ["alta", "media", "baixa", "info"];
                
                function sortMarcacoes(arr) {
                  return [...arr].sort((a, b) => 
                    severidadeOrder.indexOf(a.severidade) - severidadeOrder.indexOf(b.severidade)
                  );
                }
                
                function renderClinicalSection() {
                  const container = document.getElementById('clinicalSection');
                  if (!analise) {
                    container.style.display = 'none';
                    return;
                  }
                  
                  const perdaClass = analise.avaliacao_periodontal?.perda_ossea_global_percentual === 'leve' ? 'good' : 
                                     analise.avaliacao_periodontal?.perda_ossea_global_percentual === 'moderada' ? 'warning' : 
                                     analise.avaliacao_periodontal?.perda_ossea_global_percentual === 'grave' ? 'danger' : '';
                  
                  const alinhClass = analise.avaliacao_ortodontica?.alinhamento === 'bom' ? 'good' : 
                                     analise.avaliacao_ortodontica?.alinhamento === 'regular' ? 'warning' : 
                                     analise.avaliacao_ortodontica?.alinhamento === 'ruim' ? 'danger' : '';
                  
                  container.innerHTML = \`
                    <div class="section-title">📊 Resumo Clínico</div>
                    <div class="clinical-stats">
                      <div class="stat-card">
                        <div class="stat-label">Estrutura Óssea</div>
                        <div class="stat-value good">\${analise.estrutura_ossea_percentual || 'N/A'}</div>
                      </div>
                      <div class="stat-card">
                        <div class="stat-label">Perda Óssea</div>
                        <div class="stat-value \${perdaClass}">\${analise.avaliacao_periodontal?.perda_ossea_global_percentual || 'N/A'}</div>
                      </div>
                      <div class="stat-card">
                        <div class="stat-label">Alinhamento</div>
                        <div class="stat-value \${alinhClass}">\${analise.avaliacao_ortodontica?.alinhamento || 'N/A'}</div>
                      </div>
                      <div class="stat-card">
                        <div class="stat-label">Ausências</div>
                        <div class="stat-value \${analise.ausencias?.length > 0 ? 'warning' : 'good'}">\${analise.ausencias?.length || 0}</div>
                      </div>
                    </div>
                  \`;
                }
                
                function renderPatientSection() {
                  const container = document.getElementById('patientSection');
                  if (!analise?.resumo_para_paciente?.length) {
                    container.style.display = 'none';
                    return;
                  }
                  
                  container.innerHTML = \`
                    <div class="patient-summary">
                      <h4>👤 Resumo para o Paciente</h4>
                      <ul>
                        \${analise.resumo_para_paciente.map(item => \`<li>\${item}</li>\`).join('')}
                      </ul>
                    </div>
                  \`;
                }
                
                function renderMarcacoesList() {
                  const container = document.getElementById('marcacoesList');
                  const sorted = sortMarcacoes(marcacoes);
                  
                  container.innerHTML = sorted.map(m => {
                    const isVisible = visibleMarcacoes.has(m.id);
                    return \`
                      <div class="marcacao-item \${!isVisible ? 'hidden' : ''}" onclick="toggleMarcacao('\${m.id}')">
                        <div class="checkbox-wrapper">
                          <input type="checkbox" \${isVisible ? 'checked' : ''} onclick="event.stopPropagation(); toggleMarcacao('\${m.id}')" />
                        </div>
                        <div class="color-dot" style="background: \${m.cor}"></div>
                        <div class="marcacao-info">
                          <div class="marcacao-label">
                            \${m.label}
                            <span class="severity-badge severity-\${m.severidade}">\${m.severidade.charAt(0).toUpperCase() + m.severidade.slice(1)}</span>
                          </div>
                          <div class="marcacao-desc">\${m.descricao}</div>
                        </div>
                      </div>
                    \`;
                  }).join('');
                }
                
                function renderSvgMarkers() {
                  const svg = document.getElementById('svgOverlay');
                  let svgContent = '';
                  
                  // Render anatomic structures if available
                  if (analise?.seio_maxilar?.direito?.contorno?.length) {
                    const points = analise.seio_maxilar.direito.contorno.map(p => p.join(',')).join(' ');
                    svgContent += \`<polygon points="\${points}" fill="rgba(59,130,246,0.1)" stroke="#3B82F6" stroke-width="0.2" stroke-dasharray="0.5,0.5" />\`;
                  }
                  if (analise?.seio_maxilar?.esquerdo?.contorno?.length) {
                    const points = analise.seio_maxilar.esquerdo.contorno.map(p => p.join(',')).join(' ');
                    svgContent += \`<polygon points="\${points}" fill="rgba(59,130,246,0.1)" stroke="#3B82F6" stroke-width="0.2" stroke-dasharray="0.5,0.5" />\`;
                  }
                  if (analise?.canal_mandibular?.direito?.length >= 2) {
                    const d = analise.canal_mandibular.direito.reduce((acc, p, i) => i === 0 ? \`M \${p[0]},\${p[1]}\` : \`\${acc} L \${p[0]},\${p[1]}\`, '');
                    svgContent += \`<path d="\${d}" fill="none" stroke="#F59E0B" stroke-width="0.4" stroke-linecap="round" />\`;
                  }
                  if (analise?.canal_mandibular?.esquerdo?.length >= 2) {
                    const d = analise.canal_mandibular.esquerdo.reduce((acc, p, i) => i === 0 ? \`M \${p[0]},\${p[1]}\` : \`\${acc} L \${p[0]},\${p[1]}\`, '');
                    svgContent += \`<path d="\${d}" fill="none" stroke="#F59E0B" stroke-width="0.4" stroke-linecap="round" />\`;
                  }
                  
                  // Render marcacoes
                  svgContent += marcacoes
                    .filter(m => visibleMarcacoes.has(m.id))
                    .map(m => {
                      const [x, y, w, h] = m.coords;
                      if (m.tipo === 'rect') {
                        return \`
                          <rect x="\${x}" y="\${y}" width="\${w}" height="\${h}" 
                                fill="\${m.cor}33" stroke="\${m.cor}" stroke-width="0.3" />
                          <text x="\${x}" y="\${y - 1}" fill="\${m.cor}" font-size="2" font-weight="bold">\${m.label}</text>
                        \`;
                      } else {
                        return \`
                          <ellipse cx="\${x}" cy="\${y}" rx="\${w}" ry="\${h}" 
                                   fill="\${m.cor}33" stroke="\${m.cor}" stroke-width="0.3" />
                          <text x="\${x - w}" y="\${y - h - 1}" fill="\${m.cor}" font-size="2" font-weight="bold">\${m.label}</text>
                        \`;
                      }
                    }).join('');
                  
                  svg.innerHTML = svgContent;
                }
                
                function toggleMarcacao(id) {
                  if (visibleMarcacoes.has(id)) {
                    visibleMarcacoes.delete(id);
                  } else {
                    visibleMarcacoes.add(id);
                  }
                  renderMarcacoesList();
                  renderSvgMarkers();
                }
                
                function toggleAll(visible) {
                  if (visible) {
                    visibleMarcacoes = new Set(marcacoes.map(m => m.id));
                  } else {
                    visibleMarcacoes = new Set();
                  }
                  renderMarcacoesList();
                  renderSvgMarkers();
                }
                
                function downloadImage() {
                  const img = document.getElementById('mainImage');
                  const canvas = document.createElement('canvas');
                  canvas.width = img.naturalWidth || 1920;
                  canvas.height = img.naturalHeight || 1080;
                  const ctx = canvas.getContext('2d');
                  
                  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                  
                  marcacoes.filter(m => visibleMarcacoes.has(m.id)).forEach(m => {
                    ctx.strokeStyle = m.cor;
                    ctx.lineWidth = 4;
                    ctx.fillStyle = m.cor + '33';
                    const x = (m.coords[0] / 100) * canvas.width;
                    const y = (m.coords[1] / 100) * canvas.height;
                    const w = (m.coords[2] / 100) * canvas.width;
                    const h = (m.coords[3] / 100) * canvas.height;
                    
                    if (m.tipo === 'rect') {
                      ctx.strokeRect(x, y, w, h);
                      ctx.fillRect(x, y, w, h);
                    } else {
                      ctx.beginPath();
                      ctx.ellipse(x, y, w, h, 0, 0, 2 * Math.PI);
                      ctx.stroke();
                      ctx.fill();
                    }
                    
                    ctx.font = 'bold 16px sans-serif';
                    const textWidth = ctx.measureText(m.label).width;
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                    ctx.fillRect(x, y - 22, textWidth + 8, 20);
                    ctx.fillStyle = m.cor;
                    ctx.fillText(m.label, x + 4, y - 7);
                  });
                  
                  const link = document.createElement('a');
                  link.download = 'analise-visual-odontovision.png';
                  link.href = canvas.toDataURL('image/png');
                  link.click();
                }
                
                // Initial render
                renderClinicalSection();
                renderPatientSection();
                renderMarcacoesList();
                renderSvgMarkers();
              </script>
            </body>
          </html>
        `);
        newWindow.document.close();
        toast.success("Janela interativa aberta!", { id: "newwindow" });
      } else {
        toast.error("Bloqueador de pop-up ativo. Permita pop-ups para esta função.", { id: "newwindow" });
      }
    } catch (error) {
      toast.error("Erro ao abrir janela", { id: "newwindow" });
    }
  };

  const sortedMarcacoes = [...marcacoes].sort(
    (a, b) => severidadeOrder.indexOf(a.severidade) - severidadeOrder.indexOf(b.severidade)
  );

  const getSeveridadeBadge = (severidade: string) => {
    switch (severidade) {
      case "alta": return <Badge variant="destructive">Alta</Badge>;
      case "media": return <Badge className="bg-amber-500 hover:bg-amber-600">Média</Badge>;
      case "baixa": return <Badge className="bg-green-500 hover:bg-green-600">Baixa</Badge>;
      default: return <Badge variant="secondary">Info</Badge>;
    }
  };

  const getPerdaOsseaColor = (perda: string) => {
    switch (perda) {
      case "leve": return "text-green-500";
      case "moderada": return "text-amber-500";
      case "grave": return "text-red-500";
      default: return "text-muted-foreground";
    }
  };

  const getAlinhamentoColor = (alinhamento: string) => {
    switch (alinhamento) {
      case "bom": return "text-green-500";
      case "regular": return "text-amber-500";
      case "ruim": return "text-red-500";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="space-y-4">
      {/* Clinical Summary Cards */}
      {analiseCompleta && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-3 px-4">
              <p className="text-xs text-muted-foreground mb-1">Estrutura Óssea</p>
              <p className="text-lg font-bold text-green-500">{analiseCompleta.estrutura_ossea_percentual}</p>
            </CardContent>
          </Card>
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-3 px-4">
              <p className="text-xs text-muted-foreground mb-1">Perda Óssea</p>
              <p className={cn("text-lg font-bold capitalize", getPerdaOsseaColor(analiseCompleta.avaliacao_periodontal.perda_ossea_global_percentual))}>
                {analiseCompleta.avaliacao_periodontal.perda_ossea_global_percentual}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-3 px-4">
              <p className="text-xs text-muted-foreground mb-1">Alinhamento</p>
              <p className={cn("text-lg font-bold capitalize", getAlinhamentoColor(analiseCompleta.avaliacao_ortodontica.alinhamento))}>
                {analiseCompleta.avaliacao_ortodontica.alinhamento}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-3 px-4">
              <p className="text-xs text-muted-foreground mb-1">Ausências</p>
              <p className={cn("text-lg font-bold", analiseCompleta.ausencias.length > 0 ? "text-amber-500" : "text-green-500")}>
                {analiseCompleta.ausencias.length}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Control Buttons - Mobile optimized */}
      <div className="space-y-3">
        {/* Primary controls row */}
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            variant={showMarcacoes ? "default" : "outline"} 
            size="sm" 
            className="min-h-[44px] touch-manipulation active:opacity-80"
            onClick={() => setShowMarcacoes(!showMarcacoes)}
          >
            {showMarcacoes ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />} 
            <span className="hidden xs:inline">Marcações</span>
          </Button>
          <Button 
            variant={showList ? "default" : "outline"} 
            size="sm" 
            className="min-h-[44px] touch-manipulation active:opacity-80"
            onClick={() => setShowList(!showList)}
          >
            <List className="w-4 h-4 mr-1" /> 
            <span>Lista ({marcacoes.length})</span>
          </Button>
          
          {/* Drawing Mode Button */}
          <Button 
            variant={showDrawingMode ? "default" : "outline"} 
            size="sm" 
            className="min-h-[44px] touch-manipulation active:opacity-80"
            onClick={() => setShowDrawingMode(!showDrawingMode)}
          >
            <PenTool className="w-4 h-4 mr-1" /> 
            <span className="hidden sm:inline">Desenho Livre</span>
            <span className="sm:hidden">Desenho</span>
          </Button>
          
          {editable && (
            <>
              <Button 
                variant={editMode === "add" ? "default" : "outline"} 
                size="sm" 
                className="min-h-[44px] touch-manipulation active:opacity-80"
                onClick={() => {
                  setEditMode(editMode === "add" ? "none" : "add");
                  if (editMode !== "add") toast.info("Clique na imagem para adicionar uma marcação");
                }}
              >
                <Plus className="w-4 h-4 mr-1" /> 
                <span className="hidden sm:inline">Adicionar</span>
              </Button>
              <Button 
                variant={editMode === "move" ? "default" : "outline"} 
                size="sm" 
                className="min-h-[44px] touch-manipulation active:opacity-80"
                onClick={() => {
                  setEditMode(editMode === "move" ? "none" : "move");
                  setMovingMarcacao(null);
                  if (editMode !== "move") toast.info("Selecione uma marcação para mover");
                }}
              >
                <Move className="w-4 h-4 mr-1" /> 
                <span className="hidden sm:inline">Mover</span>
              </Button>
            </>
          )}
        </div>

        {/* Secondary controls row - clinical details */}
        {analiseCompleta && (
          <div className="flex flex-wrap items-center gap-2">
            <Button 
              variant={showPatientSummary ? "default" : "outline"} 
              size="sm" 
              className="min-h-[44px] touch-manipulation active:opacity-80"
              onClick={() => setShowPatientSummary(!showPatientSummary)}
            >
              <User className="w-4 h-4 mr-1" /> 
              <span className="hidden sm:inline">Resumo Paciente</span>
              <span className="sm:hidden">Paciente</span>
            </Button>
            <Button 
              variant={showClinicalDetails ? "default" : "outline"} 
              size="sm" 
              className="min-h-[44px] touch-manipulation active:opacity-80"
              onClick={() => setShowClinicalDetails(!showClinicalDetails)}
            >
              <Stethoscope className="w-4 h-4 mr-1" /> 
              <span className="hidden sm:inline">Detalhes Clínicos</span>
              <span className="sm:hidden">Clínico</span>
            </Button>
            <Button 
              variant={showOdontograma ? "default" : "outline"} 
              size="sm" 
              className="min-h-[44px] touch-manipulation active:opacity-80"
              onClick={() => setShowOdontograma(!showOdontograma)}
            >
              <Grid3X3 className="w-4 h-4 mr-1" /> 
              <span className="hidden sm:inline">Odontograma</span>
              <span className="sm:hidden">Odonto</span>
            </Button>
            <Button 
              variant={showAnatomicStructures ? "default" : "outline"} 
              size="sm" 
              className="min-h-[44px] touch-manipulation active:opacity-80"
              onClick={() => setShowAnatomicStructures(!showAnatomicStructures)}
            >
              <Activity className="w-4 h-4 mr-1" /> 
              <span className="hidden sm:inline">Estruturas</span>
            </Button>
          </div>
        )}
        
        {/* Zoom and tools row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button 
            variant={showLegend ? "default" : "outline"} 
            size="sm" 
            className="min-h-[44px] touch-manipulation active:opacity-80"
            onClick={() => setShowLegend(!showLegend)}
            title="Mostrar/ocultar legenda"
          >
            Legenda
          </Button>
          
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="min-h-[44px] min-w-[44px] touch-manipulation" onClick={handleZoomOut}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground px-2 min-w-[48px] text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="outline" size="icon" className="min-h-[44px] min-w-[44px] touch-manipulation" onClick={handleZoomIn}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="min-h-[44px] min-w-[44px] touch-manipulation" onClick={handleResetZoom} title="Resetar zoom">
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="min-h-[44px] min-w-[44px] touch-manipulation" onClick={handleDownload} title="Baixar imagem">
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="min-h-[44px] min-w-[44px] touch-manipulation" onClick={handleOpenInNewWindow} title="Abrir em nova janela">
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {editMode !== "none" && (
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 text-sm text-foreground">
          {editMode === "add" && "Modo Adicionar: Clique na imagem para posicionar uma nova marcação"}
          {editMode === "move" && !movingMarcacao && "Modo Mover: Clique em uma marcação para selecioná-la"}
          {editMode === "move" && movingMarcacao && "Clique na nova posição para mover a marcação selecionada"}
        </div>
      )}

      {/* Patient Summary Panel */}
      {showPatientSummary && analiseCompleta?.resumo_para_paciente?.length > 0 && (
        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" /> Resumo para o Paciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analiseCompleta.resumo_para_paciente.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Clinical Details Panel */}
      {showClinicalDetails && analiseCompleta && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Stethoscope className="w-4 h-4" /> Detalhes Clínicos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Periodontal */}
            {analiseCompleta.avaliacao_periodontal.comentarios && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Avaliação Periodontal</p>
                <p className="text-sm">{analiseCompleta.avaliacao_periodontal.comentarios}</p>
              </div>
            )}
            
            {/* Orthodontic */}
            {(analiseCompleta.avaliacao_ortodontica.inclinacoes_relevantes.length > 0 || 
              analiseCompleta.avaliacao_ortodontica.sugestoes_iniciais.length > 0) && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Avaliação Ortodôntica</p>
                {analiseCompleta.avaliacao_ortodontica.inclinacoes_relevantes.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs text-muted-foreground">Inclinações:</p>
                    <ul className="text-sm list-disc list-inside">
                      {analiseCompleta.avaliacao_ortodontica.inclinacoes_relevantes.map((inc, i) => (
                        <li key={i}>{inc}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {analiseCompleta.avaliacao_ortodontica.sugestoes_iniciais.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground">Sugestões:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {analiseCompleta.avaliacao_ortodontica.sugestoes_iniciais.map((sug, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{sug}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Teeth Summary */}
            {Object.keys(analiseCompleta.dentes).length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Dentes Identificados ({Object.keys(analiseCompleta.dentes).length})</p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(analiseCompleta.dentes).map(([num, info]) => {
                    const isHealthy = info.status.toLowerCase().includes("saudável") || info.status.toLowerCase().includes("normal");
                    const hasIssue = info.status.toLowerCase().includes("cárie") || 
                                     info.status.toLowerCase().includes("lesão") || 
                                     info.status.toLowerCase().includes("fratura");
                    return (
                      <Badge 
                        key={num} 
                        variant="outline" 
                        className={cn(
                          "text-xs",
                          isHealthy && "bg-green-500/10 border-green-500/30 text-green-700",
                          hasIssue && "bg-red-500/10 border-red-500/30 text-red-700"
                        )}
                        title={info.detalhes}
                      >
                        {num}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Absences */}
            {analiseCompleta.ausencias.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Ausências</p>
                <div className="flex flex-wrap gap-1">
                  {analiseCompleta.ausencias.map((dente) => (
                    <Badge key={dente} variant="outline" className="text-xs line-through opacity-60">
                      {dente}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Implants */}
            {analiseCompleta.implantes.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Implantes</p>
                <div className="flex flex-wrap gap-1">
                  {analiseCompleta.implantes.map((imp, i) => (
                    <Badge key={i} variant="outline" className="text-xs bg-purple-500/10 border-purple-500/30 text-purple-700">
                      {imp.dente} {imp.detalhes && `- ${imp.detalhes}`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Odontograma Interativo */}
      {showOdontograma && analiseCompleta && (
        <Odontograma 
          analiseCompleta={analiseCompleta} 
          onToothClick={handleToothClick}
        />
      )}

      {resumo && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3">
            <p className="text-sm text-foreground">{resumo}</p>
          </CardContent>
        </Card>
      )}

      {/* Main Image with Markers */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div 
            ref={containerRef} 
            className={cn(
              "relative overflow-auto bg-black/5",
              editMode !== "none" && "cursor-crosshair"
            )} 
            style={{ maxHeight: "70vh" }} 
            onClick={handleBackgroundClick}
          >
            <div 
              ref={imageWrapperRef}
              className="relative inline-block transition-transform duration-200" 
              style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
            >
              <img src={imageUrl} alt="Radiografia com análise visual" className="max-w-full h-auto" />
              
              {/* SVG Legend Overlay */}
              {/* Legend moved outside the image container */}
              
              {showMarcacoes && (
                <svg 
                  ref={svgRef} 
                  className="absolute inset-0 w-full h-full pointer-events-none" 
                  viewBox="0 0 100 100" 
                  preserveAspectRatio="none"
                >
                  {/* Render anatomic structures from analiseCompleta */}
                  {renderSeioMaxilar()}
                  {renderCanalMandibular()}
                  
                  {/* Render pathologies and findings directly from analiseCompleta */}
                  {renderDentes()}
                  {renderCaries()}
                  {renderLesoes()}
                  {renderImplantes()}
                  {renderReabsorcoes()}
                  {renderFraturas()}
                  
                  {/* Highlighted position indicator from odontogram click */}
                  {highlightedPosition && (
                    <g className="animate-pulse">
                      <circle
                        cx={highlightedPosition.x}
                        cy={highlightedPosition.y}
                        r={4}
                        fill="none"
                        stroke="#FBBF24"
                        strokeWidth={0.5}
                        className="animate-ping"
                      />
                      <circle
                        cx={highlightedPosition.x}
                        cy={highlightedPosition.y}
                        r={2}
                        fill="none"
                        stroke="#FBBF24"
                        strokeWidth={0.3}
                      />
                      <line
                        x1={highlightedPosition.x - 3}
                        y1={highlightedPosition.y}
                        x2={highlightedPosition.x + 3}
                        y2={highlightedPosition.y}
                        stroke="#FBBF24"
                        strokeWidth={0.2}
                      />
                      <line
                        x1={highlightedPosition.x}
                        y1={highlightedPosition.y - 3}
                        x2={highlightedPosition.x}
                        y2={highlightedPosition.y + 3}
                        stroke="#FBBF24"
                        strokeWidth={0.2}
                      />
                    </g>
                  )}
                  
                  {/* Render marcacoes with collision-aware labels */}
                  {marcacoes.filter(m => visibleMarcacoes.has(m.id)).map((m) => {
                    const [x, y, w, h] = m.coords;
                    const isMoving = movingMarcacao === m.id;
                    
                    // Get calculated label position from collision detection
                    const labelPos = labelPositions.get(m.id);
                    const labelX = labelPos?.x ?? x;
                    const labelY = labelPos?.y ?? Math.max(y - 2, 3);
                    const labelSide = labelPos?.side ?? "top";
                    
                    // Calculate connector line points
                    const shapeCenter = m.tipo === "rect" 
                      ? { cx: x + (w || 0) / 2, cy: y + (h || 0) / 2 }
                      : { cx: x, cy: y };
                    
                    const labelCenter = {
                      cx: labelX + (m.label.length * 0.9 + 1) / 2,
                      cy: labelY - 0.8
                    };
                    
                    // Only draw connector if label is not directly adjacent
                    const distance = Math.sqrt(
                      Math.pow(shapeCenter.cx - labelCenter.cx, 2) + 
                      Math.pow(shapeCenter.cy - labelCenter.cy, 2)
                    );
                    const showConnector = distance > 5;
                    
                    if (m.tipo === "rect") return (
                      <g key={m.id} className="pointer-events-auto cursor-pointer">
                        <rect 
                          x={x} y={y} width={w} height={h} 
                          fill={`${m.cor}25`} 
                          stroke={isMoving ? "#fff" : m.cor} 
                          strokeWidth={isMoving ? 0.4 : 0.25}
                          strokeDasharray={isMoving ? "1,1" : "none"}
                          className="transition-all duration-200 hover:fill-opacity-50" 
                          onClick={(e) => handleMarcacaoClick(m, e as unknown as React.MouseEvent)} 
                        />
                        {/* Connector line if label is far */}
                        {showConnector && (
                          <line
                            x1={shapeCenter.cx}
                            y1={labelSide === "bottom" ? y + (h || 0) : y}
                            x2={labelCenter.cx}
                            y2={labelY}
                            stroke={m.cor}
                            strokeWidth={0.1}
                            strokeOpacity={0.5}
                            strokeDasharray="0.3,0.3"
                            className="pointer-events-none"
                          />
                        )}
                        {/* Label background */}
                        <rect
                          x={labelX}
                          y={labelY - 1.7}
                          width={m.label.length * 0.9 + 1}
                          height={2}
                          fill="rgba(0,0,0,0.8)"
                          rx={0.3}
                          className="pointer-events-none"
                        />
                        <text 
                          x={labelX + 0.5} 
                          y={labelY} 
                          fill={m.cor} 
                          fontSize={1.4} 
                          fontWeight="bold" 
                          className="pointer-events-none select-none"
                        >
                          {m.label}
                        </text>
                      </g>
                    );
                    
                    if (m.tipo === "circle" || m.tipo === "ellipse") return (
                      <g key={m.id} className="pointer-events-auto cursor-pointer">
                        <ellipse 
                          cx={x} cy={y} rx={w} ry={h} 
                          fill={`${m.cor}25`} 
                          stroke={isMoving ? "#fff" : m.cor} 
                          strokeWidth={isMoving ? 0.4 : 0.25}
                          strokeDasharray={isMoving ? "1,1" : "none"}
                          className="transition-all duration-200 hover:fill-opacity-50" 
                          onClick={(e) => handleMarcacaoClick(m, e as unknown as React.MouseEvent)} 
                        />
                        {/* Connector line if label is far */}
                        {showConnector && (
                          <line
                            x1={x}
                            y1={labelSide === "bottom" ? y + (h || 0) : y - (h || 0)}
                            x2={labelCenter.cx}
                            y2={labelY}
                            stroke={m.cor}
                            strokeWidth={0.1}
                            strokeOpacity={0.5}
                            strokeDasharray="0.3,0.3"
                            className="pointer-events-none"
                          />
                        )}
                        {/* Label background for ellipse */}
                        <rect
                          x={labelX}
                          y={labelY - 1.7}
                          width={m.label.length * 0.9 + 1}
                          height={2}
                          fill="rgba(0,0,0,0.8)"
                          rx={0.3}
                          className="pointer-events-none"
                        />
                        <text 
                          x={labelX + 0.5} 
                          y={labelY} 
                          fill={m.cor} 
                          fontSize={1.4} 
                          fontWeight="bold" 
                          className="pointer-events-none select-none"
                        >
                          {m.label}
                        </text>
                      </g>
                    );
                    return null;
                  })}
                </svg>
              )}
              {selectedMarcacao && editMode === "none" && (
                <MarcacaoTooltip 
                  marcacao={selectedMarcacao} 
                  position={tooltipPosition} 
                  onClose={() => setSelectedMarcacao(null)}
                  editable={editable}
                  onDelete={() => handleDeleteMarcacao(selectedMarcacao.id)}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend below the image card */}
      {showLegend && showMarcacoes && (
        <SvgLegend showAnatomicStructures={showAnatomicStructures} className="w-full" />
      )}

      {/* Drawing Canvas Mode */}
      {showDrawingMode && (
        <DrawingCanvas 
          imageUrl={imageUrl}
          onSave={(dataUrl) => {
            toast.success("Anotações de desenho salvas!");
          }}
        />
      )}

      {/* Findings List */}
      {showList && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Achados Identificados</CardTitle>
            <CardDescription className="flex items-center justify-between">
              <span>{marcacoes.length} estrutura{marcacoes.length !== 1 ? "s" : ""} identificada{marcacoes.length !== 1 ? "s" : ""}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs">
                  {visibleMarcacoes.size}/{marcacoes.length} visíveis
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => toggleAllMarcacoes(visibleMarcacoes.size < marcacoes.length)}
                >
                  {visibleMarcacoes.size === marcacoes.length ? "Ocultar Todas" : "Mostrar Todas"}
                </Button>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {sortedMarcacoes.map((m) => (
                <div 
                  key={m.id} 
                  className={cn(
                    "p-3 rounded-lg border transition-colors hover:bg-muted/50", 
                    selectedMarcacao?.id === m.id && "ring-2 ring-primary",
                    !visibleMarcacoes.has(m.id) && "opacity-50"
                  )} 
                  style={{ borderLeftColor: m.cor, borderLeftWidth: 4 }} 
                >
                  <div className="flex items-center gap-3 mb-1">
                    <Checkbox
                      id={`visibility-${m.id}`}
                      checked={visibleMarcacoes.has(m.id)}
                      onCheckedChange={() => toggleMarcacaoVisibility(m.id)}
                      className="data-[state=checked]:bg-primary"
                    />
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => setSelectedMarcacao(m)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{m.label}</span>
                        {getSeveridadeBadge(m.severidade)}
                        <Badge variant="outline" className="text-xs">{m.categoria}</Badge>
                      </div>
                    </div>
                    {editable && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteMarcacao(m.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground pl-9">{m.descricao}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {observacoes && (
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="py-3">
            <p className="text-sm font-medium text-amber-700 mb-1">Observações</p>
            <p className="text-sm text-foreground">{observacoes}</p>
          </CardContent>
        </Card>
      )}

      {/* Add Marker Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Marcação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input 
                value={newMarcacao.label || ""} 
                onChange={(e) => setNewMarcacao(prev => ({ ...prev, label: e.target.value }))}
                placeholder="Ex: Lesão periapical"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Input 
                value={newMarcacao.descricao || ""} 
                onChange={(e) => setNewMarcacao(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descrição detalhada do achado"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select 
                  value={newMarcacao.tipo} 
                  onValueChange={(v) => setNewMarcacao(prev => ({ ...prev, tipo: v as Marcacao["tipo"] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rect">Retângulo</SelectItem>
                    <SelectItem value="circle">Círculo</SelectItem>
                    <SelectItem value="ellipse">Elipse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Severidade</Label>
                <Select 
                  value={newMarcacao.severidade} 
                  onValueChange={(v) => setNewMarcacao(prev => ({ ...prev, severidade: v as Marcacao["severidade"] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info (Azul)</SelectItem>
                    <SelectItem value="baixa">Baixa (Verde)</SelectItem>
                    <SelectItem value="media">Média (Amarelo)</SelectItem>
                    <SelectItem value="alta">Alta (Vermelho)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Categoria</Label>
              <Select 
                value={newMarcacao.categoria} 
                onValueChange={(v) => setNewMarcacao(prev => ({ ...prev, categoria: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anatomia">Anatomia</SelectItem>
                  <SelectItem value="patologia">Patologia</SelectItem>
                  <SelectItem value="tratamento">Tratamento</SelectItem>
                  <SelectItem value="anomalia">Anomalia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddMarcacao}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
