import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, X, AlertCircle } from "lucide-react";
import { validateAndSanitizeSuggestionText } from "@/lib/cephalometric-planning";

interface Props {
  initialText: string;
  onSave: (newText: string) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

export function SuggestionEditor({ initialText, onSave, onCancel, isSaving }: Props) {
  const [text, setText] = useState(initialText);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSave = async () => {
    setValidationError(null);
    const safety = validateAndSanitizeSuggestionText(text);
    if (!safety.isSafe) {
      setValidationError(
        `Texto contem termos bloqueados pelo filtro de seguranca: ${safety.blockedTerms.join(", ")}`,
      );
      return;
    }
    await onSave(text);
  };

  return (
    <div className="space-y-3">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={20}
        className="font-mono text-sm"
        disabled={isSaving}
      />

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
