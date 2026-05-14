/**
 * Testes — Filtro de Segurança Textual
 *
 * Cobre bloqueios, warnings, sanitização e casos benignos.
 * Spec viva: documenta cada termo proibido com um caso de teste.
 */

import { describe, it, expect } from 'vitest';
import {
  validateAndSanitizeSuggestionText,
  assertSafeSuggestionText,
  getBlockedTerms,
  getWarningTerms,
} from '../safety-filter';

// ============================================================================
// CASOS BENIGNOS
// ============================================================================

describe('safety-filter — textos seguros', () => {
  it('texto vazio e seguro', () => {
    const result = validateAndSanitizeSuggestionText('');
    expect(result.isSafe).toBe(true);
    expect(result.blockedTerms).toEqual([]);
  });

  it('texto neutro e seguro', () => {
    const text = 'Considerar avaliar a relacao sagital. Discutir alternativas com o paciente.';
    const result = validateAndSanitizeSuggestionText(text);
    expect(result.isSafe).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it('linguagem prudente nao gera warnings', () => {
    const text =
      'A analise sugere tendencia de Classe II. Considerar discutir alternativas terapeuticas. ' +
      'Esta sugestao requer validacao profissional.';
    const result = validateAndSanitizeSuggestionText(text);
    expect(result.isSafe).toBe(true);
    expect(result.warnings).toEqual([]);
  });
});

// ============================================================================
// BLOQUEIOS — PROMESSAS E GARANTIAS
// ============================================================================

describe('safety-filter — termos bloqueados (promessas)', () => {
  it('bloqueia "garantido"', () => {
    const result = validateAndSanitizeSuggestionText('Resultado garantido para todos.');
    expect(result.isSafe).toBe(false);
    expect(result.blockedTerms).toContain('garantido');
  });

  it('bloqueia "100% de sucesso"', () => {
    const result = validateAndSanitizeSuggestionText('Tratamento com 100% de sucesso.');
    expect(result.isSafe).toBe(false);
    expect(result.blockedTerms).toContain('100% de sucesso');
  });

  it('bloqueia "sem riscos"', () => {
    const result = validateAndSanitizeSuggestionText('Procedimento sem riscos.');
    expect(result.isSafe).toBe(false);
    expect(result.blockedTerms).toContain('sem riscos');
  });

  it('bloqueia "cura definitiva"', () => {
    const result = validateAndSanitizeSuggestionText('A cura definitiva e possivel.');
    expect(result.isSafe).toBe(false);
    expect(result.blockedTerms).toContain('cura definitiva');
  });

  it('bloqueia "totalmente seguro"', () => {
    const result = validateAndSanitizeSuggestionText('Tratamento totalmente seguro.');
    expect(result.isSafe).toBe(false);
    expect(result.blockedTerms).toContain('totalmente seguro');
  });
});

// ============================================================================
// BLOQUEIOS — CERTEZAS ABSOLUTAS
// ============================================================================

describe('safety-filter — termos bloqueados (certezas)', () => {
  it('bloqueia "certeza absoluta"', () => {
    const result = validateAndSanitizeSuggestionText('Diagnostico com certeza absoluta.');
    expect(result.isSafe).toBe(false);
    expect(result.blockedTerms).toContain('certeza absoluta');
  });

  it('bloqueia "definitivamente"', () => {
    const result = validateAndSanitizeSuggestionText('Definitivamente uma Classe II.');
    expect(result.isSafe).toBe(false);
    expect(result.blockedTerms).toContain('definitivamente');
  });

  it('bloqueia "com certeza"', () => {
    const result = validateAndSanitizeSuggestionText('Trata-se com certeza de retroclinacao.');
    expect(result.isSafe).toBe(false);
    expect(result.blockedTerms).toContain('com certeza');
  });

  it('bloqueia "jamais"', () => {
    const result = validateAndSanitizeSuggestionText('Jamais ocorrera reabsorcao.');
    expect(result.isSafe).toBe(false);
    expect(result.blockedTerms).toContain('jamais');
  });
});

// ============================================================================
// BLOQUEIOS — PRESCRIÇÕES ABSOLUTAS
// ============================================================================

describe('safety-filter — termos bloqueados (prescricoes)', () => {
  it('bloqueia "voce deve fazer"', () => {
    const result = validateAndSanitizeSuggestionText('Voce deve fazer cirurgia ja.');
    expect(result.isSafe).toBe(false);
    expect(result.blockedTerms).toContain('você deve fazer');
  });

  it('bloqueia "e obrigatorio"', () => {
    const result = validateAndSanitizeSuggestionText('A extracao é obrigatório.');
    expect(result.isSafe).toBe(false);
    expect(result.blockedTerms).toContain('é obrigatório');
  });

  it('bloqueia "milagre"', () => {
    const result = validateAndSanitizeSuggestionText('O tratamento e um milagre.');
    expect(result.isSafe).toBe(false);
    expect(result.blockedTerms).toContain('milagre');
  });
});

// ============================================================================
// WARNINGS — TERMOS DE ALERTA
// ============================================================================

describe('safety-filter — warnings (nao bloqueiam)', () => {
  it('gera warning para "prescrevo"', () => {
    const result = validateAndSanitizeSuggestionText('Prescrevo aparelho fixo.');
    expect(result.isSafe).toBe(true);
    expect(result.warnings).toContain('prescrevo');
  });

  it('gera warning para "indico"', () => {
    const result = validateAndSanitizeSuggestionText('Indico cirurgia ortognatica.');
    expect(result.isSafe).toBe(true);
    expect(result.warnings).toContain('indico');
  });

  it('gera warning para "recomendo fortemente"', () => {
    const result = validateAndSanitizeSuggestionText('Recomendo fortemente extracao.');
    expect(result.isSafe).toBe(true);
    expect(result.warnings).toContain('recomendo fortemente');
  });

  it('gera warning para "paciente precisa"', () => {
    const result = validateAndSanitizeSuggestionText('O paciente precisa de cirurgia.');
    expect(result.isSafe).toBe(true);
    expect(result.warnings).toContain('paciente precisa');
  });

  it('gera warning para "cirurgia obrigatoria"', () => {
    const result = validateAndSanitizeSuggestionText('Cirurgia obrigatória neste caso.');
    expect(result.isSafe).toBe(true);
    expect(result.warnings).toContain('cirurgia obrigatória');
  });
});

// ============================================================================
// MULTIPLOS TERMOS
// ============================================================================

describe('safety-filter — multiplos termos', () => {
  it('detecta multiplos bloqueados em sequencia', () => {
    const text = 'Resultado garantido e sem riscos, com 100% de sucesso.';
    const result = validateAndSanitizeSuggestionText(text);
    expect(result.isSafe).toBe(false);
    expect(result.blockedTerms.length).toBeGreaterThanOrEqual(3);
    expect(result.blockedTerms).toContain('garantido');
    expect(result.blockedTerms).toContain('sem riscos');
    expect(result.blockedTerms).toContain('100% de sucesso');
  });

  it('detecta bloqueado + warning no mesmo texto', () => {
    const text = 'Prescrevo cirurgia com 100% de sucesso.';
    const result = validateAndSanitizeSuggestionText(text);
    expect(result.isSafe).toBe(false);
    expect(result.blockedTerms).toContain('100% de sucesso');
    expect(result.warnings).toContain('prescrevo');
  });
});

// ============================================================================
// CASE-INSENSITIVE
// ============================================================================

describe('safety-filter — case insensitive', () => {
  it('detecta termo em maiusculas', () => {
    const result = validateAndSanitizeSuggestionText('RESULTADO GARANTIDO!');
    expect(result.isSafe).toBe(false);
    expect(result.blockedTerms).toContain('garantido');
  });

  it('detecta termo com mistura de casos', () => {
    const result = validateAndSanitizeSuggestionText('Cura DEFINITIVA do problema.');
    expect(result.isSafe).toBe(false);
    expect(result.blockedTerms).toContain('cura definitiva');
  });
});

// ============================================================================
// SANITIZAÇÃO
// ============================================================================

describe('safety-filter — sanitizacao opcional', () => {
  it('sem opt-in, sanitizedText e undefined', () => {
    const result = validateAndSanitizeSuggestionText('é indicado fazer cirurgia.');
    expect(result.sanitizedText).toBeUndefined();
  });

  it('com sanitize:true, reescreve "é indicado" para "pode ser considerado"', () => {
    const result = validateAndSanitizeSuggestionText(
      'É indicado fazer cirurgia.',
      { sanitize: true },
    );
    expect(result.sanitizedText).toBeDefined();
    expect(result.sanitizedText?.toLowerCase()).toContain('pode ser considerado');
    expect(result.sanitizedText?.toLowerCase()).not.toContain('é indicado');
  });

  it('com sanitize:true, reescreve "prescrevo" para "sugiro avaliar"', () => {
    const result = validateAndSanitizeSuggestionText(
      'Prescrevo aparelho ortodontico.',
      { sanitize: true },
    );
    expect(result.sanitizedText?.toLowerCase()).toContain('sugiro avaliar');
  });

  it('com sanitize:true, reescreve "indico" para "sugiro considerar"', () => {
    const result = validateAndSanitizeSuggestionText(
      'Indico extracao.',
      { sanitize: true },
    );
    expect(result.sanitizedText?.toLowerCase()).toContain('sugiro considerar');
  });

  it('sanitizacao nao afeta isSafe', () => {
    const result = validateAndSanitizeSuggestionText(
      'É indicado fazer cirurgia.',
      { sanitize: true },
    );
    // "indicado" sozinho nao e bloqueado, mas "indico" e warning
    // "é indicado" e sanitizado mas nao bloqueia
    expect(result.isSafe).toBe(true);
  });
});

// ============================================================================
// ASSERT MODE
// ============================================================================

describe('assertSafeSuggestionText', () => {
  it('nao lanca para texto seguro', () => {
    expect(() => assertSafeSuggestionText('Considerar avaliar a relacao.')).not.toThrow();
  });

  it('lanca para texto com termo bloqueado', () => {
    expect(() =>
      assertSafeSuggestionText('Tratamento com 100% de sucesso garantido.'),
    ).toThrow(/seguranca/i);
  });

  it('mensagem de erro lista os termos bloqueados', () => {
    try {
      assertSafeSuggestionText('Sem riscos e garantido.');
    } catch (err) {
      const message = (err as Error).message;
      expect(message).toContain('garantido');
      expect(message).toContain('sem riscos');
    }
  });
});

// ============================================================================
// METADADOS DOS TERMOS
// ============================================================================

describe('safety-filter — metadados', () => {
  it('getBlockedTerms retorna lista nao-vazia', () => {
    expect(getBlockedTerms().length).toBeGreaterThan(10);
  });

  it('getWarningTerms retorna lista nao-vazia', () => {
    expect(getWarningTerms().length).toBeGreaterThan(0);
  });

  it('listas sao readonly (referenciadas)', () => {
    const blocked = getBlockedTerms();
    expect(blocked).toContain('garantido');
    expect(blocked).toContain('milagre');
  });
});

// ============================================================================
// VALIDACAO SOBRE OUTPUT DA ENGINE
// ============================================================================

describe('safety-filter — validacao do output da engine', () => {
  it('output prudente do engine passa o filtro', () => {
    // Texto representativo do que a engine produz
    const engineOutput =
      '=== RESUMO ===\n' +
      'Analise cefalometrica compativel com tendencia esqueletica de Classe II e padrao vertical normodivergente. ' +
      'AVISO: Esta e uma sugestao de apoio a decisao clinica gerada automaticamente. NAO substitui o julgamento profissional. ' +
      'Requer validacao por dentista habilitado antes de qualquer aplicacao clinica.\n\n' +
      '=== ACHADOS PRIORIZADOS ===\n' +
      '1. Tendencia esqueletica de Classe II identificada.\n' +
      '=== OBJETIVOS TERAPEUTICOS A CONSIDERAR ===\n' +
      '1. Considerar avaliar compensacao ortodontica.\n' +
      '2. Preservar funcao oclusal.\n' +
      '=== ALTERNATIVAS A DISCUTIR ===\n' +
      '1. Avaliacao para tratamento ortodontico-cirurgico.\n' +
      '2. Discutir todas as opcoes com o paciente.';

    const result = validateAndSanitizeSuggestionText(engineOutput);
    expect(result.isSafe).toBe(true);
    expect(result.warnings).toEqual([]);
  });
});
