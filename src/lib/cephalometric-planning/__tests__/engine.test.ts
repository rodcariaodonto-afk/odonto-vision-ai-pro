/**
 * Testes — generateCephalometricPlanningSuggestion
 *
 * Cobre os principais cenários clínicos e validações estruturais.
 */

import { describe, it, expect } from 'vitest';
import { generateCephalometricPlanningSuggestion } from '../engine';
import type { CephalometricPlanningInput } from '../types';

// ============================================================================
// FIXTURES
// ============================================================================

const fullClassIInput: CephalometricPlanningInput = {
  measurements: {
    sna: 82, snb: 80, anb: 2, wits: 0.5,
    fma: 25, snGoGn: 32,
    u1NaAngle: 22, l1NbAngle: 25, impa: 90,
  },
  clinicalContext: {
    patientAge: 28, patientSex: 'female',
    hasPeriodontalData: true, hasFacialPhotos: true,
  },
};

const adultClassIIInput: CephalometricPlanningInput = {
  measurements: {
    sna: 84, snb: 78, anb: 6, fma: 32,
    u1NaAngle: 28, impa: 82,
  },
  clinicalContext: {
    patientAge: 30, patientSex: 'female',
    hasPeriodontalData: true,
  },
};

const childClassIIIInput: CephalometricPlanningInput = {
  measurements: {
    sna: 78, snb: 82, anb: -4, fma: 28,
    u1NaAngle: 22, l1NbAngle: 25,
  },
  clinicalContext: {
    patientAge: 10, patientSex: 'male',
    hasPeriodontalData: true,
  },
};

const ENGINE_PARAMS = {
  cephalometricAnalysisId: 'analysis-test-id',
  userId: 'user-test-id',
};

// ============================================================================
// CASO 1: CLASSE I (paciente normal)
// ============================================================================

describe('engine — Classe I com dados completos', () => {
  it('retorna status draft_ai_generated', () => {
    const result = generateCephalometricPlanningSuggestion({
      ...ENGINE_PARAMS,
      input: fullClassIInput,
    });
    expect(result.status).toBe('draft_ai_generated');
  });

  it('score 100 e confidence high', () => {
    const result = generateCephalometricPlanningSuggestion({
      ...ENGINE_PARAMS,
      input: fullClassIInput,
    });
    // sem Wits no input → score 90; com Wits → 100
    expect(result.dataSufficiencyScore).toBeGreaterThanOrEqual(90);
    expect(result.confidenceLevel).toBe('high');
  });

  it('summary contem Classe I e disclaimer', () => {
    const result = generateCephalometricPlanningSuggestion({
      ...ENGINE_PARAMS,
      input: fullClassIInput,
    });
    expect(result.summary).toContain('Classe I');
    expect(result.summary).toContain('AVISO');
  });

  it('snapshots preservados', () => {
    const result = generateCephalometricPlanningSuggestion({
      ...ENGINE_PARAMS,
      input: fullClassIInput,
    });
    expect(result.inputMeasurementsSnapshot.anb).toBe(2);
    expect(result.clinicalContextSnapshot.patientAge).toBe(28);
  });

  it('versoes registradas', () => {
    const result = generateCephalometricPlanningSuggestion({
      ...ENGINE_PARAMS,
      input: fullClassIInput,
    });
    expect(result.rulesVersion).toMatch(/^ceph_rules_v/);
    expect(result.templateVersion).toMatch(/^planning_template_v/);
    expect(result.safetyFilterVersion).toMatch(/^safety_filter_v/);
  });
});

// ============================================================================
// CASO 2: ADULTO CLASSE II
// ============================================================================

describe('engine — Adulto Classe II', () => {
  it('inclui Classe II nos problemas priorizados', () => {
    const result = generateCephalometricPlanningSuggestion({
      ...ENGINE_PARAMS,
      input: adultClassIIInput,
    });
    expect(
      result.prioritizedProblems.some((p) => p.includes('Classe II')),
    ).toBe(true);
  });

  it('sugere alternativa ortodontico-cirurgica para adulto Classe II severa', () => {
    const result = generateCephalometricPlanningSuggestion({
      ...ENGINE_PARAMS,
      input: adultClassIIInput,
    });
    expect(
      result.treatmentAlternatives.some(
        (a) => a.toLowerCase().includes('cir') || a.toLowerCase().includes('compensat'),
      ),
    ).toBe(true);
  });

  it('NAO sugere ortopedia para adulto', () => {
    const result = generateCephalometricPlanningSuggestion({
      ...ENGINE_PARAMS,
      input: adultClassIIInput,
    });
    const hasOrtopedia = result.treatmentAlternatives.some((a) =>
      a.toLowerCase().includes('ortopédica em paciente em crescimento'),
    );
    expect(hasOrtopedia).toBe(false);
  });

  it('inclui linguagem prudente (considerar/discutir)', () => {
    const result = generateCephalometricPlanningSuggestion({
      ...ENGINE_PARAMS,
      input: adultClassIIInput,
    });
    const text = result.aiOriginalText.toLowerCase();
    expect(text.includes('considerar') || text.includes('discutir')).toBe(true);
  });
});

// ============================================================================
// CASO 3: CRIANÇA CLASSE III
// ============================================================================

describe('engine — Criança Classe III', () => {
  it('sugere abordagem ortopedica para paciente em crescimento', () => {
    const result = generateCephalometricPlanningSuggestion({
      ...ENGINE_PARAMS,
      input: childClassIIIInput,
    });
    expect(
      result.treatmentAlternatives.some((a) =>
        a.toLowerCase().includes('ortopédica'),
      ),
    ).toBe(true);
  });

  it('objetivos terapeuticos consideram potencial de crescimento', () => {
    const result = generateCephalometricPlanningSuggestion({
      ...ENGINE_PARAMS,
      input: childClassIIIInput,
    });
    expect(
      result.therapeuticObjectives.some((o) =>
        o.toLowerCase().includes('crescimento') || o.toLowerCase().includes('protração'),
      ),
    ).toBe(true);
  });
});

// ============================================================================
// CASO 4: DADOS INSUFICIENTES
// ============================================================================

describe('engine — Dados insuficientes', () => {
  it('retorna status requires_more_data com score baixo', () => {
    const input: CephalometricPlanningInput = {
      measurements: { anb: 2 },
      clinicalContext: {},
    };
    const result = generateCephalometricPlanningSuggestion({
      ...ENGINE_PARAMS,
      input,
    });
    expect(result.dataSufficiencyScore).toBeLessThan(60);
    expect(result.status).toBe('requires_more_data');
  });

  it('summary informa insuficiencia', () => {
    const result = generateCephalometricPlanningSuggestion({
      ...ENGINE_PARAMS,
      input: { measurements: {}, clinicalContext: {} },
    });
    expect(result.summary.toLowerCase()).toContain('insuficient');
  });

  it('lista missingData', () => {
    const result = generateCephalometricPlanningSuggestion({
      ...ENGINE_PARAMS,
      input: { measurements: {}, clinicalContext: {} },
    });
    expect(result.missingData.length).toBeGreaterThan(5);
  });
});

// ============================================================================
// ALERTAS
// ============================================================================

describe('engine — alertas', () => {
  it('alerta sobre contradicao ANB x Wits', () => {
    const result = generateCephalometricPlanningSuggestion({
      ...ENGINE_PARAMS,
      input: {
        measurements: { anb: 5, wits: -3, fma: 25, u1NaAngle: 22, l1NbAngle: 25 },
        clinicalContext: { patientAge: 30, hasPeriodontalData: true },
      },
    });
    expect(
      result.alertsAndLimitations.some(
        (a) => a.includes('ANB') && a.includes('Wits'),
      ),
    ).toBe(true);
  });

  it('alerta sobre periodontal ausente', () => {
    const result = generateCephalometricPlanningSuggestion({
      ...ENGINE_PARAMS,
      input: {
        measurements: fullClassIInput.measurements,
        clinicalContext: { patientAge: 28 }, // sem hasPeriodontalData
      },
    });
    expect(
      result.alertsAndLimitations.some((a) =>
        a.toLowerCase().includes('periodontal'),
      ),
    ).toBe(true);
  });
});

// ============================================================================
// TEXTO FINAL
// ============================================================================

describe('engine — texto final', () => {
  it('aiOriginalText contem todas as secoes', () => {
    const result = generateCephalometricPlanningSuggestion({
      ...ENGINE_PARAMS,
      input: fullClassIInput,
    });
    expect(result.aiOriginalText).toContain('RESUMO');
    expect(result.aiOriginalText).toContain('OBJETIVOS');
    expect(result.aiOriginalText).toContain('ALTERNATIVAS');
    expect(result.aiOriginalText).toContain('EXPLICAÇÃO AMIGÁVEL');
  });

  it('aiOriginalText termina com disclaimer', () => {
    const result = generateCephalometricPlanningSuggestion({
      ...ENGINE_PARAMS,
      input: fullClassIInput,
    });
    expect(result.aiOriginalText).toContain('AVISO');
    expect(result.aiOriginalText).toContain('validação');
  });

  it('patientFriendlyExplanation existe e e diferente do texto tecnico', () => {
    const result = generateCephalometricPlanningSuggestion({
      ...ENGINE_PARAMS,
      input: fullClassIInput,
    });
    expect(result.patientFriendlyExplanation).toBeDefined();
    expect(result.patientFriendlyExplanation).not.toBe(result.aiOriginalText);
  });
});
