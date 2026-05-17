/**
 * Cephalometric Planning - Classificadores Clinicos Deterministicos (v1.1.0)
 *
 * Funcoes puras que classificam achados cefalometricos com hierarquia
 * multi-analise. Cada funcao:
 *
 * 1. Tenta Steiner primeiro (padrao-ouro clinico)
 * 2. Faz fallback para McNamara, Ricketts, Downs em ordem de evidencia
 * 3. Retorna source explicito para transparencia clinica
 * 4. Retorna 'blocked_missing_data' quando NENHUMA analise fornece dado
 *
 * As decisoes terapeuticas ficam no motor de regras (engine.ts).
 */

import type {
  CephalometricMeasurements,
  CephalometricClassification,
  SagittalClassification,
  SagittalSource,
  VerticalPattern,
  VerticalSource,
  IncisorInclination,
  IncisorSource,
} from './types';
import {
  ANB_THRESHOLDS,
  WITS_THRESHOLDS,
  FMA_THRESHOLDS,
  SN_GOGN_THRESHOLDS,
  MMPA_THRESHOLDS,
  U1_NA_ANGLE_THRESHOLDS,
  L1_NB_ANGLE_THRESHOLDS,
  IMPA_THRESHOLDS,
  MCNAMARA_ANPERP_THRESHOLDS,
  MCNAMARA_POGNPERP_THRESHOLDS,
  RICKETTS_FACIAL_DEPTH_THRESHOLDS,
  RICKETTS_MAND_PLANE_THRESHOLDS,
  DOWNS_FACIAL_ANGLE_THRESHOLDS,
  DOWNS_ANG_CONVEX_THRESHOLDS,
  DOWNS_Y_AXIS_THRESHOLDS,
  JARABAK_RATIO_THRESHOLDS,
  TWEED_FMIA_THRESHOLDS,
} from './constants';

// ============================================================================
// HELPERS
// ============================================================================

function isValidNumber(value: number | undefined | null): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

// ============================================================================
// CLASSIFICACAO SAGITAL (com hierarquia multi-analise)
// ============================================================================

export interface SagittalResult {
  classification: SagittalClassification;
  source: SagittalSource;
}

/**
 * Classifica sagital pelo ANB (Steiner) - padrao-ouro.
 */
function classifySagittalBySteiner(
  measurements: CephalometricMeasurements,
): SagittalResult | null {
  const { anb, wits } = measurements;
  if (!isValidNumber(anb)) return null;

  let anbClass: SagittalClassification;
  if (anb <= ANB_THRESHOLDS.classIIIUpper) anbClass = 'class_iii_tendency';
  else if (anb >= ANB_THRESHOLDS.classIIUpper) anbClass = 'class_ii_tendency';
  else anbClass = 'class_i';

  // Cross-check com Wits se disponivel
  if (isValidNumber(wits)) {
    let witsClass: SagittalClassification;
    if (wits <= WITS_THRESHOLDS.classIIIUpper) witsClass = 'class_iii_tendency';
    else if (wits >= WITS_THRESHOLDS.classIILower) witsClass = 'class_ii_tendency';
    else witsClass = 'class_i';

    if (
      (anbClass === 'class_ii_tendency' && witsClass === 'class_iii_tendency') ||
      (anbClass === 'class_iii_tendency' && witsClass === 'class_ii_tendency')
    ) {
      return { classification: 'uncertain', source: 'steiner_anb' };
    }
  }

  return { classification: anbClass, source: 'steiner_anb' };
}

/**
 * Classifica sagital pelo McNamara (A-Nperp + Pog-Nperp).
 *
 * Logica clinica:
 * - Maxila retro + Mandibula retro = padrao tendencia Classe II esqueletica
 *   (retrognatismo bimaxilar - mandibula pior que maxila tende a III)
 * - Maxila retro + Mandibula normal/proeminente = tendencia Classe III
 * - Maxila normal + Mandibula retro = tendencia Classe II (mais comum)
 * - Maxila proeminente + Mandibula normal = tendencia Classe II
 */
function classifySagittalByMcNamara(
  measurements: CephalometricMeasurements,
): SagittalResult | null {
  const { mcnamaraANperp, mcnamaraPogNperp } = measurements;
  if (!isValidNumber(mcnamaraANperp) || !isValidNumber(mcnamaraPogNperp)) return null;

  const maxRetrog = mcnamaraANperp <= MCNAMARA_ANPERP_THRESHOLDS.retrognathicMax;
  const maxProg = mcnamaraANperp >= MCNAMARA_ANPERP_THRESHOLDS.prognathicMin;
  const mandRetrog = mcnamaraPogNperp <= MCNAMARA_POGNPERP_THRESHOLDS.retrognathicMax;
  const mandProg = mcnamaraPogNperp >= MCNAMARA_POGNPERP_THRESHOLDS.prognathicMin;

  // Tendencia Classe III: mandibula proeminente OU maxila retrognata com mandibula normal
  if (mandProg && !maxProg) {
    return { classification: 'class_iii_tendency', source: 'mcnamara' };
  }

  // Tendencia Classe II: mandibula retrognata OU maxila prognata com mandibula normal
  if (mandRetrog && !maxRetrog) {
    return { classification: 'class_ii_tendency', source: 'mcnamara' };
  }
  if (maxProg && !mandProg) {
    return { classification: 'class_ii_tendency', source: 'mcnamara' };
  }

  // Bimaxilar retro (ambos retrognatas): incerto - precisa de mais info
  if (maxRetrog && mandRetrog) {
    return { classification: 'uncertain', source: 'mcnamara' };
  }

  return { classification: 'class_i', source: 'mcnamara' };
}

/**
 * Classifica sagital pelo Ricketts (Profundidade Facial + Convexidade).
 *
 * FacialDepth mede posicao A-P da mandibula:
 * - > 90 graus = mandibula prognata (tendencia III)
 * - < 84 graus = mandibula retrognata (tendencia II)
 */
function classifySagittalByRicketts(
  measurements: CephalometricMeasurements,
): SagittalResult | null {
  const { rickettsFacialDepth } = measurements;
  if (!isValidNumber(rickettsFacialDepth)) return null;

  if (rickettsFacialDepth >= RICKETTS_FACIAL_DEPTH_THRESHOLDS.classIIIMin) {
    return { classification: 'class_iii_tendency', source: 'ricketts' };
  }
  if (rickettsFacialDepth <= RICKETTS_FACIAL_DEPTH_THRESHOLDS.classIIMax) {
    return { classification: 'class_ii_tendency', source: 'ricketts' };
  }
  return { classification: 'class_i', source: 'ricketts' };
}

/**
 * Classifica sagital pelo Downs (Angulo Facial + Convexidade).
 *
 * AngConvex e bom indicador: positivo = perfil convexo (II), negativo = concavo (III).
 */
function classifySagittalByDowns(
  measurements: CephalometricMeasurements,
): SagittalResult | null {
  const { downsFacialAngle, downsAngConvex } = measurements;

  // Preferir AngConvex se disponivel (mais especifico para classe esqueletica)
  if (isValidNumber(downsAngConvex)) {
    if (downsAngConvex <= DOWNS_ANG_CONVEX_THRESHOLDS.classIIIMax) {
      return { classification: 'class_iii_tendency', source: 'downs' };
    }
    if (downsAngConvex >= DOWNS_ANG_CONVEX_THRESHOLDS.classIIMin) {
      return { classification: 'class_ii_tendency', source: 'downs' };
    }
    return { classification: 'class_i', source: 'downs' };
  }

  // Fallback: FacialAngle
  if (isValidNumber(downsFacialAngle)) {
    if (downsFacialAngle >= DOWNS_FACIAL_ANGLE_THRESHOLDS.classIIIMin) {
      return { classification: 'class_iii_tendency', source: 'downs' };
    }
    if (downsFacialAngle <= DOWNS_FACIAL_ANGLE_THRESHOLDS.classIIMax) {
      return { classification: 'class_ii_tendency', source: 'downs' };
    }
    return { classification: 'class_i', source: 'downs' };
  }

  return null;
}

/**
 * Classifica sagital com hierarquia clinica:
 * Steiner ANB > McNamara > Ricketts > Downs
 *
 * Mantem retrocompatibilidade: retorna apenas SagittalClassification
 * (source preservado em classifySagittalWithSource).
 */
export function classifySagittal(
  measurements: CephalometricMeasurements,
): SagittalClassification {
  return classifySagittalWithSource(measurements).classification;
}

/**
 * Versao com transparencia clinica: retorna classificacao + analise usada.
 */
export function classifySagittalWithSource(
  measurements: CephalometricMeasurements,
): SagittalResult {
  return (
    classifySagittalBySteiner(measurements) ||
    classifySagittalByMcNamara(measurements) ||
    classifySagittalByRicketts(measurements) ||
    classifySagittalByDowns(measurements) ||
    { classification: 'blocked_missing_data', source: 'none' }
  );
}

/**
 * Detecta contradicao entre ANB e Wits. So funciona quando ambos presentes.
 * Preservado para retrocompat.
 */
export function detectAnbWitsContradiction(
  measurements: CephalometricMeasurements,
): boolean {
  const { anb, wits } = measurements;
  if (!isValidNumber(anb) || !isValidNumber(wits)) return false;

  const anbIsClassII = anb >= ANB_THRESHOLDS.classIIUpper;
  const anbIsClassIII = anb <= ANB_THRESHOLDS.classIIIUpper;
  const witsIsClassII = wits >= WITS_THRESHOLDS.classIILower;
  const witsIsClassIII = wits <= WITS_THRESHOLDS.classIIIUpper;

  return (anbIsClassII && witsIsClassIII) || (anbIsClassIII && witsIsClassII);
}

// ============================================================================
// CLASSIFICACAO VERTICAL (hierarquia multi-analise)
// ============================================================================

export interface VerticalResult {
  pattern: VerticalPattern;
  source: VerticalSource;
}

export function classifyVerticalWithSource(
  measurements: CephalometricMeasurements,
): VerticalResult {
  const { fma, snGoGn, mmpa, rickettsMandPlane, downsMandPlane, jarabakRatio, mcnamaraLafh } =
    measurements;

  // 1. Steiner FMA (preferida)
  if (isValidNumber(fma)) {
    let p: VerticalPattern;
    if (fma <= FMA_THRESHOLDS.hypodivergentMax) p = 'hypodivergent';
    else if (fma >= FMA_THRESHOLDS.hyperdivergentMin) p = 'hyperdivergent';
    else p = 'normodivergent';
    return { pattern: p, source: 'steiner_fma' };
  }

  // 2. Steiner SN-GoGn
  if (isValidNumber(snGoGn)) {
    let p: VerticalPattern;
    if (snGoGn <= SN_GOGN_THRESHOLDS.hypodivergentMax) p = 'hypodivergent';
    else if (snGoGn >= SN_GOGN_THRESHOLDS.hyperdivergentMin) p = 'hyperdivergent';
    else p = 'normodivergent';
    return { pattern: p, source: 'steiner_sn_gogn' };
  }

  // 3. MMPA
  if (isValidNumber(mmpa)) {
    let p: VerticalPattern;
    if (mmpa <= MMPA_THRESHOLDS.hypodivergentMax) p = 'hypodivergent';
    else if (mmpa >= MMPA_THRESHOLDS.hyperdivergentMin) p = 'hyperdivergent';
    else p = 'normodivergent';
    return { pattern: p, source: 'steiner_fma' }; // fallback enum
  }

  // 4. Ricketts Plano Mandibular
  if (isValidNumber(rickettsMandPlane)) {
    let p: VerticalPattern;
    if (rickettsMandPlane <= RICKETTS_MAND_PLANE_THRESHOLDS.hypodivergentMax) p = 'hypodivergent';
    else if (rickettsMandPlane >= RICKETTS_MAND_PLANE_THRESHOLDS.hyperdivergentMin) p = 'hyperdivergent';
    else p = 'normodivergent';
    return { pattern: p, source: 'ricketts_mand_plane' };
  }

  // 5. Downs Plano Mandibular
  if (isValidNumber(downsMandPlane)) {
    let p: VerticalPattern;
    if (downsMandPlane <= 17) p = 'hypodivergent';
    else if (downsMandPlane >= 28) p = 'hyperdivergent';
    else p = 'normodivergent';
    return { pattern: p, source: 'downs_mand_plane' };
  }

  // 6. Jarabak Ratio (inversao logica: >=65% horario = hipodivergente)
  if (isValidNumber(jarabakRatio)) {
    let p: VerticalPattern;
    if (jarabakRatio >= JARABAK_RATIO_THRESHOLDS.hypodivergentMin) p = 'hypodivergent';
    else if (jarabakRatio <= JARABAK_RATIO_THRESHOLDS.hyperdivergentMax) p = 'hyperdivergent';
    else p = 'normodivergent';
    return { pattern: p, source: 'jarabak_ratio' };
  }

  // 7. McNamara LAFH (menos especifica - so detecta extremos)
  if (isValidNumber(mcnamaraLafh)) {
    let p: VerticalPattern;
    if (mcnamaraLafh <= 60) p = 'hypodivergent';
    else if (mcnamaraLafh >= 75) p = 'hyperdivergent';
    else p = 'normodivergent';
    return { pattern: p, source: 'mcnamara_lafh' };
  }

  return { pattern: 'blocked_missing_data', source: 'none' };
}

/**
 * Versao retrocompat: retorna apenas o pattern.
 */
export function classifyVertical(
  measurements: CephalometricMeasurements,
): VerticalPattern {
  return classifyVerticalWithSource(measurements).pattern;
}

// ============================================================================
// CLASSIFICACAO INCISIVOS
// ============================================================================

export function classifyUpperIncisors(
  measurements: CephalometricMeasurements,
): IncisorInclination {
  const { u1NaAngle } = measurements;
  if (!isValidNumber(u1NaAngle)) return 'blocked_missing_data';

  if (u1NaAngle <= U1_NA_ANGLE_THRESHOLDS.retroclinedMax) return 'retroclined';
  if (u1NaAngle >= U1_NA_ANGLE_THRESHOLDS.proclinedMin) return 'proclined';
  return 'normal';
}

export interface LowerIncisorResult {
  inclination: IncisorInclination;
  source: IncisorSource;
}

/**
 * Classifica incisivo inferior com hierarquia:
 * Steiner L1-NB > Steiner IMPA > Tweed FMIA > Downs U1-L1 (inferido)
 */
export function classifyLowerIncisorsWithSource(
  measurements: CephalometricMeasurements,
): LowerIncisorResult {
  const { l1NbAngle, impa, tweedFmia } = measurements;

  // 1. Steiner L1-NB (padrao-ouro)
  if (isValidNumber(l1NbAngle)) {
    let i: IncisorInclination;
    if (l1NbAngle <= L1_NB_ANGLE_THRESHOLDS.retroclinedMax) i = 'retroclined';
    else if (l1NbAngle >= L1_NB_ANGLE_THRESHOLDS.proclinedMin) i = 'proclined';
    else i = 'normal';
    return { inclination: i, source: 'steiner' };
  }

  // 2. Steiner IMPA (tambem usado por Tweed - chave compartilhada)
  if (isValidNumber(impa)) {
    let i: IncisorInclination;
    if (impa <= IMPA_THRESHOLDS.retroclinedMax) i = 'retroclined';
    else if (impa >= IMPA_THRESHOLDS.proclinedMin) i = 'proclined';
    else i = 'normal';
    return { inclination: i, source: 'steiner' };
  }

  // 3. Tweed FMIA - lembrar inversao: <65 = proclinado, >75 = retroclinado
  if (isValidNumber(tweedFmia)) {
    let i: IncisorInclination;
    if (tweedFmia <= TWEED_FMIA_THRESHOLDS.proclinedMax) i = 'proclined';
    else if (tweedFmia >= TWEED_FMIA_THRESHOLDS.retroclinedMin) i = 'retroclined';
    else i = 'normal';
    return { inclination: i, source: 'tweed_fmia' };
  }

  return { inclination: 'blocked_missing_data', source: 'none' };
}

export function classifyLowerIncisors(
  measurements: CephalometricMeasurements,
): IncisorInclination {
  return classifyLowerIncisorsWithSource(measurements).inclination;
}

// ============================================================================
// CLASSIFICACAO COMPLETA (com transparencia de fontes)
// ============================================================================

export function classifyAll(
  measurements: CephalometricMeasurements,
): CephalometricClassification {
  const sagittal = classifySagittalWithSource(measurements);
  const vertical = classifyVerticalWithSource(measurements);
  const lower = classifyLowerIncisorsWithSource(measurements);

  return {
    sagittal: sagittal.classification,
    vertical: vertical.pattern,
    upperIncisors: classifyUpperIncisors(measurements),
    lowerIncisors: lower.inclination,
    anbWitsContradiction: detectAnbWitsContradiction(measurements),
    sagittalSource: sagittal.source,
    verticalSource: vertical.source,
    lowerIncisorSource: lower.source,
  };
}
