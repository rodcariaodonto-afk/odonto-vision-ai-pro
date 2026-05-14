/**
 * Testes — Classificadores Clínicos
 *
 * Cobre os 4 classificadores + detecção de contradição + classifyAll.
 * Casos de fronteira específicos para cada norma cefalométrica.
 */

import { describe, it, expect } from 'vitest';
import {
  classifySagittal,
  classifyVertical,
  classifyUpperIncisors,
  classifyLowerIncisors,
  detectAnbWitsContradiction,
  classifyAll,
} from '../classifiers';
import type { CephalometricMeasurements } from '../types';

// ============================================================================
// SAGITAL
// ============================================================================

describe('classifySagittal', () => {
  it('retorna blocked_missing_data sem ANB', () => {
    expect(classifySagittal({})).toBe('blocked_missing_data');
  });

  it('ANB = 2 → Classe I', () => {
    expect(classifySagittal({ anb: 2 })).toBe('class_i');
  });

  it('ANB = 1 → Classe I (limite inferior)', () => {
    expect(classifySagittal({ anb: 1 })).toBe('class_i');
  });

  it('ANB = 0 → Classe III (limite)', () => {
    expect(classifySagittal({ anb: 0 })).toBe('class_iii_tendency');
  });

  it('ANB = -2 → Classe III', () => {
    expect(classifySagittal({ anb: -2 })).toBe('class_iii_tendency');
  });

  it('ANB = 4 → Classe II (limite)', () => {
    expect(classifySagittal({ anb: 4 })).toBe('class_ii_tendency');
  });

  it('ANB = 7 → Classe II', () => {
    expect(classifySagittal({ anb: 7 })).toBe('class_ii_tendency');
  });

  it('ANB = 5 + Wits = 0 → classifica por ANB (Classe II)', () => {
    expect(classifySagittal({ anb: 5, wits: 0 })).toBe('class_ii_tendency');
  });

  it('ANB = 5 + Wits = -3 → uncertain (contradição forte)', () => {
    expect(classifySagittal({ anb: 5, wits: -3 })).toBe('uncertain');
  });

  it('ANB = -2 + Wits = 3 → uncertain (contradição inversa)', () => {
    expect(classifySagittal({ anb: -2, wits: 3 })).toBe('uncertain');
  });

  it('ANB = 5 + Wits = 3 → Classe II (concordante)', () => {
    expect(classifySagittal({ anb: 5, wits: 3 })).toBe('class_ii_tendency');
  });
});

// ============================================================================
// CONTRADIÇÃO ANB × WITS
// ============================================================================

describe('detectAnbWitsContradiction', () => {
  it('sem ANB → false', () => {
    expect(detectAnbWitsContradiction({})).toBe(false);
  });

  it('sem Wits → false', () => {
    expect(detectAnbWitsContradiction({ anb: 5 })).toBe(false);
  });

  it('ANB Classe II + Wits Classe III → true', () => {
    expect(detectAnbWitsContradiction({ anb: 5, wits: -3 })).toBe(true);
  });

  it('ANB Classe III + Wits Classe II → true', () => {
    expect(detectAnbWitsContradiction({ anb: -2, wits: 3 })).toBe(true);
  });

  it('ANB Classe II + Wits Classe I → false', () => {
    expect(detectAnbWitsContradiction({ anb: 5, wits: 0 })).toBe(false);
  });

  it('ambos Classe I → false', () => {
    expect(detectAnbWitsContradiction({ anb: 2, wits: 0 })).toBe(false);
  });
});

// ============================================================================
// VERTICAL
// ============================================================================

describe('classifyVertical', () => {
  it('sem medidas verticais → blocked', () => {
    expect(classifyVertical({})).toBe('blocked_missing_data');
  });

  // FMA tem prioridade
  it('FMA = 25 → normodivergent', () => {
    expect(classifyVertical({ fma: 25 })).toBe('normodivergent');
  });

  it('FMA = 18 → hypodivergent', () => {
    expect(classifyVertical({ fma: 18 })).toBe('hypodivergent');
  });

  it('FMA = 35 → hyperdivergent', () => {
    expect(classifyVertical({ fma: 35 })).toBe('hyperdivergent');
  });

  it('FMA tem prioridade sobre SN-GoGn', () => {
    // FMA normo, SN-GoGn hyper → resultado deve ser normo
    expect(classifyVertical({ fma: 25, snGoGn: 40 })).toBe('normodivergent');
  });

  it('SN-GoGn = 32 → normodivergent (sem FMA)', () => {
    expect(classifyVertical({ snGoGn: 32 })).toBe('normodivergent');
  });

  it('SN-GoGn = 25 → hypodivergent', () => {
    expect(classifyVertical({ snGoGn: 25 })).toBe('hypodivergent');
  });

  it('SN-GoGn = 40 → hyperdivergent', () => {
    expect(classifyVertical({ snGoGn: 40 })).toBe('hyperdivergent');
  });

  it('MMPA = 27 → normodivergent (sem FMA nem SN-GoGn)', () => {
    expect(classifyVertical({ mmpa: 27 })).toBe('normodivergent');
  });

  it('MMPA = 20 → hypodivergent', () => {
    expect(classifyVertical({ mmpa: 20 })).toBe('hypodivergent');
  });

  it('MMPA = 35 → hyperdivergent', () => {
    expect(classifyVertical({ mmpa: 35 })).toBe('hyperdivergent');
  });
});

// ============================================================================
// INCISIVOS SUPERIORES
// ============================================================================

describe('classifyUpperIncisors', () => {
  it('sem U1-NA ângulo → blocked', () => {
    expect(classifyUpperIncisors({})).toBe('blocked_missing_data');
  });

  it('U1-NA = 22° → normal', () => {
    expect(classifyUpperIncisors({ u1NaAngle: 22 })).toBe('normal');
  });

  it('U1-NA = 15° → retroclined', () => {
    expect(classifyUpperIncisors({ u1NaAngle: 15 })).toBe('retroclined');
  });

  it('U1-NA = 30° → proclined', () => {
    expect(classifyUpperIncisors({ u1NaAngle: 30 })).toBe('proclined');
  });

  it('U1-NA = 18° → retroclined (limite)', () => {
    expect(classifyUpperIncisors({ u1NaAngle: 18 })).toBe('retroclined');
  });

  it('U1-NA = 26° → proclined (limite)', () => {
    expect(classifyUpperIncisors({ u1NaAngle: 26 })).toBe('proclined');
  });

  it('U1-NA distância (mm) sem ângulo → blocked', () => {
    // u1Na em mm não substitui o ângulo
    expect(classifyUpperIncisors({ u1Na: 4 })).toBe('blocked_missing_data');
  });
});

// ============================================================================
// INCISIVOS INFERIORES
// ============================================================================

describe('classifyLowerIncisors', () => {
  it('sem L1-NB ângulo nem IMPA → blocked', () => {
    expect(classifyLowerIncisors({})).toBe('blocked_missing_data');
  });

  it('L1-NB ângulo = 25° → normal', () => {
    expect(classifyLowerIncisors({ l1NbAngle: 25 })).toBe('normal');
  });

  it('L1-NB ângulo = 18° → retroclined', () => {
    expect(classifyLowerIncisors({ l1NbAngle: 18 })).toBe('retroclined');
  });

  it('L1-NB ângulo = 32° → proclined', () => {
    expect(classifyLowerIncisors({ l1NbAngle: 32 })).toBe('proclined');
  });

  it('IMPA = 90° → normal (fallback sem L1-NB)', () => {
    expect(classifyLowerIncisors({ impa: 90 })).toBe('normal');
  });

  it('IMPA = 80° → retroclined', () => {
    expect(classifyLowerIncisors({ impa: 80 })).toBe('retroclined');
  });

  it('IMPA = 100° → proclined', () => {
    expect(classifyLowerIncisors({ impa: 100 })).toBe('proclined');
  });

  it('L1-NB tem prioridade sobre IMPA', () => {
    // L1-NB normal, IMPA retroclined → resultado normal
    expect(classifyLowerIncisors({ l1NbAngle: 25, impa: 70 })).toBe('normal');
  });
});

// ============================================================================
// CLASSIFY ALL
// ============================================================================

describe('classifyAll', () => {
  it('dados completos retorna classificação completa', () => {
    const m: CephalometricMeasurements = {
      anb: 2,
      wits: 0.5,
      fma: 25,
      u1NaAngle: 22,
      l1NbAngle: 25,
    };
    const result = classifyAll(m);
    expect(result.sagittal).toBe('class_i');
    expect(result.vertical).toBe('normodivergent');
    expect(result.upperIncisors).toBe('normal');
    expect(result.lowerIncisors).toBe('normal');
    expect(result.anbWitsContradiction).toBe(false);
  });

  it('dados vazios → tudo blocked, sem contradição', () => {
    const result = classifyAll({});
    expect(result.sagittal).toBe('blocked_missing_data');
    expect(result.vertical).toBe('blocked_missing_data');
    expect(result.upperIncisors).toBe('blocked_missing_data');
    expect(result.lowerIncisors).toBe('blocked_missing_data');
    expect(result.anbWitsContradiction).toBe(false);
  });

  it('Classe II hyper com proclinação superior e retroclinação inferior', () => {
    const m: CephalometricMeasurements = {
      anb: 6,
      fma: 32,
      u1NaAngle: 28,
      impa: 82,
    };
    const result = classifyAll(m);
    expect(result.sagittal).toBe('class_ii_tendency');
    expect(result.vertical).toBe('hyperdivergent');
    expect(result.upperIncisors).toBe('proclined');
    expect(result.lowerIncisors).toBe('retroclined');
  });

  it('detecta contradição ANB × Wits no classifyAll', () => {
    const result = classifyAll({ anb: 5, wits: -3 });
    expect(result.sagittal).toBe('uncertain');
    expect(result.anbWitsContradiction).toBe(true);
  });
});
