import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Brain, Loader2, AlertTriangle, ShieldCheck, FileWarning, Download } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { useCephalometricPlanning } from "@/hooks/useCephalometricPlanning";
import {
  buildEngineInputMulti,
  calculateCephalometricPlanningDataSufficiency,
  hasMinimumMeasurementsForPlanning,
  downloadPlanningSuggestionPDF,
  type UiClinicalContext,
  type CephalometricPlanningSuggestion,
  type AnalysisResultsMap,
} from "@/lib/cephalometric-planning";

import { DataSufficiencyBadge } from "./DataSufficiencyBadge";
import { PlanningContextForm } from "./PlanningContextForm";
import { SuggestionDisplay } from "./SuggestionDisplay";
import { SuggestionEditor } from "./SuggestionEditor";
import { PlanningApprovalActions } from "./PlanningApprovalActions";
import { SuggestionHistoryList } from "./SuggestionHistoryList";
import { AuditLogTimeline } from "./AuditLogTimeline";
import type { PlanningSummary } from "@/hooks/useCephalometricPlanning";

interface Props {
  /** ID da analise cefalometrica ja persistida em cephalometric_analyses */
  cephalometricAnalysisId: string | null;
  /** Resultados de TODAS as analises rodadas (Steiner, McNamara, etc.) */
  results: AnalysisResultsMap;
  /** Nome do paciente (opcional, usado no PDF) */
  patientName?: string;
  /** ID do paciente (opcional, usado no PDF) */
  patientId?: string;
}

type LocalState =
  | { kind: "idle" }
  | { kind: "generating" }
  | { kind: "generated"; suggestion: CephalometricPlanningSuggestion; persistedId: string }
  | { kind: "editing"; suggestion: CephalometricPlanningSuggestion; persistedId: string }
  | { kind: "finalized"; suggestion: CephalometricPlanningSuggestion; persistedId: string; status: "approved" | "rejected" };

/**
 * Painel principal de sugestao de planeamento cefalometrico.
 *
 * Aparece dentro de Cephalometry.tsx apos a analise rodar e ter medidas
 * suficientes. Orquestra: gerar -> exibir -> editar -> aprovar/rejeitar.
 */
export function CephalometricPlanningPanel({ cephalometricAnalysisId, results, patientName, patientId }: Props) {
  const { user } = useAuth();
  const { isGenerating, isUpdating, generate, updateText, approve, reject, listSuggestions, fetchSuggestion } = useCephalometricPlanning();
  const [state, setState] = useState<LocalState>({ kind: "idle" });
  const [uiContext, setUiContext] = useState<UiClinicalContext>({});
  const [history, setHistory] = useState<PlanningSummary[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Carregar historico quando o analysisId mudar
  const reloadHistory = useCallback(async () => {
    if (!cephalometricAnalysisId) return;
    setIsLoadingHistory(true);
    const items = await listSuggestions(cephalometricAnalysisId);
    setHistory(items);
    setIsLoadingHistory(false);
  }, [cephalometricAnalysisId, listSuggestions]);

  useEffect(() => {
    reloadHistory();
  }, [reloadHistory]);

  // Selecionar sugestao do historico para visualizar
  const handleSelectFromHistory = useCallback(
    async (id: string) => {
      const suggestion = await fetchSuggestion(id);
      if (!suggestion) {
        toast.error("Falha ao carregar sugestao do historico");
        return;
      }
      if (suggestion.status === "clinician_approved") {
        setState({ kind: "finalized", suggestion, persistedId: id, status: "approved" });
      } else if (suggestion.status === "rejected") {
        setState({ kind: "finalized", suggestion, persistedId: id, status: "rejected" });
      } else {
        setState({ kind: "generated", suggestion, persistedId: id });
      }
    },
    [fetchSuggestion],
  );

  // Pre-check: ha dados sagitais minimos?
  const canGenerate = useMemo(
    () => hasMinimumMeasurementsForPlanning(results) && cephalometricAnalysisId !== null,
    [results, cephalometricAnalysisId],
  );

  // Preview do score antes mesmo de gerar
  const previewSufficiency = useMemo(() => {
    if (!canGenerate) return null;
    const input = buildEngineInputMulti(results, uiContext);
    return calculateCephalometricPlanningDataSufficiency(input);
  }, [results, uiContext, canGenerate]);

  // --------------------------------------------------------------------------
  // HANDLERS
  // --------------------------------------------------------------------------
  const handleGenerate = async () => {
    if (!cephalometricAnalysisId || !user?.id) {
      toast.error("Analise ou usuario nao identificado");
      return;
    }

    setState({ kind: "generating" });
    const { measurements } = buildEngineInputMulti(results, uiContext);
    const result = await generate({
      cephalometricAnalysisId,
      userId: user.id,
      measurements,
      clinicalContext: uiContext,
    });

    if (!result.success || !result.suggestion || !result.persistedRow) {
      setState({ kind: "idle" });
      toast.error(result.error ?? "Falha ao gerar sugestao", {
        description: result.blockedTerms?.length
          ? `Termos bloqueados: ${result.blockedTerms.join(", ")}`
          : undefined,
      });
      return;
    }

    const persistedId = (result.persistedRow as { id: string }).id;
    setState({
      kind: "generated",
      suggestion: result.suggestion,
      persistedId,
    });
    toast.success("Sugestao gerada com sucesso");
    reloadHistory();
  };

  const handleStartEdit = () => {
    if (state.kind !== "generated") return;
    setState({ ...state, kind: "editing" });
  };

  const handleSaveEdit = async (payload: import("./SuggestionEditor").EditedSuggestionPayload) => {
    if (state.kind !== "editing" || !user?.id) return;

    const res = await updateText({
      planningSuggestionId: state.persistedId,
      userId: user.id,
      summary: payload.summary,
      prioritizedProblems: payload.prioritizedProblems,
      therapeuticObjectives: payload.therapeuticObjectives,
      treatmentAlternatives: payload.treatmentAlternatives,
      alertsAndLimitations: payload.alertsAndLimitations,
      patientFriendlyExplanation: payload.patientFriendlyExplanation,
    });

    if (!res.success) {
      toast.error(res.error ?? "Falha ao salvar edicao");
      return;
    }

    // Atualiza estado local com os campos editados (merge em cima da sugestao original)
    setState({
      kind: "generated",
      suggestion: {
        ...state.suggestion,
        summary: payload.summary,
        prioritizedProblems: payload.prioritizedProblems,
        therapeuticObjectives: payload.therapeuticObjectives,
        treatmentAlternatives: payload.treatmentAlternatives,
        alertsAndLimitations: payload.alertsAndLimitations,
        patientFriendlyExplanation: payload.patientFriendlyExplanation,
      },
      persistedId: state.persistedId,
    });
    toast.success("Edicao salva");
  };

  const handleApprove = async () => {
    if (state.kind !== "generated" || !user?.id) return;

    const finalText = state.suggestion.clinicianEditedText ?? state.suggestion.aiOriginalText;
    const res = await approve(state.persistedId, user.id, finalText);

    if (!res.success) {
      toast.error(res.error ?? "Falha ao aprovar");
      return;
    }
    setState({ ...state, kind: "finalized", status: "approved" });
    toast.success("Sugestao aprovada e registrada no log de auditoria");
    reloadHistory();
  };

  const handleReject = async (reason: string) => {
    if (state.kind !== "generated" || !user?.id) return;

    const res = await reject(state.persistedId, user.id, reason);
    if (!res.success) {
      toast.error(res.error ?? "Falha ao rejeitar");
      return;
    }
    setState({ ...state, kind: "finalized", status: "rejected" });
    toast.success("Sugestao rejeitada");
    reloadHistory();
  };

  // --------------------------------------------------------------------------
  // GUARDAS / ESTADOS VAZIOS
  // --------------------------------------------------------------------------
  if (!cephalometricAnalysisId) {
    return null; // Painel so aparece com analise persistida
  }

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------
  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-5 w-5" />
          Sugestao de Planeamento Clinico
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Aviso permanente */}
        <Alert className="border-amber-500/40 bg-amber-500/10">
          <ShieldCheck className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-700">Apoio a decisao clinica</AlertTitle>
          <AlertDescription className="text-sm">
            Esta funcionalidade gera sugestoes deterministicas a partir das medidas
            cefalometricas. NAO substitui o julgamento profissional. Toda sugestao
            requer revisao e aprovacao do dentista antes de qualquer aplicacao.
          </AlertDescription>
        </Alert>

        {/* Historico de sugestoes desta analise */}
        <SuggestionHistoryList
          items={history}
          onSelect={handleSelectFromHistory}
          isLoading={isLoadingHistory}
        />

        {/* Pre-check: dados sagitais minimos (qualquer analise) */}
        {!canGenerate && (
          <Alert>
            <FileWarning className="h-4 w-4" />
            <AlertTitle>Dados insuficientes</AlertTitle>
            <AlertDescription>
              Para gerar uma sugestao e necessaria pelo menos uma fonte sagital:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Steiner (ANB ou SNA + SNB) - padrao-ouro</li>
                <li>McNamara (A-Nperp + Pog-Nperp)</li>
                <li>Ricketts (Profundidade Facial)</li>
                <li>Downs (Angulo Facial ou Convexidade)</li>
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                Para sugestao completa, combine sagital com vertical (ex: McNamara + Jarabak)
                e incisivos (ex: Steiner ou Tweed).
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* IDLE: formulario de contexto + botao gerar */}
        {state.kind === "idle" && canGenerate && (
          <>
            <PlanningContextForm
              value={uiContext}
              onChange={setUiContext}
              disabled={isGenerating}
            />

            {previewSufficiency && (
              <DataSufficiencyBadge
                score={previewSufficiency.score}
                confidenceLevel={previewSufficiency.confidenceLevel}
              />
            )}

            {previewSufficiency?.level === "insufficient" && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Score abaixo do minimo</AlertTitle>
                <AlertDescription className="text-sm">
                  Complemente os campos do contexto clinico para aumentar a
                  confiabilidade da sugestao. A geracao prosseguira, mas o
                  resultado podera vir como "requer mais dados".
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end">
              <Button onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Brain className="mr-2 h-4 w-4" />
                    Gerar sugestao
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* GENERATING: spinner */}
        {state.kind === "generating" && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-3 text-sm text-muted-foreground">Gerando sugestao...</span>
          </div>
        )}

        {/* GENERATED: exibe + acoes */}
        {state.kind === "generated" && (
          <>
            <DataSufficiencyBadge
              score={state.suggestion.dataSufficiencyScore}
              confidenceLevel={state.suggestion.confidenceLevel}
            />
            <SuggestionDisplay suggestion={state.suggestion} />
            <div className="flex items-center justify-between gap-2">
              <AuditLogTimeline planningSuggestionId={state.persistedId} />
              <PlanningApprovalActions
                onEdit={handleStartEdit}
                onApprove={handleApprove}
                onReject={handleReject}
                isBusy={isUpdating}
              />
            </div>
          </>
        )}

        {/* EDITING: editor estruturado por secao */}
        {state.kind === "editing" && (
          <SuggestionEditor
            initial={state.suggestion}
            onSave={handleSaveEdit}
            onCancel={() => setState({ ...state, kind: "generated" })}
            isSaving={isUpdating}
          />
        )}

        {/* FINALIZED: estado terminal */}
        {state.kind === "finalized" && (
          <div className="space-y-4">
            <Alert
              className={
                state.status === "approved"
                  ? "border-emerald-500/40 bg-emerald-500/10"
                  : "border-red-500/40 bg-red-500/10"
              }
            >
              <ShieldCheck
                className={`h-4 w-4 ${
                  state.status === "approved" ? "text-emerald-600" : "text-red-600"
                }`}
              />
              <AlertTitle>
                {state.status === "approved"
                  ? "Sugestao aprovada"
                  : "Sugestao rejeitada"}
              </AlertTitle>
              <AlertDescription className="text-sm">
                {state.status === "approved"
                  ? "Esta sugestao foi aprovada e registrada no log de auditoria."
                  : "Esta sugestao foi rejeitada. O motivo esta no log de auditoria."}
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <AuditLogTimeline planningSuggestionId={state.persistedId} />
              {state.status === "approved" && (
                <Button
                  variant="outline"
                  onClick={() => {
                    try {
                      downloadPlanningSuggestionPDF(state.suggestion, {
                        patientName,
                        patientId,
                        clinicianEmail: user?.email ?? undefined,
                        approvedAt: state.suggestion.approvedAt,
                      });
                      toast.success("PDF gerado com sucesso");
                    } catch (err) {
                      toast.error(
                        err instanceof Error
                          ? `Falha ao gerar PDF: ${err.message}`
                          : "Falha ao gerar PDF",
                      );
                    }
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Exportar PDF
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
