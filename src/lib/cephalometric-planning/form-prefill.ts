/**
 * Cephalometric Planning — Pré-preenchimento inteligente do formulário A009
 *
 * Infere automaticamente os campos clínicos a partir das medidas cefalométricas.
 * Usa os mesmos thresholds do engine (constants.ts) para consistência.
 *
 * Princípio: sugerir, nunca impor.
 * O dentista vê os campos pré-marcados e pode corrigir livremente.
 */

import type { UiClinicalContext } from './ui-adapter';
import type { AnalysisResultsMap } from './ui-adapter';

// ── Extrair medidas de todas as análises rodadas ─────────────────────────────
function extractMeasures(results: AnalysisResultsMap): Record<string, number> {
  const m: Record<string, number> = {};
  for (const r of Object.values(results)) {
    if (!r?.measurements) continue;
    for (const [k, v] of Object.entries(r.measurements)) {
      if (typeof v === 'number' && Number.isFinite(v)) m[k] = v;
    }
  }
  return m;
}

// ── Inferir padrão facial a partir de FMA / SN-GoGn ─────────────────────────
function inferPadraoFacial(m: Record<string, number>): UiClinicalContext['padraoFacial'] {
  const fma = m['FMA'] ?? m['fma'];
  const snGoGn = m['SN-GoGn'] ?? m['snGoGn'];

  // Usar FMA se disponível (Steiner/Tweed)
  if (typeof fma === 'number') {
    if (fma < 20) return 'braquifacial';
    if (fma > 30) return 'dolicofacial';
    return 'mesofacial';
  }
  // Fallback: SN-GoGn
  if (typeof snGoGn === 'number') {
    if (snGoGn < 28) return 'braquifacial';
    if (snGoGn > 36) return 'dolicofacial';
    return 'mesofacial';
  }
  return undefined;
}

// ── Inferir índice de Vert a partir de FMA ───────────────────────────────────
function inferIndiceVert(m: Record<string, number>): UiClinicalContext['indiceVert'] {
  const fma = m['FMA'] ?? m['fma'];
  if (typeof fma !== 'number') return undefined;
  if (fma < 17)  return 'braqui_severo';
  if (fma < 22)  return 'braqui_suave';
  if (fma < 27)  return 'braquifacial';
  if (fma < 32)  return 'mesofacial';
  if (fma < 36)  return 'dolicofacial';
  if (fma < 40)  return 'dolico_suave';
  return 'dolico_severo';
}

// ── Inferir classe esquelética a partir de ANB ───────────────────────────────
function inferClasseEsqueletica(m: Record<string, number>): UiClinicalContext['classeEsqueletica'] {
  const anb = m['ANB'] ?? m['anb'];
  if (typeof anb !== 'number') return undefined;
  if (anb <= 0)  return 'classe_iii';
  if (anb >= 4)  return 'classe_ii';
  return 'classe_i';
}

// ── Inferir diagnóstico esquelético detalhado a partir de SNA/SNB/ANB ────────
function inferDiagnosticoEsqueletico(
  m: Record<string, number>,
): UiClinicalContext['diagnosticoEsqueletico'] {
  const anb = m['ANB'] ?? m['anb'];
  const sna = m['SNA'] ?? m['sna'];
  const snb = m['SNB'] ?? m['snb'];
  if (typeof anb !== 'number') return undefined;

  if (anb >= 4) {
    // Classe II — determinar se é protrusão maxilar ou retrusão mandibular
    if (typeof sna === 'number' && sna > 85) return 'classe_ii_protrusao_maxilar';
    if (typeof snb === 'number' && snb < 78) return 'classe_ii_retrusao_mandibular';
    return 'classe_ii_protrusao_maxilar'; // default Classe II
  }
  if (anb <= 0) {
    // Classe III — determinar se é retrusão maxilar ou protrusão mandibular
    if (typeof sna === 'number' && sna < 79) return 'classe_iii_retrusao_maxilar';
    if (typeof snb === 'number' && snb > 83) return 'classe_iii_protrusao_mandibular';
    return 'classe_iii_retrusao_maxilar'; // default Classe III
  }
  return 'classe_i';
}

// ── Inferir mordida vertical a partir de Overbite ───────────────────────────
function inferMordida(m: Record<string, number>): UiClinicalContext['mordida'] {
  const ob = m['Overbite'] ?? m['overbite'];
  if (typeof ob !== 'number') return undefined;
  if (ob < 0)   return 'aberta';
  if (ob > 4)   return 'profunda';
  return 'normal';
}

// ── Inferir linha de sorriso a partir de incisivos ──────────────────────────
function inferLinhaDeSorriso(m: Record<string, number>): UiClinicalContext['linhaDeSorriso'] {
  const u1na = m['U1-NA'] ?? m['u1NaAngle'];
  if (typeof u1na !== 'number') return undefined;
  if (u1na > 28) return 'alta';
  if (u1na < 18) return 'baixa';
  return 'normal';
}

// ── Função principal de pré-preenchimento ────────────────────────────────────

/**
 * Infere campos do formulário A009 a partir das medidas cefalométricas.
 * Retorna apenas os campos que puderam ser inferidos com confiança.
 * Campos não inferíveis ficam undefined para o dentista preencher.
 *
 * @param results  Resultados de todas as análises rodadas
 * @param existing Contexto já preenchido pelo dentista (não sobrescreve)
 */
export function prefillFromCephalometricResults(
  results: AnalysisResultsMap,
  existing: UiClinicalContext = {},
): UiClinicalContext {
  const m = extractMeasures(results);

  // Não sobrescrever campos já preenchidos pelo dentista
  const prefilled: UiClinicalContext = { ...existing };

  if (!existing.padraoFacial)           prefilled.padraoFacial           = inferPadraoFacial(m);
  if (!existing.indiceVert)             prefilled.indiceVert             = inferIndiceVert(m);
  if (!existing.classeEsqueletica)      prefilled.classeEsqueletica      = inferClasseEsqueletica(m);
  if (!existing.diagnosticoEsqueletico) prefilled.diagnosticoEsqueletico = inferDiagnosticoEsqueletico(m);
  if (!existing.mordida)                prefilled.mordida                = inferMordida(m);
  if (!existing.linhaDeSorriso)         prefilled.linhaDeSorriso         = inferLinhaDeSorriso(m);

  return prefilled;
}

/**
 * Retorna quais campos foram inferidos automaticamente
 * (para destacar na UI com badge "Sugerido pela IA").
 */
export function getInferredFields(
  results: AnalysisResultsMap,
  existing: UiClinicalContext = {},
): (keyof UiClinicalContext)[] {
  const m = extractMeasures(results);
  const inferred: (keyof UiClinicalContext)[] = [];

  if (!existing.padraoFacial           && inferPadraoFacial(m))           inferred.push('padraoFacial');
  if (!existing.indiceVert             && inferIndiceVert(m))             inferred.push('indiceVert');
  if (!existing.classeEsqueletica      && inferClasseEsqueletica(m))      inferred.push('classeEsqueletica');
  if (!existing.diagnosticoEsqueletico && inferDiagnosticoEsqueletico(m)) inferred.push('diagnosticoEsqueletico');
  if (!existing.mordida                && inferMordida(m))                inferred.push('mordida');
  if (!existing.linhaDeSorriso         && inferLinhaDeSorriso(m))         inferred.push('linhaDeSorriso');

  return inferred;
}
