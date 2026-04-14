import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Pen, Eraser, Undo2, Redo2, Trash2, Download, Palette, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DrawingCanvasProps {
  imageUrl: string;
  onSave?: (dataUrl: string) => void;
  className?: string;
}

interface DrawingPath {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
  tool: "pen" | "eraser";
}

const COLORS = [
  "#EF4444", "#F59E0B", "#22C55E", "#3B82F6",
  "#8B5CF6", "#EC4899", "#14B8A6", "#FFFFFF", "#000000",
];

export function DrawingCanvas({ imageUrl, onSave, className }: DrawingCanvasProps) {
  const bgCanvasRef   = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef  = useRef<HTMLDivElement>(null);

  const [tool, setTool]           = useState<"pen" | "eraser">("pen");
  const [color, setColor]         = useState("#EF4444");
  const [brushSize, setBrushSize] = useState(3);
  const [paths, setPaths]         = useState<DrawingPath[]>([]);
  const [undoStack, setUndoStack] = useState<DrawingPath[][]>([]);
  const [redoStack, setRedoStack] = useState<DrawingPath[][]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [imageLoaded, setImageLoaded] = useState(false);

  const isDrawingRef    = useRef(false);
  const currentPathRef  = useRef<DrawingPath | null>(null);
  const pathsRef        = useRef<DrawingPath[]>([]);

  useEffect(() => { pathsRef.current = paths; }, [paths]);

  // Load image into background canvas once — never redraws
  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const maxW = containerRef.current?.clientWidth || 800;
      const ratio = img.height / img.width;
      const w = Math.min(img.width, maxW);
      const h = w * ratio;
      setCanvasSize({ width: w, height: h });

      const bg = bgCanvasRef.current;
      if (!bg) return;
      bg.width  = w;
      bg.height = h;
      bg.getContext("2d")?.drawImage(img, 0, 0, w, h);
      setImageLoaded(true);
    };
    img.onerror = () => toast.error("Erro ao carregar imagem no canvas");
    img.src = imageUrl;
  }, [imageUrl]);

  // Sync draw canvas dimensions
  useEffect(() => {
    const dc = drawCanvasRef.current;
    if (!dc || !imageLoaded) return;
    dc.width  = canvasSize.width;
    dc.height = canvasSize.height;
    redrawPaths(pathsRef.current);
  }, [canvasSize, imageLoaded]);

  // Redraw ONLY the drawing layer — image layer untouched
  const redrawPaths = useCallback((allPaths: DrawingPath[], activePath?: DrawingPath | null) => {
    const dc = drawCanvasRef.current;
    if (!dc) return;
    const ctx = dc.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, dc.width, dc.height);

    [...allPaths, activePath].filter(Boolean).forEach((path) => {
      if (!path || path.points.length < 2) return;
      ctx.beginPath();
      ctx.lineCap   = "round";
      ctx.lineJoin  = "round";
      ctx.lineWidth = path.width;

      if (path.tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = path.color;
      }

      ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
      }
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
    });
  }, []);

  useEffect(() => {
    if (imageLoaded) redrawPaths(paths);
  }, [paths, imageLoaded, redrawPaths]);

  // Coordinate helper — works for mouse and touch
  const getCoords = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    const dc = drawCanvasRef.current;
    if (!dc) return null;
    const rect   = dc.getBoundingClientRect();
    const scaleX = dc.width  / rect.width;
    const scaleY = dc.height / rect.height;
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const coords = getCoords(e);
    if (!coords) return;
    isDrawingRef.current   = true;
    currentPathRef.current = { id: `path_${Date.now()}`, points: [coords], color, width: brushSize, tool };
    setUndoStack(prev => [...prev, pathsRef.current]);
    setRedoStack([]);
  }, [color, brushSize, tool]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawingRef.current || !currentPathRef.current) return;
    const coords = getCoords(e);
    if (!coords) return;
    currentPathRef.current = { ...currentPathRef.current, points: [...currentPathRef.current.points, coords] };
    redrawPaths(pathsRef.current, currentPathRef.current);
  }, [redrawPaths]);

  const stopDrawing = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
    e?.preventDefault();
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const completed = currentPathRef.current;
    currentPathRef.current = null;
    if (completed && completed.points.length > 1) {
      setPaths(prev => {
        const updated = [...prev, completed];
        pathsRef.current = updated;
        redrawPaths(updated);
        return updated;
      });
    }
  }, [redrawPaths]);

  const handleUndo = () => {
    if (!undoStack.length) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack(r => [...r, paths]);
    setPaths(prev);
    setUndoStack(u => u.slice(0, -1));
  };

  const handleRedo = () => {
    if (!redoStack.length) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(u => [...u, paths]);
    setPaths(next);
    setRedoStack(r => r.slice(0, -1));
  };

  const handleClear = () => {
    setUndoStack(u => [...u, paths]);
    setRedoStack([]);
    setPaths([]);
    toast.success("Desenhos apagados");
  };

  // Merge both canvases for download/save
  const getMergedDataUrl = (): string | null => {
    const bg = bgCanvasRef.current;
    const dc = drawCanvasRef.current;
    if (!bg || !dc) return null;
    const merged = document.createElement("canvas");
    merged.width  = bg.width;
    merged.height = bg.height;
    const ctx = merged.getContext("2d")!;
    ctx.drawImage(bg, 0, 0);
    ctx.drawImage(dc, 0, 0);
    return merged.toDataURL("image/png");
  };

  const handleDownload = () => {
    const url = getMergedDataUrl();
    if (!url) return;
    const link = document.createElement("a");
    link.download = `radiografia-anotada-${Date.now()}.png`;
    link.href = url;
    link.click();
    toast.success("Imagem baixada com sucesso");
  };

  const handleSave = () => {
    const url = getMergedDataUrl();
    if (!url || !onSave) return;
    onSave(url);
    toast.success("Anotações salvas");
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-0">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 p-3 border-b bg-muted/30">
          <div className="flex gap-1">
            <Button variant={tool === "pen" ? "default" : "outline"} size="sm"
              className="min-h-[44px] min-w-[44px] touch-manipulation" onClick={() => setTool("pen")} title="Caneta">
              <Pen className="w-4 h-4" />
            </Button>
            <Button variant={tool === "eraser" ? "default" : "outline"} size="sm"
              className="min-h-[44px] min-w-[44px] touch-manipulation" onClick={() => setTool("eraser")} title="Borracha">
              <Eraser className="w-4 h-4" />
            </Button>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 min-h-[44px] touch-manipulation">
                <div className="w-5 h-5 rounded-full border border-border" style={{ backgroundColor: color }} />
                <Palette className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="start">
              <div className="grid grid-cols-5 gap-3">
                {COLORS.map(c => (
                  <button key={c}
                    className={cn("w-10 h-10 rounded-full border-2 transition-transform hover:scale-110 touch-manipulation",
                      color === c ? "border-primary ring-2 ring-primary/30" : "border-border")}
                    style={{ backgroundColor: c }} onClick={() => setColor(c)} />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <div className="hidden xs:flex items-center gap-2 min-w-[120px]">
            <Circle className="w-3 h-3 text-muted-foreground" />
            <Slider value={[brushSize]} onValueChange={([v]) => setBrushSize(v)} min={1} max={20} step={1} className="flex-1" />
            <span className="text-xs text-muted-foreground w-5">{brushSize}</span>
          </div>

          <div className="h-6 w-px bg-border mx-1 hidden sm:block" />

          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="min-h-[44px] min-w-[44px] touch-manipulation"
              onClick={handleUndo} disabled={!undoStack.length} title="Desfazer"><Undo2 className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" className="min-h-[44px] min-w-[44px] touch-manipulation"
              onClick={handleRedo} disabled={!redoStack.length} title="Refazer"><Redo2 className="w-4 h-4" /></Button>
          </div>

          <div className="h-6 w-px bg-border mx-1 hidden sm:block" />

          <div className="flex gap-1 ml-auto">
            <Button variant="outline" size="sm" className="min-h-[44px] min-w-[44px] touch-manipulation"
              onClick={handleClear} title="Limpar tudo"><Trash2 className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" className="min-h-[44px] min-w-[44px] touch-manipulation"
              onClick={handleDownload} title="Baixar imagem"><Download className="w-4 h-4" /></Button>
            {onSave && (
              <Button size="sm" className="min-h-[44px] touch-manipulation" onClick={handleSave}>
                <span className="hidden sm:inline">Salvar Anotações</span>
                <span className="sm:hidden">Salvar</span>
              </Button>
            )}
          </div>
        </div>

        {/* Canvas stack */}
        <div ref={containerRef} className="relative overflow-auto bg-black/5" style={{ maxHeight: "60vh" }}>
          {/* Background image layer — never redrawn after initial load */}
          <canvas ref={bgCanvasRef}
            style={{ display: "block", maxWidth: "100%", position: "absolute", top: 0, left: 0, pointerEvents: "none" }} />
          {/* Drawing layer on top */}
          <canvas ref={drawCanvasRef}
            width={canvasSize.width} height={canvasSize.height}
            style={{ display: "block", maxWidth: "100%", position: "relative" }}
            className={cn("touch-none", tool === "eraser" ? "cursor-cell" : "cursor-crosshair")}
            onMouseDown={startDrawing} onMouseMove={draw}
            onMouseUp={stopDrawing}   onMouseLeave={() => stopDrawing()}
            onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={() => stopDrawing()} />
        </div>

        <div className="p-3 bg-muted/20 border-t text-xs text-muted-foreground text-center">
          {paths.length} anotaç{paths.length !== 1 ? "ões" : "ão"} • Desenhe diretamente na radiografia • Touch suportado
        </div>
      </CardContent>
    </Card>
  );
}
