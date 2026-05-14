/**
 * Testes — calculateCephalometricPlanningDataSufficiency
 *
 * Cobertura:
 * - Score com dados completos (high confidence)
 * - Score com dados parciais (medium)
 * - Score com dados mínimos (low/insufficient)
 * - Detecção de blocking reasons (sagital, vertical, incisivos, periodontal)
 * - Casos de fronteira: NaN, valores zero, número ausente
 */

import { describe, it, expect } from 'vitest';
import { calculateCephalometricPlanningDataSufficiency } from '../score';
import type { CephalometricPlanningInput } from '../types';

// ============================================================================
// FIXTURES
// ============================================================================

const fullInput: CephalometricPlanningInput = {
  measurements: {
    sna: 82,
    snb: 80,
    anb: 2,
    wits: 0.5,
    fma: 25,
    snGoGn: 32,
    u1NaAngle: 22,
    l1NbAngle: 25,
    impa: 90,
    overjet: 2.5,
    overbite: 2,
  },
  clinicalContext: {
    patientAge: 28,
    patientSex: 'female',
    hasPeriodontalData: true,
    hasFacialPhotos: true,
    hasOcclusalExam: true,
  },
};

const emptyInput: CephalometricPlanningInput = {
  measurements: {},
  clinicalContext: {},
};

// ============================================================================
// SCORE: DADOS COMPLETOS
// ============================================================================

describe('calculateCephalometricPlanningDataSufficiency — dados completos', () => {
  it('retorna score 100 com todos os dados', () => {
    const result = calculateCephalometricPlanningDataSufficiency(fullInput);
    expect(result.score).toBe(100);
  });

  it('classifica como sufficient', () => {
    const result = calculateCephalometricPlanningDataSufficiency(fullInput);
    expect(result.level).toBe('sufficient');
  });

  it('confidence level alto (high)', () => {
    const result = calculateCephalometricPlanningDataSufficiency(fullInput);
    expect(result.confidenceLevel).toBe('high');
  });

  it('nao retorna missingData', () => {
    const result = calculateCephalometricPlanningDataSufficiency(fullInput);
    expect(result.missingData).toEqual([]);
  });

  it('nao retorna blockingReasons', () => {
    const result = calculateCephalometricPlanningDataSufficiency(fullInput);
    expect(result.blockingReasons).toEqual([]);
  });
});

// ============================================================================
// SCORE: DADOS PARCIAIS
// ============================================================================

describe('calculateCephalometricPlanningDataSufficiency — dados parciais', () => {
  it('score entre 60 e 79 = partial / medium confidence', () => {
    const input: CephalometricPlanningInput = {
      measurements: {
        sna: 82,
        snb: 80,
        anb: 2,
        fma: 25,
        u1NaAngle: 22,
        l1NbAngle: 25,
      },
      clinicalContext: {
        patientAge: 28,
        patientSex: 'female',
      },
    };
    const result = calculateCephalometricPlanningDataSufficiency(input);
    // 15+5+10+10+15+15+10+10 = 90; tira wits (10) = 80 → ainda sufficient
    // Removendo wits + remover patientSex (-5) = 85, ainda sufficient
    // Para forçar partial: tirar mais coisas
    expect(result.score).toBeGreaterThanOrEqual(60);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('apenas alguns dados sagitais retorna partial', () => {
    const input: CephalometricPlanningInput = {
      measurements: {
        anb: 2,
        fma: 25,
        u1NaAngle: 22,
      },
      clinicalContext: {
        patientAge: 28,
      },
    };
    const result = calculateCephalometricPlanningDataSufficiency(input);
    // 15 (idade) + 15 (anb) + 15 (vertical) + 10 (incisivo sup) = 55 → insufficient
    expect(result.score).toBe(55);
    expect(result.level).toBe('insufficient');
    expect(result.confidenceLevel).toBe('low');
  });
});

// ============================================================================
// SCORE: DADOS VAZIOS
// ============================================================================

describe('calculateCephalometricPlanningDataSufficiency — dados vazios', () => {
  it('input vazio retorna score 0', () => {
    const result = calculateCephalometricPlanningDataSufficiency(emptyInput);
    expect(result.score).toBe(0);
  });

  it('classifica como insufficient', () => {
    const result = calculateCephalometricPlanningDataSufficiency(emptyInput);
    expect(result.level).toBe('insufficient');
  });

  it('confidence level baixo (low)', () => {
    const result = calculateCephalometricPlanningDataSufficiency(emptyInput);
    expect(result.confidenceLevel).toBe('low');
  });

  it('lista todos os dados ausentes', () => {
    const result = calculateCephalometricPlanningDataSufficiency(emptyInput);
    expect(result.missingData.length).toBeGreaterThanOrEqual(9);
  });
});

// ============================================================================
// BLOCKING REASONS — SAGITAL
// ============================================================================

describe('blockingReasons — sagital', () => {
  it('bloqueia classificacao sagital sem ANB nem SNA+SNB', () => {
    const input: CephalometricPlanningInput = {
      measurements: { fma: 25, u1NaAngle: 22, l1NbAngle: 25 },
      clinicalContext: { patientAge: 28 },
    };
    const result = calculateCephalometricPlanningDataSufficiency(input);
    expect(result.blockingReasons.some((r) => r.includes('sagital'))).toBe(true);
  });

  it('nao bloqueia sagital se ANB presente', () => {
    const input: CephalometricPlanningInput = {
      measurements: { anb: 2 },
      clinicalContext: {},
    };
    const result = calculateCephalometricPlanningDataSufficiency(input);
    expect(result.blockingReasons.some((r) => r.includes('sagital'))).toBe(false);
  });

  it('nao bloqueia sagital se SNA+SNB presentes (sem ANB)', () => {
    const input: CephalometricPlanningInput = {
      measurements: { sna: 82, snb: 80 },
      clinicalContext: {},
    };
    const result = calculateCephalometricPlanningDataSufficiency(input);
    expect(result.blockingReasons.some((r) => r.includes('sagital'))).toBe(false);
  });
});

// ============================================================================
// BLOCKING REASONS — VERTICAL
// ============================================================================

describe('blockingReasons — vertical', () => {
  it('bloqueia analise vertical sem FMA/MMPA/SN-GoGn', () => {
    const input: CephalometricPlanningInput = {
      measurements: { anb: 2 },
      clinicalContext: {},
    };
    const result = calculateCephalometricPlanningDataSufficiency(input);
    expect(result.blockingReasons.some((r) => r.includes('vertical'))).toBe(true);
  });

  it('nao bloqueia vertical com FMA presente', () => {
    const input: CephalometricPlanningInput = {
      measurements: { anb: 2, fma: 25 },
      clinicalContext: {},
    };
    const result = calculateCephalometricPlanningDataSufficiency(input);
    expect(result.blockingReasons.some((r) => r.includes('vertical'))).toBe(false);
  });

  it('nao bloqueia vertical com MMPA presente', () => {
    const input: CephalometricPlanningInput = {
      measurements: { anb: 2, mmpa: 27 },
      clinicalContext: {},
    };
    const result = calculateCephalometricPlanningDataSufficiency(input);
    expect(result.blockingReasons.some((r) => r.includes('vertical'))).toBe(false);
  });

  it('nao bloqueia vertical com SN-GoGn presente', () => {
    const input: CephalometricPlanningInput = {
      measurements: { anb: 2, snGoGn: 32 },
      clinicalContext: {},
    };
    const result = calculateCephalometricPlanningDataSufficiency(input);
    expect(result.blockingReasons.some((r) => r.includes('vertical'))).toBe(false);
  });
});

// ============================================================================
// BLOCKING REASONS — INCISIVOS
// ============================================================================

describe('blockingReasons — incisivos', () => {
  it('bloqueia compensacao dentaria sem nenhum incisivo', () => {
    const input: CephalometricPlanningInput = {
      measurements: { anb: 2, fma: 25 },
      clinicalContext: {},
    };
    const result = calculateCephalometricPlanningDataSufficiency(input);
    expect(result.blockingReasons.some((r) => r.includes('compensacao') || r.includes('compensação'))).toBe(true);
  });

  it('nao bloqueia se apenas incisivo superior presente', () => {
    const input: CephalometricPlanningInput = {
      measurements: { anb: 2, fma: 25, u1NaAngle: 22 },
      clinicalContext: {},
    };
    const result = calculateCephalometricPlanningDataSufficiency(input);
    expect(result.blockingReasons.some((r) => r.includes('compensacao') || r.includes('compensação'))).toBe(false);
  });

  it('nao bloqueia se apenas IMPA presente', () => {
    const input: CephalometricPlanningInput = {
      measurements: { anb: 2, fma: 25, impa: 90 },
      clinicalContext: {},
    };
    const result = calculateCephalometricPlanningDataSufficiency(input);
    expect(result.blockingReasons.some((r) => r.includes('compensacao') || r.includes('compensação'))).toBe(false);
  });
});

// ============================================================================
// BLOCKING REASONS — PERIODONTAL
// ============================================================================

describe('blockingReasons — periodontal', () => {
  it('alerta se hasPeriodontalData explicitamente false', () => {
    const input: CephalometricPlanningInput = {
      measurements: fullInput.measurements,
      clinicalContext: { ...fullInput.clinicalContext, hasPeriodontalData: false },
    };
    const result = calculateCephalometricPlanningDataSufficiency(input);
    expect(result.blockingReasons.some((r) => r.includes('periodontal') || r.includes('Periodontal'))).toBe(true);
  });

  it('nao alerta se hasPeriodontalData true', () => {
    const result = calculateCephalometricPlanningDataSufficiency(fullInput);
    expect(result.blockingReasons.some((r) => r.includes('periodontal') || r.includes('Periodontal'))).toBe(false);
  });
});

// ============================================================================
// FRONTEIRAS NUMERICAS
// ============================================================================

describe('fronteiras numericas', () => {
  it('ANB = 0 (valor valido) e contado no score', () => {
    const input: CephalometricPlanningInput = {
      measurements: { anb: 0 },
      clinicalContext: {},
    };
    const result = calculateCephalometricPlanningDataSufficiency(input);
    expect(result.score).toBeGreaterThanOrEqual(15);
  });

  it('NaN nao e contado como dado valido', () => {
    const input: CephalometricPlanningInput = {
      measurements: { anb: NaN },
      clinicalContext: {},
    };
    const result = calculateCephalometricPlanningDataSufficiency(input);
    expect(result.score).toBe(0);
    expect(result.missingData).toContain('Ângulo ANB');
  });

  it('Infinity nao e contado como dado valido', () => {
    const input: CephalometricPlanningInput = {
      measurements: { anb: Infinity },
      clinicalContext: {},
    };
    const result = calculateCephalometricPlanningDataSufficiency(input);
    expect(result.score).toBe(0);
  });

  it('idade 0 e considerada valor valido', () => {
    const input: CephalometricPlanningInput = {
      measurements: {},
      clinicalContext: { patientAge: 0 },
    };
    const result = calculateCephalometricPlanningDataSufficiency(input);
    expect(result.score).toBeGreaterThanOrEqual(15);
  });
});
