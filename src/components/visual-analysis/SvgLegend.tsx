import { cn } from "@/lib/utils";

interface SvgLegendProps {
  showAnatomicStructures: boolean;
  className?: string;
}

const legendItems = [
  { 
    type: "seio-maxilar", 
    label: "Seio Maxilar", 
    color: "#3B82F6", 
    strokeStyle: "dashed",
    description: "Contorno pontilhado azul"
  },
  { 
    type: "canal-mandibular", 
    label: "Canal Mandibular", 
    color: "#F59E0B", 
    strokeStyle: "solid",
    description: "Linha laranja"
  },
  { 
    type: "implante", 
    label: "Implante", 
    color: "#8B5CF6", 
    strokeStyle: "solid",
    description: "Roxo"
  },
  { 
    type: "lesao", 
    label: "Lesão", 
    color: "#EF4444", 
    strokeStyle: "solid",
    description: "Vermelho"
  },
  { 
    type: "carie", 
    label: "Cárie", 
    color: "#F97316", 
    strokeStyle: "solid",
    description: "Laranja"
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
    color: "#14B8A6", 
    strokeStyle: "solid",
    description: "Verde-água"
  },
  { 
    type: "info", 
    label: "Estrutura", 
    color: "#3B82F6", 
    strokeStyle: "solid",
    description: "Azul"
  },
];

export function SvgLegend({ showAnatomicStructures, className }: SvgLegendProps) {
  return (
    <div className={cn("bg-background/95 backdrop-blur-sm rounded-lg p-3 border shadow-sm", className)}>
      <p className="text-xs font-semibold mb-2 text-foreground">Legenda das Marcações</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
        {legendItems.map((item) => {
          // Only show anatomic structures if enabled
          if ((item.type === "seio-maxilar" || item.type === "canal-mandibular") && !showAnatomicStructures) {
            return null;
          }
          
          return (
            <div key={item.type} className="flex items-center gap-2">
              <svg width="20" height="12" viewBox="0 0 20 12" className="flex-shrink-0">
                {item.type === "seio-maxilar" ? (
                  <polygon 
                    points="2,10 10,2 18,10" 
                    fill={`${item.color}20`} 
                    stroke={item.color} 
                    strokeWidth="1" 
                    strokeDasharray="2,1" 
                  />
                ) : item.type === "canal-mandibular" ? (
                  <path 
                    d="M 2,6 Q 10,2 18,6" 
                    fill="none" 
                    stroke={item.color} 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                  />
                ) : (
                  <rect 
                    x="2" 
                    y="2" 
                    width="16" 
                    height="8" 
                    rx="2"
                    fill={`${item.color}33`} 
                    stroke={item.color} 
                    strokeWidth="1" 
                  />
                )}
              </svg>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
