/**
 * Cephalometric Planning Suggestion — Type Definitions
 *
 * Tipos do domínio para a funcionalidade de Sugestão de Planeamento Clínico.
 * Toda a camada determinística (score, motor de regras, filtro de segurança)
 * consome e produz estes tipos.
 *
 * Princípio central: a IA sugere, o profissional valida, o sistema audita.
 */

// ============================================================================
// ENUMS / UNIÕES (espelham o schema Postgres)
// ============================================================================

export type CephPlanningStatus =
  | 'draft_ai_generated'
  | 'clinician_edited'
  | 'clinician_approved'
  | 'rejected'
  | 'requires_more_data';

export type CephPlanningConfidence = 'low' | 'medium' | 'high';

export type CephPlanningAuditEvent =
  | 'generated'
  | 'edited'
  | 'approved'
  | 'rejected'
  | 'exported'
  | 'safety_blocked'
  | 'requested_more_data';

export type DataSufficiencyLevel = 'insufficient' | 'partial' | 'sufficient';

// ============================================================================
// INPUT: medidas cefalométricas + contexto clínico
// ============================================================================

/**
 * Medidas cefalométricas suportadas pelo motor de regras.
 * Todos os campos opcionais — o score de suficiência avalia quais existem.
 *
 * Nomes alinhados com a tabela `cephalometric_analyses` do OdontoVision.
 */
export interface CephalometricMeasurements {
  // Sagitais
  sna?: number;        // ângulo SNA (graus)
  snb?: number;        // ângulo SNB (graus)
  anb?: number;        // ângulo ANB (graus)
  wits?: number;       // Wits appraisal (mm) — opcional, será adicionado em chunk separado

  // Verticais
  snGoGn?: number;     // SN-GoGn (graus)
  fma?: number;        // Frankfort Mandibular Angle (graus)
  mmpa?: number;       // Maxillomandibular Planes Angle (graus)

  // Dentários — incisivos superiores
  u1Na?: number;       // U1-NA distância (mm) ou ângulo
  u1NaAngle?: number;  // U1-NA ângulo (graus)

  // Dentários — incisivos inferiores
  l1Nb?: number;       // L1-NB distância (mm) ou ângulo
  l1NbAngle?: number;  // L1-NB ângulo (graus)
  impa?: number;       // Incisor Mandibular Plane Angle (graus)

  // Oclusão
  overjet?: number;    // sobressaliência (mm)
  overbite?: number;   // sobremordida (mm)
}

/**
 * Contexto clínico do paciente. Influencia o score de suficiência
 * e decisões sobre ortopedia / cirurgia.
 */
export interface ClinicalContext {
  patientAge?: number;          // anos
  patientSex?: 'male' | 'female' | 'other';
  hasPeriodontalData?: boolean; // se há avaliação periodontal disponível
  hasFacialPhotos?: boolean;    // se há fotos faciais para correlação
  hasOcclusalExam?: boolean;    // se há exame oclusal documentado
  growthPotential?: 'likely' | 'unlikely' | 'unknown'; // potencial de crescimento
}

/**
 * Input completo do motor de regras.
 */
export interface CephalometricPlanningInput {
  measurements: CephalometricMeasurements;
  clinicalContext: ClinicalContext;
}

// ============================================================================
// SCORE DE SUFICIÊNCIA DE DADOS
// ============================================================================

export interface DataSufficiencyResult {
  score: number;                    // 0–100
  level: DataSufficiencyLevel;      // insufficient | partial | sufficient
  confidenceLevel: CephPlanningConfidence; // low | medium | high
  missingData: string[];            // lista legível de dados ausentes
  blockingReasons: string[];        // razões que bloqueiam classificações específicas
}

// ============================================================================
// CLASSIFICAÇÕES INTERMEDIÁRIAS (motor de regras)
// ============================================================================

export type SagittalClassification =
  | 'class_i'
  | 'class_ii_tendency'
  | 'class_iii_tendency'
  | 'uncertain'
  | 'blocked_missing_data';

export type VerticalPattern =
  | 'normodivergent'
  | 'hyperdivergent'
  | 'hypodivergent'
  | 'blocked_missing_data';

export type IncisorInclination =
  | 'normal'
  | 'proclined'
  | 'retroclined'
  | 'blocked_missing_data';

export interface CephalometricClassification {
  sagittal: SagittalClassification;
  vertical: VerticalPattern;
  upperIncisors: IncisorInclination;
  lowerIncisors: IncisorInclination;
  anbWitsContradiction: boolean; // bandeira de incerteza diagnóstica
}

// ============================================================================
// OUTPUT: sugestão estruturada
// ============================================================================

/**
 * Sugestão de planeamento clínico gerada pelo motor de regras.
 * Espelha a estrutura da tabela `cephalometric_planning_suggestions`.
 */
export interface CephalometricPlanningSuggestion {
  // Identificadores
  id?: string;                         // gerado no insert
  cephalometricAnalysisId: string;
  userId: string;

  // Estado
  status: CephPlanningStatus;

  // Suficiência
  dataSufficiencyScore: number;
  confidenceLevel: CephPlanningConfidence;
  missingData: string[];
  blockingReasons: string[];

  // Snapshot (auditoria)
  inputMeasurementsSnapshot: CephalometricMeasurements;
  clinicalContextSnapshot: ClinicalContext;

  // Conteúdo estruturado
  summary: string;
  prioritizedProblems: string[];
  therapeuticObjectives: string[];
  treatmentAlternatives: string[];
  alertsAndLimitations: string[];
  patientFriendlyExplanation?: string;

  // Texto formatado
  aiOriginalText: string;
  clinicianEditedText?: string;
  approvedFinalText?: string;
  rejectionReason?: string;

  // Versionamento
  rulesVersion: string;
  templateVersion: string;
  safetyFilterVersion: string;

  // Workflow timestamps
  generatedAt: string;
  editedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;

  // Profissional aprovador
  clinicianUserId?: string;
}

// ============================================================================
// FILTRO DE SEGURANÇA TEXTUAL
// ============================================================================

export interface SafetyValidationResult {
  isSafe: boolean;
  blockedTerms: string[];   // termos críticos encontrados
  warnings: string[];       // alertas não-bloqueantes
  sanitizedText?: string;   // texto após substituições leves (quando aplicável)
}

// ============================================================================
// AUDITORIA
// ============================================================================

export interface CephPlanningAuditEntry {
  id?: string;
  planningSuggestionId: string;
  cephalometricAnalysisId: string;
  userId?: string;

  eventType: CephPlanningAuditEvent;
  eventTimestamp: string;

  inputMeasurementsSnapshot?: CephalometricMeasurements;
  clinicalContextSnapshot?: ClinicalContext;
  missingDataList?: string[];
  dataSufficiencyScore?: number;
  confidenceLevel?: CephPlanningConfidence;

  rulesVersion?: string;
  templateVersion?: string;
  safetyFilterVersion?: string;

  contentBefore?: string;
  contentAfter?: string;

  reason?: string;
  metadata?: Record<string, unknown>;
}
