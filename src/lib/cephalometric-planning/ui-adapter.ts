/**
 * Cephalometric Planning - UI Adapter (Multi-Analise)
 *
 * Camada de adaptacao entre o formato de medidas usado pelo Cephalometry.tsx
 * (chaves nativas de cada analise) e o formato camelCase consumido pelo engine
 * deterministico.
 *
 * Suporta as 6 analises do projeto: Steiner, Jarabak, McNamara, Ricketts,
 * Tweed, Downs. Agrega medidas de TODAS as analises rodadas, mantendo
 * hierarquia de prioridade clinica (Steiner > McNamara > Ricketts/Downs).
 */

import type {
  CephalometricMeasurements,
  CephalometricPlanningInput,
  ClinicalContext,
  MeasurementSources,
} from './types';

/**
 * Formato como os measurements chegam de cada analise individual.
 */
export type RawMeasurements = Record<string, number | undefined>;

/**
 * Estrutura completa dos resultados da cefalometria (todas analises rodadas).
 * Espelha o tipo do Cephalometry.tsx:
 *   results: Partial<Record<AnalysisType, { measurements, interpretation }>>
 */
export type AnalysisResultsMap = Partial<
  Record<
    'steiner' | 'jarabak' | 'mcnamara' | 'ricketts' | 'tweed' | 'downs',
    { measurements: RawMeasurements; interpretation?: string }
  >
>;

export interface UiClinicalContext {
  patientAge?: number;
  patientSex?: 'male' | 'female' | 'other';
  hasPeriodontalData?: boolean;
  hasFacialPhotos?: boolean;
  hasOcclusalExam?: boolean;
  /** Wits opcional digitado manualmente. */
  manualWitsMm?: number;
}

// ============================================================================
// MAPEAMENTOS POR ANALISE
// Chaves: lado esquerdo = chave nativa da analise (do cephalometric-math.ts)
//         lado direito = campo correspondente em CephalometricMeasurements
// ============================================================================

const STEINER_MAP: Record<string, keyof CephalometricMeasurements> = {
  SNA: 'sna',
  SNB: 'snb',
  ANB: 'anb',
  'SN-GoGn': 'snGoGn',
  FMA: 'fma',
  IMPA: 'impa',
  'U1-NA': 'u1NaAngle',
  'L1-NB': 'l1NbAngle',
};

const MCNAMARA_MAP: Record<string, keyof CephalometricMeasurements> = {
  'Co-A': 'mcnamaraCoA',
  'Co-Gn': 'mcnamaraCoGn',
  MaxMand: 'mcnamaraMaxMand',
  'A-Nperp': 'mcnamaraANperp',
  'Pog-Nperp': 'mcnamaraPogNperp',
  LAFH: 'mcnamaraLafh',
};

const RICKETTS_MAP: Record<string, keyof CephalometricMeasurements> = {
  FacialAxis: 'rickettsFacialAxis',
  FacialDepth: 'rickettsFacialDepth',
  MandPlane: 'rickettsMandPlane',
  LowerFaceH: 'rickettsLowerFaceH',
  ConvFacial: 'rickettsConvFacial',
};

const DOWNS_MAP: Record<string, keyof CephalometricMeasurements> = {
  FacialAngle: 'downsFacialAngle',
  AngConvex: 'downsAngConvex',
  ABplane: 'downsABplane',
  MandPlane: 'downsMandPlane',
  YAxis: 'downsYAxis',
  'U1-L1': 'downsU1L1',
};

const JARABAK_MAP: Record<string, keyof CephalometricMeasurements> = {
  JarabakRatio: 'jarabakRatio',
  GonialAngle: 'jarabakGonialAngle',
  SellaAngle: 'jarabakSellaAngle',
  ArticularAngle: 'jarabakArticularAngle',
};

const TWEED_MAP: Record<string, keyof CephalometricMeasurements> = {
  FMIA: 'tweedFmia',
};

// ============================================================================
// HELPERS DE COPIA
// ============================================================================

/**
 * Copia medidas de um source para target usando um mapa de chaves.
 * Nunca sobrescreve campo ja preenchido (preserva precedencia).
 */
function copyMeasurements(
  target: CephalometricMeasurements,
  source: RawMeasurements,
  map: Record<string, keyof CephalometricMeasurements>,
): void {
  for (const [sourceKey, targetKey] of Object.entries(map)) {
    const value = source[sourceKey];
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    // Nao sobrescreve - precedencia clinica preservada pela ordem de chamada
    if ((target as Record<string, unknown>)[targetKey] !== undefined) continue;
    (target as Record<string, unknown>)[targetKey] = value;
  }
}

// ============================================================================
// AGREGACAO MULTI-ANALISE
// ============================================================================

/**
 * Agrega medidas de TODAS as analises rodadas em um unico
 * CephalometricMeasurements. Ordem de precedencia clinica:
 *
 *   1. Steiner (padrao-ouro sagital ANB)
 *   2. McNamara (sagital alternativo A-Nperp/Pog-Nperp)
 *   3. Ricketts (crescimento + sagital aproximado)
 *   4. Downs (sagital aproximado historico)
 *   5. Jarabak (vertical + crescimento)
 *   6. Tweed (vertical + dental inferior)
 *
 * Cada chave so e preenchida UMA VEZ - se ja foi copiada da analise
 * de maior precedencia, copias subsequentes sao ignoradas.
 */
export function adaptResultsToEngineFormat(
  results: AnalysisResultsMap,
  manualWits?: number,
): { measurements: CephalometricMeasurements; sources: MeasurementSources } {
  const merged: CephalometricMeasurements = {};

  const sources: MeasurementSources = {
    hasSteiner: !!results.steiner?.measurements,
    hasMcnamara: !!results.mcnamara?.measurements,
    hasRicketts: !!results.ricketts?.measurements,
    hasDowns: !!results.downs?.measurements,
    hasJarabak: !!results.jarabak?.measurements,
    hasTweed: !!results.tweed?.measurements,
  };

  // Ordem importa: Steiner primeiro (precedencia clinica)
  if (results.steiner?.measurements) {
    copyMeasurements(merged, results.steiner.measurements, STEINER_MAP);
  }
  if (results.mcnamara?.measurements) {
    copyMeasurements(merged, results.mcnamara.measurements, MCNAMARA_MAP);
  }
  if (results.ricketts?.measurements) {
    copyMeasurements(merged, results.ricketts.measurements, RICKETTS_MAP);
  }
  if (results.downs?.measurements) {
    copyMeasurements(merged, results.downs.measurements, DOWNS_MAP);
  }
  if (results.jarabak?.measurements) {
    copyMeasurements(merged, results.jarabak.measurements, JARABAK_MAP);
  }
  if (results.tweed?.measurements) {
    copyMeasurements(merged, results.tweed.measurements, TWEED_MAP);
  }

  // Wits manual sempre injetado, independente da analise
  if (typeof manualWits === 'number' && Number.isFinite(manualWits)) {
    merged.wits = manualWits;
  }

  return { measurements: merged, sources };
}

// ============================================================================
// COMPATIBILIDADE COM API ANTIGA (single-analysis)
// ============================================================================

/**
 * @deprecated Use adaptResultsToEngineFormat. Mantido para retrocompatibilidade.
 * Aceita apenas medidas de Steiner em chaves nativas.
 */
export function adaptMeasurementsToEngineFormat(
  raw: RawMeasurements,
  manualWits?: number,
): CephalometricMeasurements {
  const { measurements } = adaptResultsToEngineFormat(
    { steiner: { measurements: raw } },
    manualWits,
  );
  return measurements;
}

/**
 * Monta o input completo do engine a partir dos resultados de TODAS as
 * analises rodadas e do contexto da UI.
 *
 * Versao nova: aceita AnalysisResultsMap (multi-analise).
 */
export function buildEngineInputMulti(
  results: AnalysisResultsMap,
  uiContext: UiClinicalContext,
): CephalometricPlanningInput & { sources: MeasurementSources } {
  const clinicalContext: ClinicalContext = {
    patientAge: uiContext.patientAge,
    patientSex: uiContext.patientSex,
    hasPeriodontalData: uiContext.hasPeriodontalData,
    hasFacialPhotos: uiContext.hasFacialPhotos,
    hasOcclusalExam: uiContext.hasOcclusalExam,
  };

  const { measurements, sources } = adaptResultsToEngineFormat(
    results,
    uiContext.manualWitsMm,
  );

  return { measurements, clinicalContext, sources };
}

/**
 * @deprecated Use buildEngineInputMulti com results object.
 */
export function buildEngineInput(
  rawMeasurements: RawMeasurements,
  uiContext: UiClinicalContext,
): CephalometricPlanningInput {
  return buildEngineInputMulti(
    { steiner: { measurements: rawMeasurements } },
    uiContext,
  );
}

// ============================================================================
// PRE-CHECK MULTI-ANALISE
// ============================================================================

/**
 * Verifica se ha medidas suficientes para tentar gerar uma sugestao.
 * Aceita Steiner (ANB ou SNA+SNB) OU McNamara (A-Nperp + Pog-Nperp) OU
 * Ricketts (FacialDepth) OU Downs (FacialAngle).
 *
 * Importante: passar este check NAO garante sugestao - o engine ainda
 * pode retornar requires_more_data se score < 60.
 */
export function hasMinimumMeasurementsForPlanning(
  results: AnalysisResultsMap | RawMeasurements,
): boolean {
  // Compatibilidade: se receber RawMeasurements (antiga API), envolve em steiner
  const resultsMap: AnalysisResultsMap =
    results && typeof results === 'object' && 'measurements' in (results as object) === false &&
    ('SNA' in (results as object) || 'ANB' in (results as object))
      ? { steiner: { measurements: results as RawMeasurements } }
      : (results as AnalysisResultsMap);

  // Sagital Steiner
  const steiner = resultsMap.steiner?.measurements;
  if (steiner) {
    if (typeof steiner.ANB === 'number') return true;
    if (typeof steiner.SNA === 'number' && typeof steiner.SNB === 'number') return true;
  }

  // Sagital McNamara
  const mcnamara = resultsMap.mcnamara?.measurements;
  if (mcnamara) {
    if (
      typeof mcnamara['A-Nperp'] === 'number' &&
      typeof mcnamara['Pog-Nperp'] === 'number'
    )
      return true;
  }

  // Sagital Ricketts (FacialDepth da uma leitura sagital)
  const ricketts = resultsMap.ricketts?.measurements;
  if (ricketts && typeof ricketts.FacialDepth === 'number') return true;

  // Sagital Downs
  const downs = resultsMap.downs?.measurements;
  if (downs && typeof downs.FacialAngle === 'number') return true;

  return false;
}
