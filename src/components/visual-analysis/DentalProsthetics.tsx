/**
 * DentalProsthetics.tsx
 * Componente de inserção de implantes e coroas dentárias na radiografia
 * SVGs anatomicamente precisos, tamanhos variáveis, drag-and-drop
 */

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, RotateCcw, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProstheticType =
  | "implant_standard"   // Implante padrão (3.75–4mm)
  | "implant_wide"       // Implante largo (5–6mm)
  | "implant_narrow"     // Implante estreito (3–3.3mm)
  | "implant_short"      // Implante curto (<8mm)
  | "crown_molar"        // Coroa molar
  | "crown_premolar"     // Coroa pré-molar
  | "crown_anterior"     // Coroa anterior (incisivo/canino)
  | "crown_on_implant";  // Coroa sobre implante (implante + coroa combinados)

export interface ProstheticItem {
  id: string;
  type: ProstheticType;
  x: number;       // 0–1 normalizado
  y: number;       // 0–1 normalizado
  scale: number;   // 0.5–2.0
  rotation: number; // graus
  label?: string;
}

interface DentalProstheticsProps {
  items: ProstheticItem[];
  onItemsChange: (items: ProstheticItem[]) => void;
}

// ─── Config ──────────────────────────────────────────────────────────────────

const PROSTHETIC_CONFIG: Record<ProstheticType, {
  label: string;
  category: "implant" | "crown";
  color: string;
  description: string;
  defaultScale: number;
}> = {
  implant_standard: {
    label: "Implante Padrão (3.75–4mm)",
    category: "implant",
    color: "#A78BFA",
    description: "Indicado para substituição de pré-molares e molares anteriores",
    defaultScale: 1.0,
  },
  implant_wide:  {
    label: "Implante Largo (5–6mm)",
    category: "implant",
    color: "#7C3AED",
    description: "Indicado para molares e regiões com amplo volume ósseo",
    defaultScale: 1.2,
  },
  implant_narrow: {
    label: "Implante Estreito (3–3.3mm)",
    category: "implant",
    color: "#C4B5FD",
    description: "Indicado para incisivos inferiores e espaços reduzidos",
    defaultScale: 0.8,
  },
  implant_short:  {
    label: "Implante Curto (<8mm)",
    category: "implant",
    color: "#8B5CF6",
    description: "Indicado quando há limitação de altura óssea",
    defaultScale: 0.7,
  },
  crown_molar:    {
    label: "Coroa Molar",
    category: "crown",
    color: "#F59E0B",
    description: "Coroa para molares — maior superfície oclusal",
    defaultScale: 1.2,
  },
  crown_premolar: {
    label: "Coroa Pré-molar",
    category: "crown",
    color: "#FBBF24",
    description: "Coroa para pré-molares — cúspide única",
    defaultScale: 1.0,
  },
  crown_anterior: {
    label: "Coroa Anterior",
    category: "crown",
    color: "#FCD34D",
    description: "Coroa para incisivos e caninos",
    defaultScale: 0.9,
  },
  crown_on_implant: {
    label: "Coroa sobre Implante",
    category: "crown",
    color: "#10B981",
    description: "Conjunto implante + coroa para visualização completa da reabilitação",
    defaultScale: 1.0,
  },
};

// ─── SVG renderers ────────────────────────────────────────────────────────────

/**
 * Implante: forma de parafuso com roscas — visão radiográfica lateral
 * Dimensões base: 8×30 unidades SVG (largo × alto)
 */
const ImplantSVG = ({
  type,
  color,
  size,
}: {
  type: "standard" | "wide" | "narrow" | "short";
  color: string;
  size: number; // px total height
}) => {
  const w = type === "wide" ? 11 : type === "narrow" ? 7 : 9;
  const h = type === "short" ? 20 : 30;
  const threadCount = type === "short" ? 6 : 10;
  const viewH = 34;

  const threads = Array.from({ length: threadCount }, (_, i) => {
    const y = 6 + (i * (h - 6)) / threadCount;
    return y;
  });

  return (
    <svg
      width={size * (w / 30)}
      height={size}
      viewBox={`-2 -2 ${w + 4} ${viewH}`}
      style={{ filter: "drop-shadow(0 0 2px rgba(0,0,0,0.5))", overflow: "visible" }}
    >
      {/* Cabeça hexagonal */}
      <rect x={w * 0.1} y={0} width={w * 0.8} height={4} rx={1}
        fill={color} stroke="rgba(255,255,255,0.4)" strokeWidth={0.4} />
      <rect x={w * 0.2} y={1} width={w * 0.6} height={2}
        fill="rgba(255,255,255,0.2)" rx={0.5} />

      {/* Colo do implante (sem roscas) */}
      <rect x={w * 0.1} y={4} width={w * 0.8} height={3}
        fill={color} stroke="rgba(255,255,255,0.3)" strokeWidth={0.3} />

      {/* Corpo com roscas */}
      <rect x={w * 0.1} y={7} width={w * 0.8} height={h - 7}
        fill={color} opacity={0.85} />

      {/* Roscas */}
      {threads.map((y, i) => (
        <g key={i}>
          <line x1={-1} y1={y} x2={w + 1} y2={y}
            stroke={color} strokeWidth={1.2}
            style={{ filter: "brightness(1.3)" }} />
          <line x1={0} y1={y} x2={w} y2={y}
            stroke="rgba(255,255,255,0.35)" strokeWidth={0.5} />
        </g>
      ))}

      {/* Ponta apical cônica */}
      <polygon
        points={`${w * 0.1},${h} ${w * 0.9},${h} ${w * 0.5},${h + 3}`}
        fill={color}
        style={{ filter: "brightness(0.8)" }}
      />

      {/* Brilho lateral */}
      <rect x={w * 0.15} y={4} width={w * 0.15} height={h}
        fill="rgba(255,255,255,0.15)" rx={0.5} />
    </svg>
  );
};

/**
 * Coroa dentária — visão radiográfica (contorno anatômico opaco)
 */
const CrownSVG = ({
  type,
  color,
  size,
}: {
  type: "molar" | "premolar" | "anterior";
  color: string;
  size: number;
}) => {
  if (type === "anterior") {
    // Incisivo/canino — forma trapezoidal com aresta incisal
    return (
      <svg width={size * 0.7} height={size} viewBox="-1 -1 16 28"
        style={{ filter: "drop-shadow(0 0 2px rgba(0,0,0,0.5))", overflow: "visible" }}>
        {/* Coroa */}
        <path d="M2,0 L12,0 L13,18 L7,22 L1,18 Z"
          fill={color} stroke="rgba(255,255,255,0.5)" strokeWidth={0.6} opacity={0.9} />
        {/* Câmara pulpar */}
        <path d="M5,2 L9,2 L10,14 L7,16 L4,14 Z"
          fill="rgba(0,0,0,0.35)" />
        {/* Canal radicular */}
        <line x1={7} y1={16} x2={7} y2={26} stroke="rgba(0,0,0,0.35)" strokeWidth={1.5} />
        {/* Brilho */}
        <path d="M3,1 L5,1 L6,15 L4,15 Z" fill="rgba(255,255,255,0.25)" />
      </svg>
    );
  }

  if (type === "premolar") {
    return (
      <svg width={size * 0.85} height={size} viewBox="-1 -1 18 26"
        style={{ filter: "drop-shadow(0 0 2px rgba(0,0,0,0.5))", overflow: "visible" }}>
        {/* Coroa */}
        <path d="M1,4 Q3,0 8,0 Q13,0 15,4 L14,16 Q12,20 8,21 Q4,20 2,16 Z"
          fill={color} stroke="rgba(255,255,255,0.5)" strokeWidth={0.6} opacity={0.9} />
        {/* Cúspide */}
        <path d="M5,0 Q8,-3 11,0" fill="none" stroke={color}
          strokeWidth={1.5} style={{ filter: "brightness(1.2)" }} />
        {/* Câmara pulpar */}
        <path d="M5,4 L11,4 L11,14 L8,16 L5,14 Z"
          fill="rgba(0,0,0,0.35)" />
        {/* Canais */}
        <line x1={6.5} y1={16} x2={6} y2={24} stroke="rgba(0,0,0,0.35)" strokeWidth={1.2} />
        <line x1={9.5} y1={16} x2={10} y2={24} stroke="rgba(0,0,0,0.35)" strokeWidth={1.2} />
        {/* Brilho */}
        <path d="M2,4 Q3,1 5,2 L5,14 L3,14 Z" fill="rgba(255,255,255,0.2)" />
      </svg>
    );
  }

  // Molar — forma mais larga com 4-5 cúspides
  return (
    <svg width={size} height={size * 0.85} viewBox="-1 -1 28 24"
      style={{ filter: "drop-shadow(0 0 2px rgba(0,0,0,0.5))", overflow: "visible" }}>
      {/* Coroa */}
      <path d="M1,5 Q3,0 7,0 L19,0 Q23,0 25,5 L24,16 Q22,20 13,21 Q4,20 2,16 Z"
        fill={color} stroke="rgba(255,255,255,0.5)" strokeWidth={0.6} opacity={0.9} />
      {/* Cúspides */}
      <path d="M4,0 Q6,-2 8,0 M11,0 Q13,-2.5 15,0 M18,0 Q20,-2 22,0"
        fill="none" stroke={color} strokeWidth={1.5}
        style={{ filter: "brightness(1.2)" }} />
      {/* Câmara pulpar */}
      <path d="M7,5 L19,5 L18,14 L13,16 L8,14 Z"
        fill="rgba(0,0,0,0.35)" />
      {/* 3 canais */}
      <line x1={9}  y1={14} x2={8}  y2={22} stroke="rgba(0,0,0,0.35)" strokeWidth={1.2} />
      <line x1={13} y1={15} x2={13} y2={22} stroke="rgba(0,0,0,0.35)" strokeWidth={1.2} />
      <line x1={17} y1={14} x2={18} y2={22} stroke="rgba(0,0,0,0.35)" strokeWidth={1.2} />
      {/* Brilho */}
      <path d="M2,5 Q3,2 5,3 L5,14 L3,14 Z" fill="rgba(255,255,255,0.2)" />
    </svg>
  );
};

/** Conjunto implante + coroa sobre implante */
const CrownOnImplantSVG = ({ size }: { size: number }) => (
  <svg width={size * 0.7} height={size * 1.3} viewBox="-2 -2 22 40"
    style={{ filter: "drop-shadow(0 0 2px rgba(0,0,0,0.5))", overflow: "visible" }}>
    {/* Coroa (amarelo) */}
    <path d="M1,4 Q2,0 9,0 Q16,0 17,4 L16,13 Q14,17 9,18 Q4,17 2,13 Z"
      fill="#F59E0B" stroke="rgba(255,255,255,0.5)" strokeWidth={0.5} opacity={0.9} />
    <path d="M4,0 Q9,-3 14,0" fill="none" stroke="#F59E0B" strokeWidth={2}
      style={{ filter: "brightness(1.2)" }} />
    {/* Câmara pulpar */}
    <path d="M5,4 L13,4 L13,13 L9,15 L5,13 Z" fill="rgba(0,0,0,0.3)" />

    {/* Abutment / Munhão */}
    <rect x={6.5} y={17} width={5} height={4} rx={0.5}
      fill="#94A3B8" stroke="rgba(255,255,255,0.4)" strokeWidth={0.4} />

    {/* Implante (roxo) */}
    <rect x={6} y={21} width={6} height={2} fill="#8B5CF6" opacity={0.9} />
    {[0,1,2,3,4,5].map(i => (
      <line key={i} x1={5} y1={23 + i * 2} x2={13} y2={23 + i * 2}
        stroke="#8B5CF6" strokeWidth={1.2}
        style={{ filter: "brightness(1.3)" }} />
    ))}
    <rect x={6.5} y={21} width={5} height={13} fill="#8B5CF6" opacity={0.6} />
    <polygon points="6,34 12,34 9,37" fill="#8B5CF6"
      style={{ filter: "brightness(0.8)" }} />

    {/* Brilho implante */}
    <rect x={7} y={21} width={1.5} height={13} fill="rgba(255,255,255,0.15)" rx={0.3} />
  </svg>
);

// ─── Render dispatcher ────────────────────────────────────────────────────────

const renderProsthetic = (type: ProstheticType, size: number) => {
  const config = PROSTHETIC_CONFIG[type];
  switch (type) {
    case "implant_standard": return <ImplantSVG type="standard" color={config.color} size={size} />;
    case "implant_wide":     return <ImplantSVG type="wide"     color={config.color} size={size} />;
    case "implant_narrow":   return <ImplantSVG type="narrow"   color={config.color} size={size} />;
    case "implant_short":    return <ImplantSVG type="short"    color={config.color} size={size} />;
    case "crown_molar":      return <CrownSVG type="molar"     color={config.color} size={size} />;
    case "crown_premolar":   return <CrownSVG type="premolar"  color={config.color} size={size} />;
    case "crown_anterior":   return <CrownSVG type="anterior"  color={config.color} size={size} />;
    case "crown_on_implant": return <CrownOnImplantSVG size={size} />;
    default:                 return null;
  }
};

// ─── Panel component ──────────────────────────────────────────────────────────

export function DentalProstheticsPanel({ items, onItemsChange }: DentalProstheticsProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<ProstheticType>("implant_standard");

  const selectedItem = items.find(i => i.id === selectedId);

  const addItem = useCallback((type: ProstheticType) => {
    const cfg = PROSTHETIC_CONFIG[type];
    const newItem: ProstheticItem = {
      id: `prosthetic_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      x: 0.5,
      y: 0.5,
      scale: cfg.defaultScale,
      rotation: 0,
      label: cfg.label,
    };
    onItemsChange([...items, newItem]);
    setSelectedId(newItem.id);
    toast.success(`${cfg.label} adicionado — arraste para posicionar`);
  }, [items, onItemsChange]);

  const updateSelected = useCallback((patch: Partial<ProstheticItem>) => {
    if (!selectedId) return;
    onItemsChange(items.map(i => i.id === selectedId ? { ...i, ...patch } : i));
  }, [selectedId, items, onItemsChange]);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    onItemsChange(items.filter(i => i.id !== selectedId));
    setSelectedId(null);
    toast.success("Item removido");
  }, [selectedId, items, onItemsChange]);

  const clearAll = useCallback(() => {
    onItemsChange([]);
    setSelectedId(null);
    toast.success("Todos os itens removidos");
  }, [onItemsChange]);

  const implantTypes: ProstheticType[] = ["implant_standard", "implant_wide", "implant_narrow", "implant_short"];
  const crownTypes:   ProstheticType[] = ["crown_anterior", "crown_premolar", "crown_molar", "crown_on_implant"];

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            🦷 Implantes & Coroas
            {items.length > 0 && <Badge variant="secondary">{items.length}</Badge>}
          </span>
          {items.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll}
              className="h-6 px-2 text-xs text-destructive hover:text-destructive">
              <RotateCcw className="w-3 h-3 mr-1" /> Limpar
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">

        {/* Seletor de tipo — Implantes */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Implantes</p>
          <div className="grid grid-cols-2 gap-2">
            {implantTypes.map(type => {
              const cfg = PROSTHETIC_CONFIG[type];
              return (
                <button key={type}
                  onClick={() => { setActiveType(type); addItem(type); }}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg border text-left transition-all hover:border-primary/50 hover:bg-muted/50 text-xs",
                    activeType === type ? "border-primary bg-primary/5" : "border-border"
                  )}>
                  <div className="w-4 h-6 flex-shrink-0 flex items-center justify-center">
                    {renderProsthetic(type, 20)}
                  </div>
                  <span className="leading-tight">{cfg.label.replace(/\s*\(.*\)/, '')}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Seletor de tipo — Coroas */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Coroas</p>
          <div className="grid grid-cols-2 gap-2">
            {crownTypes.map(type => {
              const cfg = PROSTHETIC_CONFIG[type];
              return (
                <button key={type}
                  onClick={() => { setActiveType(type); addItem(type); }}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg border text-left transition-all hover:border-primary/50 hover:bg-muted/50 text-xs",
                    activeType === type ? "border-primary bg-primary/5" : "border-border"
                  )}>
                  <div className="w-5 h-6 flex-shrink-0 flex items-center justify-center">
                    {renderProsthetic(type, 22)}
                  </div>
                  <span className="leading-tight">{cfg.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Controles do item selecionado */}
        {selectedItem && (
          <div className="space-y-3 pt-2 border-t">
            <p className="text-xs font-medium text-primary">
              Editando: {PROSTHETIC_CONFIG[selectedItem.type].label}
            </p>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Tamanho</span>
                <span>{Math.round(selectedItem.scale * 100)}%</span>
              </div>
              <Slider
                value={[selectedItem.scale]}
                onValueChange={([v]) => updateSelected({ scale: v })}
                min={0.3} max={2.5} step={0.05}
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Rotação</span>
                <span>{selectedItem.rotation}°</span>
              </div>
              <Slider
                value={[selectedItem.rotation]}
                onValueChange={([v]) => updateSelected({ rotation: v })}
                min={-45} max={45} step={1}
              />
            </div>

            <Button variant="destructive" size="sm" onClick={deleteSelected}
              className="w-full h-8 text-xs">
              <Trash2 className="w-3 h-3 mr-1" /> Remover este item
            </Button>
          </div>
        )}

        {/* Lista de itens */}
        {items.length > 0 && (
          <div className="space-y-1 pt-1 border-t">
            <p className="text-xs text-muted-foreground mb-1">Itens na radiografia:</p>
            {items.map(item => (
              <div key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={cn(
                  "flex items-center gap-2 p-1.5 rounded cursor-pointer text-xs transition-colors",
                  selectedId === item.id ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
                )}>
                <div className="w-4 h-5 flex-shrink-0">
                  {renderProsthetic(item.type, 16)}
                </div>
                <span className="truncate">{PROSTHETIC_CONFIG[item.type].label}</span>
                <span className="ml-auto text-muted-foreground">{Math.round(item.scale * 100)}%</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-start gap-2 p-2 bg-muted/30 rounded text-xs text-muted-foreground">
          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>Clique para adicionar. Arraste na radiografia para posicionar. Selecione para ajustar tamanho e rotação.</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── SVG overlay for the radiograph ─────────────────────────────────────────

interface ProstheticsOverlayProps {
  items: ProstheticItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

export function ProstheticsOverlay({
  items, selectedId, onSelect, onMove, containerRef,
}: ProstheticsOverlayProps) {
  const draggingRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent, item: ProstheticItem) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect(item.id);
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    draggingRef.current = {
      id: item.id,
      offsetX: e.clientX / rect.width  - item.x,
      offsetY: e.clientY / rect.height - item.y,
    };

    const handleMove = (ev: MouseEvent) => {
      if (!draggingRef.current || !container) return;
      const r = container.getBoundingClientRect();
      const nx = Math.max(0, Math.min(1, ev.clientX / r.width  - draggingRef.current.offsetX));
      const ny = Math.max(0, Math.min(1, ev.clientY / r.height - draggingRef.current.offsetY));
      onMove(draggingRef.current.id, nx, ny);
    };
    const handleUp = () => {
      draggingRef.current = null;
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  }, [containerRef, onMove, onSelect]);

  return (
    <>
      {items.map(item => {
        const BASE_SIZE = 40; // px base
        const size = BASE_SIZE * item.scale;
        const isSelected = selectedId === item.id;

        return (
          <div
            key={item.id}
            onMouseDown={e => handleMouseDown(e, item)}
            style={{
              position: "absolute",
              left: `${item.x * 100}%`,
              top:  `${item.y * 100}%`,
              transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
              cursor: "grab",
              userSelect: "none",
              zIndex: isSelected ? 30 : 20,
              filter: isSelected
                ? "drop-shadow(0 0 4px rgba(99,102,241,0.9))"
                : "drop-shadow(0 0 2px rgba(0,0,0,0.6))",
              transition: "filter 0.15s",
            }}
          >
            {renderProsthetic(item.type, size)}

            {/* Selection ring */}
            {isSelected && (
              <div style={{
                position: "absolute", inset: -4,
                border: "1.5px dashed rgba(99,102,241,0.8)",
                borderRadius: 4, pointerEvents: "none",
              }} />
            )}
          </div>
        );
      })}
    </>
  );
}
