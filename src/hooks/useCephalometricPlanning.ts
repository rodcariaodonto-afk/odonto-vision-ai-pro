/**
 * useCephalometricPlanning — Hook React
 *
 * Orquestra a geracao de uma sugestao de planeamento cefalometrico:
 * 1. Roda o engine deterministico no client
 * 2. Re-valida com filtro de seguranca local
 * 3. Envia para a Edge Function generate-ceph-planning (re-validacao server-side)
 * 4. Recebe a sugestao persistida com id do banco
 *
 * Tambem expoe operacoes de UPDATE (editar / aprovar / rejeitar) sobre sugestoes
 * ja persistidas. As gravacoes vao via supabase-js direto (RLS protege).
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  generateCephalometricPlanningSuggestion,
  validateAndSanitizeSuggestionText,
  buildEngineInput,
  type UiClinicalContext,
  type RawMeasurements,
  type CephalometricPlanningSuggestion,
} from '@/lib/cephalometric-planning';

// ============================================================================
// TIPOS
// ============================================================================

export interface PlanningGenerationParams {
  cephalometricAnalysisId: string;
  userId: string;
  measurements: RawMeasurements;
  clinicalContext: UiClinicalContext;
}

export interface PlanningGenerationResult {
  success: boolean;
  suggestion?: CephalometricPlanningSuggestion;
  persistedRow?: Record<string, unknown>;
  error?: string;
  blockedTerms?: string[];
}

export interface PlanningSummary {
  id: string;
  status: string;
  data_sufficiency_score: number;
  confidence_level: 'low' | 'medium' | 'high';
  summary: string;
  generated_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
}

interface UpdateOptions {
  planningSuggestionId: string;
  userId: string;
  summary: string;
  prioritizedProblems: string[];
  therapeuticObjectives: string[];
  treatmentAlternatives: string[];
  alertsAndLimitations: string[];
  patientFriendlyExplanation: string;
}

// ============================================================================
// HOOK
// ============================================================================

export function useCephalometricPlanning() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastSuggestion, setLastSuggestion] = useState<CephalometricPlanningSuggestion | null>(null);

  // -------------------------------------------------------------------------
  // GERAR
  // -------------------------------------------------------------------------
  const generate = useCallback(
    async (params: PlanningGenerationParams): Promise<PlanningGenerationResult> => {
      setIsGenerating(true);
      try {
        // 1. Monta input do engine
        const input = buildEngineInput(params.measurements, params.clinicalContext);

        // 2. Roda engine deterministico
        const suggestion = generateCephalometricPlanningSuggestion({
          input,
          cephalometricAnalysisId: params.cephalometricAnalysisId,
          userId: params.userId,
        });

        // 3. Re-valida filtro de seguranca local (espelha o server)
        const safety = validateAndSanitizeSuggestionText(suggestion.aiOriginalText);
        if (!safety.isSafe) {
          return {
            success: false,
            error: 'O texto gerado foi bloqueado pelo filtro de seguranca local.',
            blockedTerms: safety.blockedTerms,
          };
        }

        // 4. Envia para a Edge Function (que re-valida e persiste)
        const { data, error } = await supabase.functions.invoke(
          'generate-ceph-planning',
          {
            body: {
              cephalometric_analysis_id: params.cephalometricAnalysisId,
              suggestion,
            },
          },
        );

        if (error) {
          return {
            success: false,
            error: `Erro na Edge Function: ${error.message}`,
          };
        }

        const response = data as {
          success?: boolean;
          planning_suggestion_id?: string;
          suggestion?: Record<string, unknown>;
          error?: string;
          blockedTerms?: string[];
        };

        if (!response.success) {
          return {
            success: false,
            error: response.error ?? 'Falha desconhecida na geracao',
            blockedTerms: response.blockedTerms,
          };
        }

        // 5. Sucesso
        setLastSuggestion(suggestion);
        return {
          success: true,
          suggestion,
          persistedRow: response.suggestion,
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Erro desconhecido',
        };
      } finally {
        setIsGenerating(false);
      }
    },
    [],
  );

  // -------------------------------------------------------------------------
  // EDITAR
  // -------------------------------------------------------------------------
  const updateText = useCallback(
    async (opts: UpdateOptions): Promise<{ success: boolean; error?: string }> => {
      setIsUpdating(true);
      try {
        // Valida cada campo com o filtro de seguranca (concatenado)
        const allText = [
          opts.summary,
          ...opts.prioritizedProblems,
          ...opts.therapeuticObjectives,
          ...opts.treatmentAlternatives,
          ...opts.alertsAndLimitations,
          opts.patientFriendlyExplanation,
        ].join('\n');

        const safety = validateAndSanitizeSuggestionText(allText);
        if (!safety.isSafe) {
          return {
            success: false,
            error: `Texto bloqueado: ${safety.blockedTerms.join(', ')}`,
          };
        }

        // Recompoe o texto consolidado (clinician_edited_text)
        const consolidatedText = [
          '=== RESUMO ===',
          opts.summary,
          '',
          '=== ACHADOS PRIORIZADOS ===',
          ...opts.prioritizedProblems.map((p, i) => `${i + 1}. ${p}`),
          '',
          '=== OBJETIVOS TERAPEUTICOS A CONSIDERAR ===',
          ...opts.therapeuticObjectives.map((o, i) => `${i + 1}. ${o}`),
          '',
          '=== ALTERNATIVAS A DISCUTIR ===',
          ...opts.treatmentAlternatives.map((a, i) => `${i + 1}. ${a}`),
          '',
          '=== ALERTAS E LIMITACOES ===',
          ...opts.alertsAndLimitations.map((a, i) => `${i + 1}. ${a}`),
          '',
          '=== EXPLICACAO AMIGAVEL AO PACIENTE ===',
          opts.patientFriendlyExplanation,
        ].join('\n');

        // Busca o cephalometric_analysis_id para o audit_log
        const { data: existing } = await supabase
          .from('cephalometric_planning_suggestions')
          .select('cephalometric_analysis_id')
          .eq('id', opts.planningSuggestionId)
          .maybeSingle();

        const { error } = await supabase
          .from('cephalometric_planning_suggestions')
          .update({
            summary: opts.summary,
            prioritized_problems: opts.prioritizedProblems,
            therapeutic_objectives: opts.therapeuticObjectives,
            treatment_alternatives: opts.treatmentAlternatives,
            alerts_and_limitations: opts.alertsAndLimitations,
            patient_friendly_explanation: opts.patientFriendlyExplanation,
            clinician_edited_text: consolidatedText,
            status: 'clinician_edited',
            edited_at: new Date().toISOString(),
          })
          .eq('id', opts.planningSuggestionId);

        if (error) {
          return { success: false, error: error.message };
        }

        // Registra evento de auditoria (best-effort)
        if (existing?.cephalometric_analysis_id) {
          await supabase.from('cephalometric_planning_audit_log').insert({
            planning_suggestion_id: opts.planningSuggestionId,
            cephalometric_analysis_id: existing.cephalometric_analysis_id,
            user_id: opts.userId,
            event_type: 'edited',
            content_after: consolidatedText,
          });
        }

        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Erro desconhecido',
        };
      } finally {
        setIsUpdating(false);
      }
    },
    [],
  );

  // -------------------------------------------------------------------------
  // APROVAR
  // -------------------------------------------------------------------------
  const approve = useCallback(
    async (planningSuggestionId: string, userId: string, finalText: string) => {
      setIsUpdating(true);
      try {
        const safety = validateAndSanitizeSuggestionText(finalText);
        if (!safety.isSafe) {
          return {
            success: false,
            error: `Texto bloqueado: ${safety.blockedTerms.join(', ')}`,
          };
        }

        const now = new Date().toISOString();
        const { error } = await supabase
          .from('cephalometric_planning_suggestions')
          .update({
            approved_final_text: finalText,
            status: 'clinician_approved',
            approved_at: now,
            clinician_user_id: userId,
          })
          .eq('id', planningSuggestionId);

        if (error) return { success: false, error: error.message };

        await supabase.from('cephalometric_planning_audit_log').insert({
          planning_suggestion_id: planningSuggestionId,
          cephalometric_analysis_id: '',
          user_id: userId,
          event_type: 'approved',
          content_after: finalText,
        });

        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Erro desconhecido',
        };
      } finally {
        setIsUpdating(false);
      }
    },
    [],
  );

  // -------------------------------------------------------------------------
  // REJEITAR
  // -------------------------------------------------------------------------
  const reject = useCallback(
    async (planningSuggestionId: string, userId: string, reason: string) => {
      setIsUpdating(true);
      try {
        const now = new Date().toISOString();
        const { error } = await supabase
          .from('cephalometric_planning_suggestions')
          .update({
            status: 'rejected',
            rejection_reason: reason,
            rejected_at: now,
            clinician_user_id: userId,
          })
          .eq('id', planningSuggestionId);

        if (error) return { success: false, error: error.message };

        await supabase.from('cephalometric_planning_audit_log').insert({
          planning_suggestion_id: planningSuggestionId,
          cephalometric_analysis_id: '',
          user_id: userId,
          event_type: 'rejected',
          reason,
        });

        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Erro desconhecido',
        };
      } finally {
        setIsUpdating(false);
      }
    },
    [],
  );

  // -------------------------------------------------------------------------
  // LISTAR SUGESTOES DE UMA ANALISE
  // -------------------------------------------------------------------------
  const listSuggestions = useCallback(
    async (cephalometricAnalysisId: string): Promise<PlanningSummary[]> => {
      const { data, error } = await supabase
        .from('cephalometric_planning_suggestions')
        .select('id, status, data_sufficiency_score, confidence_level, summary, generated_at, approved_at, rejected_at, rejection_reason')
        .eq('cephalometric_analysis_id', cephalometricAnalysisId)
        .order('generated_at', { ascending: false });

      if (error) {
        console.error('[useCephalometricPlanning] listSuggestions error:', error.message);
        return [];
      }
      return (data ?? []) as PlanningSummary[];
    },
    [],
  );

  // -------------------------------------------------------------------------
  // BUSCAR UMA SUGESTAO COMPLETA POR ID
  // -------------------------------------------------------------------------
  const fetchSuggestion = useCallback(
    async (id: string): Promise<CephalometricPlanningSuggestion | null> => {
      const { data, error } = await supabase
        .from('cephalometric_planning_suggestions')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) {
        console.error('[useCephalometricPlanning] fetchSuggestion error:', error?.message);
        return null;
      }

      // Mapeia snake_case -> camelCase
      return {
        id: data.id,
        cephalometricAnalysisId: data.cephalometric_analysis_id,
        userId: data.user_id,
        status: data.status,
        dataSufficiencyScore: data.data_sufficiency_score,
        confidenceLevel: data.confidence_level,
        missingData: data.missing_data ?? [],
        blockingReasons: data.blocking_reasons ?? [],
        inputMeasurementsSnapshot: data.input_measurements_snapshot ?? {},
        clinicalContextSnapshot: data.clinical_context_snapshot ?? {},
        summary: data.summary,
        prioritizedProblems: data.prioritized_problems ?? [],
        therapeuticObjectives: data.therapeutic_objectives ?? [],
        treatmentAlternatives: data.treatment_alternatives ?? [],
        alertsAndLimitations: data.alerts_and_limitations ?? [],
        patientFriendlyExplanation: data.patient_friendly_explanation ?? undefined,
        aiOriginalText: data.ai_original_text,
        clinicianEditedText: data.clinician_edited_text ?? undefined,
        approvedFinalText: data.approved_final_text ?? undefined,
        rejectionReason: data.rejection_reason ?? undefined,
        rulesVersion: data.rules_version,
        templateVersion: data.template_version,
        safetyFilterVersion: data.safety_filter_version,
        generatedAt: data.generated_at,
        editedAt: data.edited_at ?? undefined,
        approvedAt: data.approved_at ?? undefined,
        rejectedAt: data.rejected_at ?? undefined,
        clinicianUserId: data.clinician_user_id ?? undefined,
      };
    },
    [],
  );

  return {
    isGenerating,
    isUpdating,
    lastSuggestion,
    generate,
    updateText,
    approve,
    reject,
    listSuggestions,
    fetchSuggestion,
  };
}
