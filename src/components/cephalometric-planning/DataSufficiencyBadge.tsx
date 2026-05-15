import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { CephPlanningConfidence } from "@/lib/cephalometric-planning";

interface Props {
  score: number;
  confidenceLevel: CephPlanningConfidence;
}

const CONFIG: Record<CephPlanningConfidence, { label: string; color: string; tone: string }> = {
  low: {
    label: "Confiança Baixa",
    color: "bg-red-500/15 text-red-700 border-red-500/30",
    tone: "bg-red-500",
  },
  medium: {
    label: "Confiança Média",
    color: "bg-amber-500/15 text-amber-700 border-amber-500/30",
    tone: "bg-amber-500",
  },
  high: {
    label: "Confiança Alta",
    color: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
    tone: "bg-emerald-500",
  },
};

export function DataSufficiencyBadge({ score, confidenceLevel }: Props) {
  const cfg = CONFIG[confidenceLevel];

  return (
    <div className="space-y-2 rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">
          Suficiência de dados
        </span>
        <Badge variant="outline" className={cfg.color}>
          {cfg.label}
        </Badge>
      </div>
      <div className="flex items-center gap-3">
        <Progress value={score} className="h-2" />
        <span className="text-sm font-mono tabular-nums text-foreground">
          {score}/100
        </span>
      </div>
    </div>
  );
}
