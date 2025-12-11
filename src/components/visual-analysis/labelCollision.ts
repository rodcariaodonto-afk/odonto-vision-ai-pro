import type { Marcacao } from "./VisualAnalysis";

interface LabelPosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  originalX: number;
  originalY: number;
}

interface AdjustedLabel {
  id: string;
  x: number;
  y: number;
  side: "top" | "bottom" | "left" | "right";
}

const LABEL_HEIGHT = 2;
const LABEL_PADDING = 0.5;
const CHAR_WIDTH = 0.9;
const MIN_GAP = 0.8;

/**
 * Check if two rectangles overlap
 */
function rectsOverlap(a: LabelPosition, b: LabelPosition): boolean {
  return !(
    a.x + a.width + MIN_GAP < b.x ||
    b.x + b.width + MIN_GAP < a.x ||
    a.y + a.height + MIN_GAP < b.y ||
    b.y + b.height + MIN_GAP < a.y
  );
}

/**
 * Calculate label positions with collision detection
 * Uses a greedy algorithm to position labels avoiding overlaps
 */
export function calculateLabelPositions(
  marcacoes: Marcacao[],
  visibleIds: Set<string>
): Map<string, AdjustedLabel> {
  const visibleMarcacoes = marcacoes.filter(m => visibleIds.has(m.id));
  const result = new Map<string, AdjustedLabel>();
  const placedLabels: LabelPosition[] = [];

  // Sort by y position (top to bottom) then x (left to right)
  const sorted = [...visibleMarcacoes].sort((a, b) => {
    const [ax, ay] = a.coords;
    const [bx, by] = b.coords;
    if (Math.abs(ay - by) < 3) return ax - bx;
    return ay - by;
  });

  for (const m of sorted) {
    const [x, y, w, h] = m.coords;
    const labelWidth = m.label.length * CHAR_WIDTH + LABEL_PADDING * 2;
    
    // Try different positions: top, bottom, left, right
    const positions: Array<{ pos: LabelPosition; side: AdjustedLabel["side"] }> = [
      // Top (preferred)
      {
        pos: {
          id: m.id,
          x: m.tipo === "rect" ? x : x - labelWidth / 2,
          y: m.tipo === "rect" ? Math.max(y - LABEL_HEIGHT - 1, 1) : Math.max(y - (h || 2) - LABEL_HEIGHT - 1, 1),
          width: labelWidth,
          height: LABEL_HEIGHT,
          originalX: x,
          originalY: y,
        },
        side: "top" as const,
      },
      // Bottom
      {
        pos: {
          id: m.id,
          x: m.tipo === "rect" ? x : x - labelWidth / 2,
          y: m.tipo === "rect" ? y + (h || 5) + 0.5 : y + (h || 2) + 0.5,
          width: labelWidth,
          height: LABEL_HEIGHT,
          originalX: x,
          originalY: y,
        },
        side: "bottom" as const,
      },
      // Right
      {
        pos: {
          id: m.id,
          x: m.tipo === "rect" ? x + (w || 5) + 0.5 : x + (w || 2) + 0.5,
          y: m.tipo === "rect" ? y : y - LABEL_HEIGHT / 2,
          width: labelWidth,
          height: LABEL_HEIGHT,
          originalX: x,
          originalY: y,
        },
        side: "right" as const,
      },
      // Left
      {
        pos: {
          id: m.id,
          x: m.tipo === "rect" ? x - labelWidth - 0.5 : x - (w || 2) - labelWidth - 0.5,
          y: m.tipo === "rect" ? y : y - LABEL_HEIGHT / 2,
          width: labelWidth,
          height: LABEL_HEIGHT,
          originalX: x,
          originalY: y,
        },
        side: "left" as const,
      },
    ];

    // Find first non-overlapping position
    let placed = false;
    for (const { pos, side } of positions) {
      // Check bounds
      if (pos.x < 0 || pos.x + pos.width > 100 || pos.y < 0 || pos.y + pos.height > 100) {
        continue;
      }

      const hasOverlap = placedLabels.some(existing => rectsOverlap(pos, existing));
      
      if (!hasOverlap) {
        placedLabels.push(pos);
        result.set(m.id, {
          id: m.id,
          x: pos.x,
          y: pos.y + LABEL_HEIGHT - 0.3, // Adjust for text baseline
          side,
        });
        placed = true;
        break;
      }
    }

    // If all positions overlap, try with offset
    if (!placed) {
      let offsetY = 0;
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        offsetY += LABEL_HEIGHT + MIN_GAP;
        const offsetPos: LabelPosition = {
          id: m.id,
          x: m.tipo === "rect" ? x : x - labelWidth / 2,
          y: Math.max(y - LABEL_HEIGHT - 1 - offsetY, 1),
          width: labelWidth,
          height: LABEL_HEIGHT,
          originalX: x,
          originalY: y,
        };

        if (offsetPos.y < 1) {
          offsetPos.y = y + (m.tipo === "rect" ? (h || 5) : (h || 2)) + 0.5 + offsetY;
        }

        if (offsetPos.y + offsetPos.height > 99) break;

        const hasOverlap = placedLabels.some(existing => rectsOverlap(offsetPos, existing));
        
        if (!hasOverlap) {
          placedLabels.push(offsetPos);
          result.set(m.id, {
            id: m.id,
            x: offsetPos.x,
            y: offsetPos.y + LABEL_HEIGHT - 0.3,
            side: offsetPos.y < y ? "top" : "bottom",
          });
          placed = true;
          break;
        }
        attempts++;
      }

      // Fallback: place anyway with slight offset
      if (!placed) {
        const fallbackPos = positions[0].pos;
        fallbackPos.y += placedLabels.length * 0.3;
        placedLabels.push(fallbackPos);
        result.set(m.id, {
          id: m.id,
          x: fallbackPos.x,
          y: fallbackPos.y + LABEL_HEIGHT - 0.3,
          side: "top",
        });
      }
    }
  }

  return result;
}

/**
 * Find marcacao by tooth number
 */
export function findMarcacaoByDente(
  marcacoes: Marcacao[],
  denteNum: string,
  analiseCompleta?: {
    implantes?: Array<{ dente: string; posicao: [number, number] }>;
    lesoes_suspeitas?: Array<{ dente: string; posicao: [number, number] }>;
    caries?: Array<{ dente: string; posicao: [number, number] }>;
    fraturas?: Array<{ dente: string; posicao: [number, number] }>;
    reabsorcoes?: Array<{ dente: string; posicao: [number, number] }>;
    dentes?: Record<string, { posicao: [number, number] }>;
  }
): { x: number; y: number } | null {
  // First try to find in marcacoes by label
  const marcacao = marcacoes.find(m => 
    m.label.includes(denteNum) || 
    m.descricao.toLowerCase().includes(`dente ${denteNum}`) ||
    m.descricao.toLowerCase().includes(`${denteNum}`)
  );
  
  if (marcacao) {
    return { x: marcacao.coords[0], y: marcacao.coords[1] };
  }

  // Try to find in analise completa structures
  if (analiseCompleta) {
    const implante = analiseCompleta.implantes?.find(i => i.dente === denteNum);
    if (implante?.posicao) return { x: implante.posicao[0], y: implante.posicao[1] };

    const lesao = analiseCompleta.lesoes_suspeitas?.find(l => l.dente === denteNum);
    if (lesao?.posicao) return { x: lesao.posicao[0], y: lesao.posicao[1] };

    const carie = analiseCompleta.caries?.find(c => c.dente === denteNum);
    if (carie?.posicao) return { x: carie.posicao[0], y: carie.posicao[1] };

    const fratura = analiseCompleta.fraturas?.find(f => f.dente === denteNum);
    if (fratura?.posicao) return { x: fratura.posicao[0], y: fratura.posicao[1] };

    const reabsorcao = analiseCompleta.reabsorcoes?.find(r => r.dente === denteNum);
    if (reabsorcao?.posicao) return { x: reabsorcao.posicao[0], y: reabsorcao.posicao[1] };

    const dente = analiseCompleta.dentes?.[denteNum];
    if (dente?.posicao) return { x: dente.posicao[0], y: dente.posicao[1] };
  }

  return null;
}
