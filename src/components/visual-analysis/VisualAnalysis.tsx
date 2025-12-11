import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { MarcacaoTooltip } from "./MarcacaoTooltip";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, ZoomIn, ZoomOut, RotateCcw, Download, List } from "lucide-react";

interface Marcacao {
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
}

const severidadeOrder = ["alta", "media", "baixa", "info"];

export function VisualAnalysis({ imageUrl, marcacoes, resumo, observacoes }: VisualAnalysisProps) {
  const [selectedMarcacao, setSelectedMarcacao] = useState<Marcacao | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showMarcacoes, setShowMarcacoes] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [showList, setShowList] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const handleMarcacaoClick = (marcacao: Marcacao, event: React.MouseEvent) => {
    event.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      setTooltipPosition({ x, y });
    }
    setSelectedMarcacao(marcacao);
  };

  const handleBackgroundClick = () => setSelectedMarcacao(null);
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

  const handleDownload = async () => {
    if (!containerRef.current) return;
    const img = containerRef.current.querySelector("img");
    if (!img) return;

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || 1920;
    canvas.height = img.naturalHeight || 1080;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const tempImg = new Image();
    tempImg.crossOrigin = "anonymous";
    tempImg.onload = () => {
      ctx.drawImage(tempImg, 0, 0, canvas.width, canvas.height);
      if (showMarcacoes) {
        marcacoes.forEach(m => {
          ctx.strokeStyle = m.cor;
          ctx.lineWidth = 3;
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
          ctx.fillStyle = m.cor;
          ctx.font = "bold 14px sans-serif";
          ctx.fillText(m.label, x, y - 5);
        });
      }
      const link = document.createElement("a");
      link.download = "analise-visual-odontovision.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    tempImg.src = imageUrl;
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
        <div className="flex items-center gap-1 ml-auto">
          <Button variant="outline" size="icon" onClick={handleZoomOut}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-2">{Math.round(zoom * 100)}%</span>
          <Button variant="outline" size="icon" onClick={handleZoomIn}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleResetZoom}>
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleDownload}>
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

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
            className="relative overflow-auto bg-black/5" 
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
                  {marcacoes.map((m) => {
                    const [x, y, w, h] = m.coords;
                    if (m.tipo === "rect") return (
                      <g key={m.id} className="pointer-events-auto cursor-pointer">
                        <rect 
                          x={x} y={y} width={w} height={h} 
                          fill={`${m.cor}20`} stroke={m.cor} strokeWidth={0.3} 
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
                          fill={`${m.cor}20`} stroke={m.cor} strokeWidth={0.3} 
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
              {selectedMarcacao && (
                <MarcacaoTooltip 
                  marcacao={selectedMarcacao} 
                  position={tooltipPosition} 
                  onClose={() => setSelectedMarcacao(null)} 
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
            <CardDescription>
              {marcacoes.length} estrutura{marcacoes.length !== 1 ? "s" : ""} identificada{marcacoes.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {sortedMarcacoes.map((m) => (
                <div 
                  key={m.id} 
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50", 
                    selectedMarcacao?.id === m.id && "ring-2 ring-primary"
                  )} 
                  style={{ borderLeftColor: m.cor, borderLeftWidth: 4 }} 
                  onClick={() => setSelectedMarcacao(m)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-foreground">{m.label}</span>
                    {getSeveridadeBadge(m.severidade)}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{m.descricao}</p>
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
    </div>
  );
}
