/**
 * DentalProsthetics.tsx
 * Implantes com diâmetro + comprimento reais (mm) e coroas dentárias
 * SVGs anatomicamente precisos, drag-and-drop, dimensionamento clínico
 */

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, RotateCcw, Info, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Diâmetros e comprimentos clínicos reais ─────────────────────────────────

export const IMPLANT_DIAMETERS = [3.0, 3.3, 3.5, 3.75, 4.0, 4.5, 5.0, 5.5, 6.0] as const;
export const IMPLANT_LENGTHS   = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 21] as const;

export type ImplantDiameter = typeof IMPLANT_DIAMETERS[number];
export type ImplantLength   = typeof IMPLANT_LENGTHS[number];

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProstheticType =
  | "implant"
  | "crown_molar"
  | "crown_premolar"
  | "crown_anterior"
  | "crown_on_implant";

export interface ProstheticItem {
  id: string;
  type: ProstheticType;
  x: number;         // 0–1 normalizado
  y: number;         // 0–1 normalizado
  // Implante: dimensões clínicas reais
  diameter: number;  // mm — controla largura visual
  length: number;    // mm — controla altura visual
  // Coroa: escala uniforme
  scale: number;     // 0.5–2.0
  rotation: number;  // graus
  label?: string;
}

interface DentalProstheticsProps {
  items: ProstheticItem[];
  onItemsChange: (items: ProstheticItem[]) => void;
}

// ─── Constantes de escala visual ─────────────────────────────────────────────
// 1 mm clínico = PX_PER_MM pixels no canvas (base 40px = ~10mm implante médio)
const PX_PER_MM = 4;

// ─── SVG do implante com dimensões reais ─────────────────────────────────────
/**
 * Implante em corte lateral — proporcional ao diâmetro e comprimento reais em mm
 * width  = diameter × PX_PER_MM
 * height = length   × PX_PER_MM
 */
const ImplantSVG = ({
  diameter,
  length,
  color = "#8B5CF6",
}: {
  diameter: number;
  length: number;
  color?: string;
}) => {
  const W = diameter * PX_PER_MM;   // largura px
  const H = length   * PX_PER_MM;   // altura px

  // Geometria interna
  const headH  = Math.max(3, W * 0.4);    // cabeça hexagonal
  const neckH  = Math.max(2, W * 0.3);    // colo liso (sem roscas)
  const bodyH  = H - headH - neckH - 3;   // corpo com roscas
  const apexH  = 3;                        // ponta cônica fixa
  const threadSpacing = Math.max(1.2, bodyH / Math.round(length * 1.1));
  const threadCount   = Math.floor(bodyH / threadSpacing);

  // viewBox com margem
  const vw = W + 6;
  const vh = H + 4;

  return (
    <svg
      width={W}
      height={H}
      viewBox={`-3 -2 ${vw} ${vh}`}
      style={{ overflow: "visible", filter: "drop-shadow(0 0 2px rgba(0,0,0,0.55))" }}
    >
      {/* ── Cabeça hexagonal ── */}
      <rect x={W * 0.05} y={0} width={W * 0.9} height={headH} rx={1}
        fill={color} stroke="rgba(255,255,255,0.45)" strokeWidth={0.5} />
      {/* Sulco da chave no topo */}
      <rect x={W * 0.25} y={headH * 0.25} width={W * 0.5} height={headH * 0.5} rx={0.4}
        fill="rgba(0,0,0,0.3)" />
      {/* Brilho cabeça */}
      <rect x={W * 0.1} y={headH * 0.1} width={W * 0.18} height={headH * 0.7} rx={0.3}
        fill="rgba(255,255,255,0.25)" />

      {/* ── Colo liso ── */}
      <rect x={W * 0.1} y={headH} width={W * 0.8} height={neckH}
        fill={color} stroke="rgba(255,255,255,0.25)" strokeWidth={0.3}
        style={{ filter: "brightness(0.92)" }} />

      {/* ── Corpo rosqueado ── */}
      <rect x={W * 0.1} y={headH + neckH} width={W * 0.8} height={bodyH}
        fill={color} opacity={0.85} />

      {/* Roscas — número proporcional ao comprimento */}
      {Array.from({ length: threadCount }, (_, i) => {
        const ty = headH + neckH + i * threadSpacing + threadSpacing * 0.5;
        return (
          <g key={i}>
            <line x1={-0.5} y1={ty} x2={W + 0.5} y2={ty}
              stroke={color} strokeWidth={1.3}
              style={{ filter: "brightness(1.35)" }} />
            <line x1={0} y1={ty} x2={W} y2={ty}
              stroke="rgba(255,255,255,0.3)" strokeWidth={0.4} />
          </g>
        );
      })}

      {/* Separador corpo / ápice */}
      <line x1={W * 0.1} y1={headH + neckH + bodyH}
            x2={W * 0.9} y2={headH + neckH + bodyH}
        stroke="rgba(255,255,255,0.2)" strokeWidth={0.4} />

      {/* ── Ponta cônica ── */}
      <polygon
        points={`${W * 0.1},${headH + neckH + bodyH} ${W * 0.9},${headH + neckH + bodyH} ${W * 0.5},${headH + neckH + bodyH + apexH}`}
        fill={color}
        style={{ filter: "brightness(0.75)" }}
      />

      {/* Brilho lateral corpo */}
      <rect x={W * 0.13} y={headH + neckH} width={W * 0.14} height={bodyH + apexH}
        fill="rgba(255,255,255,0.14)" rx={0.4} />

      {/* Etiqueta de medida (comprimento) — ao lado direito */}
      <text
        x={W + 2.5} y={H / 2}
        fontSize={Math.max(4, W * 0.55)}
        fill="rgba(255,255,255,0.85)"
        dominantBaseline="middle"
        style={{ fontFamily: "monospace", fontWeight: "bold", letterSpacing: "0.01em",
                 textShadow: "0 0 3px rgba(0,0,0,0.9)" }}
      >
        {length}mm
      </text>
    </svg>
  );
};

// ─── SVG coroas ───────────────────────────────────────────────────────────────

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
    return (
      <svg width={size * 0.7} height={size} viewBox="-1 -1 16 28"
        style={{ filter: "drop-shadow(0 0 2px rgba(0,0,0,0.5))", overflow: "visible" }}>
        <path d="M2,0 L12,0 L13,18 L7,22 L1,18 Z"
          fill={color} stroke="rgba(255,255,255,0.5)" strokeWidth={0.6} opacity={0.9} />
        <path d="M5,2 L9,2 L10,14 L7,16 L4,14 Z" fill="rgba(0,0,0,0.35)" />
        <line x1={7} y1={16} x2={7} y2={26} stroke="rgba(0,0,0,0.35)" strokeWidth={1.5} />
        <path d="M3,1 L5,1 L6,15 L4,15 Z" fill="rgba(255,255,255,0.25)" />
      </svg>
    );
  }
  if (type === "premolar") {
    return (
      <svg width={size * 0.85} height={size} viewBox="-1 -1 18 26"
        style={{ filter: "drop-shadow(0 0 2px rgba(0,0,0,0.5))", overflow: "visible" }}>
        <path d="M1,4 Q3,0 8,0 Q13,0 15,4 L14,16 Q12,20 8,21 Q4,20 2,16 Z"
          fill={color} stroke="rgba(255,255,255,0.5)" strokeWidth={0.6} opacity={0.9} />
        <path d="M5,0 Q8,-3 11,0" fill="none" stroke={color} strokeWidth={1.5}
          style={{ filter: "brightness(1.2)" }} />
        <path d="M5,4 L11,4 L11,14 L8,16 L5,14 Z" fill="rgba(0,0,0,0.35)" />
        <line x1={6.5} y1={16} x2={6} y2={24} stroke="rgba(0,0,0,0.35)" strokeWidth={1.2} />
        <line x1={9.5} y1={16} x2={10} y2={24} stroke="rgba(0,0,0,0.35)" strokeWidth={1.2} />
        <path d="M2,4 Q3,1 5,2 L5,14 L3,14 Z" fill="rgba(255,255,255,0.2)" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size * 0.85} viewBox="-1 -1 28 24"
      style={{ filter: "drop-shadow(0 0 2px rgba(0,0,0,0.5))", overflow: "visible" }}>
      <path d="M1,5 Q3,0 7,0 L19,0 Q23,0 25,5 L24,16 Q22,20 13,21 Q4,20 2,16 Z"
        fill={color} stroke="rgba(255,255,255,0.5)" strokeWidth={0.6} opacity={0.9} />
      <path d="M4,0 Q6,-2 8,0 M11,0 Q13,-2.5 15,0 M18,0 Q20,-2 22,0"
        fill="none" stroke={color} strokeWidth={1.5}
        style={{ filter: "brightness(1.2)" }} />
      <path d="M7,5 L19,5 L18,14 L13,16 L8,14 Z" fill="rgba(0,0,0,0.35)" />
      <line x1={9}  y1={14} x2={8}  y2={22} stroke="rgba(0,0,0,0.35)" strokeWidth={1.2} />
      <line x1={13} y1={15} x2={13} y2={22} stroke="rgba(0,0,0,0.35)" strokeWidth={1.2} />
      <line x1={17} y1={14} x2={18} y2={22} stroke="rgba(0,0,0,0.35)" strokeWidth={1.2} />
      <path d="M2,5 Q3,2 5,3 L5,14 L3,14 Z" fill="rgba(255,255,255,0.2)" />
    </svg>
  );
};

const CrownOnImplantSVG = ({
  diameter,
  length,
}: {
  diameter: number;
  length: number;
}) => {
  const W = diameter * PX_PER_MM;
  const H = length   * PX_PER_MM;
  const crownH = Math.max(14, W * 1.5);
  const abutH  = 4;
  const implH  = H;
  const total  = crownH + abutH + implH;
  const vw = W + 8;

  return (
    <svg width={W + 4} height={total} viewBox={`-4 -2 ${vw} ${total + 4}`}
      style={{ overflow: "visible", filter: "drop-shadow(0 0 2px rgba(0,0,0,0.55))" }}>
      {/* Coroa (amarelo) */}
      <path d={`M0,${crownH * 0.22} Q${W * 0.1},0 ${W * 0.5},0 Q${W * 0.9},0 ${W},${crownH * 0.22} L${W * 0.95},${crownH * 0.8} Q${W * 0.8},${crownH} ${W * 0.5},${crownH} Q${W * 0.2},${crownH} ${W * 0.05},${crownH * 0.8} Z`}
        fill="#F59E0B" stroke="rgba(255,255,255,0.5)" strokeWidth={0.5} opacity={0.92} />
      {/* Cúspide */}
      <path d={`M${W*0.2},0 Q${W*0.5},-${W*0.35} ${W*0.8},0`}
        fill="none" stroke="#F59E0B" strokeWidth={1.8}
        style={{ filter: "brightness(1.2)" }} />
      {/* Câmara pulpar */}
      <path d={`M${W*0.25},${crownH*0.2} L${W*0.75},${crownH*0.2} L${W*0.75},${crownH*0.75} L${W*0.5},${crownH*0.88} L${W*0.25},${crownH*0.75} Z`}
        fill="rgba(0,0,0,0.3)" />
      {/* Brilho coroa */}
      <path d={`M${W*0.08},${crownH*0.2} Q${W*0.12},${crownH*0.05} ${W*0.25},${crownH*0.1} L${W*0.25},${crownH*0.75} L${W*0.1},${crownH*0.75} Z`}
        fill="rgba(255,255,255,0.2)" />

      {/* Abutment */}
      <rect x={W*0.2} y={crownH} width={W*0.6} height={abutH} rx={0.5}
        fill="#94A3B8" stroke="rgba(255,255,255,0.4)" strokeWidth={0.4} />

      {/* Implante abaixo */}
      <g transform={`translate(0, ${crownH + abutH})`}>
        <ImplantSVG diameter={diameter} length={length} color="#8B5CF6" />
      </g>
    </svg>
  );
};

// ─── Render dispatcher ────────────────────────────────────────────────────────

export const renderProsthetic = (item: ProstheticItem) => {
  const BASE = 40;
  switch (item.type) {
    case "implant":
      return <ImplantSVG diameter={item.diameter} length={item.length} />;
    case "crown_molar":
      return <CrownSVG type="molar"    color="#F59E0B" size={BASE * item.scale} />;
    case "crown_premolar":
      return <CrownSVG type="premolar" color="#FBBF24" size={BASE * item.scale} />;
    case "crown_anterior":
      return <CrownSVG type="anterior" color="#FCD34D" size={BASE * item.scale} />;
    case "crown_on_implant":
      return <CrownOnImplantSVG diameter={item.diameter} length={item.length} />;
    default:
      return null;
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isImplant = (type: ProstheticType) =>
  type === "implant" || type === "crown_on_implant";

const diameterLabel = (d: number) => {
  if (d <= 3.3)  return "Estreito";
  if (d <= 4.0)  return "Padrão";
  if (d <= 4.5)  return "Intermediário";
  return "Largo";
};

// ─── Panel ────────────────────────────────────────────────────────────────────

export function DentalProstheticsPanel({ items, onItemsChange }: DentalProstheticsProps) {
  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [selDiameter, setSelDiameter]   = useState<number>(4.0);
  const [selLength, setSelLength]       = useState<number>(12);
  const [crownScale, setCrownScale]     = useState<number>(1.0);
  const [showImplants, setShowImplants] = useState(true);
  const [showCrowns, setShowCrowns]     = useState(true);

  const selectedItem = items.find(i => i.id === selectedId);

  const createItem = useCallback((type: ProstheticType): ProstheticItem => ({
    id: `prosthetic_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    x: 0.5,
    y: 0.5,
    diameter: selDiameter,
    length:   selLength,
    scale:    crownScale,
    rotation: 0,
  }), [selDiameter, selLength, crownScale]);

  const addItem = useCallback((type: ProstheticType) => {
    const item = createItem(type);
    onItemsChange([...items, item]);
    setSelectedId(item.id);
    const label = type === "implant"
      ? `Implante ${selDiameter}×${selLength}mm`
      : type.replace("crown_", "Coroa ").replace("on_implant", "s/ Implante");
    toast.success(`${label} adicionado — arraste para posicionar`);
  }, [createItem, items, onItemsChange, selDiameter, selLength]);

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

  const crownTypes: ProstheticType[] = ["crown_anterior", "crown_premolar", "crown_molar", "crown_on_implant"];
  const crownLabels: Record<string, string> = {
    crown_anterior: "Anterior", crown_premolar: "Pré-molar",
    crown_molar: "Molar", crown_on_implant: "s/ Implante",
  };
  const crownColors: Record<string, string> = {
    crown_anterior: "#FCD34D", crown_premolar: "#FBBF24",
    crown_molar: "#F59E0B", crown_on_implant: "#10B981",
  };

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

        {/* ── SEÇÃO IMPLANTES ── */}
        <div>
          <button
            onClick={() => setShowImplants(v => !v)}
            className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 hover:text-foreground"
          >
            <span>Implantes</span>
            {showImplants ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {showImplants && (
            <div className="space-y-3">
              {/* Diâmetro */}
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">
                  Diâmetro: <span className="font-bold text-foreground">{selDiameter} mm</span>
                  <span className="ml-1 text-muted-foreground">({diameterLabel(selDiameter)})</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {IMPLANT_DIAMETERS.map(d => (
                    <button key={d}
                      onClick={() => setSelDiameter(d)}
                      className={cn(
                        "px-2 py-1 rounded text-xs border transition-all",
                        selDiameter === d
                          ? "bg-purple-600 border-purple-400 text-white font-bold"
                          : "border-border hover:border-purple-400 hover:bg-purple-900/20"
                      )}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comprimento */}
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">
                  Comprimento: <span className="font-bold text-foreground">{selLength} mm</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {IMPLANT_LENGTHS.map(l => (
                    <button key={l}
                      onClick={() => setSelLength(l)}
                      className={cn(
                        "px-2 py-1 rounded text-xs border transition-all",
                        selLength === l
                          ? "bg-purple-600 border-purple-400 text-white font-bold"
                          : "border-border hover:border-purple-400 hover:bg-purple-900/20"
                      )}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview + Botões de inserção */}
              <div className="flex gap-3 items-end">
                {/* Preview do implante selecionado */}
                <div className="flex flex-col items-center gap-1 bg-muted/40 rounded-lg p-2 min-w-[60px]">
                  <div className="flex items-center justify-center" style={{ height: 60 }}>
                    <ImplantSVG diameter={selDiameter} length={selLength} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{selDiameter}×{selLength}mm</span>
                </div>

                <div className="flex flex-col gap-2 flex-1">
                  <Button size="sm" onClick={() => addItem("implant")}
                    className="h-9 text-xs bg-purple-600 hover:bg-purple-500 text-white">
                    + Inserir Implante {selDiameter}×{selLength}mm
                  </Button>
                  <Button size="sm" onClick={() => addItem("crown_on_implant")}
                    className="h-9 text-xs bg-emerald-700 hover:bg-emerald-600 text-white">
                    + Coroa sobre Implante {selDiameter}×{selLength}mm
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── SEÇÃO COROAS ── */}
        <div className="border-t pt-3">
          <button
            onClick={() => setShowCrowns(v => !v)}
            className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 hover:text-foreground"
          >
            <span>Coroas</span>
            {showCrowns ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {showCrowns && (
            <div className="space-y-3">
              {/* Escala da coroa */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Tamanho da coroa</span>
                  <span className="font-bold text-foreground">{Math.round(crownScale * 100)}%</span>
                </div>
                <Slider value={[crownScale]} onValueChange={([v]) => setCrownScale(v)}
                  min={0.4} max={2.0} step={0.05} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {crownTypes.map(type => (
                  <button key={type}
                    onClick={() => addItem(type)}
                    className="flex items-center gap-2 p-2 rounded-lg border border-border hover:border-amber-400/60 hover:bg-amber-900/10 text-left transition-all text-xs">
                    <div style={{ width: 28, height: 28, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <CrownSVG
                        type={type === "crown_on_implant" ? "molar" : type.replace("crown_", "") as any}
                        color={crownColors[type]}
                        size={26}
                      />
                    </div>
                    <span className="leading-tight">{crownLabels[type]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── EDITOR DO ITEM SELECIONADO ── */}
        {selectedItem && (
          <div className="border-t pt-3 space-y-3">
            <p className="text-xs font-semibold text-primary flex items-center gap-1">
              ✏️ Editando item selecionado
            </p>

            {isImplant(selectedItem.type) && (
              <>
                {/* Editar diâmetro do selecionado */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">
                    Diâmetro: <span className="font-bold text-foreground">{selectedItem.diameter} mm</span>
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {IMPLANT_DIAMETERS.map(d => (
                      <button key={d}
                        onClick={() => updateSelected({ diameter: d })}
                        className={cn(
                          "px-1.5 py-0.5 rounded text-[11px] border transition-all",
                          selectedItem.diameter === d
                            ? "bg-purple-600 border-purple-400 text-white font-bold"
                            : "border-border hover:border-purple-400"
                        )}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Editar comprimento do selecionado */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">
                    Comprimento: <span className="font-bold text-foreground">{selectedItem.length} mm</span>
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {IMPLANT_LENGTHS.map(l => (
                      <button key={l}
                        onClick={() => updateSelected({ length: l })}
                        className={cn(
                          "px-1.5 py-0.5 rounded text-[11px] border transition-all",
                          selectedItem.length === l
                            ? "bg-purple-600 border-purple-400 text-white font-bold"
                            : "border-border hover:border-purple-400"
                        )}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {!isImplant(selectedItem.type) && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Tamanho</span>
                  <span>{Math.round(selectedItem.scale * 100)}%</span>
                </div>
                <Slider value={[selectedItem.scale]}
                  onValueChange={([v]) => updateSelected({ scale: v })}
                  min={0.3} max={2.5} step={0.05} />
              </div>
            )}

            {/* Rotação — para todos */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Rotação</span>
                <span>{selectedItem.rotation > 0 ? `+${selectedItem.rotation}°` : `${selectedItem.rotation}°`}</span>
              </div>
              <Slider value={[selectedItem.rotation]}
                onValueChange={([v]) => updateSelected({ rotation: Math.round(v) })}
                min={-45} max={45} step={1} />
            </div>

            <Button variant="destructive" size="sm" onClick={deleteSelected} className="w-full h-8 text-xs">
              <Trash2 className="w-3 h-3 mr-1" /> Remover
            </Button>
          </div>
        )}

        {/* ── LISTA DE ITENS ── */}
        {items.length > 0 && (
          <div className="border-t pt-2 space-y-1">
            <p className="text-xs text-muted-foreground">Itens na radiografia:</p>
            {items.map(item => (
              <div key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={cn(
                  "flex items-center gap-2 p-1.5 rounded cursor-pointer text-xs transition-colors",
                  selectedId === item.id ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
                )}>
                <div style={{ width: 18, height: 22, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {isImplant(item.type)
                    ? <ImplantSVG diameter={Math.min(item.diameter, 4)} length={Math.min(item.length, 12)} />
                    : <CrownSVG type={item.type === "crown_molar" ? "molar" : item.type === "crown_premolar" ? "premolar" : "anterior"}
                        color="#F59E0B" size={18} />
                  }
                </div>
                <span className="truncate flex-1">
                  {item.type === "implant" || item.type === "crown_on_implant"
                    ? `${item.type === "crown_on_implant" ? "Coroa+Impl." : "Implante"} ${item.diameter}×${item.length}mm`
                    : item.type.replace("crown_", "Coroa ").replace("_", "-")}
                </span>
                {selectedId === item.id && (
                  <span className="text-[10px] text-primary font-bold">selecionado</span>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-start gap-2 p-2 bg-muted/30 rounded text-xs text-muted-foreground">
          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>Selecione diâmetro e comprimento → clique "Inserir" → arraste na radiografia para posicionar.</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Overlay de próteses na radiografia ──────────────────────────────────────

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
      window.removeEventListener("mouseup",   handleUp);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup",   handleUp);
  }, [containerRef, onMove, onSelect]);

  return (
    <>
      {items.map(item => {
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
                ? "drop-shadow(0 0 5px rgba(139,92,246,0.95))"
                : "drop-shadow(0 0 2px rgba(0,0,0,0.65))",
              transition: "filter 0.15s",
            }}
          >
            {renderProsthetic(item)}
            {isSelected && (
              <div style={{
                position: "absolute", inset: -5,
                border: "1.5px dashed rgba(139,92,246,0.85)",
                borderRadius: 4, pointerEvents: "none",
              }} />
            )}
          </div>
        );
      })}
    </>
  );
}
