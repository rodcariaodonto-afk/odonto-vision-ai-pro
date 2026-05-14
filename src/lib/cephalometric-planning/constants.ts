/**
 * Cephalometric Planning — Constantes Clínicas
 *
 * Limiares (thresholds) e pesos usados pelo motor de regras.
 * Centralizados para facilitar ajustes e auditoria.
 *
 * IMPORTANTE: qualquer alteração aqui exige bump em
 * CEPH_PLANNING_RULES_VERSION em versions.ts.
 *
 * Referências:
 * - Normas Steiner clássicas para SNA, SNB, ANB
 * - Padrão Tweed para FMA
 * - Limiares conservadores para uso clínico de apoio à decisão
 */

// ============================================================================
// PESOS DO SCORE DE SUFICIÊNCIA (soma = 100)
// ============================================================================

export const DATA_SUFFICIENCY_WEIGHTS = {
  patientAge: 15,
  patientSex: 5,
  sna: 10,
  snb: 10,
  anb: 15,
  wits: 10,
  verticalMeasure: 15,
  upperIncisor: 10,
  lowerIncisor: 10,
} as const;

// ============================================================================
// CLASSIFICAÇÃO DO SCORE
// ============================================================================

export const SUFFICIENCY_THRESHOLDS = {
  insufficientMax: 59,
  partialMax: 79,
} as const;

// ============================================================================
// NORMAS CEFALOMÉTRICAS (limiares conservadores)
// ============================================================================

export const ANB_THRESHOLDS = {
  classIIIUpper: 0,
  classILower: 0,
  classILower2: 2,
  classIIUpper: 4,
} as const;

export const WITS_THRESHOLDS = {
  classIIIUpper: -2,
  classIILower: 2,
} as const;

export const FMA_THRESHOLDS = {
  hypodivergentMax: 20,
  hyperdivergentMin: 30,
} as const;

export const SN_GOGN_THRESHOLDS = {
  hypodivergentMax: 27,
  hyperdivergentMin: 37,
} as const;

export const MMPA_THRESHOLDS = {
  hypodivergentMax: 22,
  hyperdivergentMin: 32,
} as const;

// ============================================================================
// INCLINAÇÃO DOS INCISIVOS (graus)
// ============================================================================

export const U1_NA_ANGLE_THRESHOLDS = {
  retroclinedMax: 18,
  proclinedMin: 26,
} as const;

export const L1_NB_ANGLE_THRESHOLDS = {
  retroclinedMax: 21,
  proclinedMin: 29,
} as const;

export const IMPA_THRESHOLDS = {
  retroclinedMax: 85,
  proclinedMin: 95,
} as const;

// ============================================================================
// IDADE — DECISÕES ORTOPÉDICAS
// ============================================================================

export const GROWTH_POTENTIAL_AGE_THRESHOLD = 14;
export const ADULT_AGE_THRESHOLD = 18;

// ============================================================================
// CONTRADIÇÃO ANB × WITS
// ============================================================================

export const ANB_WITS_CONTRADICTION_REDUCES_CONFIDENCE = true;

// ============================================================================
// LABELS LEGÍVEIS (PT-BR) PARA DADOS AUSENTES
// ============================================================================

export const MISSING_DATA_LABELS: Record<string, string> = {
  patientAge: 'Idade do paciente',
  patientSex: 'Sexo do paciente',
  sna: 'Ângulo SNA',
  snb: 'Ângulo SNB',
  anb: 'Ângulo ANB',
  wits: 'Wits appraisal',
  verticalMeasure: 'Medida vertical (FMA, MMPA ou SN-GoGn)',
  upperIncisor: 'Inclinação dos incisivos superiores (U1-NA)',
  lowerIncisor: 'Inclinação dos incisivos inferiores (L1-NB ou IMPA)',
  periodontalData: 'Avaliação periodontal',
  facialPhotos: 'Fotografias faciais para correlação',
  occlusalExam: 'Exame oclusal documentado',
};
