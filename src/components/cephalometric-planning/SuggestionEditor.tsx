import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, X, AlertCircle } from "lucide-react";
import { validateAndSanitizeSuggestionText } from "@/lib/cephalometric-planning";
import type { CephalometricPlanningSuggestion } from "@/lib/cephalometric-planning";

/**
 * Estrutura editavel: cada lista vira um texto multi-linha.
 * Conversao "uma linha = um item" e feita na hora de salvar.
 */
export interface EditableSuggestionFields {
  summary: string;
  prioritizedProblems: string;
  therapeuticObjectives: string;
  treatmentAlternatives: string;
  alertsAndLimitations: string;
  patientFriendlyExplanation: string;
}

export interface EditedSuggestionPayload {
  summary: string;
  prioritizedProblems: string[];
  therapeuticObjectives: string[];
  treatmentAlternatives: string[];
  alertsAndLimitations: string[];
  patientFriendlyExplanation: string;
}

interface Props {
  initial: CephalometricPlanningSuggestion;
  onSave: (payload: EditedSuggestionPayload) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

function arrayToText(arr: string[] | undefined): string {
  return (arr ?? []).join("\n");
}

function textToArray(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Editor estruturado: cada secao da sugestao em um textarea separado.
 * Listas (achados, objetivos, alternativas, alertas) usam convencao
 * "uma linha = um item".
 */
export function SuggestionEditor({ initial, onSave, onCancel, isSaving }: Props) {
  const [fields, setFields] = useState<EditableSuggestionFields>({
    summary: initial.summary,
    prioritizedProblems: arrayToText(initial.prioritizedProblems),
    therapeuticObjectives: arrayToText(initial.therapeuticObjectives),
    treatmentAlternatives: arrayToText(initial.treatmentAlternatives),
    alertsAndLimitations: arrayToText(initial.alertsAndLimitations),
    patientFriendlyExplanation: initial.patientFriendlyExplanation ?? "",
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  const set = <K extends keyof EditableSuggestionFields>(key: K, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setValidationError(null);

    // Valida cada secao com o filtro de seguranca
    const allText = [
      fields.summary,
      fields.prioritizedProblems,
      fields.therapeuticObjectives,
      fields.treatmentAlternatives,
      fields.alertsAndLimitations,
      fields.patientFriendlyExplanation,
    ].join("\n");

    const safety = validateAndSanitizeSuggestionText(allText);
    if (!safety.isSafe) {
      setValidationError(
        `Texto contem termos bloqueados pelo filtro de seguranca: ${safety.blockedTerms.join(", ")}`,
      );
      return;
    }

    const payload: EditedSuggestionPayload = {
      summary: fields.summary.trim(),
      prioritizedProblems: textToArray(fields.prioritizedProblems),
      therapeuticObjectives: textToArray(fields.therapeuticObjectives),
      treatmentAlternatives: textToArray(fields.treatmentAlternatives),
      alertsAndLimitations: textToArray(fields.alertsAndLimitations),
      patientFriendlyExplanation: fields.patientFriendlyExplanation.trim(),
    };

    await onSave(payload);
  };

  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>Editor por secao.</strong> Listas seguem a convencao
          "uma linha = um item". Linhas vazias serao descartadas ao salvar.
        </AlertDescription>
      </Alert>

      <div className="space-y-1.5">
        <Label htmlFor="edit-summary">Resumo</Label>
        <Textarea
          id="edit-summary"
          value={fields.summary}
          onChange={(e) => set("summary", e.target.value)}
          rows={3}
          disabled={isSaving}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-problems">Achados priorizados (um por linha)</Label>
        <Textarea
          id="edit-problems"
          value={fields.prioritizedProblems}
          onChange={(e) => set("prioritizedProblems", e.target.value)}
          rows={5}
          disabled={isSaving}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-objectives">Objetivos terapeuticos (um por linha)</Label>
        <Textarea
          id="edit-objectives"
          value={fields.therapeuticObjectives}
          onChange={(e) => set("therapeuticObjectives", e.target.value)}
          rows={5}
          disabled={isSaving}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-alternatives">Alternativas a discutir (uma por linha)</Label>
        <Textarea
          id="edit-alternatives"
          value={fields.treatmentAlternatives}
          onChange={(e) => set("treatmentAlternatives", e.target.value)}
          rows={5}
          disabled={isSaving}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-alerts">Alertas e limitacoes (uma por linha)</Label>
        <Textarea
          id="edit-alerts"
          value={fields.alertsAndLimitations}
          onChange={(e) => set("alertsAndLimitations", e.target.value)}
          rows={4}
          disabled={isSaving}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-patient">Explicacao amigavel ao paciente</Label>
        <Textarea
          id="edit-patient"
          value={fields.patientFriendlyExplanation}
          onChange={(e) => set("patientFriendlyExplanation", e.target.value)}
          rows={3}
          disabled={isSaving}
        />
      </div>

      {validationError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          <X className="mr-2 h-4 w-4" />
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          Salvar edicao
        </Button>
      </div>
    </div>
  );
}
