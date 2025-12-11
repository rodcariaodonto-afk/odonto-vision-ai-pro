import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { MarcacaoTooltip } from "./MarcacaoTooltip";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Eye, EyeOff, ZoomIn, ZoomOut, RotateCcw, Download, List, Plus, Trash2, Edit2, Move, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export interface Marcacao {
  id: string;
  tipo: "rect" | "circle" | "polygon" | "ellipse";
  coords: number[];
  label: string;
  descricao: string;
  cor: string;
  severidade: "baixa" | "media" | "alta" | "info";
  categoria: string;
}

interface VisualAnalysisProps {
  imageUrl: string;
  marcacoes: Marcacao[];
  resumo?: string;
  observacoes?: string;
  editable?: boolean;
  onMarcacoesChange?: (marcacoes: Marcacao[]) => void;
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
  onMarcacoesChange 
}: VisualAnalysisProps) {
  const [selectedMarcacao, setSelectedMarcacao] = useState<Marcacao | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showMarcacoes, setShowMarcacoes] = useState(true);
  const [visibleMarcacoes, setVisibleMarcacoes] = useState<Set<string>>(new Set(marcacoes.map(m => m.id)));
  const [zoom, setZoom] = useState(1);
  const [showList, setShowList] = useState(false);
  const [editMode, setEditMode] = useState<"none" | "add" | "move">("none");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newMarcacao, setNewMarcacao] = useState<Partial<Marcacao>>({
    tipo: "rect",
    severidade: "info",
    categoria: "anatomia",
    coords: [10, 10, 10, 10],
  });
  const [movingMarcacao, setMovingMarcacao] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

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
          // Only draw visible markers
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
            
            // Draw label with background for better visibility
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
        // Prepare data for the new window
        const marcacoesData = JSON.stringify(marcacoes);
        const visibleIds = JSON.stringify(Array.from(visibleMarcacoes));
        
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
                  width: 320px;
                  background: #2a2a2a;
                  border-radius: 8px;
                  padding: 16px;
                  overflow-y: auto;
                  max-height: calc(100vh - 140px);
                }
                .controls-header {
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  margin-bottom: 16px;
                  padding-bottom: 12px;
                  border-bottom: 1px solid #3a3a3a;
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
                  padding: 12px;
                  margin-bottom: 8px;
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
                  width: 14px;
                  height: 14px;
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
                  font-size: 14px;
                  margin-bottom: 4px;
                }
                .marcacao-desc {
                  font-size: 12px;
                  color: #aaa;
                  line-height: 1.4;
                }
                .severity-badge {
                  font-size: 10px;
                  padding: 2px 6px;
                  border-radius: 4px;
                  font-weight: 600;
                  margin-left: 8px;
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
                <p>Análise Visual Interativa - ${new Date().toLocaleDateString('pt-BR')}</p>
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
                  <div class="controls-header">
                    <h3>Achados (${marcacoes.length})</h3>
                    <div class="toggle-all-btns">
                      <button class="btn-show-all" onclick="toggleAll(true)">Todos</button>
                      <button class="btn-hide-all" onclick="toggleAll(false)">Nenhum</button>
                    </div>
                  </div>
                  
                  <div id="marcacoesList"></div>
                  
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
                const severidadeOrder = ["alta", "media", "baixa", "info"];
                
                function sortMarcacoes(arr) {
                  return [...arr].sort((a, b) => 
                    severidadeOrder.indexOf(a.severidade) - severidadeOrder.indexOf(b.severidade)
                  );
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
                  
                  svg.innerHTML = marcacoes
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button 
          variant={showMarcacoes ? "default" : "outline"} 
          size="sm" 
          onClick={() => setShowMarcacoes(!showMarcacoes)}
        >
          {showMarcacoes ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />} 
          Marcações
        </Button>
        <Button 
          variant={showList ? "default" : "outline"} 
          size="sm" 
          onClick={() => setShowList(!showList)}
        >
          <List className="w-4 h-4 mr-1" /> Lista ({marcacoes.length})
        </Button>
        
        {editable && (
          <>
            <Button 
              variant={editMode === "add" ? "default" : "outline"} 
              size="sm" 
              onClick={() => {
                setEditMode(editMode === "add" ? "none" : "add");
                if (editMode !== "add") toast.info("Clique na imagem para adicionar uma marcação");
              }}
            >
              <Plus className="w-4 h-4 mr-1" /> Adicionar
            </Button>
            <Button 
              variant={editMode === "move" ? "default" : "outline"} 
              size="sm" 
              onClick={() => {
                setEditMode(editMode === "move" ? "none" : "move");
                setMovingMarcacao(null);
                if (editMode !== "move") toast.info("Selecione uma marcação para mover");
              }}
            >
              <Move className="w-4 h-4 mr-1" /> Mover
            </Button>
          </>
        )}
        
        <div className="flex items-center gap-1 ml-auto">
          <Button variant="outline" size="icon" onClick={handleZoomOut}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-2">{Math.round(zoom * 100)}%</span>
          <Button variant="outline" size="icon" onClick={handleZoomIn}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleResetZoom} title="Resetar zoom">
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleDownload} title="Baixar imagem">
            <Download className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleOpenInNewWindow} title="Abrir em nova janela">
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {editMode !== "none" && (
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 text-sm text-foreground">
          {editMode === "add" && "Modo Adicionar: Clique na imagem para posicionar uma nova marcação"}
          {editMode === "move" && !movingMarcacao && "Modo Mover: Clique em uma marcação para selecioná-la"}
          {editMode === "move" && movingMarcacao && "Clique na nova posição para mover a marcação selecionada"}
        </div>
      )}

      {resumo && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3">
            <p className="text-sm text-foreground">{resumo}</p>
          </CardContent>
        </Card>
      )}

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
              className="relative inline-block transition-transform duration-200" 
              style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
            >
              <img src={imageUrl} alt="Radiografia com análise visual" className="max-w-full h-auto" />
              {showMarcacoes && (
                <svg 
                  ref={svgRef} 
                  className="absolute inset-0 w-full h-full pointer-events-none" 
                  viewBox="0 0 100 100" 
                  preserveAspectRatio="none"
                >
                  {marcacoes.filter(m => visibleMarcacoes.has(m.id)).map((m) => {
                    const [x, y, w, h] = m.coords;
                    const isMoving = movingMarcacao === m.id;
                    if (m.tipo === "rect") return (
                      <g key={m.id} className="pointer-events-auto cursor-pointer">
                        <rect 
                          x={x} y={y} width={w} height={h} 
                          fill={`${m.cor}20`} 
                          stroke={isMoving ? "#fff" : m.cor} 
                          strokeWidth={isMoving ? 0.5 : 0.3}
                          strokeDasharray={isMoving ? "1,1" : "none"}
                          className="transition-all duration-200 hover:fill-opacity-40" 
                          onClick={(e) => handleMarcacaoClick(m, e as unknown as React.MouseEvent)} 
                        />
                        <text x={x} y={y - 1} fill={m.cor} fontSize={2} fontWeight="bold" className="pointer-events-none select-none">
                          {m.label}
                        </text>
                      </g>
                    );
                    if (m.tipo === "circle" || m.tipo === "ellipse") return (
                      <g key={m.id} className="pointer-events-auto cursor-pointer">
                        <ellipse 
                          cx={x} cy={y} rx={w} ry={h} 
                          fill={`${m.cor}20`} 
                          stroke={isMoving ? "#fff" : m.cor} 
                          strokeWidth={isMoving ? 0.5 : 0.3}
                          strokeDasharray={isMoving ? "1,1" : "none"}
                          className="transition-all duration-200 hover:fill-opacity-40" 
                          onClick={(e) => handleMarcacaoClick(m, e as unknown as React.MouseEvent)} 
                        />
                        <text x={x} y={y - h - 1} fill={m.cor} fontSize={2} fontWeight="bold" textAnchor="middle" className="pointer-events-none select-none">
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
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{m.label}</span>
                        <div className="flex items-center gap-2">
                          {getSeveridadeBadge(m.severidade)}
                          {editable && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteMarcacao(m.id);
                              }}
                            >
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{m.descricao}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {observacoes && (
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-600 dark:text-amber-400">Observações</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">{observacoes}</p>
          </CardContent>
        </Card>
      )}

      {/* Add Marcacao Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Marcação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="label">Nome da Estrutura *</Label>
              <Input 
                id="label"
                placeholder="Ex: Lesão Periapical"
                value={newMarcacao.label || ""}
                onChange={(e) => setNewMarcacao(prev => ({ ...prev, label: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição *</Label>
              <Input 
                id="descricao"
                placeholder="Descrição detalhada do achado"
                value={newMarcacao.descricao || ""}
                onChange={(e) => setNewMarcacao(prev => ({ ...prev, descricao: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
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
                    <SelectItem value="ellipse">Elipse</SelectItem>
                    <SelectItem value="circle">Círculo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
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
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select 
                value={newMarcacao.categoria} 
                onValueChange={(v) => setNewMarcacao(prev => ({ ...prev, categoria: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anatomia">Estrutura Anatômica</SelectItem>
                  <SelectItem value="patologia">Achado Patológico</SelectItem>
                  <SelectItem value="tratamento">Tratamento Prévio</SelectItem>
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
