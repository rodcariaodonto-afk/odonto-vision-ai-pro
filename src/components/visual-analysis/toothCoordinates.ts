// Coordenadas anatômicas típicas para dentes em radiografia panorâmica
// Formato NORMALIZADO: [x, y] - valores entre 0 e 1
// X: 0 = extrema esquerda, 1 = extrema direita
// Y: 0 = topo, 1 = base

export const TYPICAL_TOOTH_COORDINATES: Record<string, [number, number]> = {
  // Arcada superior direita (lado esquerdo da imagem) - Y entre 0.20 e 0.40
  "18": [0.08, 0.35],   // Terceiro molar superior direito (siso)
  "17": [0.13, 0.33],   // Segundo molar superior direito
  "16": [0.18, 0.31],   // Primeiro molar superior direito
  "15": [0.23, 0.30],   // Segundo pré-molar superior direito
  "14": [0.28, 0.29],   // Primeiro pré-molar superior direito
  "13": [0.33, 0.28],   // Canino superior direito
  "12": [0.38, 0.28],   // Incisivo lateral superior direito
  "11": [0.44, 0.28],   // Incisivo central superior direito
  
  // Arcada superior esquerda (lado direito da imagem) - Y entre 0.20 e 0.40
  "21": [0.56, 0.28],   // Incisivo central superior esquerdo
  "22": [0.62, 0.28],   // Incisivo lateral superior esquerdo
  "23": [0.67, 0.28],   // Canino superior esquerdo
  "24": [0.72, 0.29],   // Primeiro pré-molar superior esquerdo
  "25": [0.77, 0.30],   // Segundo pré-molar superior esquerdo
  "26": [0.82, 0.31],   // Primeiro molar superior esquerdo
  "27": [0.87, 0.33],   // Segundo molar superior esquerdo
  "28": [0.92, 0.35],   // Terceiro molar superior esquerdo (siso)
  
  // Arcada inferior direita (lado esquerdo da imagem) - Y entre 0.60 e 0.80
  "48": [0.08, 0.72],   // Terceiro molar inferior direito (siso)
  "47": [0.13, 0.70],   // Segundo molar inferior direito
  "46": [0.20, 0.68],   // Primeiro molar inferior direito
  "45": [0.25, 0.67],   // Segundo pré-molar inferior direito
  "44": [0.30, 0.66],   // Primeiro pré-molar inferior direito
  "43": [0.35, 0.66],   // Canino inferior direito
  "42": [0.40, 0.66],   // Incisivo lateral inferior direito
  "41": [0.45, 0.66],   // Incisivo central inferior direito
  
  // Arcada inferior esquerda (lado direito da imagem) - Y entre 0.60 e 0.80
  "31": [0.55, 0.66],   // Incisivo central inferior esquerdo
  "32": [0.60, 0.66],   // Incisivo lateral inferior esquerdo
  "33": [0.65, 0.66],   // Canino inferior esquerdo
  "34": [0.70, 0.66],   // Primeiro pré-molar inferior esquerdo
  "35": [0.75, 0.67],   // Segundo pré-molar inferior esquerdo
  "36": [0.80, 0.68],   // Primeiro molar inferior esquerdo
  "37": [0.87, 0.70],   // Segundo molar inferior esquerdo
  "38": [0.92, 0.72],   // Terceiro molar inferior esquerdo (siso)
};

// Estruturas anatômicas típicas (coordenadas normalizadas 0-1)
export const TYPICAL_ANATOMIC_STRUCTURES = {
  seio_maxilar: {
    direito: {
      center: [0.18, 0.25],
      yRange: [0.15, 0.35],
      xRange: [0.08, 0.30],
    },
    esquerdo: {
      center: [0.82, 0.25],
      yRange: [0.15, 0.35],
      xRange: [0.70, 0.92],
    },
  },
  canal_mandibular: {
    direito: {
      yRange: [0.68, 0.78],
      xRange: [0.08, 0.45],
    },
    esquerdo: {
      yRange: [0.68, 0.78],
      xRange: [0.55, 0.92],
    },
  },
};

// Função para verificar se coordenadas estão normalizadas (0-1)
function isNormalized(value: number): boolean {
  return value >= 0 && value <= 1;
}

// Função para normalizar coordenadas que podem vir em formato 0-100 ou 0-1
function normalizeCoordinate(value: number): number {
  if (value > 1) {
    // Provavelmente está em formato 0-100, converter para 0-1
    return Math.min(1, Math.max(0, value / 100));
  }
  return Math.min(1, Math.max(0, value));
}

// Função para corrigir coordenadas baseada em posição anatômica típica
// FORÇA as coordenadas típicas para garantir precisão
export function correctToothCoordinates(
  denteNum: string,
  originalCoords: [number, number]
): [number, number] {
  const typicalCoords = TYPICAL_TOOTH_COORDINATES[denteNum];
  
  if (!typicalCoords) {
    // Se não temos coordenadas típicas, normalizar as originais
    return [normalizeCoordinate(originalCoords[0]), normalizeCoordinate(originalCoords[1])];
  }
  
  // Normalizar as coordenadas originais caso venham em formato 0-100
  const [origX, origY] = [normalizeCoordinate(originalCoords[0]), normalizeCoordinate(originalCoords[1])];
  
  // SEMPRE usar as coordenadas típicas como base principal (95%)
  // As coordenadas da IA são muito imprecisas, então forçamos 95% típica
  const [typicalX, typicalY] = typicalCoords;
  
  // Pequeno offset baseado no original (5% máximo) para variação natural
  const offsetX = Math.max(-0.02, Math.min(0.02, (origX - typicalX) * 0.05));
  const offsetY = Math.max(-0.02, Math.min(0.02, (origY - typicalY) * 0.05));
  
  return [typicalX + offsetX, typicalY + offsetY];
}

// Função para corrigir todas as coordenadas de uma análise
// Converte coordenadas 0-1 para 0-100 para renderização SVG
export function correctAnalysisCoordinates(analise: any): any {
  if (!analise) return analise;
  
  const corrected = { ...analise };
  
  // Função helper para converter coordenadas normalizadas (0-1) para percentuais (0-100)
  const toPercentage = (coords: [number, number]): [number, number] => {
    const [x, y] = coords;
    // Se já está em formato 0-100, manter; se está em 0-1, converter
    const normalizedX = x > 1 ? x : x * 100;
    const normalizedY = y > 1 ? y : y * 100;
    return [normalizedX, normalizedY];
  };
  
  // Corrigir dentes
  if (corrected.dentes) {
    const correctedDentes: Record<string, any> = {};
    for (const [num, dente] of Object.entries(corrected.dentes)) {
      const d = dente as any;
      if (d.posicao) {
        const correctedNormalized = correctToothCoordinates(num, d.posicao);
        correctedDentes[num] = {
          ...d,
          posicao: toPercentage(correctedNormalized),
        };
      } else {
        // Se não tem posição, usar a típica
        const typicalPos = TYPICAL_TOOTH_COORDINATES[num] || [0.5, 0.5];
        correctedDentes[num] = {
          ...d,
          posicao: toPercentage(typicalPos),
        };
      }
    }
    corrected.dentes = correctedDentes;
  }
  
  // Corrigir implantes
  if (corrected.implantes?.length) {
    corrected.implantes = corrected.implantes.map((impl: any) => {
      if (impl.dente && impl.posicao) {
        const correctedNormalized = correctToothCoordinates(impl.dente, impl.posicao);
        return {
          ...impl,
          posicao: toPercentage(correctedNormalized),
        };
      } else if (impl.dente && !impl.posicao) {
        const typicalPos = TYPICAL_TOOTH_COORDINATES[impl.dente] || [0.5, 0.5];
        return {
          ...impl,
          posicao: toPercentage(typicalPos),
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
          const yOffset = isUpper ? 0.02 : -0.02;
          return {
            ...carie,
            posicao: toPercentage([toothCoords[0], toothCoords[1] + yOffset]),
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
          // Lesões periapicais ficam abaixo do ápice
          const isUpper = parseInt(lesao.dente) < 30 || (parseInt(lesao.dente) >= 11 && parseInt(lesao.dente) <= 28);
          const yOffset = isUpper ? 0.05 : -0.05;
          return {
            ...lesao,
            posicao: toPercentage([toothCoords[0], toothCoords[1] + yOffset]),
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
        const typicalPos = TYPICAL_TOOTH_COORDINATES[reab.dente] || (reab.posicao ? [normalizeCoordinate(reab.posicao[0]), normalizeCoordinate(reab.posicao[1])] : [0.5, 0.5]);
        return {
          ...reab,
          posicao: toPercentage(typicalPos as [number, number]),
        };
      }
      return reab;
    });
  }
  
  // Corrigir fraturas
  if (corrected.fraturas?.length) {
    corrected.fraturas = corrected.fraturas.map((frat: any) => {
      if (frat.dente) {
        const typicalPos = TYPICAL_TOOTH_COORDINATES[frat.dente] || (frat.posicao ? [normalizeCoordinate(frat.posicao[0]), normalizeCoordinate(frat.posicao[1])] : [0.5, 0.5]);
        return {
          ...frat,
          posicao: toPercentage(typicalPos as [number, number]),
        };
      }
      return frat;
    });
  }
  
  // Corrigir seio maxilar (converter contornos para 0-100)
  if (corrected.seio_maxilar) {
    if (corrected.seio_maxilar.direito?.contorno) {
      corrected.seio_maxilar.direito.contorno = corrected.seio_maxilar.direito.contorno.map(
        (point: [number, number]) => toPercentage(point)
      );
    }
    if (corrected.seio_maxilar.esquerdo?.contorno) {
      corrected.seio_maxilar.esquerdo.contorno = corrected.seio_maxilar.esquerdo.contorno.map(
        (point: [number, number]) => toPercentage(point)
      );
    }
  }
  
  // Corrigir canal mandibular (converter pontos para 0-100)
  if (corrected.canal_mandibular) {
    if (corrected.canal_mandibular.direito) {
      corrected.canal_mandibular.direito = corrected.canal_mandibular.direito.map(
        (point: [number, number]) => toPercentage(point)
      );
    }
    if (corrected.canal_mandibular.esquerdo) {
      corrected.canal_mandibular.esquerdo = corrected.canal_mandibular.esquerdo.map(
        (point: [number, number]) => toPercentage(point)
      );
    }
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
