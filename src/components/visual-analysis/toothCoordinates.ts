// Coordenadas anatômicas típicas para dentes em radiografia panorâmica
// Formato: [x%, y%] - posição central típica de cada dente

export const TYPICAL_TOOTH_COORDINATES: Record<string, [number, number]> = {
  // Arcada superior direita (lado esquerdo da imagem) - Y ~35-45%
  "18": [8, 42],   // Terceiro molar superior direito
  "17": [14, 40],  // Segundo molar superior direito
  "16": [19, 38],  // Primeiro molar superior direito
  "15": [24, 36],  // Segundo pré-molar superior direito
  "14": [28, 35],  // Primeiro pré-molar superior direito
  "13": [32, 34],  // Canino superior direito
  "12": [37, 33],  // Incisivo lateral superior direito
  "11": [43, 33],  // Incisivo central superior direito
  
  // Arcada superior esquerda (lado direito da imagem) - Y ~35-45%
  "21": [57, 33],  // Incisivo central superior esquerdo
  "22": [63, 33],  // Incisivo lateral superior esquerdo
  "23": [68, 34],  // Canino superior esquerdo
  "24": [72, 35],  // Primeiro pré-molar superior esquerdo
  "25": [76, 36],  // Segundo pré-molar superior esquerdo
  "26": [81, 38],  // Primeiro molar superior esquerdo
  "27": [86, 40],  // Segundo molar superior esquerdo
  "28": [92, 42],  // Terceiro molar superior esquerdo
  
  // Arcada inferior direita (lado esquerdo da imagem) - Y ~55-65%
  "48": [8, 62],   // Terceiro molar inferior direito
  "47": [14, 60],  // Segundo molar inferior direito
  "46": [19, 58],  // Primeiro molar inferior direito
  "45": [24, 57],  // Segundo pré-molar inferior direito
  "44": [28, 56],  // Primeiro pré-molar inferior direito
  "43": [32, 55],  // Canino inferior direito
  "42": [37, 54],  // Incisivo lateral inferior direito
  "41": [43, 54],  // Incisivo central inferior direito
  
  // Arcada inferior esquerda (lado direito da imagem) - Y ~55-65%
  "31": [57, 54],  // Incisivo central inferior esquerdo
  "32": [63, 54],  // Incisivo lateral inferior esquerdo
  "33": [68, 55],  // Canino inferior esquerdo
  "34": [72, 56],  // Primeiro pré-molar inferior esquerdo
  "35": [76, 57],  // Segundo pré-molar inferior esquerdo
  "36": [81, 58],  // Primeiro molar inferior esquerdo
  "37": [86, 60],  // Segundo molar inferior esquerdo
  "38": [92, 62],  // Terceiro molar inferior esquerdo
};

// Estruturas anatômicas típicas
export const TYPICAL_ANATOMIC_STRUCTURES = {
  seio_maxilar: {
    direito: {
      center: [18, 25],
      yRange: [15, 35],
      xRange: [8, 30],
    },
    esquerdo: {
      center: [82, 25],
      yRange: [15, 35],
      xRange: [70, 92],
    },
  },
  canal_mandibular: {
    direito: {
      yRange: [68, 78],
      xRange: [8, 45],
    },
    esquerdo: {
      yRange: [68, 78],
      xRange: [55, 92],
    },
  },
};

// Função para corrigir coordenadas baseada em posição anatômica típica
export function correctToothCoordinates(
  denteNum: string,
  originalCoords: [number, number]
): [number, number] {
  const typicalCoords = TYPICAL_TOOTH_COORDINATES[denteNum];
  
  if (!typicalCoords) {
    return originalCoords;
  }
  
  const [typicalX, typicalY] = typicalCoords;
  const [origX, origY] = originalCoords;
  
  // Se a coordenada original está muito longe da posição típica (>20%), usar a típica
  const xDiff = Math.abs(origX - typicalX);
  const yDiff = Math.abs(origY - typicalY);
  
  if (xDiff > 20 || yDiff > 20) {
    // Usar coordenada típica com pequeno offset baseado no original
    const offsetX = Math.max(-5, Math.min(5, (origX - typicalX) * 0.2));
    const offsetY = Math.max(-3, Math.min(3, (origY - typicalY) * 0.2));
    return [typicalX + offsetX, typicalY + offsetY];
  }
  
  // Se está razoavelmente próximo, interpolar 70% típica, 30% original
  const correctedX = typicalX * 0.7 + origX * 0.3;
  const correctedY = typicalY * 0.7 + origY * 0.3;
  
  return [correctedX, correctedY];
}

// Função para corrigir todas as coordenadas de uma análise
export function correctAnalysisCoordinates(analise: any): any {
  if (!analise) return analise;
  
  const corrected = { ...analise };
  
  // Corrigir dentes
  if (corrected.dentes) {
    const correctedDentes: Record<string, any> = {};
    for (const [num, dente] of Object.entries(corrected.dentes)) {
      const d = dente as any;
      if (d.posicao) {
        correctedDentes[num] = {
          ...d,
          posicao: correctToothCoordinates(num, d.posicao),
        };
      } else {
        // Se não tem posição, usar a típica
        correctedDentes[num] = {
          ...d,
          posicao: TYPICAL_TOOTH_COORDINATES[num] || [50, 50],
        };
      }
    }
    corrected.dentes = correctedDentes;
  }
  
  // Corrigir implantes
  if (corrected.implantes?.length) {
    corrected.implantes = corrected.implantes.map((impl: any) => {
      if (impl.dente && impl.posicao) {
        return {
          ...impl,
          posicao: correctToothCoordinates(impl.dente, impl.posicao),
        };
      } else if (impl.dente && !impl.posicao) {
        return {
          ...impl,
          posicao: TYPICAL_TOOTH_COORDINATES[impl.dente] || [50, 50],
        };
      }
      return impl;
    });
  }
  
  // Corrigir cáries
  if (corrected.caries?.length) {
    corrected.caries = corrected.caries.map((carie: any) => {
      if (carie.dente && carie.posicao) {
        const toothCoords = TYPICAL_TOOTH_COORDINATES[carie.dente];
        if (toothCoords) {
          // Cáries ficam levemente acima/abaixo do dente
          const isUpper = parseInt(carie.dente) < 30 || (parseInt(carie.dente) >= 11 && parseInt(carie.dente) <= 28);
          const yOffset = isUpper ? 2 : -2;
          return {
            ...carie,
            posicao: [toothCoords[0], toothCoords[1] + yOffset],
          };
        }
      }
      return carie;
    });
  }
  
  // Corrigir lesões
  if (corrected.lesoes_suspeitas?.length) {
    corrected.lesoes_suspeitas = corrected.lesoes_suspeitas.map((lesao: any) => {
      if (lesao.dente && lesao.posicao) {
        const toothCoords = TYPICAL_TOOTH_COORDINATES[lesao.dente];
        if (toothCoords) {
          // Lesões periapicais ficam abaixo do ápice (4-6% abaixo para superiores, acima para inferiores)
          const isUpper = parseInt(lesao.dente) < 30 || (parseInt(lesao.dente) >= 11 && parseInt(lesao.dente) <= 28);
          const yOffset = isUpper ? 5 : -5;
          return {
            ...lesao,
            posicao: [toothCoords[0], toothCoords[1] + yOffset],
          };
        }
      }
      return lesao;
    });
  }
  
  // Corrigir reabsorções
  if (corrected.reabsorcoes?.length) {
    corrected.reabsorcoes = corrected.reabsorcoes.map((reab: any) => {
      if (reab.dente) {
        return {
          ...reab,
          posicao: TYPICAL_TOOTH_COORDINATES[reab.dente] || reab.posicao,
        };
      }
      return reab;
    });
  }
  
  // Corrigir fraturas
  if (corrected.fraturas?.length) {
    corrected.fraturas = corrected.fraturas.map((frat: any) => {
      if (frat.dente) {
        return {
          ...frat,
          posicao: TYPICAL_TOOTH_COORDINATES[frat.dente] || frat.posicao,
        };
      }
      return frat;
    });
  }
  
  return corrected;
}

// Obter informação do dente por número
export function getToothInfo(denteNum: string): { quadrant: string; name: string } {
  const num = parseInt(denteNum);
  const toothNames: Record<number, string> = {
    1: "Incisivo Central",
    2: "Incisivo Lateral",
    3: "Canino",
    4: "1º Pré-molar",
    5: "2º Pré-molar",
    6: "1º Molar",
    7: "2º Molar",
    8: "3º Molar (Siso)",
  };
  
  const quadrantNames: Record<number, string> = {
    1: "Superior Direito",
    2: "Superior Esquerdo",
    3: "Inferior Esquerdo",
    4: "Inferior Direito",
  };
  
  const quadrant = Math.floor(num / 10);
  const tooth = num % 10;
  
  return {
    quadrant: quadrantNames[quadrant] || "Desconhecido",
    name: toothNames[tooth] || "Desconhecido",
  };
}
