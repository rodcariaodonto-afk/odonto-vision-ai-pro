import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ListChecks, Target, Lightbulb, MessageCircle } from "lucide-react";
import type { CephalometricPlanningSuggestion } from "@/lib/cephalometric-planning";

interface Props {
  suggestion: CephalometricPlanningSuggestion;
}

/**
 * Exibe a sugestao gerada em formato estruturado e visualmente claro.
 * NAO permite edicao — apenas leitura. Edicao e feita pelo SuggestionEditor.
 */
export function SuggestionDisplay({ suggestion }: Props) {
  return (
    <div className="space-y-4">
      {/* Resumo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Resumo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{suggestion.summary}</p>
        </CardContent>
      </Card>

      {/* Achados priorizados */}
      {suggestion.prioritizedProblems.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="h-4 w-4" />
              Achados priorizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm">
              {suggestion.prioritizedProblems.map((p, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-mono text-muted-foreground">{i + 1}.</span>
                  <span>{p}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Objetivos */}
      {suggestion.therapeuticObjectives.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4" />
              Objetivos terapeuticos a considerar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {suggestion.therapeuticObjectives.map((o, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span>{o}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Alternativas */}
      {suggestion.treatmentAlternatives.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4" />
              Alternativas a discutir com o paciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {suggestion.treatmentAlternatives.map((a, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Alertas */}
      {suggestion.alertsAndLimitations.length > 0 && (
        <Alert variant="default" className="border-amber-500/40 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-700">Alertas e limitacoes</AlertTitle>
          <AlertDescription className="mt-2">
            <ul className="space-y-1 text-sm">
              {suggestion.alertsAndLimitations.map((a, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Explicacao para o paciente */}
      {suggestion.patientFriendlyExplanation && (
        <Card className="bg-muted/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="h-4 w-4" />
              Explicacao amigavel ao paciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">
              {suggestion.patientFriendlyExplanation}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
