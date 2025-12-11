import { cn } from "@/lib/utils";

interface SvgLegendProps {
  showAnatomicStructures: boolean;
  className?: string;
}

const legendItems = [
  { 
    type: "seio-maxilar", 
    label: "Seio Maxilar", 
    color: "#FFD700", 
    strokeStyle: "dashed",
    description: "Polígono amarelo pontilhado"
  },
  { 
    type: "canal-mandibular", 
    label: "Canal Mandibular", 
    color: "#00AEEF", 
    strokeStyle: "solid",
    description: "Linha azul clara"
  },
  { 
    type: "implante", 
    label: "Implante", 
    color: "#8B5CF6", 
    strokeStyle: "solid",
    description: "Roxo com linhas"
  },
  { 
    type: "carie", 
    label: "Cárie", 
    color: "#FF0000", 
    strokeStyle: "solid",
    description: "Círculo vermelho"
  },
  { 
    type: "lesao", 
    label: "Lesão", 
    color: "#FFA500", 
    strokeStyle: "solid",
    description: "Círculo laranja"
  },
  { 
    type: "restauracao", 
    label: "Restauração", 
    color: "#22C55E", 
    strokeStyle: "solid",
    description: "Verde"
  },
  { 
    type: "fratura", 
    label: "Fratura", 
    color: "#EC4899", 
    strokeStyle: "solid",
    description: "Rosa"
  },
  { 
    type: "reabsorcao", 
    label: "Reabsorção", 
    color: "#EF4444", 
    strokeStyle: "solid",
    description: "Vermelho escuro"
  },
  { 
    type: "dente-normal", 
    label: "Dente Normal", 
    color: "#3B82F6", 
    strokeStyle: "solid",
    description: "Azul"
  },
  { 
    type: "dente-alterado", 
    label: "Dente Alterado", 
    color: "#F59E0B", 
    strokeStyle: "solid",
    description: "Laranja"
  },
];

export function SvgLegend({ showAnatomicStructures, className }: SvgLegendProps) {
  return (
    <div className={cn("bg-background/95 backdrop-blur-sm rounded-lg p-3 border shadow-sm", className)}>
      <p className="text-xs font-semibold mb-2 text-foreground">Legenda das Marcações</p>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-3 gap-y-2">
        {legendItems.map((item) => {
          // Only show anatomic structures if enabled
          if ((item.type === "seio-maxilar" || item.type === "canal-mandibular") && !showAnatomicStructures) {
            return null;
          }
          
          return (
            <div key={item.type} className="flex items-center gap-2">
              <svg width="18" height="14" viewBox="0 0 18 14" className="flex-shrink-0">
                {item.type === "seio-maxilar" ? (
                  <polygon 
                    points="2,12 9,2 16,12" 
                    fill={`${item.color}30`} 
                    stroke={item.color} 
                    strokeWidth="1.5" 
                    strokeDasharray="2,1" 
                  />
                ) : item.type === "canal-mandibular" ? (
                  <path 
                    d="M 2,7 Q 9,2 16,7" 
                    fill="none" 
                    stroke={item.color} 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                  />
                ) : item.type === "implante" ? (
                  <g>
                    <rect x="5" y="1" width="8" height="12" rx="1" fill={`${item.color}60`} stroke={item.color} strokeWidth="1" />
                    <line x1="6" y1="4" x2="12" y2="4" stroke={item.color} strokeWidth="0.8" />
                    <line x1="6" y1="7" x2="12" y2="7" stroke={item.color} strokeWidth="0.8" />
                    <line x1="6" y1="10" x2="12" y2="10" stroke={item.color} strokeWidth="0.8" />
                  </g>
                ) : (
                  <circle 
                    cx="9" 
                    cy="7" 
                    r="5"
                    fill={`${item.color}40`} 
                    stroke={item.color} 
                    strokeWidth="1.5" 
                  />
                )}
              </svg>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
