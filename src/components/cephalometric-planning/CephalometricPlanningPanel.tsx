import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Brain, Loader2, AlertTriangle, ShieldCheck, FileWarning, Download } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { useCephalometricPlanning } from "@/hooks/useCephalometricPlanning";
import {
  buildEngineInput,
  calculateCephalometricPlanningDataSufficiency,
  hasMinimumMeasurementsForPlanning,
  downloadPlanningSuggestionPDF,
  type UiClinicalContext,
  type CephalometricPlanningSuggestion,
  type RawMeasurements,
} from "@/lib/cephalometric-planning";

import { DataSufficiencyBadge } from "./DataSufficiencyBadge";
import { PlanningContextForm } from "./PlanningContextForm";
import { SuggestionDisplay } from "./SuggestionDisplay";
import { SuggestionEditor } from "./SuggestionEditor";
import { PlanningApprovalActions } from "./PlanningApprovalActions";

interface Props {
  /** ID da analise cefalometrica ja persistida em cephalometric_analyses */
  cephalometricAnalysisId: string | null;
  /** Medidas brutas do estado React (chaves UI: SNA, SNB, ANB, etc.) */
  measurements: RawMeasurements;
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
export function CephalometricPlanningPanel({ cephalometricAnalysisId, measurements }: Props) {
  const { user } = useAuth();
  const { isGenerating, isUpdating, generate, updateText, approve, reject } = useCephalometricPlanning();
  const [state, setState] = useState<LocalState>({ kind: "idle" });
  const [uiContext, setUiContext] = useState<UiClinicalContext>({});

  // Pre-check: ha dados sagitais minimos?
  const canGenerate = useMemo(
    () => hasMinimumMeasurementsForPlanning(measurements) && cephalometricAnalysisId !== null,
    [measurements, cephalometricAnalysisId],
  );

  // Preview do score antes mesmo de gerar
  const previewSufficiency = useMemo(() => {
    if (!canGenerate) return null;
    const input = buildEngineInput(measurements, uiContext);
    return calculateCephalometricPlanningDataSufficiency(input);
  }, [measurements, uiContext, canGenerate]);

  // --------------------------------------------------------------------------
  // HANDLERS
  // --------------------------------------------------------------------------
  const handleGenerate = async () => {
    if (!cephalometricAnalysisId || !user?.id) {
      toast.error("Analise ou usuario nao identificado");
      return;
    }

    setState({ kind: "generating" });
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

        {/* Pre-check: dados sagitais minimos */}
        {!canGenerate && (
          <Alert>
            <FileWarning className="h-4 w-4" />
            <AlertTitle>Dados insuficientes</AlertTitle>
            <AlertDescription>
              Para gerar uma sugestao, e necessario que a analise contenha ao menos
              ANB ou SNA + SNB. Rode a analise Steiner antes de prosseguir.
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
            <PlanningApprovalActions
              onEdit={handleStartEdit}
              onApprove={handleApprove}
              onReject={handleReject}
              isBusy={isUpdating}
            />
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

            {state.status === "approved" && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    try {
                      downloadPlanningSuggestionPDF(state.suggestion, {
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
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
