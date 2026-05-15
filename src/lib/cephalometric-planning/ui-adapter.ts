/**
 * Cephalometric Planning — UI Adapter
 *
 * Camada de adaptacao entre o formato de medidas usado pelo Cephalometry.tsx
 * (chaves MAIUSCULAS com hifens: "SNA", "SN-GoGn", "U1-NA") e o formato
 * camelCase consumido pelo engine deterministico.
 *
 * Esta funcao tambem aceita Wits opcional vindo de um input manual na UI.
 */

import type {
  CephalometricMeasurements,
  CephalometricPlanningInput,
  ClinicalContext,
} from './types';

/**
 * Formato como os measurements chegam do Cephalometry.tsx
 * (Measurements de src/lib/cephalometric-math.ts).
 */
export type RawMeasurements = Record<string, number | undefined>;

/**
 * Contexto clinico vindo da UI (campos do formulario).
 */
export interface UiClinicalContext {
  patientAge?: number;
  patientSex?: 'male' | 'female' | 'other';
  hasPeriodontalData?: boolean;
  hasFacialPhotos?: boolean;
  hasOcclusalExam?: boolean;
  /**
   * Wits opcional digitado manualmente pelo dentista.
   * Quando preenchido, alimenta o cross-check ANB x Wits.
   */
  manualWitsMm?: number;
}

/**
 * Mapeamento das chaves do formato React para o formato engine.
 */
const KEY_MAP: Record<string, keyof CephalometricMeasurements> = {
  SNA: 'sna',
  SNB: 'snb',
  ANB: 'anb',
  'SN-GoGn': 'snGoGn',
  FMA: 'fma',
  MMPA: 'mmpa',
  IMPA: 'impa',
  'U1-NA': 'u1NaAngle',
  'L1-NB': 'l1NbAngle',
  Overjet: 'overjet',
  Overbite: 'overbite',
};

/**
 * Converte um objeto Measurements (chaves UI) em CephalometricMeasurements
 * (chaves engine). Wits e injetado a partir do contexto, nao das medidas.
 */
export function adaptMeasurementsToEngineFormat(
  raw: RawMeasurements,
  manualWits?: number,
): CephalometricMeasurements {
  const result: CephalometricMeasurements = {};

  for (const [uiKey, engineKey] of Object.entries(KEY_MAP)) {
    const value = raw[uiKey];
    if (typeof value === 'number' && Number.isFinite(value)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (result as any)[engineKey] = value;
    }
  }

  if (typeof manualWits === 'number' && Number.isFinite(manualWits)) {
    result.wits = manualWits;
  }

  return result;
}

/**
 * Monta o input completo do engine a partir das medidas brutas e do contexto da UI.
 */
export function buildEngineInput(
  rawMeasurements: RawMeasurements,
  uiContext: UiClinicalContext,
): CephalometricPlanningInput {
  const clinicalContext: ClinicalContext = {
    patientAge: uiContext.patientAge,
    patientSex: uiContext.patientSex,
    hasPeriodontalData: uiContext.hasPeriodontalData,
    hasFacialPhotos: uiContext.hasFacialPhotos,
    hasOcclusalExam: uiContext.hasOcclusalExam,
  };

  return {
    measurements: adaptMeasurementsToEngineFormat(rawMeasurements, uiContext.manualWitsMm),
    clinicalContext,
  };
}

/**
 * Verifica se a analise selecionada contem medidas suficientes para o engine.
 * Steiner e a unica analise que produz SNA/SNB/ANB nativamente.
 *
 * @returns true se ha pelo menos uma medida sagital basica nas chaves brutas
 */
export function hasMinimumMeasurementsForPlanning(raw: RawMeasurements): boolean {
  return (
    typeof raw['ANB'] === 'number' ||
    (typeof raw['SNA'] === 'number' && typeof raw['SNB'] === 'number')
  );
}
