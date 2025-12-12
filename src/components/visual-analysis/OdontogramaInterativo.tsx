import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, CheckSquare, Square } from "lucide-react";

export type TipoMarcacao = "carie" | "restauracao" | "endo" | "ausente" | "implante" | "protese" | "lesao" | "fratura";

export interface MarcacaoManual {
  id: string;
  tipo: TipoMarcacao;
  dente: string;
  x: number; // 0-1 normalizado
  y: number; // 0-1 normalizado
}

// Interface para achados clínicos da IA
interface AchadosClinicos {
  dentes_presentes?: string[];
  dentes_ausentes?: string[];
  caries_suspeitas?: string[];
  lesoes_suspeitas?: string[];
  implantes?: string[];
  restauracoes?: string[];
  tratamentos_endodonticos?: string[];
  observacoes?: string;
}

interface OdontogramaInterativoProps {
  onModoChange?: (dente: string | null, tipo: TipoMarcacao | null) => void;
  modoAtivo?: { dente: string | null; tipo: TipoMarcacao | null };
  onResetMarcacoes?: () => void;
  achadosClinicos?: AchadosClinicos;
}

// Dentes FDI
const dentesSuperiores = ["18", "17", "16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26", "27", "28"];
const dentesInferiores = ["48", "47", "46", "45", "44", "43", "42", "41", "31", "32", "33", "34", "35", "36", "37", "38"];

// Configuração de tipos de marcação
export const tipoMarcacaoConfig: Record<TipoMarcacao, { cor: string; bg: string; label: string; icone: string }> = {
  carie: { cor: "#EF4444", bg: "bg-red-500", label: "Cárie", icone: "●" },
  restauracao: { cor: "#3B82F6", bg: "bg-blue-500", label: "Restauração", icone: "■" },
  endo: { cor: "#06B6D4", bg: "bg-cyan-500", label: "Endodontia", icone: "E" },
  ausente: { cor: "#6B7280", bg: "bg-gray-500", label: "Ausente", icone: "✕" },
  implante: { cor: "#8B5CF6", bg: "bg-purple-500", label: "Implante", icone: "⚙" },
  protese: { cor: "#A855F7", bg: "bg-violet-500", label: "Prótese", icone: "◗" },
  lesao: { cor: "#F59E0B", bg: "bg-amber-500", label: "Lesão", icone: "○" },
  fratura: { cor: "#EC4899", bg: "bg-pink-500", label: "Fratura", icone: "╱" },
};

export function OdontogramaInterativo({ 
  onModoChange,
  modoAtivo,
  onResetMarcacoes,
  achadosClinicos
}: OdontogramaInterativoProps) {
  const [denteExpandido, setDenteExpandido] = useState<string | null>(null);
  const [dentesSelecionados, setDentesSelecionados] = useState<string[]>([]);

  // Funções auxiliares para verificar tratamentos da IA
  const hasImplante = useCallback((denteNum: string) => {
    return achadosClinicos?.implantes?.some(i => i.includes(denteNum)) || false;
  }, [achadosClinicos]);

  const hasRestauracao = useCallback((denteNum: string) => {
    return achadosClinicos?.restauracoes?.some(r => r.includes(denteNum)) || false;
  }, [achadosClinicos]);

  const hasEndo = useCallback((denteNum: string) => {
    return achadosClinicos?.tratamentos_endodonticos?.some(e => e.includes(denteNum)) || false;
  }, [achadosClinicos]);

  const isAusente = useCallback((denteNum: string) => {
    return achadosClinicos?.dentes_ausentes?.includes(denteNum) || false;
  }, [achadosClinicos]);

  const hasCarie = useCallback((denteNum: string) => {
    return achadosClinicos?.caries_suspeitas?.some(c => c.includes(denteNum)) || false;
  }, [achadosClinicos]);

  const hasLesao = useCallback((denteNum: string) => {
    return achadosClinicos?.lesoes_suspeitas?.some(l => l.includes(denteNum)) || false;
  }, [achadosClinicos]);

  const handleDenteClick = useCallback((denteNum: string, event: React.MouseEvent) => {
    // Multi-seleção com Shift ou Ctrl
    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      setDentesSelecionados(prev => 
        prev.includes(denteNum) 
          ? prev.filter(d => d !== denteNum) 
          : [...prev, denteNum]
      );
    } else {
      // Seleção única - abre menu
      if (denteExpandido === denteNum) {
        setDenteExpandido(null);
      } else {
        setDenteExpandido(denteNum);
      }
    }
  }, [denteExpandido]);

  const handleTipoClick = useCallback((denteNum: string, tipo: TipoMarcacao) => {
    if (modoAtivo?.dente === denteNum && modoAtivo?.tipo === tipo) {
      onModoChange?.(null, null);
    } else {
      onModoChange?.(denteNum, tipo);
    }
    setDenteExpandido(null);
  }, [modoAtivo, onModoChange]);

  const handleSelectAll = useCallback(() => {
    setDentesSelecionados([...dentesSuperiores, ...dentesInferiores]);
  }, []);

  const handleClearSelection = useCallback(() => {
    setDentesSelecionados([]);
  }, []);

  const renderTooth = (denteNum: string) => {
    const isExpanded = denteExpandido === denteNum;
    const isActive = modoAtivo?.dente === denteNum;
    const isSelected = dentesSelecionados.includes(denteNum);
    
    // Verificar tratamentos da IA
    const hasImp = hasImplante(denteNum);
    const hasRest = hasRestauracao(denteNum);
    const hasEnd = hasEndo(denteNum);
    const isAus = isAusente(denteNum);
    const hasCar = hasCarie(denteNum);
    const hasLes = hasLesao(denteNum);
    
    const hasTreatment = hasImp || hasRest || hasEnd || hasCar || hasLes;
    
    return (
      <div key={denteNum} className="relative">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => handleDenteClick(denteNum, e)}
                className={cn(
                  "w-7 h-9 sm:w-8 sm:h-10 md:w-9 md:h-11 rounded border-2 flex flex-col items-center justify-center text-[10px] sm:text-xs font-bold transition-all relative",
                  isActive 
                    ? "bg-primary text-primary-foreground border-primary scale-110 shadow-lg" 
                    : isSelected
                    ? "bg-primary/20 border-primary scale-105 shadow"
                    : isAus
                    ? "bg-muted/50 opacity-60 border-muted"
                    : "bg-card border-border hover:border-primary hover:scale-105",
                  isExpanded && "ring-2 ring-primary ring-offset-1",
                  // Bordas de tratamentos da IA
                  hasImp && "ring-2 ring-purple-500",
                  hasRest && !hasImp && "ring-2 ring-blue-500",
                  hasEnd && !hasImp && !hasRest && "ring-2 ring-cyan-500",
                  hasCar && !hasImp && !hasRest && !hasEnd && "ring-2 ring-red-500",
                  hasLes && !hasImp && !hasRest && !hasEnd && !hasCar && "ring-2 ring-amber-500"
                )}
              >
                {denteNum}
                {/* Ícones de tratamento no canto */}
                {hasTreatment && (
                  <div className="absolute -top-1 -right-1 flex gap-0.5">
                    {hasImp && <span className="text-purple-500 text-[7px]">⚙</span>}
                    {hasEnd && <span className="text-cyan-500 text-[7px]">E</span>}
                    {hasRest && <span className="text-blue-500 text-[7px]">■</span>}
                    {hasCar && <span className="text-red-500 text-[7px]">●</span>}
                    {hasLes && <span className="text-amber-500 text-[7px]">○</span>}
                  </div>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {isAus ? "Dente ausente" : hasTreatment 
                ? `Dente ${denteNum}: ${[hasImp && "Implante", hasRest && "Restauração", hasEnd && "Endo", hasCar && "Cárie", hasLes && "Lesão"].filter(Boolean).join(", ")}`
                : "Clique para selecionar (Ctrl+Click para multi-seleção)"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Menu de tipos de marcação */}
        {isExpanded && (
          <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-1 bg-popover border rounded-lg shadow-xl p-2 min-w-[140px]">
            <p className="text-xs font-semibold text-center mb-2 text-muted-foreground">
              Dente {denteNum}
            </p>
            <div className="grid grid-cols-2 gap-1">
              {(Object.entries(tipoMarcacaoConfig) as [TipoMarcacao, typeof tipoMarcacaoConfig.carie][]).map(([tipo, config]) => (
                <button
                  key={tipo}
                  onClick={() => handleTipoClick(denteNum, tipo)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-all",
                    modoAtivo?.dente === denteNum && modoAtivo?.tipo === tipo
                      ? `${config.bg} text-white`
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  <span style={{ color: config.cor }}>{config.icone}</span>
                  <span className="truncate">{config.label}</span>
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 h-7 text-xs"
              onClick={() => setDenteExpandido(null)}
            >
              Fechar
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            🦷 Odontograma Interativo
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="h-7 text-xs"
            >
              <CheckSquare className="w-3 h-3 mr-1" />
              Todos
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearSelection}
              className="h-7 text-xs"
            >
              <Square className="w-3 h-3 mr-1" />
              Limpar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetMarcacoes}
              className="h-7 text-xs"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Seleção múltipla indicator */}
        {dentesSelecionados.length > 0 && (
          <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium bg-primary/10 text-primary">
            <span>{dentesSelecionados.length} dente(s) selecionado(s)</span>
            <Badge variant="secondary" className="text-xs">
              {dentesSelecionados.join(", ")}
            </Badge>
          </div>
        )}

        {/* Modo ativo indicator */}
        {modoAtivo?.dente && modoAtivo?.tipo && (
          <div 
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: tipoMarcacaoConfig[modoAtivo.tipo].cor }}
          >
            <span>{tipoMarcacaoConfig[modoAtivo.tipo].icone}</span>
            <span>
              Clique na radiografia para inserir {tipoMarcacaoConfig[modoAtivo.tipo].label} (Dente {modoAtivo.dente})
            </span>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-1.5 justify-center">
          {(Object.entries(tipoMarcacaoConfig) as [TipoMarcacao, typeof tipoMarcacaoConfig.carie][]).map(([tipo, config]) => (
            <div key={tipo} className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-muted rounded">
              <span style={{ color: config.cor, fontSize: '12px' }}>{config.icone}</span>
              <span className="text-muted-foreground">{config.label}</span>
            </div>
          ))}
        </div>

        {/* Odontogram Grid */}
        <div className="space-y-3">
          {/* Superior Arch */}
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground text-center uppercase tracking-wider">Arcada Superior</p>
            <div className="flex justify-center gap-0.5">
              {dentesSuperiores.map(renderTooth)}
            </div>
          </div>
          
          {/* Divider */}
          <div className="border-t border-dashed border-muted-foreground/30" />
          
          {/* Inferior Arch */}
          <div className="space-y-1">
            <div className="flex justify-center gap-0.5">
              {dentesInferiores.map(renderTooth)}
            </div>
            <p className="text-[10px] text-muted-foreground text-center uppercase tracking-wider">Arcada Inferior</p>
          </div>
        </div>

        {/* Instructions */}
        <p className="text-[10px] text-center text-muted-foreground">
          1. Clique no dente → 2. Escolha o tipo → 3. Clique na radiografia • Ctrl+Click para multi-seleção
        </p>
      </CardContent>
    </Card>
  );
}
