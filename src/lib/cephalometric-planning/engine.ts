/**
 * Cephalometric Planning — Engine de Sugestão Determinístico
 *
 * Consome classificadores + score e produz a sugestão estruturada.
 * Toda a linguagem é prudente e não-prescritiva — o sistema sugere
 * elementos a considerar; o profissional decide.
 *
 * Princípios:
 * - "Considerar avaliar X" em vez de "fazer X"
 * - "Compatível com tendência de Y" em vez de "diagnóstico de Y"
 * - "Discutir com o paciente Z" em vez de "indicar Z"
 * - Aviso obrigatório de validação profissional em todo output
 */

import type {
  CephalometricPlanningInput,
  CephalometricPlanningSuggestion,
  CephalometricClassification,
  DataSufficiencyResult,
  CephPlanningStatus,
} from './types';
import { calculateCephalometricPlanningDataSufficiency } from './score';
import { classifyAll } from './classifiers';
import {
  CEPH_PLANNING_RULES_VERSION,
  CEPH_PLANNING_TEMPLATE_VERSION,
  CEPH_PLANNING_SAFETY_FILTER_VERSION,
} from './versions';
import {
  GROWTH_POTENTIAL_AGE_THRESHOLD,
  ADULT_AGE_THRESHOLD,
  SAGITTAL_SOURCE_LABELS,
  VERTICAL_SOURCE_LABELS,
} from './constants';

// ============================================================================
// CONSTANTES DE TEXTO
// ============================================================================

const MANDATORY_DISCLAIMER =
  'AVISO: Esta é uma sugestão de apoio à decisão clínica gerada automaticamente. ' +
  'NÃO substitui o julgamento profissional. Requer validação por dentista habilitado ' +
  'antes de qualquer aplicação clínica.';

const INSUFFICIENT_DATA_MESSAGE =
  'Dados cefalométricos disponíveis são insuficientes para gerar uma sugestão estruturada. ' +
  'Recomenda-se complementar a análise antes de prosseguir.';

// ============================================================================
// ENTRADA DA ENGINE
// ============================================================================

export interface EngineInput {
  input: CephalometricPlanningInput;
  cephalometricAnalysisId: string;
  userId: string;
}

// ============================================================================
// GERADORES DE SEÇÕES (funções puras)
// ============================================================================

/**
 * Gera lista de problemas priorizados a partir das classificações.
 * Ordem: sagital → vertical → incisivos.
 */
function generatePrioritizedProblems(
  classification: CephalometricClassification,
): string[] {
  const problems: string[] = [];

  // Sagital
  switch (classification.sagittal) {
    case 'class_ii_tendency':
      problems.push(
        'Tendência esquelética de Classe II identificada (relação maxilo-mandibular sagital).',
      );
      break;
    case 'class_iii_tendency':
      problems.push(
        'Tendência esquelética de Classe III identificada (relação maxilo-mandibular sagital).',
      );
      break;
    case 'uncertain':
      problems.push(
        'Relação sagital com achados conflitantes entre ANB e Wits — requer reavaliação.',
      );
      break;
    case 'class_i':
      // Não é problema; não adiciona
      break;
  }

  // Vertical
  switch (classification.vertical) {
    case 'hyperdivergent':
      problems.push('Padrão facial vertical compatível com tendência hiperdivergente.');
      break;
    case 'hypodivergent':
      problems.push('Padrão facial vertical compatível com tendência hipodivergente.');
      break;
    case 'normodivergent':
      // Não é problema
      break;
  }

  // Incisivos superiores
  if (classification.upperIncisors === 'proclined') {
    problems.push('Incisivos superiores compatíveis com proclinação relativa às normas de referência.');
  } else if (classification.upperIncisors === 'retroclined') {
    problems.push('Incisivos superiores compatíveis com retroclinação relativa às normas de referência.');
  }

  // Incisivos inferiores
  if (classification.lowerIncisors === 'proclined') {
    problems.push('Incisivos inferiores compatíveis com proclinação relativa às normas de referência.');
  } else if (classification.lowerIncisors === 'retroclined') {
    problems.push('Incisivos inferiores compatíveis com retroclinação relativa às normas de referência.');
  }

  return problems;
}

/**
 * Gera objetivos terapêuticos genéricos baseados nos problemas.
 * Linguagem deliberadamente conservadora.
 */
function generateTherapeuticObjectives(
  classification: CephalometricClassification,
  patientAge: number | undefined,
): string[] {
  const objectives: string[] = [];

  const growthPotential =
    typeof patientAge === 'number' && patientAge < GROWTH_POTENTIAL_AGE_THRESHOLD;

  if (classification.sagittal === 'class_ii_tendency') {
    objectives.push(
      growthPotential
        ? 'Considerar avaliar potencial de modulação do crescimento mandibular.'
        : 'Considerar avaliar compensação ortodôntica da discrepância sagital.',
    );
  }

  if (classification.sagittal === 'class_iii_tendency') {
    objectives.push(
      growthPotential
        ? 'Considerar avaliar abordagem ortopédica precoce (protração maxilar).'
        : 'Considerar discutir abordagem multidisciplinar com avaliação ortodôntico-cirúrgica.',
    );
  }

  if (classification.vertical === 'hyperdivergent') {
    objectives.push('Considerar controlar dimensão vertical durante o tratamento.');
  }

  if (classification.vertical === 'hypodivergent') {
    objectives.push('Considerar avaliar necessidade de aumento de dimensão vertical.');
  }

  if (classification.upperIncisors === 'proclined' || classification.lowerIncisors === 'proclined') {
    objectives.push('Considerar avaliar retração ou descompensação dos incisivos proclinados.');
  }

  if (classification.upperIncisors === 'retroclined' || classification.lowerIncisors === 'retroclined') {
    objectives.push('Considerar avaliar verticalização ou descompensação dos incisivos retroclinados.');
  }

  // Objetivo genérico se nada acima foi adicionado
  if (objectives.length === 0) {
    objectives.push('Manter a estabilidade dos parâmetros cefalométricos atuais.');
  }

  // Objetivo funcional universal
  objectives.push('Preservar ou reestabelecer função oclusal, estética e estabilidade.');

  return objectives;
}

/**
 * Gera alternativas terapêuticas a discutir, em linguagem aberta.
 */
function generateTreatmentAlternatives(
  classification: CephalometricClassification,
  patientAge: number | undefined,
): string[] {
  const alternatives: string[] = [];

  const isAdult = typeof patientAge === 'number' && patientAge >= ADULT_AGE_THRESHOLD;
  const hasGrowthPotential =
    typeof patientAge === 'number' && patientAge < GROWTH_POTENTIAL_AGE_THRESHOLD;

  const isSevereSkeletal =
    classification.sagittal === 'class_ii_tendency' ||
    classification.sagittal === 'class_iii_tendency';

  if (isSevereSkeletal && isAdult) {
    alternatives.push(
      'Avaliação para tratamento ortodôntico-cirúrgico (caso a discrepância seja confirmada e o paciente esteja em condições adequadas).',
    );
    alternatives.push(
      'Tratamento ortodôntico compensatório (camuflagem) — discutir limitações estéticas e funcionais.',
    );
  }

  if (isSevereSkeletal && hasGrowthPotential) {
    alternatives.push('Abordagem ortopédica em paciente em crescimento.');
    alternatives.push('Reavaliação periódica do desenvolvimento facial.');
  }

  if (classification.sagittal === 'class_i' && classification.vertical === 'normodivergent') {
    alternatives.push('Tratamento ortodôntico convencional (caso indicado por outros achados clínicos).');
  }

  // Alternativa universal
  alternatives.push('Discutir todas as opções com o paciente, considerando expectativas, riscos e custos.');

  return alternatives;
}

/**
 * Gera alertas e limitações baseados em score, contradições e dados ausentes.
 */
function generateAlertsAndLimitations(
  sufficiency: DataSufficiencyResult,
  classification: CephalometricClassification,
  input: CephalometricPlanningInput,
): string[] {
  const alerts: string[] = [];

  // Transparencia clinica: alertar quando classificacao usou fonte nao-Steiner
  if (
    classification.sagittalSource &&
    classification.sagittalSource !== 'steiner_anb' &&
    classification.sagittalSource !== 'none'
  ) {
    const label = SAGITTAL_SOURCE_LABELS[classification.sagittalSource] ?? classification.sagittalSource;
    alerts.push(
      `Classificacao sagital baseada em ${label} (Steiner ANB indisponivel). ` +
        'Confianca reduzida - considerar complementar com analise Steiner.',
    );
  }

  if (
    classification.verticalSource &&
    classification.verticalSource !== 'steiner_fma' &&
    classification.verticalSource !== 'steiner_sn_gogn' &&
    classification.verticalSource !== 'none'
  ) {
    const label = VERTICAL_SOURCE_LABELS[classification.verticalSource] ?? classification.verticalSource;
    alerts.push(
      `Padrao vertical baseado em ${label} (Steiner indisponivel).`,
    );
  }

  if (
    classification.lowerIncisorSource &&
    classification.lowerIncisorSource === 'tweed_fmia'
  ) {
    alerts.push(
      'Inclinacao do incisivo inferior baseada em Tweed FMIA (Steiner L1-NB indisponivel).',
    );
  }

  // Alerta de score baixo
  if (sufficiency.level === 'partial') {
    alerts.push(
      'Sugestão limitada — dados parciais. Confiança classificada como média. Complementar análise antes de decisões definitivas.',
    );
  }

  // Contradição ANB × Wits
  if (classification.anbWitsContradiction) {
    alerts.push(
      'ANB e Wits divergem na classificação sagital. Recomenda-se reavaliar pontos cefalométricos e considerar fatores compensatórios.',
    );
  }

  // Dados ausentes específicos
  if (sufficiency.missingData.length > 0) {
    alerts.push(
      `Dados ausentes na análise: ${sufficiency.missingData.join(', ')}.`,
    );
  }

  // Blocking reasons (já gerados pelo score)
  alerts.push(...sufficiency.blockingReasons);

  // Avaliação periodontal ausente — alerta de segurança
  if (input.clinicalContext.hasPeriodontalData !== true) {
    alerts.push(
      'Sem avaliação periodontal confirmada — considerar antes de planejar movimentos amplos ou extrações.',
    );
  }

  // Sem fotos faciais
  if (input.clinicalContext.hasFacialPhotos !== true) {
    alerts.push(
      'Análise sem correlação com fotografias faciais — limitação para julgamento estético.',
    );
  }

  return alerts;
}

/**
 * Gera resumo de uma linha do achado principal.
 */
function generateSummary(
  classification: CephalometricClassification,
  sufficiency: DataSufficiencyResult,
): string {
  if (sufficiency.level === 'insufficient') {
    return INSUFFICIENT_DATA_MESSAGE;
  }

  const sagittalText =
    classification.sagittal === 'class_i'
      ? 'relação sagital compatível com Classe I'
      : classification.sagittal === 'class_ii_tendency'
        ? 'tendência esquelética de Classe II'
        : classification.sagittal === 'class_iii_tendency'
          ? 'tendência esquelética de Classe III'
          : classification.sagittal === 'uncertain'
            ? 'relação sagital com achados conflitantes'
            : 'relação sagital não classificada';

  const verticalText =
    classification.vertical === 'normodivergent'
      ? 'padrão vertical normodivergente'
      : classification.vertical === 'hyperdivergent'
        ? 'tendência hiperdivergente'
        : classification.vertical === 'hypodivergent'
          ? 'tendência hipodivergente'
          : 'padrão vertical não classificado';

  return `Análise cefalométrica compatível com ${sagittalText} e ${verticalText}. ${MANDATORY_DISCLAIMER}`;
}

/**
 * Gera explicação amigável para o paciente.
 */
function generatePatientFriendlyExplanation(
  classification: CephalometricClassification,
): string {
  const parts: string[] = [];

  parts.push(
    'A análise da sua radiografia identificou os seguintes pontos a discutir com seu dentista:',
  );

  if (classification.sagittal === 'class_ii_tendency') {
    parts.push('- A relação entre os ossos da face sugere uma tendência conhecida como "Classe II".');
  } else if (classification.sagittal === 'class_iii_tendency') {
    parts.push('- A relação entre os ossos da face sugere uma tendência conhecida como "Classe III".');
  } else if (classification.sagittal === 'class_i') {
    parts.push('- A relação entre os ossos da face está dentro de padrões considerados normais.');
  }

  if (classification.vertical === 'hyperdivergent') {
    parts.push('- O padrão de crescimento vertical sugere um perfil mais alongado da face.');
  } else if (classification.vertical === 'hypodivergent') {
    parts.push('- O padrão de crescimento vertical sugere um perfil mais quadrangular da face.');
  }

  parts.push(
    'Estes achados são apenas indicativos. Apenas seu dentista pode avaliar com precisão e propor um plano personalizado.',
  );

  return parts.join(' ');
}

// ============================================================================
// COMPOSITOR DE TEXTO FINAL
// ============================================================================

function composeOriginalText(
  summary: string,
  problems: string[],
  objectives: string[],
  alternatives: string[],
  alerts: string[],
  patientExplanation: string,
): string {
  const sections: string[] = [];

  sections.push('=== RESUMO ===');
  sections.push(summary);

  if (problems.length > 0) {
    sections.push('\n=== ACHADOS PRIORIZADOS ===');
    problems.forEach((p, i) => sections.push(`${i + 1}. ${p}`));
  }

  if (objectives.length > 0) {
    sections.push('\n=== OBJETIVOS TERAPÊUTICOS A CONSIDERAR ===');
    objectives.forEach((o, i) => sections.push(`${i + 1}. ${o}`));
  }

  if (alternatives.length > 0) {
    sections.push('\n=== ALTERNATIVAS A DISCUTIR ===');
    alternatives.forEach((a, i) => sections.push(`${i + 1}. ${a}`));
  }

  if (alerts.length > 0) {
    sections.push('\n=== ALERTAS E LIMITAÇÕES ===');
    alerts.forEach((a, i) => sections.push(`${i + 1}. ${a}`));
  }

  sections.push('\n=== EXPLICAÇÃO AMIGÁVEL AO PACIENTE ===');
  sections.push(patientExplanation);

  sections.push(`\n${MANDATORY_DISCLAIMER}`);

  return sections.join('\n');
}

// ============================================================================
// FUNÇÃO PRINCIPAL
// ============================================================================

/**
 * Gera a sugestão de planeamento cefalométrico determinística.
 *
 * NÃO grava no banco — apenas produz o objeto. A persistência fica
 * a cargo da Edge Function (Chunk 6).
 */
export function generateCephalometricPlanningSuggestion(
  params: EngineInput,
): CephalometricPlanningSuggestion {
  const { input, cephalometricAnalysisId, userId } = params;

  // 1. Calcula suficiência
  const sufficiency = calculateCephalometricPlanningDataSufficiency(input);

  // 2. Classifica
  const classification = classifyAll(input.measurements);

  // 3. Define status inicial
  let status: CephPlanningStatus = 'draft_ai_generated';
  if (sufficiency.level === 'insufficient') {
    status = 'requires_more_data';
  }

  // 4. Gera seções
  const prioritizedProblems = generatePrioritizedProblems(classification);
  const therapeuticObjectives = generateTherapeuticObjectives(
    classification,
    input.clinicalContext.patientAge,
  );
  const treatmentAlternatives = generateTreatmentAlternatives(
    classification,
    input.clinicalContext.patientAge,
  );
  const alertsAndLimitations = generateAlertsAndLimitations(
    sufficiency,
    classification,
    input,
  );
  const summary = generateSummary(classification, sufficiency);
  const patientFriendlyExplanation = generatePatientFriendlyExplanation(classification);

  // 5. Compõe texto final
  const aiOriginalText = composeOriginalText(
    summary,
    prioritizedProblems,
    therapeuticObjectives,
    treatmentAlternatives,
    alertsAndLimitations,
    patientFriendlyExplanation,
  );

  // 6. Monta resultado
  const now = new Date().toISOString();

  return {
    cephalometricAnalysisId,
    userId,
    status,
    dataSufficiencyScore: sufficiency.score,
    confidenceLevel: sufficiency.confidenceLevel,
    missingData: sufficiency.missingData,
    blockingReasons: sufficiency.blockingReasons,
    inputMeasurementsSnapshot: input.measurements,
    clinicalContextSnapshot: input.clinicalContext,
    summary,
    prioritizedProblems,
    therapeuticObjectives,
    treatmentAlternatives,
    alertsAndLimitations,
    patientFriendlyExplanation,
    aiOriginalText,
    rulesVersion: CEPH_PLANNING_RULES_VERSION,
    templateVersion: CEPH_PLANNING_TEMPLATE_VERSION,
    safetyFilterVersion: CEPH_PLANNING_SAFETY_FILTER_VERSION,
    generatedAt: now,
  };
}
