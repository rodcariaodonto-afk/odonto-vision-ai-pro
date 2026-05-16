import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, History } from "lucide-react";
import type { PlanningSummary } from "@/hooks/useCephalometricPlanning";

interface Props {
  items: PlanningSummary[];
  onSelect: (id: string) => void;
  isLoading?: boolean;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  draft_ai_generated: { label: "Rascunho", color: "bg-blue-500/15 text-blue-700 border-blue-500/30" },
  clinician_edited: { label: "Editado", color: "bg-amber-500/15 text-amber-700 border-amber-500/30" },
  clinician_approved: { label: "Aprovado", color: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" },
  rejected: { label: "Rejeitado", color: "bg-red-500/15 text-red-700 border-red-500/30" },
  requires_more_data: { label: "Dados insuficientes", color: "bg-gray-500/15 text-gray-700 border-gray-500/30" },
};

export function SuggestionHistoryList({ items, onSelect, isLoading }: Props) {
  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground py-2">Carregando historico...</p>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <Card className="bg-muted/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <History className="h-4 w-4" />
          Sugestoes anteriores para esta analise ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => {
          const cfg = STATUS_LABEL[item.status] ?? STATUS_LABEL.draft_ai_generated;
          const date = new Date(item.generated_at).toLocaleString("pt-BR");
          return (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-md border bg-card p-3 hover:border-primary/40 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className={cfg.color}>
                    {cfg.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{date}</span>
                  <span className="text-xs font-mono text-muted-foreground">
                    {item.data_sufficiency_score}/100
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {item.summary}
                </p>
                {item.rejection_reason && (
                  <p className="text-xs text-red-600 mt-1">
                    Motivo da rejeicao: {item.rejection_reason}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelect(item.id)}
              >
                <Eye className="mr-2 h-3 w-3" />
                Ver
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
