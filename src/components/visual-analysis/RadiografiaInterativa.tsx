import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { TipoMarcacao, MarcacaoManual, tipoMarcacaoConfig } from "./OdontogramaInterativo";

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
  seioMaxilar?: {
    direito?: { contorno_normalizado: Array<[number, number]> };
    esquerdo?: { contorno_normalizado: Array<[number, number]> };
  };
  canalMandibular?: {
    direito?: Array<[number, number]>;
    esquerdo?: Array<[number, number]>;
  };
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
  seioMaxilar,
  canalMandibular,
}: RadiografiaInterativaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  // Handle click to add marcacao
  const handleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingId) return; // Don't add if dragging
    
    if (modoAtivo.dente && modoAtivo.tipo) {
      const { x, y } = getCoordinates(e);
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
  }, [modoAtivo, getCoordinates, onAddMarcacao, draggingId]);

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

  // Handle drag move
  const handleDragMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!draggingId) return;
    
    const { x, y } = getCoordinates(e);
    const newX = Math.max(0, Math.min(1, x + dragOffset.x));
    const newY = Math.max(0, Math.min(1, y + dragOffset.y));
    onMoveMarcacao(draggingId, newX, newY);
  }, [draggingId, dragOffset, getCoordinates, onMoveMarcacao]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
  }, []);

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

  // Render anatomical structures
  const renderSeioMaxilar = () => {
    if (!seioMaxilar || !showAnatomicStructures) return null;
    
    const elements: JSX.Element[] = [];
    
    if (seioMaxilar.direito?.contorno_normalizado?.length >= 3) {
      const points = seioMaxilar.direito.contorno_normalizado
        .map((p) => toPercentage(p))
        .map(([x, y]) => `${x},${y}`).join(" ");
      elements.push(
        <polygon
          key="seio-direito"
          points={points}
          fill="rgba(255, 215, 0, 0.2)"
          stroke="#FFD700"
          strokeWidth="0.4"
          strokeDasharray="2,1"
        />
      );
    }
    
    if (seioMaxilar.esquerdo?.contorno_normalizado?.length >= 3) {
      const points = seioMaxilar.esquerdo.contorno_normalizado
        .map((p) => toPercentage(p))
        .map(([x, y]) => `${x},${y}`).join(" ");
      elements.push(
        <polygon
          key="seio-esquerdo"
          points={points}
          fill="rgba(255, 215, 0, 0.2)"
          stroke="#FFD700"
          strokeWidth="0.4"
          strokeDasharray="2,1"
        />
      );
    }
    
    return elements;
  };

  const renderCanalMandibular = () => {
    if (!canalMandibular || !showAnatomicStructures) return null;
    
    const elements: JSX.Element[] = [];
    
    if (canalMandibular.direito?.length >= 2) {
      const points = canalMandibular.direito
        .map((p) => toPercentage(p))
        .map(([x, y]) => `${x},${y}`).join(" ");
      elements.push(
        <polyline
          key="canal-direito"
          points={points}
          fill="none"
          stroke="#00AEEF"
          strokeWidth="0.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    }
    
    if (canalMandibular.esquerdo?.length >= 2) {
      const points = canalMandibular.esquerdo
        .map((p) => toPercentage(p))
        .map(([x, y]) => `${x},${y}`).join(" ");
      elements.push(
        <polyline
          key="canal-esquerdo"
          points={points}
          fill="none"
          stroke="#00AEEF"
          strokeWidth="0.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    }
    
    return elements;
  };

  // Cursor style based on mode
  const getCursorStyle = () => {
    if (draggingId) return "grabbing";
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
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ cursor: getCursorStyle() }}
            onClick={handleClick}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
          >
            {/* Anatomical structures */}
            {renderSeioMaxilar()}
            {renderCanalMandibular()}
            
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
      
      {/* Instructions overlay */}
      {modoAtivo.dente && modoAtivo.tipo && (
        <div className="absolute bottom-3 left-3 right-3 bg-black/70 text-white text-xs p-2 rounded text-center pointer-events-none">
          Clique para inserir • Arraste para mover • Clique direito ou Delete para remover
        </div>
      )}
    </div>
  );
}
