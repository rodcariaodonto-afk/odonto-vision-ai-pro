/**
 * Cephalometric Planning — Filtro de Segurança Textual
 *
 * Camada de validação que verifica se o texto de uma sugestão de
 * planeamento clínico está em linguagem prudente, sem promessas
 * absolutas, prescrições diretas ou diagnósticos sem qualificadores.
 *
 * Duas categorias:
 * 1. BLOCKED_TERMS — termos que invalidam o output (hard block)
 * 2. WARNING_TERMS — termos que geram alerta mas não bloqueiam
 *
 * Sanitização opcional: substitui linguagem imperativa por prudente
 * quando possível, preservando o significado clínico.
 *
 * IMPORTANTE: alterar listas aqui exige bump em
 * CEPH_PLANNING_SAFETY_FILTER_VERSION em versions.ts.
 */

import type { SafetyValidationResult } from './types';

// ============================================================================
// LISTAS DE TERMOS
// ============================================================================

/**
 * Termos que bloqueiam o output. Promessas, certezas absolutas, garantias.
 * Match case-insensitive em qualquer parte do texto.
 */
const BLOCKED_TERMS: ReadonlyArray<string> = [
  // Promessas e garantias
  'garantido',
  'garantia de sucesso',
  '100% de sucesso',
  'sucesso garantido',
  'sem riscos',
  'sem efeitos colaterais',
  'totalmente seguro',
  'cura definitiva',
  'cura garantida',
  'resultado perfeito',
  'resultado garantido',
  // Certezas absolutas
  'certeza absoluta',
  'definitivamente',
  'com certeza',
  'jamais',
  'nunca falha',
  // Prescrições absolutas sem qualificador profissional
  'você deve fazer',
  'o paciente deve',
  'é obrigatório',
  'é imprescindível',
  // Linguagem comercial/marketing inadequada
  'milagre',
  'milagroso',
  'revolucionário',
  'tratamento exclusivo',
];

/**
 * Termos que geram alerta mas não bloqueiam.
 * Linguagem imperativa ou diagnóstica que pode ser apropriada com contexto.
 */
const WARNING_TERMS: ReadonlyArray<string> = [
  'prescrevo',
  'prescrever',
  'indico',
  'recomendo fortemente',
  'é necessário',
  'paciente precisa',
  'requer cirurgia',
  'cirurgia obrigatória',
  'extração obrigatória',
];

/**
 * Substituições leves para sanitização opcional.
 * Cada par [pattern, replacement] reescreve linguagem imperativa
 * para linguagem prudente.
 */
const SANITIZATION_RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bé indicado\b/gi, 'pode ser considerado'],
  [/\bé necessário\b/gi, 'considerar a necessidade de'],
  [/\bdeve ser feito\b/gi, 'pode ser avaliado'],
  [/\bdeve fazer\b/gi, 'pode considerar'],
  [/\brequer cirurgia\b/gi, 'pode requerer avaliação cirúrgica'],
  [/\bprescrevo\b/gi, 'sugiro avaliar'],
  [/\bindico\b/gi, 'sugiro considerar'],
];

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Verifica se um termo aparece no texto (case-insensitive, com word boundaries
 * quando aplicável). Retorna a forma exata encontrada ou null.
 */
function findTermInText(text: string, term: string): string | null {
  const normalized = text.toLowerCase();
  const target = term.toLowerCase();
  const idx = normalized.indexOf(target);
  if (idx === -1) return null;
  // Retorna a forma como aparece no texto original
  return text.slice(idx, idx + term.length);
}

// ============================================================================
// FUNÇÃO PRINCIPAL
// ============================================================================

/**
 * Valida e (opcionalmente) sanitiza o texto de uma sugestão clínica.
 *
 * @param text Texto a validar
 * @param options.sanitize Se true, devolve sanitizedText com substituições aplicadas
 * @returns Resultado estruturado com flags, termos encontrados e texto saneado
 */
export function validateAndSanitizeSuggestionText(
  text: string,
  options: { sanitize?: boolean } = {},
): SafetyValidationResult {
  const blockedFound: string[] = [];
  const warningsFound: string[] = [];

  // 1. Bloqueio: termos críticos
  for (const term of BLOCKED_TERMS) {
    const found = findTermInText(text, term);
    if (found !== null) {
      blockedFound.push(term);
    }
  }

  // 2. Warning: termos a sinalizar
  for (const term of WARNING_TERMS) {
    const found = findTermInText(text, term);
    if (found !== null) {
      warningsFound.push(term);
    }
  }

  // 3. Sanitização opcional
  let sanitizedText: string | undefined;
  if (options.sanitize) {
    let working = text;
    for (const [pattern, replacement] of SANITIZATION_RULES) {
      working = working.replace(pattern, replacement);
    }
    sanitizedText = working;
  }

  return {
    isSafe: blockedFound.length === 0,
    blockedTerms: blockedFound,
    warnings: warningsFound,
    sanitizedText,
  };
}

/**
 * Versão estrita: lança erro se o texto contiver termos bloqueados.
 * Útil para uso em pipelines onde queremos abortar imediatamente.
 */
export function assertSafeSuggestionText(text: string): void {
  const result = validateAndSanitizeSuggestionText(text);
  if (!result.isSafe) {
    throw new Error(
      `Texto bloqueado pelo filtro de seguranca. Termos detectados: ${result.blockedTerms.join(', ')}`,
    );
  }
}

/**
 * Acesso aos termos bloqueados (somente leitura) — útil para UI exibir
 * a lista ao admin ou para testes verificarem cobertura.
 */
export function getBlockedTerms(): ReadonlyArray<string> {
  return BLOCKED_TERMS;
}

export function getWarningTerms(): ReadonlyArray<string> {
  return WARNING_TERMS;
}
