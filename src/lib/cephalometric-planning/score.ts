/**
 * Cephalometric Planning — Score de Suficiência de Dados
 *
 * Função pura, determinística, que avalia se os dados disponíveis são
 * suficientes para gerar uma sugestão de planeamento clínico segura.
 *
 * NÃO toma decisões clínicas — apenas mede a completude do input.
 * As decisões clínicas ficam no motor de regras (chunk seguinte).
 *
 * Regras:
 * - 0–59:   insufficient → não gerar plano completo
 * - 60–79:  partial      → gerar sugestão limitada com alertas
 * - 80–100: sufficient   → gerar sugestão estruturada
 *
 * Sempre, independentemente do score, a sugestão exige validação profissional.
 */

import type {
  CephalometricPlanningInput,
  DataSufficiencyResult,
  DataSufficiencyLevel,
  CephPlanningConfidence,
} from './types';
import {
  DATA_SUFFICIENCY_WEIGHTS,
  SUFFICIENCY_THRESHOLDS,
  MISSING_DATA_LABELS,
} from './constants';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Verifica se um número está definido e é finito.
 * Rejeita undefined, null, NaN, Infinity.
 */
function isValidNumber(value: number | undefined | null): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Verifica se alguma medida vertical está presente (FMA, MMPA ou SN-GoGn).
 */
function hasVerticalMeasure(input: CephalometricPlanningInput): boolean {
  const { fma, mmpa, snGoGn } = input.measurements;
  return isValidNumber(fma) || isValidNumber(mmpa) || isValidNumber(snGoGn);
}

/**
 * Verifica se alguma medida de incisivo superior está presente.
 */
function hasUpperIncisor(input: CephalometricPlanningInput): boolean {
  const { u1Na, u1NaAngle } = input.measurements;
  return isValidNumber(u1Na) || isValidNumber(u1NaAngle);
}

/**
 * Verifica se alguma medida de incisivo inferior está presente
 * (L1-NB distância, L1-NB ângulo ou IMPA).
 */
function hasLowerIncisor(input: CephalometricPlanningInput): boolean {
  const { l1Nb, l1NbAngle, impa } = input.measurements;
  return isValidNumber(l1Nb) || isValidNumber(l1NbAngle) || isValidNumber(impa);
}

/**
 * Verifica se a classificação sagital tem os dados mínimos.
 * Requer SNA OU SNB OU ANB presentes — mas idealmente todos.
 */
function hasMinimumSagittalData(input: CephalometricPlanningInput): boolean {
  const { sna, snb, anb } = input.measurements;
  return isValidNumber(anb) || (isValidNumber(sna) && isValidNumber(snb));
}

// ============================================================================
// FUNÇÃO PRINCIPAL
// ============================================================================

/**
 * Calcula o score de suficiência de dados (0–100) para gerar uma sugestão
 * de planeamento cefalométrico. Retorna também o nível de confiança e a
 * lista de dados ausentes ou bloqueantes.
 *
 * @param input Medidas cefalométricas + contexto clínico do paciente
 * @returns Resultado estruturado com score, nível, confiança, ausências
 *          e razões de bloqueio
 */
export function calculateCephalometricPlanningDataSufficiency(
  input: CephalometricPlanningInput,
): DataSufficiencyResult {
  let score = 0;
  const missingData: string[] = [];
  const blockingReasons: string[] = [];

  const { measurements, clinicalContext } = input;

  // ----- Contexto clínico -----
  if (isValidNumber(clinicalContext.patientAge)) {
    score += DATA_SUFFICIENCY_WEIGHTS.patientAge;
  } else {
    missingData.push(MISSING_DATA_LABELS.patientAge);
  }

  if (clinicalContext.patientSex) {
    score += DATA_SUFFICIENCY_WEIGHTS.patientSex;
  } else {
    missingData.push(MISSING_DATA_LABELS.patientSex);
  }

  // ----- Medidas sagitais -----
  if (isValidNumber(measurements.sna)) {
    score += DATA_SUFFICIENCY_WEIGHTS.sna;
  } else {
    missingData.push(MISSING_DATA_LABELS.sna);
  }

  if (isValidNumber(measurements.snb)) {
    score += DATA_SUFFICIENCY_WEIGHTS.snb;
  } else {
    missingData.push(MISSING_DATA_LABELS.snb);
  }

  if (isValidNumber(measurements.anb)) {
    score += DATA_SUFFICIENCY_WEIGHTS.anb;
  } else {
    missingData.push(MISSING_DATA_LABELS.anb);
  }

  if (isValidNumber(measurements.wits)) {
    score += DATA_SUFFICIENCY_WEIGHTS.wits;
  } else {
    missingData.push(MISSING_DATA_LABELS.wits);
  }

  // ----- Medida vertical (qualquer uma das 3) -----
  if (hasVerticalMeasure(input)) {
    score += DATA_SUFFICIENCY_WEIGHTS.verticalMeasure;
  } else {
    missingData.push(MISSING_DATA_LABELS.verticalMeasure);
  }

  // ----- Incisivos -----
  if (hasUpperIncisor(input)) {
    score += DATA_SUFFICIENCY_WEIGHTS.upperIncisor;
  } else {
    missingData.push(MISSING_DATA_LABELS.upperIncisor);
  }

  if (hasLowerIncisor(input)) {
    score += DATA_SUFFICIENCY_WEIGHTS.lowerIncisor;
  } else {
    missingData.push(MISSING_DATA_LABELS.lowerIncisor);
  }

  // ----- Razões de bloqueio (decisões clínicas que NÃO podem ser feitas) -----
  if (!hasMinimumSagittalData(input)) {
    blockingReasons.push(
      'Sem dados sagitais mínimos (ANB ou SNA+SNB) — classificação sagital bloqueada',
    );
  }

  if (!hasVerticalMeasure(input)) {
    blockingReasons.push(
      'Sem medida vertical (FMA/MMPA/SN-GoGn) — análise vertical bloqueada',
    );
  }

  if (!hasUpperIncisor(input) && !hasLowerIncisor(input)) {
    blockingReasons.push(
      'Sem dados de incisivos — comentários sobre compensação dentária bloqueados',
    );
  }

  // Bloqueio adicional: sem dados periodontais, alertar antes de retração/extração
  if (clinicalContext.hasPeriodontalData === false) {
    blockingReasons.push(
      'Avaliação periodontal ausente — alerta obrigatório antes de sugerir retração ampla',
    );
  }

  // ----- Classificação -----
  const level: DataSufficiencyLevel =
    score <= SUFFICIENCY_THRESHOLDS.insufficientMax
      ? 'insufficient'
      : score <= SUFFICIENCY_THRESHOLDS.partialMax
        ? 'partial'
        : 'sufficient';

  const confidenceLevel: CephPlanningConfidence =
    level === 'insufficient' ? 'low' : level === 'partial' ? 'medium' : 'high';

  return {
    score,
    level,
    confidenceLevel,
    missingData,
    blockingReasons,
  };
}
