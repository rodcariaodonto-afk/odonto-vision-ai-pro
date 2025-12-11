import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { AnaliseVisualCompleta } from "./VisualAnalysis";

interface OdontogramaProps {
  analiseCompleta: AnaliseVisualCompleta;
  onToothClick?: (dente: string) => void;
}

// Dentes superiores (direito para esquerdo visualmente)
const dentesSuperiores = ["18", "17", "16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26", "27", "28"];
// Dentes inferiores (direito para esquerdo visualmente)
const dentesInferiores = ["48", "47", "46", "45", "44", "43", "42", "41", "31", "32", "33", "34", "35", "36", "37", "38"];

type ToothStatus = "saudavel" | "carie" | "lesao" | "ausente" | "implante" | "restaurado" | "fratura" | "reabsorcao" | "tratamento";

const statusConfig: Record<ToothStatus, { bg: string; border: string; text: string; label: string }> = {
  saudavel: { bg: "bg-green-500/20", border: "border-green-500", text: "text-green-600", label: "Saudável" },
  carie: { bg: "bg-red-500/20", border: "border-red-500", text: "text-red-600", label: "Cárie" },
  lesao: { bg: "bg-orange-500/20", border: "border-orange-500", text: "text-orange-600", label: "Lesão" },
  ausente: { bg: "bg-gray-500/10", border: "border-gray-400 border-dashed", text: "text-gray-400", label: "Ausente" },
  implante: { bg: "bg-purple-500/20", border: "border-purple-500", text: "text-purple-600", label: "Implante" },
  restaurado: { bg: "bg-blue-500/20", border: "border-blue-500", text: "text-blue-600", label: "Restaurado" },
  fratura: { bg: "bg-amber-500/20", border: "border-amber-500", text: "text-amber-600", label: "Fratura" },
  reabsorcao: { bg: "bg-pink-500/20", border: "border-pink-500", text: "text-pink-600", label: "Reabsorção" },
  tratamento: { bg: "bg-cyan-500/20", border: "border-cyan-500", text: "text-cyan-600", label: "Em tratamento" },
};

export function Odontograma({ analiseCompleta, onToothClick }: OdontogramaProps) {
  const getToothStatus = (denteNum: string): { status: ToothStatus; detalhes: string } => {
    // Check if absent
    if (analiseCompleta.ausencias?.includes(denteNum)) {
      return { status: "ausente", detalhes: "Dente ausente" };
    }
    
    // Check if implant
    const implante = analiseCompleta.implantes?.find(i => i.dente === denteNum);
    if (implante) {
      return { status: "implante", detalhes: implante.detalhes || "Implante osseointegrado" };
    }
    
    // Check for caries
    const carie = analiseCompleta.caries?.find(c => c.dente === denteNum);
    if (carie) {
      return { status: "carie", detalhes: `Cárie na superfície ${carie.superficie}` };
    }
    
    // Check for lesions
    const lesao = analiseCompleta.lesoes_suspeitas?.find(l => l.dente === denteNum);
    if (lesao) {
      return { status: "lesao", detalhes: lesao.descricao };
    }
    
    // Check for fractures
    const fratura = analiseCompleta.fraturas?.find(f => f.dente === denteNum);
    if (fratura) {
      return { status: "fratura", detalhes: fratura.descricao };
    }
    
    // Check for reabsorptions
    const reabsorcao = analiseCompleta.reabsorcoes?.find(r => r.dente === denteNum);
    if (reabsorcao) {
      return { status: "reabsorcao", detalhes: `Reabsorção ${reabsorcao.tipo}` };
    }
    
    // Check in dentes map
    const denteInfo = analiseCompleta.dentes?.[denteNum];
    if (denteInfo) {
      const statusLower = denteInfo.status.toLowerCase();
      if (statusLower.includes("saudável") || statusLower.includes("normal") || statusLower.includes("hígido")) {
        return { status: "saudavel", detalhes: denteInfo.detalhes || denteInfo.status };
      }
      if (statusLower.includes("restaur")) {
        return { status: "restaurado", detalhes: denteInfo.detalhes || denteInfo.status };
      }
      if (statusLower.includes("tratamento") || statusLower.includes("endodont")) {
        return { status: "tratamento", detalhes: denteInfo.detalhes || denteInfo.status };
      }
      if (statusLower.includes("cárie") || statusLower.includes("carie")) {
        return { status: "carie", detalhes: denteInfo.detalhes || denteInfo.status };
      }
      if (statusLower.includes("lesão") || statusLower.includes("lesao") || statusLower.includes("periapical")) {
        return { status: "lesao", detalhes: denteInfo.detalhes || denteInfo.status };
      }
      // Default to healthy if has info but no specific issue
      return { status: "saudavel", detalhes: denteInfo.detalhes || denteInfo.status };
    }
    
    // Default - unknown/not analyzed
    return { status: "saudavel", detalhes: "Sem alterações identificadas" };
  };

  const renderTooth = (denteNum: string) => {
    const { status, detalhes } = getToothStatus(denteNum);
    const config = statusConfig[status];
    
    return (
      <TooltipProvider key={denteNum}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onToothClick?.(denteNum)}
              className={cn(
                "w-8 h-10 md:w-10 md:h-12 rounded-md border-2 flex items-center justify-center text-xs font-bold transition-all hover:scale-110 hover:shadow-lg",
                config.bg,
                config.border,
                config.text,
                status === "ausente" && "opacity-50"
              )}
            >
              {denteNum}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="font-semibold">Dente {denteNum}</p>
            <p className="text-xs text-muted-foreground">{config.label}</p>
            <p className="text-xs mt-1">{detalhes}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Calculate statistics
  const stats = {
    total: 32,
    saudaveis: 0,
    ausentes: analiseCompleta.ausencias?.length || 0,
    implantes: analiseCompleta.implantes?.length || 0,
    caries: analiseCompleta.caries?.length || 0,
    lesoes: analiseCompleta.lesoes_suspeitas?.length || 0,
    fraturas: analiseCompleta.fraturas?.length || 0,
    reabsorcoes: analiseCompleta.reabsorcoes?.length || 0,
  };
  
  stats.saudaveis = stats.total - stats.ausentes - stats.caries - stats.lesoes - stats.fraturas - stats.reabsorcoes;
  if (stats.saudaveis < 0) stats.saudaveis = 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          🦷 Odontograma Interativo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Legend */}
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(statusConfig).map(([key, config]) => (
            <div key={key} className="flex items-center gap-1">
              <div className={cn("w-3 h-3 rounded border", config.bg, config.border)} />
              <span className="text-muted-foreground">{config.label}</span>
            </div>
          ))}
        </div>

        {/* Odontogram Grid */}
        <div className="space-y-4">
          {/* Superior Arch */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground text-center">Arcada Superior</p>
            <div className="flex justify-center gap-0.5 md:gap-1">
              {dentesSuperiores.map(renderTooth)}
            </div>
          </div>
          
          {/* Divider */}
          <div className="border-t border-dashed border-muted-foreground/30 my-2" />
          
          {/* Inferior Arch */}
          <div className="space-y-1">
            <div className="flex justify-center gap-0.5 md:gap-1">
              {dentesInferiores.map(renderTooth)}
            </div>
            <p className="text-xs text-muted-foreground text-center">Arcada Inferior</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 pt-2 border-t">
          <div className="text-center">
            <p className="text-lg font-bold text-green-500">{stats.saudaveis}</p>
            <p className="text-xs text-muted-foreground">Saudáveis</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-400">{stats.ausentes}</p>
            <p className="text-xs text-muted-foreground">Ausentes</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-purple-500">{stats.implantes}</p>
            <p className="text-xs text-muted-foreground">Implantes</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-red-500">{stats.caries + stats.lesoes}</p>
            <p className="text-xs text-muted-foreground">Patologias</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
