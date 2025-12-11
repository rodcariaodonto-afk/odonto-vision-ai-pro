import { cn } from "@/lib/utils";

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

interface MarcacaoTooltipProps {
  marcacao: Marcacao;
  position: { x: number; y: number };
  onClose: () => void;
}

const severidadeConfig = {
  info: { 
    label: "Informação", 
    bgClass: "bg-blue-500/10 border-blue-500/30", 
    textClass: "text-blue-600 dark:text-blue-400", 
    dotClass: "bg-blue-500" 
  },
  baixa: { 
    label: "Baixa", 
    bgClass: "bg-green-500/10 border-green-500/30", 
    textClass: "text-green-600 dark:text-green-400", 
    dotClass: "bg-green-500" 
  },
  media: { 
    label: "Média", 
    bgClass: "bg-amber-500/10 border-amber-500/30", 
    textClass: "text-amber-600 dark:text-amber-400", 
    dotClass: "bg-amber-500" 
  },
  alta: { 
    label: "Alta", 
    bgClass: "bg-red-500/10 border-red-500/30", 
    textClass: "text-red-600 dark:text-red-400", 
    dotClass: "bg-red-500" 
  },
};

const categoriaLabels: Record<string, string> = {
  anatomia: "Estrutura Anatômica",
  patologia: "Achado Patológico",
  tratamento: "Tratamento Prévio",
  anomalia: "Anomalia",
};

export function MarcacaoTooltip({ marcacao, position, onClose }: MarcacaoTooltipProps) {
  const config = severidadeConfig[marcacao.severidade] || severidadeConfig.info;

  return (
    <div
      className={cn(
        "absolute z-50 max-w-xs p-3 rounded-lg border shadow-lg backdrop-blur-sm bg-background/95 animate-in fade-in-0 zoom-in-95 duration-200",
        config.bgClass
      )}
      style={{ 
        left: `${Math.min(position.x, 70)}%`, 
        top: `${Math.min(position.y + 5, 80)}%` 
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span 
            className={cn("w-3 h-3 rounded-full", config.dotClass)} 
            style={{ backgroundColor: marcacao.cor }} 
          />
          <h4 className="font-semibold text-foreground text-sm">{marcacao.label}</h4>
        </div>
        <button 
          onClick={onClose} 
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex gap-2 mb-2">
        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", config.bgClass, config.textClass)}>
          {config.label}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
          {categoriaLabels[marcacao.categoria] || marcacao.categoria}
        </span>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed">{marcacao.descricao}</p>
    </div>
  );
}
