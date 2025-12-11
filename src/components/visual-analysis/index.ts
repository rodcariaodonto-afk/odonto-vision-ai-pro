export { VisualAnalysis } from "./VisualAnalysis";
export { MarcacaoTooltip } from "./MarcacaoTooltip";
export { Odontograma } from "./Odontograma";
export { OdontogramaInterativo, tipoMarcacaoConfig } from "./OdontogramaInterativo";
export { RadiografiaInterativa } from "./RadiografiaInterativa";
export { SvgLegend } from "./SvgLegend";
export { DrawingCanvas } from "./DrawingCanvas";
export { calculateLabelPositions, findMarcacaoByDente } from "./labelCollision";
export { 
  correctAnalysisCoordinates, 
  correctToothCoordinates, 
  TYPICAL_TOOTH_COORDINATES,
  getToothInfo 
} from "./toothCoordinates";
export type { Marcacao, AnaliseVisualCompleta, AnaliseVisualSimplificada } from "./VisualAnalysis";
export type { TipoMarcacao, MarcacaoManual } from "./OdontogramaInterativo";
