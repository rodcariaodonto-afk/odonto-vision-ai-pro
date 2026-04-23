import {
  AnalysisType,
  ANALYSES_BY_ID,
} from "@/types/cephalometric-analyses";

export interface Landmark { x: number; y: number; name: string; confidence: number; }
export type Measurements = Record<string, number>;

export function angle(p1: Landmark, v: Landmark, p2: Landmark): number {
  const a = { x: p1.x - v.x, y: p1.y - v.y };
  const b = { x: p2.x - v.x, y: p2.y - v.y };
  return Math.abs(Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y) * (180 / Math.PI));
}

/** distance in mm assuming 0.1 mm per pixel — same scale used in edge function */
export function distance(p1: Landmark, p2: Landmark): number {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2) * 0.1;
}

const r = (v: number) => Math.round(v * 10) / 10;

export function calculateMeasurementsByAnalysis(
  landmarks: Landmark[],
  analysisType: AnalysisType
): Measurements {
  const lm = new Map(landmarks.map((l) => [l.name, l]));
  const S   = lm.get("Sella turcica");
  const N   = lm.get("Nasion");
  const A   = lm.get("Subspinale (Point A)");
  const B   = lm.get("Supramentale (Point B)");
  const Go  = lm.get("Gonion");
  const Me  = lm.get("Menton");
  const Gn  = lm.get("Gnathion");
  const Or  = lm.get("Orbitale");
  const Po  = lm.get("Porion");
  const Pog = lm.get("Pogonion");
  const Ar  = lm.get("Articulare");
  const ENA = lm.get("Anterior Nasal Spine");
  const Sn  = lm.get("Subnasale");
  const STPog = lm.get("Soft Tissue Pogonion");
  const U1  = lm.get("Upper Incisor Tip");
  const L1  = lm.get("Lower Incisor Tip");
  if (!S || !N) return {};

  switch (analysisType) {
    case "steiner": {
      if (!A || !B) return {};
      const SNA = angle(S, N, A), SNB = angle(S, N, B);
      return {
        SNA: r(SNA), SNB: r(SNB), ANB: r(SNA - SNB),
        "SN-GoGn": r(Go && Gn ? angle(S, N, Gn) : 32),
        FMA: r(Po && Or && Go ? angle(Po, Or, Go) : 25),
        IMPA: r(L1 && Go && Me ? angle(L1, Me, Go) : 90),
        "U1-NA": r(U1 ? angle(U1, N, A) : 22),
        "L1-NB": r(L1 ? angle(L1, N, B) : 25),
      };
    }
    case "jarabak": {
      const NSAr = Ar ? angle(N, S, Ar) : 123;
      const SArGo = Ar && Go ? angle(S, Ar, Go) : 143;
      const ArGoMe = Ar && Go && Me ? angle(Ar, Go, Me) : 130;
      const SGo = Go ? distance(S, Go) * 10 : 80;
      const NMe = Me ? distance(N, Me) * 10 : 120;
      return {
        SellaAngle: r(NSAr), ArticularAngle: r(SArGo), GonialAngle: r(ArGoMe),
        PosteriorFH: r(SGo), AnteriorFH: r(NMe),
        JarabakRatio: r((SGo / NMe) * 100),
      };
    }
    case "mcnamara": {
      const CoA = Ar && A ? distance(Ar, A) * 10 : 91;
      const CoGn = Ar && Gn ? distance(Ar, Gn) * 10 : 120;
      const ANperp = A ? (A.x - N.x) * 0.1 : 1;
      const PogNperp = Pog ? (Pog.x - N.x) * 0.1 : -2;
      const LAFH = ENA && Me ? distance(ENA, Me) * 10 : 67;
      return {
        "Co-A": r(CoA), "Co-Gn": r(CoGn),
        MaxMand: r(CoGn - CoA),
        "A-Nperp": r(ANperp),
        "Pog-Nperp": r(PogNperp),
        LAFH: r(LAFH),
      };
    }
    case "ricketts": {
      const facialAxis = Pog && Ar ? angle(Pog, S, Ar) : 90;
      const facialDepth = Po && Or && Pog ? angle(Po, Or, Pog) : 87;
      const mandPlane = Po && Or && Me ? angle(Po, Or, Me) : 26;
      const lowerFaceH = ENA && Pog && Me ? angle(ENA, Pog, Me) : 47;
      const conv = A && Pog ? Math.abs(A.x - ((N.x + Pog.x) / 2)) * 0.1 : 2;
      const l1E = L1 && STPog && Sn ? Math.abs(L1.x - ((STPog.x + Sn.x) / 2)) * 0.1 * -1 : -2;
      return {
        FacialAxis: r(facialAxis), FacialDepth: r(facialDepth),
        MandPlane: r(mandPlane), LowerFaceH: r(lowerFaceH),
        ConvFacial: r(conv), "L1-Eplane": r(l1E),
      };
    }
    case "tweed": {
      const FMA = Po && Or && Go && Me ? angle(Po, Or, Me) : 25;
      const IMPA = L1 && Go && Me ? angle(L1, Me, Go) : 90;
      const FMIA = 180 - FMA - IMPA;
      return {
        FMA: r(FMA), FMIA: r(FMIA), IMPA: r(IMPA),
        TweedSum: r(FMA + FMIA + IMPA),
      };
    }
    case "downs": {
      if (!Pog) return {};
      const facialAngle = Po && Or ? angle(Po, Or, Pog) : 87;
      const angConv = A ? angle(N, A, Pog) - 180 : 0;
      const ABplane = A && B ? angle(A, B, Pog) - 180 : -4.6;
      const mandPlane = Po && Or && Me ? angle(Po, Or, Me) : 22;
      const yAxis = Gn && Po && Or ? angle(Po, Or, Gn) : 59.4;
      const u1L1 = U1 && L1 ? angle(U1, S, L1) : 135.4;
      return {
        FacialAngle: r(facialAngle),
        AngConvex: r(angConv),
        ABplane: r(ABplane),
        MandPlane: r(mandPlane),
        YAxis: r(yAxis),
        "U1-L1": r(u1L1),
      };
    }
  }
  return {};
}

/** Recalculate measurements for ALL given analysis types from a landmarks set */
export function recalcAll(
  landmarks: Landmark[],
  types: AnalysisType[]
): Record<AnalysisType, Measurements> {
  const out: Partial<Record<AnalysisType, Measurements>> = {};
  types.forEach((t) => {
    if (ANALYSES_BY_ID[t]) out[t] = calculateMeasurementsByAnalysis(landmarks, t);
  });
  return out as Record<AnalysisType, Measurements>;
}