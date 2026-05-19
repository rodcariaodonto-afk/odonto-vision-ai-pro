import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { UiClinicalContext } from "@/lib/cephalometric-planning";

interface Props {
  value: UiClinicalContext;
  onChange: (next: UiClinicalContext) => void;
  disabled?: boolean;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-md border bg-muted/20 p-4">
      <p className="text-sm font-semibold text-foreground border-b pb-2">{title}</p>
      {children}
    </div>
  );
}

function CheckItem({ label, checked, onChange, disabled }: {
  label: string; checked: boolean;
  onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
      <Checkbox checked={checked} onCheckedChange={(c) => onChange(c === true)} disabled={disabled} />
      <span>{label}</span>
    </label>
  );
}

export function PlanningContextForm({ value, onChange, disabled }: Props) {
  const set = <K extends keyof UiClinicalContext>(key: K, v: UiClinicalContext[K]) =>
    onChange({ ...value, [key]: v });

  const parseNumber = (raw: string): number | undefined => {
    if (raw === "") return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };

  const toggleMulti = (
    key: 'tratamentoMultidisciplinar',
    item: string,
  ) => {
    const arr = (value[key] as string[] | undefined) ?? [];
    const next = arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
    onChange({ ...value, [key]: next as any });
  };

  return (
    <div className="space-y-4">

      {/* ── Identificação ────────────────────────────────────── */}
      <Section title="Identificação do Paciente">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="patient-age">Idade</Label>
            <Input
              id="patient-age" type="number" inputMode="numeric" min={0} max={120}
              value={value.patientAge ?? ""} disabled={disabled} placeholder="ex: 28"
              onChange={(e) => set("patientAge", parseNumber(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="patient-sex">Sexo</Label>
            <Select value={value.patientSex ?? ""} disabled={disabled}
              onValueChange={(v) => set("patientSex", v as UiClinicalContext["patientSex"])}>
              <SelectTrigger id="patient-sex"><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="female">Feminino</SelectItem>
                <SelectItem value="male">Masculino</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="queixa">Queixa principal *</Label>
          <Textarea
            id="queixa" rows={2} disabled={disabled}
            placeholder="Descreva a queixa principal do paciente..."
            value={value.queixaPrincipal ?? ""}
            onChange={(e) => set("queixaPrincipal", e.target.value)}
          />
        </div>
      </Section>

      {/* ── Padrão Facial ────────────────────────────────────── */}
      <Section title="Padrão Facial">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Padrão Facial</Label>
            <Select value={value.padraoFacial ?? ""} disabled={disabled}
              onValueChange={(v) => set("padraoFacial", v as UiClinicalContext["padraoFacial"])}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="braquifacial">Braquifacial</SelectItem>
                <SelectItem value="mesofacial">Mesofacial</SelectItem>
                <SelectItem value="dolicofacial">Dolicofacial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Índice de Vert</Label>
            <Select value={value.indiceVert ?? ""} disabled={disabled}
              onValueChange={(v) => set("indiceVert", v as UiClinicalContext["indiceVert"])}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="braqui_severo">Braqui Severo</SelectItem>
                <SelectItem value="braqui_suave">Braqui Suave</SelectItem>
                <SelectItem value="braquifacial">Braquifacial</SelectItem>
                <SelectItem value="mesofacial">Mesofacial</SelectItem>
                <SelectItem value="dolicofacial">Dolicofacial</SelectItem>
                <SelectItem value="dolico_suave">Dólico Suave</SelectItem>
                <SelectItem value="dolico_severo">Dólico Severo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Assimetria Facial</Label>
            <Select value={value.assimetriaFacial ?? ""} disabled={disabled}
              onValueChange={(v) => set("assimetriaFacial", v as UiClinicalContext["assimetriaFacial"])}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nao">Não</SelectItem>
                <SelectItem value="direita_desenvolvida">Direita Desenvolvida</SelectItem>
                <SelectItem value="esquerda_desenvolvida">Esquerda Desenvolvida</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Linha de Sorriso</Label>
            <Select value={value.linhaDeSorriso ?? ""} disabled={disabled}
              onValueChange={(v) => set("linhaDeSorriso", v as UiClinicalContext["linhaDeSorriso"])}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="baixa">Baixa</SelectItem>
                <SelectItem value="alta_exposicao_inferiores">Alta — Exposição Incisivos Inferiores</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 pt-1">
          <CheckItem label="Vedamento Labial Passivo"
            checked={value.vedamentoLabial ?? false} disabled={disabled}
            onChange={(v) => set("vedamentoLabial", v)} />
          <CheckItem label="Corredor Bucal Aumentado"
            checked={value.corredorBucalAumentado ?? false} disabled={disabled}
            onChange={(v) => set("corredorBucalAumentado", v)} />
        </div>
      </Section>

      {/* ── Diagnóstico Dentário ─────────────────────────────── */}
      <Section title="Diagnóstico Dentário">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Classe Dentária — Direita</Label>
            <Select value={value.classeDentariaDireita ?? ""} disabled={disabled}
              onValueChange={(v) => set("classeDentariaDireita", v as UiClinicalContext["classeDentariaDireita"])}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="classe_i">Classe I</SelectItem>
                <SelectItem value="classe_ii">Classe II</SelectItem>
                <SelectItem value="classe_iii">Classe III</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Classe Dentária — Esquerda</Label>
            <Select value={value.classeDentariaEsquerda ?? ""} disabled={disabled}
              onValueChange={(v) => set("classeDentariaEsquerda", v as UiClinicalContext["classeDentariaEsquerda"])}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="classe_i">Classe I</SelectItem>
                <SelectItem value="classe_ii">Classe II</SelectItem>
                <SelectItem value="classe_iii">Classe III</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Linha Média</Label>
            <Select value={value.linhaMedia ?? ""} disabled={disabled}
              onValueChange={(v) => set("linhaMedia", v as UiClinicalContext["linhaMedia"])}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="coincidente">Coincidente</SelectItem>
                <SelectItem value="desvio_superior_direita">Desvio Superior — Direita</SelectItem>
                <SelectItem value="desvio_superior_esquerda">Desvio Superior — Esquerda</SelectItem>
                <SelectItem value="desvio_inferior_direita">Desvio Inferior — Direita</SelectItem>
                <SelectItem value="desvio_inferior_esquerda">Desvio Inferior — Esquerda</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Mordida Vertical</Label>
            <Select value={value.mordida ?? ""} disabled={disabled}
              onValueChange={(v) => set("mordida", v as UiClinicalContext["mordida"])}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="aberta">Mordida Aberta</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="profunda">Mordida Profunda</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 pt-1">
          <CheckItem label="Giroversões Dentárias"
            checked={value.giroversoes ?? false} disabled={disabled}
            onChange={(v) => set("giroversoes", v)} />
        </div>
      </Section>

      {/* ── Diagnóstico Esquelético ──────────────────────────── */}
      <Section title="Diagnóstico Esquelético">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Classe Esquelética</Label>
            <Select value={value.classeEsqueletica ?? ""} disabled={disabled}
              onValueChange={(v) => set("classeEsqueletica", v as UiClinicalContext["classeEsqueletica"])}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="classe_i">Classe I</SelectItem>
                <SelectItem value="classe_ii">Classe II</SelectItem>
                <SelectItem value="classe_iii">Classe III</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Diagnóstico Detalhado</Label>
            <Select value={value.diagnosticoEsqueletico ?? ""} disabled={disabled}
              onValueChange={(v) => set("diagnosticoEsqueletico", v as UiClinicalContext["diagnosticoEsqueletico"])}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="classe_i">Classe I</SelectItem>
                <SelectItem value="classe_ii_protrusao_maxilar">Classe II — Protrusão Maxilar</SelectItem>
                <SelectItem value="classe_ii_retrusao_mandibular">Classe II — Retrusão Mandibular</SelectItem>
                <SelectItem value="classe_iii_retrusao_maxilar">Classe III — Retrusão Maxilar</SelectItem>
                <SelectItem value="classe_iii_protrusao_mandibular">Classe III — Protrusão Mandibular</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      {/* ── Apinhamentos ────────────────────────────────────── */}
      <Section title="Apinhamentos">
        <div className="grid gap-2 sm:grid-cols-2">
          <CheckItem label="Superior Anterior"
            checked={value.apinhamentoSuperiorAnterior ?? false} disabled={disabled}
            onChange={(v) => set("apinhamentoSuperiorAnterior", v)} />
          <CheckItem label="Superior Posterior"
            checked={value.apinhamentoSuperiorPosterior ?? false} disabled={disabled}
            onChange={(v) => set("apinhamentoSuperiorPosterior", v)} />
          <CheckItem label="Inferior Anterior"
            checked={value.apinhamentoInferiorAnterior ?? false} disabled={disabled}
            onChange={(v) => set("apinhamentoInferiorAnterior", v)} />
          <CheckItem label="Inferior Posterior"
            checked={value.apinhamentoInferiorPosterior ?? false} disabled={disabled}
            onChange={(v) => set("apinhamentoInferiorPosterior", v)} />
        </div>
      </Section>

      {/* ── Reabsorção e Exodontia ───────────────────────────── */}
      <Section title="Reabsorções e Exodontias">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Reabsorção Radicular</Label>
            <Select value={value.reabsorcaoRadicular ?? ""} disabled={disabled}
              onValueChange={(v) => set("reabsorcaoRadicular", v as UiClinicalContext["reabsorcaoRadicular"])}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nao">Não</SelectItem>
                <SelectItem value="leve">Leve</SelectItem>
                <SelectItem value="moderada">Moderada</SelectItem>
                <SelectItem value="severa">Severa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <CheckItem label="Necessidade de Exodontia"
          checked={value.necessidadeExodontia ?? false} disabled={disabled}
          onChange={(v) => set("necessidadeExodontia", v)} />
      </Section>

      {/* ── Fase e Plano de Tratamento ───────────────────────── */}
      <Section title="Fase e Plano de Tratamento">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Fase do Tratamento</Label>
            <Select value={value.faseTratamento ?? ""} disabled={disabled}
              onValueChange={(v) => set("faseTratamento", v as UiClinicalContext["faseTratamento"])}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="preventiva">Preventiva</SelectItem>
                <SelectItem value="interceptativa">Interceptativa</SelectItem>
                <SelectItem value="ortopedica">Ortopédica</SelectItem>
                <SelectItem value="corretiva">Corretiva</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Tratamento Multidisciplinar</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {(["fono", "ortognatica", "outro"] as const).map((item) => (
              <CheckItem key={item}
                label={item === "fono" ? "Fonoaudiologia" : item === "ortognatica" ? "Ortognática" : "Outro"}
                checked={(value.tratamentoMultidisciplinar ?? []).includes(item)}
                disabled={disabled}
                onChange={() => toggleMulti("tratamentoMultidisciplinar", item)}
              />
            ))}
          </div>
        </div>
      </Section>

      {/* ── Dados clínicos complementares ───────────────────── */}
      <Section title="Dados Clínicos Complementares">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="manual-wits">Wits Appraisal (mm) — opcional</Label>
            <Input
              id="manual-wits" type="number" step="0.1" disabled={disabled}
              value={value.manualWitsMm ?? ""} placeholder="ex: 0.5 ou -1.2"
              onChange={(e) => set("manualWitsMm", parseNumber(e.target.value))}
            />
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 pt-1">
          <CheckItem label="Avaliação Periodontal"
            checked={value.hasPeriodontalData ?? false} disabled={disabled}
            onChange={(v) => set("hasPeriodontalData", v)} />
          <CheckItem label="Fotos Faciais"
            checked={value.hasFacialPhotos ?? false} disabled={disabled}
            onChange={(v) => set("hasFacialPhotos", v)} />
          <CheckItem label="Exame Oclusal"
            checked={value.hasOcclusalExam ?? false} disabled={disabled}
            onChange={(v) => set("hasOcclusalExam", v)} />
        </div>
      </Section>

    </div>
  );
}
