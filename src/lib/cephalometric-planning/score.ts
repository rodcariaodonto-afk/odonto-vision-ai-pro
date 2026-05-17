/**
 * Cephalometric Planning - Score de Suficiencia (v1.1.0 - Multi-Analise)
 *
 * Funcao pura, deterministica, que avalia se os dados disponiveis sao
 * suficientes para gerar uma sugestao de planeamento clinico segura.
 *
 * Hierarquia clinica de fontes para cada eixo:
 *   Sagital:    Steiner ANB > McNamara > Ricketts > Downs
 *   Vertical:   Steiner FMA/SN-GoGn > Ricketts > Downs > Jarabak > McNamara LAFH
 *   Incisivos:  Steiner > Tweed FMIA
 *
 * Calibracao de pontos: cada eixo so contabiliza UMA fonte (a de maior
 * precedencia disponivel) para evitar dupla contagem.
 *
 * Faixas:
 *   0-59:   insufficient -> nao gerar plano completo
 *   60-79:  partial      -> gerar sugestao limitada com alertas
 *   80-100: sufficient   -> gerar sugestao estruturada
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
  ALTERNATIVE_ANALYSIS_WEIGHTS,
} from './constants';

// ============================================================================
// HELPERS
// ============================================================================

function isValidNumber(value: number | undefined | null): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

// ============================================================================
// DETECTORES POR EIXO CLINICO (qualquer fonte)
// ============================================================================

function hasSagittalSteinerData(input: CephalometricPlanningInput): boolean {
  const { sna, snb, anb } = input.measurements;
  return isValidNumber(anb) || (isValidNumber(sna) && isValidNumber(snb));
}

function hasSagittalMcnamaraData(input: CephalometricPlanningInput): boolean {
  const { mcnamaraANperp, mcnamaraPogNperp } = input.measurements;
  return isValidNumber(mcnamaraANperp) && isValidNumber(mcnamaraPogNperp);
}

function hasSagittalRickettsData(input: CephalometricPlanningInput): boolean {
  return isValidNumber(input.measurements.rickettsFacialDepth);
}

function hasSagittalDownsData(input: CephalometricPlanningInput): boolean {
  const { downsFacialAngle, downsAngConvex } = input.measurements;
  return isValidNumber(downsFacialAngle) || isValidNumber(downsAngConvex);
}

/**
 * Qualquer fonte sagital aceita (Steiner OU McNamara OU Ricketts OU Downs).
 */
function hasAnySagittalSource(input: CephalometricPlanningInput): boolean {
  return (
    hasSagittalSteinerData(input) ||
    hasSagittalMcnamaraData(input) ||
    hasSagittalRickettsData(input) ||
    hasSagittalDownsData(input)
  );
}

function hasVerticalSteinerData(input: CephalometricPlanningInput): boolean {
  const { fma, mmpa, snGoGn } = input.measurements;
  return isValidNumber(fma) || isValidNumber(mmpa) || isValidNumber(snGoGn);
}

function hasVerticalAlternativeSource(input: CephalometricPlanningInput): boolean {
  const { rickettsMandPlane, downsMandPlane, jarabakRatio, mcnamaraLafh } =
    input.measurements;
  return (
    isValidNumber(rickettsMandPlane) ||
    isValidNumber(downsMandPlane) ||
    isValidNumber(jarabakRatio) ||
    isValidNumber(mcnamaraLafh)
  );
}

function hasAnyVerticalSource(input: CephalometricPlanningInput): boolean {
  return hasVerticalSteinerData(input) || hasVerticalAlternativeSource(input);
}

function hasUpperIncisor(input: CephalometricPlanningInput): boolean {
  const { u1Na, u1NaAngle, downsU1L1 } = input.measurements;
  return isValidNumber(u1Na) || isValidNumber(u1NaAngle) || isValidNumber(downsU1L1);
}

function hasLowerIncisorSteinerData(input: CephalometricPlanningInput): boolean {
  const { l1Nb, l1NbAngle, impa } = input.measurements;
  return isValidNumber(l1Nb) || isValidNumber(l1NbAngle) || isValidNumber(impa);
}

function hasLowerIncisorAlternative(input: CephalometricPlanningInput): boolean {
  return isValidNumber(input.measurements.tweedFmia);
}

function hasAnyLowerIncisor(input: CephalometricPlanningInput): boolean {
  return hasLowerIncisorSteinerData(input) || hasLowerIncisorAlternative(input);
}

// ============================================================================
// FUNCAO PRINCIPAL
// ============================================================================

export function calculateCephalometricPlanningDataSufficiency(
  input: CephalometricPlanningInput,
): DataSufficiencyResult {
  let score = 0;
  const missingData: string[] = [];
  const blockingReasons: string[] = [];

  const { measurements, clinicalContext } = input;

  // ----- Contexto clinico -----
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

  // ----- SAGITAL: maior precedencia ganha (nao acumula) -----
  if (hasSagittalSteinerData(input)) {
    // Steiner: pontuacao individual por medida disponivel
    if (isValidNumber(measurements.sna)) score += DATA_SUFFICIENCY_WEIGHTS.sna;
    else missingData.push(MISSING_DATA_LABELS.sna);

    if (isValidNumber(measurements.snb)) score += DATA_SUFFICIENCY_WEIGHTS.snb;
    else missingData.push(MISSING_DATA_LABELS.snb);

    if (isValidNumber(measurements.anb)) score += DATA_SUFFICIENCY_WEIGHTS.anb;
    else missingData.push(MISSING_DATA_LABELS.anb);

    if (isValidNumber(measurements.wits)) score += DATA_SUFFICIENCY_WEIGHTS.wits;
    else missingData.push(MISSING_DATA_LABELS.wits);
  } else if (hasSagittalMcnamaraData(input)) {
    // McNamara como fonte sagital alternativa (alta confianca: 12pts)
    score += ALTERNATIVE_ANALYSIS_WEIGHTS.mcnamaraSagittal;
    missingData.push('ANB Steiner (substituido por McNamara A-Nperp + Pog-Nperp)');
  } else if (hasSagittalRickettsData(input)) {
    score += ALTERNATIVE_ANALYSIS_WEIGHTS.rickettsSagittal;
    missingData.push('ANB Steiner (substituido por Ricketts Profundidade Facial)');
  } else if (hasSagittalDownsData(input)) {
    score += ALTERNATIVE_ANALYSIS_WEIGHTS.downsSagittal;
    missingData.push('ANB Steiner (substituido por Downs Angulo Facial)');
  } else {
    // Nenhuma fonte sagital
    missingData.push(MISSING_DATA_LABELS.sna);
    missingData.push(MISSING_DATA_LABELS.snb);
    missingData.push(MISSING_DATA_LABELS.anb);
    missingData.push(MISSING_DATA_LABELS.wits);
  }

  // ----- VERTICAL: Steiner ou alternativa -----
  if (hasVerticalSteinerData(input)) {
    score += DATA_SUFFICIENCY_WEIGHTS.verticalMeasure;
  } else if (hasVerticalAlternativeSource(input)) {
    score += ALTERNATIVE_ANALYSIS_WEIGHTS.alternativeVertical;
    missingData.push(
      'Vertical Steiner (substituido por Ricketts/Downs/Jarabak/McNamara)',
    );
  } else {
    missingData.push(MISSING_DATA_LABELS.verticalMeasure);
  }

  // ----- INCISIVOS SUPERIORES -----
  if (hasUpperIncisor(input)) {
    score += DATA_SUFFICIENCY_WEIGHTS.upperIncisor;
  } else {
    missingData.push(MISSING_DATA_LABELS.upperIncisor);
  }

  // ----- INCISIVOS INFERIORES -----
  if (hasLowerIncisorSteinerData(input)) {
    score += DATA_SUFFICIENCY_WEIGHTS.lowerIncisor;
  } else if (hasLowerIncisorAlternative(input)) {
    score += ALTERNATIVE_ANALYSIS_WEIGHTS.alternativeIncisor;
    missingData.push('L1-NB Steiner (substituido por Tweed FMIA)');
  } else {
    missingData.push(MISSING_DATA_LABELS.lowerIncisor);
  }

  // ----- BLOCKING REASONS -----
  if (!hasAnySagittalSource(input)) {
    blockingReasons.push(
      'Sem dados sagitais minimos (Steiner ANB, McNamara, Ricketts ou Downs) - ' +
        'classificacao da classe esqueletica bloqueada',
    );
  }

  if (!hasAnyVerticalSource(input)) {
    blockingReasons.push(
      'Sem medida vertical em nenhuma analise - analise vertical bloqueada',
    );
  }

  if (!hasUpperIncisor(input) && !hasAnyLowerIncisor(input)) {
    blockingReasons.push(
      'Sem dados de incisivos - comentarios sobre compensacao dentaria bloqueados',
    );
  }

  if (clinicalContext.hasPeriodontalData === false) {
    blockingReasons.push(
      'Avaliacao periodontal ausente - alerta obrigatorio antes de sugerir retracao ampla',
    );
  }

  // ----- Classificacao -----
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
