/**
 * Cephalometric Planning — Classificadores Clínicos Determinísticos
 *
 * Funções puras que classificam achados cefalométricos com base em limiares
 * conservadores das normas Steiner e Tweed. Cada função:
 *
 * 1. Retorna 'blocked_missing_data' quando faltam dados essenciais
 *    (nunca chuta, nunca extrapola)
 * 2. Usa limiares de constants.ts (auditáveis, versionados)
 * 3. Não toma decisões terapêuticas — apenas classifica anatomia/padrão
 *
 * As decisões terapêuticas ficam no motor de regras (engine.ts, Chunk 4B).
 */

import type {
  CephalometricMeasurements,
  CephalometricClassification,
  SagittalClassification,
  VerticalPattern,
  IncisorInclination,
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
} from './constants';

// ============================================================================
// HELPERS
// ============================================================================

function isValidNumber(value: number | undefined | null): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

// ============================================================================
// CLASSIFICAÇÃO SAGITAL
// ============================================================================

/**
 * Classifica a relação esquelética sagital com base em ANB e (opcionalmente) Wits.
 *
 * Hierarquia:
 * - ANB é o critério primário (norma Steiner)
 * - Wits, quando presente, é usado como verificação cruzada
 * - Se ANB e Wits discordarem fortemente → 'uncertain' (sinal para alertar)
 *
 * @returns Classificação sagital ou 'blocked_missing_data' se ANB ausente
 */
export function classifySagittal(
  measurements: CephalometricMeasurements,
): SagittalClassification {
  const { anb, wits } = measurements;

  if (!isValidNumber(anb)) {
    return 'blocked_missing_data';
  }

  // Classificação preliminar pelo ANB
  let anbClass: SagittalClassification;
  if (anb <= ANB_THRESHOLDS.classIIIUpper) {
    anbClass = 'class_iii_tendency';
  } else if (anb >= ANB_THRESHOLDS.classIIUpper) {
    anbClass = 'class_ii_tendency';
  } else {
    anbClass = 'class_i';
  }

  // Sem Wits → retornar classificação por ANB
  if (!isValidNumber(wits)) {
    return anbClass;
  }

  // Classificação pelo Wits
  let witsClass: SagittalClassification;
  if (wits <= WITS_THRESHOLDS.classIIIUpper) {
    witsClass = 'class_iii_tendency';
  } else if (wits >= WITS_THRESHOLDS.classIILower) {
    witsClass = 'class_ii_tendency';
  } else {
    witsClass = 'class_i';
  }

  // Contradição forte → uncertain
  if (
    (anbClass === 'class_ii_tendency' && witsClass === 'class_iii_tendency') ||
    (anbClass === 'class_iii_tendency' && witsClass === 'class_ii_tendency')
  ) {
    return 'uncertain';
  }

  // Concordantes ou um deles em Classe I → retornar ANB (critério primário)
  return anbClass;
}

/**
 * Detecta contradição entre ANB e Wits.
 *
 * Critério: classificam em classes opostas (II vs III).
 * Útil para reduzir confiança e alertar o profissional.
 */
export function detectAnbWitsContradiction(
  measurements: CephalometricMeasurements,
): boolean {
  const { anb, wits } = measurements;

  if (!isValidNumber(anb) || !isValidNumber(wits)) {
    return false; // sem dados para detectar contradição
  }

  const anbIsClassII = anb >= ANB_THRESHOLDS.classIIUpper;
  const anbIsClassIII = anb <= ANB_THRESHOLDS.classIIIUpper;
  const witsIsClassII = wits >= WITS_THRESHOLDS.classIILower;
  const witsIsClassIII = wits <= WITS_THRESHOLDS.classIIIUpper;

  return (anbIsClassII && witsIsClassIII) || (anbIsClassIII && witsIsClassII);
}

// ============================================================================
// CLASSIFICAÇÃO VERTICAL
// ============================================================================

/**
 * Classifica o padrão facial vertical.
 *
 * Hierarquia (primeira medida disponível ganha):
 * 1. FMA — Frankfort Mandibular Angle (Tweed) — preferida
 * 2. SN-GoGn — Steiner
 * 3. MMPA — Maxillomandibular Planes Angle
 *
 * @returns Padrão vertical ou 'blocked_missing_data' se nenhuma medida disponível
 */
export function classifyVertical(
  measurements: CephalometricMeasurements,
): VerticalPattern {
  const { fma, snGoGn, mmpa } = measurements;

  // Preferência: FMA
  if (isValidNumber(fma)) {
    if (fma <= FMA_THRESHOLDS.hypodivergentMax) return 'hypodivergent';
    if (fma >= FMA_THRESHOLDS.hyperdivergentMin) return 'hyperdivergent';
    return 'normodivergent';
  }

  // Segunda opção: SN-GoGn
  if (isValidNumber(snGoGn)) {
    if (snGoGn <= SN_GOGN_THRESHOLDS.hypodivergentMax) return 'hypodivergent';
    if (snGoGn >= SN_GOGN_THRESHOLDS.hyperdivergentMin) return 'hyperdivergent';
    return 'normodivergent';
  }

  // Terceira opção: MMPA
  if (isValidNumber(mmpa)) {
    if (mmpa <= MMPA_THRESHOLDS.hypodivergentMax) return 'hypodivergent';
    if (mmpa >= MMPA_THRESHOLDS.hyperdivergentMin) return 'hyperdivergent';
    return 'normodivergent';
  }

  return 'blocked_missing_data';
}

// ============================================================================
// CLASSIFICAÇÃO DE INCISIVOS
// ============================================================================

/**
 * Classifica inclinação dos incisivos superiores via U1-NA ângulo.
 *
 * Norma Steiner: 22° ± 4° (faixa conservadora aplicada em constants).
 *
 * @returns Inclinação ou 'blocked_missing_data' se U1-NA ângulo ausente
 */
export function classifyUpperIncisors(
  measurements: CephalometricMeasurements,
): IncisorInclination {
  const { u1NaAngle } = measurements;

  if (!isValidNumber(u1NaAngle)) {
    return 'blocked_missing_data';
  }

  if (u1NaAngle <= U1_NA_ANGLE_THRESHOLDS.retroclinedMax) return 'retroclined';
  if (u1NaAngle >= U1_NA_ANGLE_THRESHOLDS.proclinedMin) return 'proclined';
  return 'normal';
}

/**
 * Classifica inclinação dos incisivos inferiores via L1-NB ângulo ou IMPA.
 *
 * Hierarquia:
 * 1. L1-NB ângulo (norma Steiner 25° ± 4°) — preferida
 * 2. IMPA (norma Tweed 90° ± 5°)
 *
 * @returns Inclinação ou 'blocked_missing_data' se ambas ausentes
 */
export function classifyLowerIncisors(
  measurements: CephalometricMeasurements,
): IncisorInclination {
  const { l1NbAngle, impa } = measurements;

  if (isValidNumber(l1NbAngle)) {
    if (l1NbAngle <= L1_NB_ANGLE_THRESHOLDS.retroclinedMax) return 'retroclined';
    if (l1NbAngle >= L1_NB_ANGLE_THRESHOLDS.proclinedMin) return 'proclined';
    return 'normal';
  }

  if (isValidNumber(impa)) {
    if (impa <= IMPA_THRESHOLDS.retroclinedMax) return 'retroclined';
    if (impa >= IMPA_THRESHOLDS.proclinedMin) return 'proclined';
    return 'normal';
  }

  return 'blocked_missing_data';
}

// ============================================================================
// CLASSIFICAÇÃO COMPLETA
// ============================================================================

/**
 * Roda todos os classificadores em sequência e devolve o quadro completo.
 *
 * Esta função é o ponto de entrada do motor de classificação. Seu resultado
 * é consumido pelo gerador de sugestão (engine.ts) para emitir o laudo.
 */
export function classifyAll(
  measurements: CephalometricMeasurements,
): CephalometricClassification {
  return {
    sagittal: classifySagittal(measurements),
    vertical: classifyVertical(measurements),
    upperIncisors: classifyUpperIncisors(measurements),
    lowerIncisors: classifyLowerIncisors(measurements),
    anbWitsContradiction: detectAnbWitsContradiction(measurements),
  };
}
