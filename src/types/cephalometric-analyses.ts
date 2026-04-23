/**
 * Definitions for the 6 supported cephalometric analyses:
 * Steiner, Jarabak, McNamara, Ricketts, Tweed, Downs.
 */

export type AnalysisType =
  | "steiner"
  | "jarabak"
  | "mcnamara"
  | "ricketts"
  | "tweed"
  | "downs";

export interface CephalometricMeasure {
  /** Unique key, used as object key in measurements record */
  key: string;
  /** Display name */
  name: string;
  unit: "°" | "mm" | "%" | "";
  /** Lower bound of normal range (inclusive) */
  min: number;
  /** Reference / mean value (display only) */
  normal: number | string;
  /** Upper bound of normal range (inclusive) */
  max: number;
  /** Short clinical description */
  description: string;
}

export interface CephalometricLine {
  /** Display name of the reference line (ex: "SN", "NA", "FH") */
  name: string;
  /** Landmark name for first endpoint */
  point1: string;
  /** Landmark name for second endpoint */
  point2: string;
  /** Stroke color (hex) */
  color: string;
  /** Optional measure key associated with this line (for label) */
  measureKey?: string;
}

export interface CephalometricAnalysisDefinition {
  id: AnalysisType;
  name: string;
  author: string;
  year: number;
  shortDescription: string;
  description: string;
  measures: CephalometricMeasure[];
  lines: CephalometricLine[];
}

/* ────────────────────────────────────────────────────────────── */
/* STEINER (1953)                                                 */
/* ────────────────────────────────────────────────────────────── */
export const STEINER_ANALYSIS: CephalometricAnalysisDefinition = {
  id: "steiner",
  name: "Steiner",
  author: "Cecil C. Steiner",
  year: 1953,
  shortDescription: "Análise angular sagital baseada na linha SN.",
  description:
    "Avalia relações esqueléticas e dentárias usando a base craniana anterior (SN) como referência. Padrão-ouro para diagnóstico de Classe I/II/III.",
  measures: [
    { key: "SNA",       name: "SNA",       unit: "°", min: 79, normal: 82, max: 85, description: "Posição ântero-posterior da maxila" },
    { key: "SNB",       name: "SNB",       unit: "°", min: 77, normal: 80, max: 83, description: "Posição ântero-posterior da mandíbula" },
    { key: "ANB",       name: "ANB",       unit: "°", min: 0,  normal: 2,  max: 5,  description: "Relação maxilomandibular (Classe esquelética)" },
    { key: "SN-GoGn",   name: "SN-GoGn",   unit: "°", min: 26, normal: 32, max: 38, description: "Padrão de crescimento vertical" },
    { key: "FMA",       name: "FMA",       unit: "°", min: 20, normal: 25, max: 30, description: "Plano mandibular vs Frankfurt" },
    { key: "IMPA",      name: "IMPA",      unit: "°", min: 85, normal: 90, max: 95, description: "Inclinação do incisivo inferior" },
    { key: "U1-NA",     name: "U1-NA",     unit: "°", min: 18, normal: 22, max: 26, description: "Inclinação do incisivo superior" },
    { key: "L1-NB",     name: "L1-NB",     unit: "°", min: 21, normal: 25, max: 29, description: "Inclinação do incisivo inferior (NB)" },
  ],
  lines: [
    { name: "SN",   point1: "Sella turcica",         point2: "Nasion",                color: "#3B82F6" },
    { name: "NA",   point1: "Nasion",                point2: "Subspinale (Point A)",  color: "#22C55E", measureKey: "SNA" },
    { name: "NB",   point1: "Nasion",                point2: "Supramentale (Point B)",color: "#F59E0B", measureKey: "SNB" },
    { name: "GoGn", point1: "Gonion",                point2: "Gnathion",              color: "#EC4899", measureKey: "SN-GoGn" },
  ],
};

/* ────────────────────────────────────────────────────────────── */
/* JARABAK (1972)                                                 */
/* ────────────────────────────────────────────────────────────── */
export const JARABAK_ANALYSIS: CephalometricAnalysisDefinition = {
  id: "jarabak",
  name: "Jarabak",
  author: "Joseph R. Jarabak",
  year: 1972,
  shortDescription: "Análise vertical e direção do crescimento facial.",
  description:
    "Avalia proporções faciais verticais (LAFH/TAFH) e prediz a direção do crescimento (horária, anti-horária ou neutra).",
  measures: [
    { key: "SellaAngle",   name: "Ângulo Sela (NSAr)",     unit: "°", min: 117, normal: 123, max: 130, description: "Sela-Nasion-Articular" },
    { key: "ArticularAngle", name: "Ângulo Articular (SArGo)", unit: "°", min: 138, normal: 143, max: 153, description: "Sela-Articular-Gônio" },
    { key: "GonialAngle",  name: "Ângulo Goníaco (ArGoMe)",unit: "°", min: 117, normal: 130, max: 140, description: "Articular-Gônio-Mento" },
    { key: "PosteriorFH",  name: "AFP (S-Go)",             unit: "mm",min: 70,  normal: 80,  max: 85,  description: "Altura facial posterior" },
    { key: "AnteriorFH",   name: "AFA (N-Me)",             unit: "mm",min: 110, normal: 120, max: 130, description: "Altura facial anterior" },
    { key: "JarabakRatio", name: "Razão Jarabak (AFP/AFA)",unit: "%", min: 62,  normal: 65,  max: 80,  description: "Direção do crescimento (>65% horário)" },
  ],
  lines: [
    { name: "S-N",  point1: "Sella turcica", point2: "Nasion",     color: "#3B82F6" },
    { name: "S-Ar", point1: "Sella turcica", point2: "Articulare", color: "#8B5CF6" },
    { name: "Ar-Go",point1: "Articulare",    point2: "Gonion",     color: "#EC4899" },
    { name: "Go-Me",point1: "Gonion",        point2: "Menton",     color: "#F59E0B" },
    { name: "N-Me", point1: "Nasion",        point2: "Menton",     color: "#22C55E", measureKey: "AnteriorFH" },
    { name: "S-Go", point1: "Sella turcica", point2: "Gonion",     color: "#14B8A6", measureKey: "PosteriorFH" },
  ],
};

/* ────────────────────────────────────────────────────────────── */
/* McNAMARA (1984)                                                */
/* ────────────────────────────────────────────────────────────── */
export const MCNAMARA_ANALYSIS: CephalometricAnalysisDefinition = {
  id: "mcnamara",
  name: "McNamara",
  author: "James A. McNamara Jr.",
  year: 1984,
  shortDescription: "Análise linear baseada na perpendicular de Násio.",
  description:
    "Avalia o tamanho efetivo da maxila e mandíbula (Co-A, Co-Gn) e suas posições em relação à perpendicular de Násio (Plano de Frankfurt).",
  measures: [
    { key: "Co-A",     name: "Co-A (Comp. Maxila Eficaz)", unit: "mm", min: 85,  normal: 91,  max: 97,  description: "Comprimento efetivo da maxila" },
    { key: "Co-Gn",    name: "Co-Gn (Comp. Mandíbula)",    unit: "mm", min: 105, normal: 120, max: 130, description: "Comprimento efetivo da mandíbula" },
    { key: "MaxMand",  name: "Diferencial Maxilo-Mand.",   unit: "mm", min: 20,  normal: 25,  max: 35,  description: "Co-Gn − Co-A" },
    { key: "A-Nperp",  name: "A à perpendicular de N",     unit: "mm", min: -1,  normal: 1,   max: 3,   description: "Posição sagital da maxila" },
    { key: "Pog-Nperp",name: "Pog à perpendicular de N",   unit: "mm", min: -4,  normal: -2,  max: 2,   description: "Posição sagital da mandíbula" },
    { key: "LAFH",     name: "ALFI (ENA-Me)",              unit: "mm", min: 60,  normal: 67,  max: 75,  description: "Altura facial inferior" },
  ],
  lines: [
    { name: "Co-A",   point1: "Articulare",       point2: "Subspinale (Point A)",   color: "#3B82F6", measureKey: "Co-A" },
    { name: "Co-Gn",  point1: "Articulare",       point2: "Gnathion",               color: "#22C55E", measureKey: "Co-Gn" },
    { name: "FH",     point1: "Porion",           point2: "Orbitale",               color: "#8B5CF6" },
    { name: "ENA-Me", point1: "Anterior Nasal Spine", point2: "Menton",             color: "#F59E0B", measureKey: "LAFH" },
  ],
};

/* ────────────────────────────────────────────────────────────── */
/* RICKETTS (1961)                                                */
/* ────────────────────────────────────────────────────────────── */
export const RICKETTS_ANALYSIS: CephalometricAnalysisDefinition = {
  id: "ricketts",
  name: "Ricketts",
  author: "Robert M. Ricketts",
  year: 1961,
  shortDescription: "Análise multifatorial com eixo facial e plano estético.",
  description:
    "Análise abrangente que utiliza eixo facial, profundidade facial, plano mandibular e linha estética (E-line) para avaliação esquelética e estética.",
  measures: [
    { key: "FacialAxis",   name: "Eixo Facial",         unit: "°", min: 87,  normal: 90,  max: 93,  description: "Direção do crescimento mandibular" },
    { key: "FacialDepth",  name: "Profundidade Facial", unit: "°", min: 84,  normal: 87,  max: 90,  description: "Posição A-P da mandíbula" },
    { key: "MandPlane",    name: "Plano Mandibular",    unit: "°", min: 21,  normal: 26,  max: 31,  description: "Inclinação do plano mandibular" },
    { key: "LowerFaceH",   name: "Altura Facial Inf.",  unit: "°", min: 42,  normal: 47,  max: 52,  description: "ENA-Xi-Pm" },
    { key: "ConvFacial",   name: "Convexidade Facial",  unit: "mm",min: 0,   normal: 2,   max: 4,   description: "Distância A ao plano N-Pog" },
    { key: "L1-Eplane",    name: "Lábio Inf. à E-line", unit: "mm",min: -4,  normal: -2,  max: 0,   description: "Linha estética de Ricketts" },
  ],
  lines: [
    { name: "N-Ba",  point1: "Nasion",       point2: "Articulare", color: "#3B82F6" },
    { name: "N-Pog", point1: "Nasion",       point2: "Pogonion",   color: "#22C55E", measureKey: "ConvFacial" },
    { name: "FH",    point1: "Porion",       point2: "Orbitale",   color: "#8B5CF6" },
    { name: "Go-Me", point1: "Gonion",       point2: "Menton",     color: "#F59E0B", measureKey: "MandPlane" },
    { name: "E-line",point1: "Soft Tissue Pogonion", point2: "Subnasale", color: "#EC4899", measureKey: "L1-Eplane" },
  ],
};

/* ────────────────────────────────────────────────────────────── */
/* TWEED (1954)                                                   */
/* ────────────────────────────────────────────────────────────── */
export const TWEED_ANALYSIS: CephalometricAnalysisDefinition = {
  id: "tweed",
  name: "Tweed",
  author: "Charles H. Tweed",
  year: 1954,
  shortDescription: "Triângulo diagnóstico FMA-FMIA-IMPA.",
  description:
    "Diagnóstico baseado no triângulo formado pelo plano mandibular, plano de Frankfurt e eixo do incisivo inferior. Define prognóstico ortodôntico.",
  measures: [
    { key: "FMA",   name: "FMA",   unit: "°", min: 20, normal: 25, max: 30,  description: "Frankfurt-Mandibular Angle" },
    { key: "FMIA",  name: "FMIA",  unit: "°", min: 60, normal: 65, max: 75,  description: "Frankfurt-Mandibular Incisor Angle" },
    { key: "IMPA",  name: "IMPA",  unit: "°", min: 85, normal: 90, max: 95,  description: "Incisor-Mandibular Plane Angle" },
    { key: "TweedSum", name: "Soma Tweed", unit: "°", min: 178, normal: 180, max: 182, description: "FMA+FMIA+IMPA (deve ser ~180°)" },
  ],
  lines: [
    { name: "FH",    point1: "Porion", point2: "Orbitale",          color: "#8B5CF6" },
    { name: "Go-Me", point1: "Gonion", point2: "Menton",            color: "#F59E0B", measureKey: "FMA" },
    { name: "L1",    point1: "Lower Incisor Tip", point2: "Menton", color: "#22C55E", measureKey: "IMPA" },
  ],
};

/* ────────────────────────────────────────────────────────────── */
/* DOWNS (1948)                                                   */
/* ────────────────────────────────────────────────────────────── */
export const DOWNS_ANALYSIS: CephalometricAnalysisDefinition = {
  id: "downs",
  name: "Downs",
  author: "William B. Downs",
  year: 1948,
  shortDescription: "Análise pioneira baseada no plano de Frankfurt.",
  description:
    "Primeira análise cefalométrica padronizada. Avalia padrão esquelético e dentário usando o plano de Frankfurt como referência horizontal.",
  measures: [
    { key: "FacialAngle", name: "Ângulo Facial",     unit: "°", min: 82, normal: 87, max: 95, description: "FH × N-Pog (prognatismo)" },
    { key: "AngConvex",   name: "Ângulo Convexidade",unit: "°", min: -8.5, normal: 0, max: 10, description: "NA × A-Pog" },
    { key: "ABplane",     name: "Plano A-B",         unit: "°", min: -9, normal: -4.6, max: 0, description: "AB × N-Pog" },
    { key: "MandPlane",   name: "Plano Mandibular",  unit: "°", min: 17, normal: 21.9, max: 28, description: "FH × Go-Me" },
    { key: "YAxis",       name: "Eixo Y",            unit: "°", min: 53, normal: 59.4, max: 66, description: "FH × S-Gn" },
    { key: "U1-L1",       name: "Interincisal",      unit: "°", min: 130, normal: 135.4, max: 150, description: "Ângulo entre incisivos" },
  ],
  lines: [
    { name: "FH",    point1: "Porion",     point2: "Orbitale",           color: "#8B5CF6" },
    { name: "N-Pog", point1: "Nasion",     point2: "Pogonion",           color: "#22C55E", measureKey: "FacialAngle" },
    { name: "A-Pog", point1: "Subspinale (Point A)", point2: "Pogonion", color: "#3B82F6", measureKey: "AngConvex" },
    { name: "Go-Me", point1: "Gonion",     point2: "Menton",             color: "#F59E0B", measureKey: "MandPlane" },
    { name: "S-Gn",  point1: "Sella turcica", point2: "Gnathion",        color: "#EC4899", measureKey: "YAxis" },
  ],
};

export const ANALYSES_BY_ID: Record<AnalysisType, CephalometricAnalysisDefinition> = {
  steiner:  STEINER_ANALYSIS,
  jarabak:  JARABAK_ANALYSIS,
  mcnamara: MCNAMARA_ANALYSIS,
  ricketts: RICKETTS_ANALYSIS,
  tweed:    TWEED_ANALYSIS,
  downs:    DOWNS_ANALYSIS,
};

export const ALL_ANALYSES: CephalometricAnalysisDefinition[] = [
  STEINER_ANALYSIS, JARABAK_ANALYSIS, MCNAMARA_ANALYSIS,
  RICKETTS_ANALYSIS, TWEED_ANALYSIS, DOWNS_ANALYSIS,
];

export function getStatus(
  measure: CephalometricMeasure,
  value: number
): "normal" | "high" | "low" {
  if (value > measure.max) return "high";
  if (value < measure.min) return "low";
  return "normal";
}

export function formatRange(m: CephalometricMeasure): string {
  return `${m.min}–${m.max}${m.unit}`;
}