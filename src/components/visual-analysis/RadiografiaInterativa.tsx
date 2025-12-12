import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { TipoMarcacao, MarcacaoManual, TipoEstrutura, EstruturaManual, tipoMarcacaoConfig, estruturaConfig } from "./OdontogramaInterativo";
import { toast } from "sonner";

// Interface para traço de desenho livre
interface Stroke {
  id: string;
  tipo: TipoEstrutura;
  lado: "direito" | "esquerdo";
  points: Array<[number, number]>;
  color: string;
}

interface RadiografiaInterativaProps {
  imageUrl: string;
  zoom: number;
  marcacoesManuals: MarcacaoManual[];
  onAddMarcacao: (marcacao: MarcacaoManual) => void;
  onMoveMarcacao: (id: string, x: number, y: number) => void;
  onDeleteMarcacao: (id: string) => void;
  modoAtivo: { dente: string | null; tipo: TipoMarcacao | null };
  showMarcacoes: boolean;
  showAnatomicStructures: boolean;
  // Props para estruturas manuais (desenho livre)
  estruturaAtiva?: { tipo: TipoEstrutura | null; lado: "direito" | "esquerdo" | null };
  estruturasManuais?: EstruturaManual[];
  onAddEstruturaManual?: (estrutura: EstruturaManual) => void;
  onResetEstrutura?: (tipo: TipoEstrutura, lado: "direito" | "esquerdo") => void;
}

// Tamanhos específicos para cada tipo de marcação (muito menores)
const marcacaoSizes: Record<TipoMarcacao, number> = {
  carie: 0.8,        // Bolinha bem pequena (era 2.5)
  restauracao: 1.0,  // Quadrado pequeno
  endo: 1.2,         // Letra "E" legível mas discreta
  ausente: 1.2,      // X pequeno
  implante: 1.5,     // Parafuso visível
  protese: 1.5,      // Meia-lua média
  lesao: 1.0,        // Círculo vazado pequeno
  fratura: 1.5,      // Linha fina
};

// SVG icons for each type - com tamanhos específicos
const renderMarcacaoIcon = (tipo: TipoMarcacao, x: number, y: number) => {
  const config = tipoMarcacaoConfig[tipo];
  const size = marcacaoSizes[tipo];
  
  switch (tipo) {
    case "carie":
      return <circle cx={x} cy={y} r={size} fill={config.cor} opacity={0.9} />;
    case "restauracao":
      return <rect x={x - size} y={y - size} width={size * 2} height={size * 2} fill={config.cor} opacity={0.9} />;
    case "endo":
      return (
        <text x={x} y={y} textAnchor="middle" dominantBaseline="central" 
              fontSize={size * 2.5} fontWeight="bold" fill={config.cor}>E</text>
      );
    case "ausente":
      return (
        <g stroke={config.cor} strokeWidth={0.6}>
          <line x1={x - size} y1={y - size} x2={x + size} y2={y + size} />
          <line x1={x + size} y1={y - size} x2={x - size} y2={y + size} />
        </g>
      );
    case "implante":
      return (
        <g fill={config.cor}>
          <rect x={x - size * 0.3} y={y - size * 1.2} width={size * 0.6} height={size * 2.4} rx={0.2} />
          <rect x={x - size * 0.8} y={y - size * 0.4} width={size * 1.6} height={size * 0.3} />
          <rect x={x - size * 0.6} y={y + size * 0.1} width={size * 1.2} height={size * 0.3} />
        </g>
      );
    case "protese":
      return (
        <path 
          d={`M ${x - size} ${y} A ${size} ${size} 0 0 1 ${x + size} ${y}`} 
          fill={config.cor} 
          opacity={0.9}
        />
      );
    case "lesao":
      return <circle cx={x} cy={y} r={size} fill="none" stroke={config.cor} strokeWidth={0.6} />;
    case "fratura":
      return (
        <line 
          x1={x - size} y1={y + size} 
          x2={x + size} y2={y - size} 
          stroke={config.cor} 
          strokeWidth={0.8}
        />
      );
    default:
      return <circle cx={x} cy={y} r={size} fill={config.cor} />;
  }
};

export function RadiografiaInterativa({
  imageUrl,
  zoom,
  marcacoesManuals,
  onAddMarcacao,
  onMoveMarcacao,
  onDeleteMarcacao,
  modoAtivo,
  showMarcacoes,
  showAnatomicStructures,
  estruturaAtiva,
  estruturasManuais = [],
  onAddEstruturaManual,
  onResetEstrutura,
}: RadiografiaInterativaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Estado para desenho livre
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Array<[number, number]>>([]);

  // Handle keyboard delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        onDeleteMarcacao(selectedId);
        setSelectedId(null);
      }
      if (e.key === "Escape") {
        setSelectedId(null);
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, onDeleteMarcacao]);

  // Get normalized coordinates from click
  const getCoordinates = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
  }, []);

  // Handle click to add marcacao (for dental markings, not structures)
  const handleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingId) return; // Don't add if dragging
    if (estruturaAtiva?.tipo && estruturaAtiva?.lado) return; // Drawing mode, don't add marcacao
    
    const { x, y } = getCoordinates(e);
    
    // Modo de marcação dentária
    if (modoAtivo.dente && modoAtivo.tipo) {
      const newMarcacao: MarcacaoManual = {
        id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        tipo: modoAtivo.tipo,
        dente: modoAtivo.dente,
        x,
        y,
      };
      onAddMarcacao(newMarcacao);
    } else {
      // Deselect if clicking empty area
      setSelectedId(null);
    }
  }, [modoAtivo, estruturaAtiva, getCoordinates, onAddMarcacao, draggingId]);

  // Freehand drawing handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!estruturaAtiva?.tipo || !estruturaAtiva?.lado) return;
    
    const { x, y } = getCoordinates(e);
    setIsDrawing(true);
    setCurrentStroke([[x, y]]);
  }, [estruturaAtiva, getCoordinates]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    // Handle dragging marcacao
    if (draggingId) {
      const { x, y } = getCoordinates(e);
      const newX = Math.max(0, Math.min(1, x + dragOffset.x));
      const newY = Math.max(0, Math.min(1, y + dragOffset.y));
      onMoveMarcacao(draggingId, newX, newY);
      return;
    }
    
    // Handle freehand drawing
    if (!isDrawing || !estruturaAtiva?.tipo || !estruturaAtiva?.lado) return;
    
    const { x, y } = getCoordinates(e);
    setCurrentStroke(prev => [...prev, [x, y]]);
  }, [isDrawing, estruturaAtiva, getCoordinates, draggingId, dragOffset, onMoveMarcacao]);

  const handleMouseUp = useCallback(() => {
    if (draggingId) {
      setDraggingId(null);
      return;
    }
    
    if (!isDrawing || !estruturaAtiva?.tipo || !estruturaAtiva?.lado) return;
    
    setIsDrawing(false);
    
    // Only save if we have enough points
    if (currentStroke.length >= 3) {
      const newEstrutura: EstruturaManual = {
        id: `estrutura-${estruturaAtiva.tipo}-${estruturaAtiva.lado}-${Date.now()}`,
        tipo: estruturaAtiva.tipo,
        lado: estruturaAtiva.lado,
        pontos: currentStroke,
      };
      onAddEstruturaManual?.(newEstrutura);
    }
    
    setCurrentStroke([]);
  }, [isDrawing, estruturaAtiva, currentStroke, onAddEstruturaManual, draggingId]);

  // Reset current stroke when structure mode changes
  useEffect(() => {
    setCurrentStroke([]);
    setIsDrawing(false);
  }, [estruturaAtiva?.tipo, estruturaAtiva?.lado]);

  // Handle drag start
  const handleDragStart = useCallback((e: React.MouseEvent, marcacao: MarcacaoManual) => {
    e.stopPropagation();
    setDraggingId(marcacao.id);
    setSelectedId(marcacao.id);
    
    const { x, y } = getCoordinates(e as any);
    setDragOffset({
      x: marcacao.x - x,
      y: marcacao.y - y,
    });
  }, [getCoordinates]);

  // Handle right-click to delete
  const handleContextMenu = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    onDeleteMarcacao(id);
  }, [onDeleteMarcacao]);

  // Convert normalized coords to percentage
  const toPercentage = (point: [number, number]): [number, number] => {
    const [x, y] = point;
    return [x > 1 ? x : x * 100, y > 1 ? y : y * 100];
  };

  // Convert points array to SVG path string for freehand drawing
  const pointsToPath = (points: Array<[number, number]>): string => {
    if (points.length < 2) return "";
    
    const percentPoints = points.map(p => toPercentage(p));
    let path = `M ${percentPoints[0][0]},${percentPoints[0][1]}`;
    
    for (let i = 1; i < percentPoints.length; i++) {
      path += ` L ${percentPoints[i][0]},${percentPoints[i][1]}`;
    }
    
    return path;
  };

  // Render estruturas manuais (desenho livre)
  const renderEstruturasManuais = () => {
    if (!showAnatomicStructures) return null;
    
    const elements: JSX.Element[] = [];
    
    estruturasManuais.forEach((estrutura) => {
      if (estrutura.pontos.length < 2) return;
      
      const pathData = pointsToPath(estrutura.pontos);
      const config = estruturaConfig[estrutura.tipo];
      
      elements.push(
        <path
          key={estrutura.id}
          d={pathData}
          fill="none"
          stroke={config.cor}
          strokeWidth={estrutura.tipo === "seio_maxilar" ? "0.8" : "0.6"}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.9}
        />
      );
    });
    
    return elements;
  };

  // Render current stroke being drawn
  const renderCurrentStroke = () => {
    if (!estruturaAtiva?.tipo || !estruturaAtiva?.lado || currentStroke.length < 2) return null;
    
    const config = estruturaConfig[estruturaAtiva.tipo];
    const pathData = pointsToPath(currentStroke);
    
    return (
      <path
        d={pathData}
        fill="none"
        stroke={config.cor}
        strokeWidth={estruturaAtiva.tipo === "seio_maxilar" ? "0.8" : "0.6"}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.7}
        strokeDasharray="1,1"
      />
    );
  };

  // Cursor style based on mode
  const getCursorStyle = () => {
    if (draggingId) return "grabbing";
    if (estruturaAtiva?.tipo && estruturaAtiva?.lado) return "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m12 19 7-7 3 3-7 7-3-3z'%3E%3C/path%3E%3Cpath d='m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z'%3E%3C/path%3E%3Cpath d='m2 2 7.586 7.586'%3E%3C/path%3E%3Ccircle cx='11' cy='11' r='2'%3E%3C/circle%3E%3C/svg%3E\") 0 24, crosshair";
    if (modoAtivo.dente && modoAtivo.tipo) return "crosshair";
    return "default";
  };

  return (
    <div 
      ref={containerRef}
      className="relative overflow-auto bg-black rounded-lg border border-border"
      style={{ 
        height: "calc(100vh - 350px)", 
        minHeight: "400px",
        maxHeight: "70vh"
      }}
    >
      <div
        style={{
          width: `${100 * zoom}%`,
          height: `${100 * zoom}%`,
          minWidth: "100%",
          minHeight: "100%",
        }}
      >
        <div 
          className="relative"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            transition: draggingId ? "none" : "transform 0.2s ease",
          }}
        >
          <img
            src={imageUrl}
            alt="Radiografia"
            className="block w-full h-auto"
            draggable={false}
          />
          
          {/* SVG Overlay */}
          <svg
            ref={svgRef}
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ cursor: getCursorStyle() }}
            onClick={handleClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Estruturas manuais (desenho livre) */}
            {renderEstruturasManuais()}
            
            {/* Traço atual sendo desenhado */}
            {renderCurrentStroke()}
            
            {/* Manual marcacoes */}
            {showMarcacoes && marcacoesManuals.map((marcacao) => {
              const x = marcacao.x * 100;
              const y = marcacao.y * 100;
              const isSelected = selectedId === marcacao.id;
              const isDragging = draggingId === marcacao.id;
              
              return (
                <g
                  key={marcacao.id}
                  style={{ cursor: isDragging ? "grabbing" : "grab" }}
                  onMouseDown={(e) => handleDragStart(e, marcacao)}
                  onContextMenu={(e) => handleContextMenu(e, marcacao.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(marcacao.id);
                  }}
                >
                  {/* Selection ring */}
                  {isSelected && (
                    <circle
                      cx={x}
                      cy={y}
                      r={4}
                      fill="none"
                      stroke="white"
                      strokeWidth={0.5}
                      strokeDasharray="1,1"
                    />
                  )}
                  
                  {/* Icon */}
                  {renderMarcacaoIcon(marcacao.tipo, x, y)}
                  
                  {/* Label */}
                  <text
                    x={x}
                    y={y - 4}
                    textAnchor="middle"
                    fontSize={2}
                    fill="white"
                    style={{ 
                      textShadow: "0 0 2px black, 0 0 2px black",
                      pointerEvents: "none"
                    }}
                  >
                    {marcacao.dente}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
      
      {/* Instructions overlay - Marcações dentárias */}
      {modoAtivo.dente && modoAtivo.tipo && (
        <div className="absolute bottom-3 left-3 right-3 bg-black/70 text-white text-xs p-2 rounded text-center pointer-events-none">
          Clique para inserir • Arraste para mover • Clique direito ou Delete para remover
        </div>
      )}
      
      {/* Instructions overlay - Estruturas anatômicas (desenho livre) */}
      {estruturaAtiva?.tipo && estruturaAtiva?.lado && (
        <div className="absolute bottom-3 left-3 right-3 bg-black/80 text-white text-xs p-3 rounded pointer-events-auto flex items-center justify-between gap-2">
          <div className="flex-1 text-center">
            <span className="font-medium" style={{ color: estruturaConfig[estruturaAtiva.tipo].cor }}>
              ✏️ {estruturaConfig[estruturaAtiva.tipo].label} ({estruturaAtiva.lado === "direito" ? "Direito" : "Esquerdo"})
            </span>
            <span className="ml-2">• Clique e arraste para desenhar a estrutura</span>
          </div>
          <button
            onClick={() => {
              if (estruturaAtiva.tipo && estruturaAtiva.lado) {
                onResetEstrutura?.(estruturaAtiva.tipo, estruturaAtiva.lado);
              }
            }}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded text-xs font-medium"
          >
            Limpar
          </button>
        </div>
      )}
    </div>
  );
}
