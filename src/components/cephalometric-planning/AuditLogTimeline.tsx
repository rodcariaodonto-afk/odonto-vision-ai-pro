import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Loader2, CheckCircle, XCircle, Pencil, FileDown, Sparkles, ShieldAlert, FileWarning } from "lucide-react";
import { useCephalometricPlanning, type AuditLogEntry } from "@/hooks/useCephalometricPlanning";

interface Props {
  planningSuggestionId: string;
}

const EVENT_CONFIG: Record<string, { label: string; icon: typeof CheckCircle; color: string }> = {
  generated: { label: "Sugestao gerada", icon: Sparkles, color: "text-blue-600" },
  edited: { label: "Editada pelo profissional", icon: Pencil, color: "text-amber-600" },
  approved: { label: "Aprovada", icon: CheckCircle, color: "text-emerald-600" },
  rejected: { label: "Rejeitada", icon: XCircle, color: "text-red-600" },
  exported: { label: "Exportada", icon: FileDown, color: "text-purple-600" },
  safety_blocked: { label: "Bloqueada pelo filtro de seguranca", icon: ShieldAlert, color: "text-red-700" },
  requested_more_data: { label: "Solicitou mais dados", icon: FileWarning, color: "text-gray-600" },
};

export function AuditLogTimeline({ planningSuggestionId }: Props) {
  const { fetchAuditLog } = useCephalometricPlanning();
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setIsLoading(true);
    fetchAuditLog(planningSuggestionId).then((items) => {
      setEntries(items);
      setIsLoading(false);
    });
  }, [open, planningSuggestionId, fetchAuditLog]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <History className="mr-2 h-4 w-4" />
          Ver log de auditoria
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Log de auditoria</DialogTitle>
          <DialogDescription>
            Timeline de eventos desta sugestao. Registros sao imutaveis e mantidos para fins medico-legais.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mr-2 pr-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum evento de auditoria registrado.
            </p>
          ) : (
            <ol className="space-y-4 relative border-l-2 border-border pl-6 ml-2 py-2">
              {entries.map((entry) => {
                const cfg = EVENT_CONFIG[entry.event_type] ?? {
                  label: entry.event_type,
                  icon: History,
                  color: "text-muted-foreground",
                };
                const Icon = cfg.icon;
                const date = new Date(entry.event_timestamp).toLocaleString("pt-BR");
                return (
                  <li key={entry.id} className="relative">
                    <span className="absolute -left-[35px] flex h-6 w-6 items-center justify-center rounded-full bg-background border-2 border-border">
                      <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                    </span>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-sm">{cfg.label}</span>
                        <span className="text-xs text-muted-foreground">{date}</span>
                      </div>
                      {entry.reason && (
                        <p className="text-xs text-muted-foreground">
                          <strong>Motivo:</strong> {entry.reason}
                        </p>
                      )}
                      {entry.data_sufficiency_score !== null && (
                        <div className="flex gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            Score: {entry.data_sufficiency_score}/100
                          </Badge>
                          {entry.confidence_level && (
                            <Badge variant="outline" className="text-xs">
                              {entry.confidence_level}
                            </Badge>
                          )}
                          {entry.rules_version && (
                            <Badge variant="outline" className="text-xs font-mono">
                              {entry.rules_version}
                            </Badge>
                          )}
                        </div>
                      )}
                      {entry.content_after && entry.event_type === "edited" && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            Ver conteudo apos edicao
                          </summary>
                          <pre className="mt-2 p-2 bg-muted rounded text-[10px] whitespace-pre-wrap max-h-40 overflow-y-auto">
                            {entry.content_after}
                          </pre>
                        </details>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
