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

// ============================================================================
// NORMAS DAS ANALISES ALTERNATIVAS (McNAMARA / RICKETTS / DOWNS)
// ============================================================================

/**
 * McNamara A-Nperp (mm) - posicao sagital da maxila.
 * Norma: 1 +/- 2mm. Combinado com Pog-Nperp da uma leitura sagital.
 */
export const MCNAMARA_ANPERP_THRESHOLDS = {
  retrognathicMax: -1,  // A muito posterior ao Nperp = maxila retrognatica
  prognathicMin: 3,     // A muito anterior ao Nperp = maxila prognatica
} as const;

/**
 * McNamara Pog-Nperp (mm) - posicao sagital da mandibula.
 * Norma: -2 +/- 2mm. Adulto: 0 a -4mm.
 */
export const MCNAMARA_POGNPERP_THRESHOLDS = {
  retrognathicMax: -4,
  prognathicMin: 2,
} as const;

/**
 * Ricketts FacialDepth (graus) - profundidade facial sagital.
 * Norma: 87 +/- 3 graus. Inclui aumento de 1 grau por idade (criancas).
 */
export const RICKETTS_FACIAL_DEPTH_THRESHOLDS = {
  classIIIMin: 90,    // >= 90 = mandibula prognatica (tendencia III)
  classIIMax: 84,     // <= 84 = mandibula retrognatica (tendencia II)
} as const;

/**
 * Ricketts FacialAxis (graus) - direcao do crescimento mandibular.
 * Norma: 90 +/- 3 graus. < 90 = vertical, > 90 = horizontal.
 */
export const RICKETTS_FACIAL_AXIS_THRESHOLDS = {
  verticalGrowthMax: 87,    // <= 87 = crescimento vertical
  horizontalGrowthMin: 93,  // >= 93 = crescimento horizontal
} as const;

/**
 * Ricketts MandPlane (graus). Norma: 26 +/- 5 graus.
 */
export const RICKETTS_MAND_PLANE_THRESHOLDS = {
  hypodivergentMax: 21,
  hyperdivergentMin: 31,
} as const;

/**
 * Downs FacialAngle (graus). Norma: 87 +/- 5 graus.
 * Mede prognatismo: > 87 = prognatismo (III), < 82 = retrognatismo (II).
 */
export const DOWNS_FACIAL_ANGLE_THRESHOLDS = {
  classIIMax: 82,
  classIIIMin: 90,
} as const;

/**
 * Downs AngConvex (graus). Norma: 0 +/- 8.5 graus.
 * Positivo = perfil convexo (Classe II). Negativo = concavo (Classe III).
 */
export const DOWNS_ANG_CONVEX_THRESHOLDS = {
  classIIIMax: -2,
  classIIMin: 6,
} as const;

/**
 * Downs YAxis (graus). Norma: 59.4 +/- 6.6 graus.
 */
export const DOWNS_Y_AXIS_THRESHOLDS = {
  horizontalGrowthMax: 53,
  verticalGrowthMin: 66,
} as const;

/**
 * Jarabak Ratio (AFP/AFA em %). Norma: 62-65%.
 * > 65% = crescimento horizontal (anti-horario, hipodivergente).
 * < 62% = crescimento vertical (horario, hiperdivergente).
 */
export const JARABAK_RATIO_THRESHOLDS = {
  hyperdivergentMax: 62,    // <= 62% = hiperdivergente
  hypodivergentMin: 65,     // >= 65% = hipodivergente
} as const;

/**
 * Tweed FMIA (graus). Norma: 65-75 graus.
 * < 65 = incisivo inferior proclinado. > 75 = retroclinado.
 */
export const TWEED_FMIA_THRESHOLDS = {
  proclinedMax: 65,
  retroclinedMin: 75,
} as const;

// ============================================================================
// PESOS PARA SCORE MULTI-ANALISE
// ============================================================================

/**
 * Pesos adicionais quando dados de analises alternativas estao presentes.
 * Aplicados SOMENTE quando Steiner ANB esta ausente (fallback).
 * Steiner mantem prioridade quando presente (regra de ouro).
 */
export const ALTERNATIVE_ANALYSIS_WEIGHTS = {
  // Sagital alternativo - calibrado para permitir sugestao com 2-3 analises
  // McNamara: 25pts (equivalente a SNA+SNB+ANB-5)
  // Ricketts: 18pts (Profundidade Facial e referencia consagrada)
  // Downs: 15pts (historico mas valido)
  mcnamaraSagittal: 25,
  rickettsSagittal: 18,
  downsSagittal: 15,
  // Vertical alternativo: mesmo peso da medida vertical Steiner (clinicamente equivalentes)
  alternativeVertical: 15,
  // Incisivo alternativo: mesmo peso do L1-NB/IMPA Steiner
  alternativeIncisor: 10,
} as const;

// ============================================================================
// LABELS DE FONTES (para alertas transparentes)
// ============================================================================

export const SAGITTAL_SOURCE_LABELS: Record<string, string> = {
  steiner_anb: 'Steiner ANB',
  mcnamara: 'McNamara A-Nperp + Pog-Nperp',
  ricketts: 'Ricketts Profundidade Facial',
  downs: 'Downs Angulo Facial + Convexidade',
};

export const VERTICAL_SOURCE_LABELS: Record<string, string> = {
  steiner_fma: 'Steiner FMA',
  steiner_sn_gogn: 'Steiner SN-GoGn',
  ricketts_mand_plane: 'Ricketts Plano Mandibular',
  downs_mand_plane: 'Downs Plano Mandibular',
  jarabak_ratio: 'Jarabak Razao AFP/AFA',
  mcnamara_lafh: 'McNamara LAFH',
};
