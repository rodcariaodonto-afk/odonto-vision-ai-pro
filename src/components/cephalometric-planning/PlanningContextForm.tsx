import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UiClinicalContext } from "@/lib/cephalometric-planning";

interface Props {
  value: UiClinicalContext;
  onChange: (next: UiClinicalContext) => void;
  disabled?: boolean;
}

/**
 * Formulario compacto de contexto clinico que alimenta o engine.
 * Todos os campos opcionais — engine trata ausencia.
 */
export function PlanningContextForm({ value, onChange, disabled }: Props) {
  const set = <K extends keyof UiClinicalContext>(key: K, v: UiClinicalContext[K]) => {
    onChange({ ...value, [key]: v });
  };

  const parseNumber = (raw: string): number | undefined => {
    if (raw === "") return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="patient-age">Idade do paciente</Label>
        <Input
          id="patient-age"
          type="number"
          inputMode="numeric"
          min={0}
          max={120}
          value={value.patientAge ?? ""}
          onChange={(e) => set("patientAge", parseNumber(e.target.value))}
          placeholder="ex: 28"
          disabled={disabled}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="patient-sex">Sexo</Label>
        <Select
          value={value.patientSex ?? ""}
          onValueChange={(v) => set("patientSex", v as UiClinicalContext["patientSex"])}
          disabled={disabled}
        >
          <SelectTrigger id="patient-sex">
            <SelectValue placeholder="Selecionar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="female">Feminino</SelectItem>
            <SelectItem value="male">Masculino</SelectItem>
            <SelectItem value="other">Outro / Nao informado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="manual-wits">
          Wits Appraisal (mm) — opcional
        </Label>
        <Input
          id="manual-wits"
          type="number"
          step="0.1"
          value={value.manualWitsMm ?? ""}
          onChange={(e) => set("manualWitsMm", parseNumber(e.target.value))}
          placeholder="Se ja medido em outro software (ex: 0.5 ou -1.2)"
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          Preenchimento opcional. Quando informado, alimenta o cross-check com ANB.
        </p>
      </div>

      <div className="space-y-3 sm:col-span-2 rounded-md border bg-muted/30 p-3">
        <p className="text-sm font-medium">Dados clinicos complementares</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={value.hasPeriodontalData ?? false}
              onCheckedChange={(c) => set("hasPeriodontalData", c === true)}
              disabled={disabled}
            />
            <span>Avaliacao periodontal</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={value.hasFacialPhotos ?? false}
              onCheckedChange={(c) => set("hasFacialPhotos", c === true)}
              disabled={disabled}
            />
            <span>Fotos faciais</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={value.hasOcclusalExam ?? false}
              onCheckedChange={(c) => set("hasOcclusalExam", c === true)}
              disabled={disabled}
            />
            <span>Exame oclusal</span>
          </label>
        </div>
      </div>
    </div>
  );
}
