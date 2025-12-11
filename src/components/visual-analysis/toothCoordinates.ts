// Coordenadas anatômicas típicas para dentes em radiografia panorâmica
// Formato: [x%, y%] - posição central típica de cada dente
// Baseado em análise de radiografias panorâmicas padrão
// X: 0 = extrema esquerda, 100 = extrema direita
// Y: 0 = topo, 100 = base

export const TYPICAL_TOOTH_COORDINATES: Record<string, [number, number]> = {
  // Arcada superior direita (lado esquerdo da imagem) - Y ~38-48%
  // Os dentes superiores aparecem na metade superior da arcada dentária
  "18": [12, 43],   // Terceiro molar superior direito (siso)
  "17": [17, 41],   // Segundo molar superior direito
  "16": [22, 39],   // Primeiro molar superior direito
  "15": [27, 38],   // Segundo pré-molar superior direito
  "14": [31, 37],   // Primeiro pré-molar superior direito
  "13": [35, 36],   // Canino superior direito
  "12": [40, 36],   // Incisivo lateral superior direito
  "11": [45, 36],   // Incisivo central superior direito
  
  // Arcada superior esquerda (lado direito da imagem) - Y ~38-48%
  "21": [55, 36],   // Incisivo central superior esquerdo
  "22": [60, 36],   // Incisivo lateral superior esquerdo
  "23": [65, 36],   // Canino superior esquerdo
  "24": [69, 37],   // Primeiro pré-molar superior esquerdo
  "25": [73, 38],   // Segundo pré-molar superior esquerdo
  "26": [78, 39],   // Primeiro molar superior esquerdo
  "27": [83, 41],   // Segundo molar superior esquerdo
  "28": [88, 43],   // Terceiro molar superior esquerdo (siso)
  
  // Arcada inferior direita (lado esquerdo da imagem) - Y ~52-62%
  // Os dentes inferiores aparecem na metade inferior da arcada dentária
  "48": [12, 57],   // Terceiro molar inferior direito (siso)
  "47": [17, 55],   // Segundo molar inferior direito
  "46": [22, 53],   // Primeiro molar inferior direito
  "45": [27, 52],   // Segundo pré-molar inferior direito
  "44": [31, 51],   // Primeiro pré-molar inferior direito
  "43": [35, 51],   // Canino inferior direito
  "42": [40, 51],   // Incisivo lateral inferior direito
  "41": [45, 51],   // Incisivo central inferior direito
  
  // Arcada inferior esquerda (lado direito da imagem) - Y ~52-62%
  "31": [55, 51],   // Incisivo central inferior esquerdo
  "32": [60, 51],   // Incisivo lateral inferior esquerdo
  "33": [65, 51],   // Canino inferior esquerdo
  "34": [69, 51],   // Primeiro pré-molar inferior esquerdo
  "35": [73, 52],   // Segundo pré-molar inferior esquerdo
  "36": [78, 53],   // Primeiro molar inferior esquerdo
  "37": [83, 55],   // Segundo molar inferior esquerdo
  "38": [88, 57],   // Terceiro molar inferior esquerdo (siso)
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
// FORÇA as coordenadas típicas para garantir precisão
export function correctToothCoordinates(
  denteNum: string,
  originalCoords: [number, number]
): [number, number] {
  const typicalCoords = TYPICAL_TOOTH_COORDINATES[denteNum];
  
  if (!typicalCoords) {
    return originalCoords;
  }
  
  // SEMPRE usar as coordenadas típicas como base principal
  // As coordenadas da IA são muito imprecisas, então forçamos 95% típica
  const [typicalX, typicalY] = typicalCoords;
  const [origX, origY] = originalCoords;
  
  // Pequeno offset baseado no original (5% máximo) para variação natural
  const offsetX = Math.max(-2, Math.min(2, (origX - typicalX) * 0.05));
  const offsetY = Math.max(-2, Math.min(2, (origY - typicalY) * 0.05));
  
  return [typicalX + offsetX, typicalY + offsetY];
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
