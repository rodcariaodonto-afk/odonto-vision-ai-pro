import { useEffect, useRef, useState, useCallback } from "react";
import {
  AnalysisType, ANALYSES_BY_ID,
} from "@/types/cephalometric-analyses";
import { Landmark, Measurements } from "@/lib/cephalometric-math";
import { Button } from "@/components/ui/button";
import {
  ZoomIn, ZoomOut, RotateCcw, Pencil, Eraser, Minus,
  Move, Trash2, Undo2,
} from "lucide-react";

type Tool = "none" | "pen" | "line" | "eraser";
const COLORS = ["#3B82F6", "#EF4444", "#22C55E", "#F59E0B"];

interface DrawStroke {
  tool: Tool;
  color: string;
  points: { x: number; y: number }[]; // image-space coords (unscaled)
}

interface Props {
  imageSrc: string;            // data: URL or public storage URL
  landmarks: Landmark[];
  onLandmarksChange?: (lm: Landmark[]) => void;
  analysisType: AnalysisType;
  measurements: Measurements;
  /** expose the composed canvas (image+overlay+drawings) to parent for PDF */
  registerCanvas?: (canvas: HTMLCanvasElement | null) => void;
}

export default function CephalometricViewer({
  imageSrc, landmarks, onLandmarksChange,
  analysisType, measurements, registerCanvas,
}: Props) {
  const def = ANALYSES_BY_ID[analysisType];
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [tool, setTool] = useState<Tool>("none");
  const [color, setColor] = useState(COLORS[0]);
  const [strokes, setStrokes] = useState<DrawStroke[]>([]);
  const draftStroke = useRef<DrawStroke | null>(null);
  const draggingLm = useRef<number | null>(null);
  const panning = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null);
  const baseScaleRef = useRef(1);

  // Load image once
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { imgRef.current = img; redraw(); };
    img.onerror = () => {
      // retry without CORS for data: URLs that don't need it
      const i2 = new Image();
      i2.onload = () => { imgRef.current = i2; redraw(); };
      i2.src = imageSrc;
    };
    img.src = imageSrc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageSrc]);

  useEffect(() => { registerCanvas?.(canvasRef.current); return () => registerCanvas?.(null); }, [registerCanvas]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current; const img = imgRef.current;
    if (!canvas || !img) return;
    const wrap = wrapRef.current; if (!wrap) return;

    try {
    const maxW = wrap.clientWidth;
    const baseScale = Math.min(1, maxW / img.width);
    baseScaleRef.current = baseScale;
    canvas.width = img.width * baseScale;
    canvas.height = img.height * baseScale;
    const ctx = canvas.getContext("2d"); if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // apply zoom + pan
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // landmarks usados nesta análise (apenas pontos — sem linhas automáticas)
    const lmMap = new Map(landmarks.map((l) => [l.name, l]));
    const used = new Set<string>();
    def.lines.forEach((l) => { used.add(l.point1); used.add(l.point2); });
    landmarks.forEach((lm) => {
      if (!used.has(lm.name)) return;
      const x = lm.x * baseScale, y = lm.y * baseScale;
      // ponto pequeno
      ctx.beginPath(); ctx.arc(x, y, 3 / zoom, 0, 2 * Math.PI);
      ctx.fillStyle = lm.confidence > 0.8 ? "#22C55E" : "#F59E0B";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1 / zoom;
      ctx.stroke();
    });

    // manual strokes (image-space coords scaled by baseScale)
    strokes.forEach((s) => drawStroke(ctx, s, baseScale));
    if (draftStroke.current && draftStroke.current.tool !== "eraser") {
      drawStroke(ctx, draftStroke.current, baseScale);
    }

    ctx.restore();
    } catch (err) {
      console.error("[CephalometricViewer] redraw error:", err);
    }
  }, [landmarks, def, measurements, strokes, pan, zoom]);

  function drawStroke(ctx: CanvasRenderingContext2D, s: DrawStroke, baseScale: number) {
    if (!s.points || s.points.length < 1) return;
    ctx.save();
    try {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2 / zoom;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath();
    if (s.tool === "line") {
      if (s.points.length < 2) { ctx.restore(); return; }
      const a = s.points[0], b = s.points[s.points.length - 1];
      ctx.moveTo(a.x * baseScale, a.y * baseScale);
      ctx.lineTo(b.x * baseScale, b.y * baseScale);
    } else {
      if (s.points.length < 2) { ctx.restore(); return; }
      ctx.moveTo(s.points[0].x * baseScale, s.points[0].y * baseScale);
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i].x * baseScale, s.points[i].y * baseScale);
      }
    }
    ctx.stroke();
    } catch (err) {
      console.error("[CephalometricViewer] drawStroke error:", err);
    }
    ctx.restore();
  }

  useEffect(() => { redraw(); }, [redraw]);

  // map pointer event → image-space coords (accounting for zoom/pan/baseScale)
  function toImageCoords(ev: React.PointerEvent): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const cx = (ev.clientX - rect.left) * (canvas.width / rect.width);
    const cy = (ev.clientY - rect.top) * (canvas.height / rect.height);
    // reverse: pan + scale
    const x = (cx - pan.x) / zoom;
    const y = (cy - pan.y) / zoom;
    const baseScale = baseScaleRef.current || 1;
    return { x: x / baseScale, y: y / baseScale };
  }

  function findLandmarkAt(p: { x: number; y: number }): number | null {
    const used = new Set<string>();
    def.lines.forEach((l) => { used.add(l.point1); used.add(l.point2); });
    const r = 12 / (zoom);
    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i];
      if (!used.has(lm.name)) continue;
      if (Math.hypot(lm.x - p.x, lm.y - p.y) < r) return i;
    }
    return null;
  }

  function onPointerDown(ev: React.PointerEvent) {
    (ev.target as Element).setPointerCapture(ev.pointerId);
    const ip = toImageCoords(ev);

    if (tool === "none") {
      // Try landmark drag first
      const idx = findLandmarkAt(ip);
      if (idx !== null) { draggingLm.current = idx; return; }
      // else pan if zoomed
      if (zoom > 1) {
        panning.current = { sx: ev.clientX, sy: ev.clientY, px: pan.x, py: pan.y };
      }
      return;
    }

    draftStroke.current = { tool, color, points: [ip] };
    redraw();
  }

  function onPointerMove(ev: React.PointerEvent) {
    const ip = toImageCoords(ev);

    if (draggingLm.current !== null && onLandmarksChange) {
      const next = landmarks.slice();
      next[draggingLm.current] = { ...next[draggingLm.current], x: ip.x, y: ip.y };
      onLandmarksChange(next);
      return;
    }
    if (panning.current) {
      setPan({
        x: panning.current.px + (ev.clientX - panning.current.sx),
        y: panning.current.py + (ev.clientY - panning.current.sy),
      });
      return;
    }
    if (draftStroke.current) {
      draftStroke.current.points.push(ip);
      if (draftStroke.current.tool === "eraser") {
        // delete any stroke close to the eraser path
        const r = 12;
        setStrokes((prev) => prev.filter((s) => {
          if (s.tool === "eraser") return true;
          return !s.points.some((pt) => Math.hypot(pt.x - ip.x, pt.y - ip.y) < r);
        }));
      }
      redraw();
    }
  }

  function onPointerUp() {
    draggingLm.current = null;
    panning.current = null;
    if (draftStroke.current) {
      const ds = draftStroke.current;
      // Eraser nao precisa ser salvo; demais precisam de >=2 pontos
      if (ds.tool !== "eraser" && ds.points.length >= 2) {
        setStrokes((s) => [...s, ds]);
      }
      draftStroke.current = null;
      redraw();
    }
  }

  function onWheel(ev: React.WheelEvent) {
    if (!ev.ctrlKey && !ev.metaKey && Math.abs(ev.deltaY) < 30) return;
    const delta = ev.deltaY > 0 ? -0.1 : 0.1;
    setZoom((z) => Math.min(4, Math.max(0.5, +(z + delta).toFixed(2))));
  }

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 rounded-lg border bg-muted/30">
        <Button size="sm" variant={tool === "none" ? "default" : "outline"} onClick={() => setTool("none")} title="Mover/Selecionar">
          <Move className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant={tool === "pen" ? "default" : "outline"} onClick={() => setTool("pen")} title="Caneta livre">
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant={tool === "line" ? "default" : "outline"} onClick={() => setTool("line")} title="Linha reta / régua">
          <Minus className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant={tool === "eraser" ? "default" : "outline"} onClick={() => setTool("eraser")} title="Borracha">
          <Eraser className="w-3.5 h-3.5" />
        </Button>
        <div className="flex items-center gap-1 ml-1">
          {COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)} title={c}
              className={`w-5 h-5 rounded-full border-2 ${color === c ? "border-foreground" : "border-transparent"}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={() => setStrokes([])} title="Limpar anotações">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>

        <div className="ml-auto flex items-center gap-1">
          <Button size="sm" variant="outline" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}>
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <span className="text-xs w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
          <Button size="sm" variant="outline" onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))}>
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div ref={wrapRef} className="relative w-full overflow-hidden rounded-lg border bg-black"
        style={{ touchAction: "none" }}>
        <canvas
          ref={canvasRef}
          className="w-full block"
          style={{ cursor: tool === "none" ? (zoom > 1 ? "grab" : "default") : "crosshair" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
        />
      </div>

      {/* Dica */}
      <p className="text-xs text-muted-foreground">
        Apenas os pontos cefalométricos são marcados automaticamente. Use a ferramenta de
        <span className="mx-1 font-medium">linha reta</span>
        para conectar os pontos manualmente, ou arraste um ponto para reposicioná-lo.
      </p>
    </div>
  );
}