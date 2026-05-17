/**
 * Cephalometric Planning — Versionamento
 *
 * Cada componente da pipeline (regras, template, filtro) tem um número
 * de versão semântico que é gravado em cada sugestão gerada e em cada
 * evento de auditoria. Isso permite reproduzir posteriormente exatamente
 * qual lógica foi aplicada em qualquer geração histórica.
 *
 * REGRA: ao alterar a lógica de qualquer módulo, INCREMENTAR a versão
 * correspondente aqui ANTES de fazer deploy. Nunca alterar regras sem
 * subir o número de versão — quebra auditabilidade médico-legal.
 */

/**
 * Motor de regras clínicas determinístico.
 * Bump quando: limiares clínicos mudam, novas regras adicionadas,
 * comportamento de classificação muda.
 */
export const CEPH_PLANNING_RULES_VERSION = 'ceph_rules_v1.1.1';

/**
 * Template de saída textual (estrutura do laudo de sugestão).
 * Bump quando: estrutura de seções muda, redação dos avisos é alterada.
 */
export const CEPH_PLANNING_TEMPLATE_VERSION = 'planning_template_v1.0.0';

/**
 * Filtro de segurança textual (lista de termos bloqueados).
 * Bump quando: novos termos adicionados, regras de detecção alteradas.
 */
export const CEPH_PLANNING_SAFETY_FILTER_VERSION = 'safety_filter_v1.0.0';
