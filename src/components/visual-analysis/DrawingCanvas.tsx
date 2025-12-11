import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Pen, Eraser, Undo2, Redo2, Trash2, Download, Palette, Circle, Square, Minus } from "lucide-react";
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
  "#EF4444", // Red
  "#F59E0B", // Amber
  "#22C55E", // Green
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#14B8A6", // Teal
  "#FFFFFF", // White
  "#000000", // Black
];

export function DrawingCanvas({ imageUrl, onSave, className }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState("#EF4444");
  const [brushSize, setBrushSize] = useState(3);
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [currentPath, setCurrentPath] = useState<DrawingPath | null>(null);
  const [undoStack, setUndoStack] = useState<DrawingPath[][]>([]);
  const [redoStack, setRedoStack] = useState<DrawingPath[][]>([]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  // Load image and set canvas size
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const maxWidth = containerRef.current?.clientWidth || 800;
      const aspectRatio = img.height / img.width;
      const width = Math.min(img.width, maxWidth);
      const height = width * aspectRatio;
      
      setCanvasSize({ width, height });
      setImageLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Redraw canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Draw all paths
      [...paths, currentPath].filter(Boolean).forEach((path) => {
        if (!path || path.points.length < 2) return;
        
        ctx.beginPath();
        ctx.strokeStyle = path.tool === "eraser" ? "rgba(0,0,0,0)" : path.color;
        ctx.lineWidth = path.width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        
        if (path.tool === "eraser") {
          ctx.globalCompositeOperation = "destination-out";
        } else {
          ctx.globalCompositeOperation = "source-over";
        }
        
        ctx.moveTo(path.points[0].x, path.points[0].y);
        for (let i = 1; i < path.points.length; i++) {
          ctx.lineTo(path.points[i].x, path.points[i].y);
        }
        ctx.stroke();
        ctx.globalCompositeOperation = "source-over";
      });
    };
    img.src = imageUrl;
  }, [paths, currentPath, imageUrl]);

  useEffect(() => {
    if (imageLoaded) {
      redrawCanvas();
    }
  }, [imageLoaded, redrawCanvas]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const coords = getCoordinates(e);
    if (!coords) return;

    setIsDrawing(true);
    const newPath: DrawingPath = {
      id: `path_${Date.now()}`,
      points: [coords],
      color,
      width: brushSize,
      tool,
    };
    setCurrentPath(newPath);
    
    // Save current state for undo
    setUndoStack((prev) => [...prev, paths]);
    setRedoStack([]);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !currentPath) return;
    
    const coords = getCoordinates(e);
    if (!coords) return;

    setCurrentPath((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        points: [...prev.points, coords],
      };
    });
  };

  const stopDrawing = () => {
    if (currentPath && currentPath.points.length > 1) {
      setPaths((prev) => [...prev, currentPath]);
    }
    setCurrentPath(null);
    setIsDrawing(false);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    
    const previousPaths = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [...prev, paths]);
    setPaths(previousPaths);
    setUndoStack((prev) => prev.slice(0, -1));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    
    const nextPaths = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [...prev, paths]);
    setPaths(nextPaths);
    setRedoStack((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setUndoStack((prev) => [...prev, paths]);
    setRedoStack([]);
    setPaths([]);
    toast.success("Desenhos apagados");
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = "radiografia-anotada.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("Imagem baixada com sucesso");
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    onSave?.(dataUrl);
    toast.success("Anotações salvas");
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-0">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 p-3 border-b bg-muted/30">
          {/* Tool Selection */}
          <div className="flex gap-1">
            <Button
              variant={tool === "pen" ? "default" : "outline"}
              size="sm"
              onClick={() => setTool("pen")}
              title="Caneta"
            >
              <Pen className="w-4 h-4" />
            </Button>
            <Button
              variant={tool === "eraser" ? "default" : "outline"}
              size="sm"
              onClick={() => setTool("eraser")}
              title="Borracha"
            >
              <Eraser className="w-4 h-4" />
            </Button>
          </div>

          {/* Color Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <div
                  className="w-4 h-4 rounded-full border border-border"
                  style={{ backgroundColor: color }}
                />
                <Palette className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="start">
              <div className="grid grid-cols-5 gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-transform hover:scale-110",
                      color === c ? "border-primary ring-2 ring-primary/30" : "border-border"
                    )}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Brush Size */}
          <div className="flex items-center gap-2 min-w-[140px]">
            <Circle className="w-3 h-3 text-muted-foreground" />
            <Slider
              value={[brushSize]}
              onValueChange={([v]) => setBrushSize(v)}
              min={1}
              max={20}
              step={1}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-5">{brushSize}</span>
          </div>

          <div className="h-6 w-px bg-border mx-1" />

          {/* Undo/Redo */}
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              title="Desfazer"
            >
              <Undo2 className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              title="Refazer"
            >
              <Redo2 className="w-4 h-4" />
            </Button>
          </div>

          <div className="h-6 w-px bg-border mx-1" />

          {/* Actions */}
          <Button variant="outline" size="sm" onClick={handleClear} title="Limpar tudo">
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload} title="Baixar imagem">
            <Download className="w-4 h-4" />
          </Button>
          {onSave && (
            <Button size="sm" onClick={handleSave}>
              Salvar Anotações
            </Button>
          )}
        </div>

        {/* Canvas Container */}
        <div 
          ref={containerRef} 
          className="relative overflow-auto bg-black/5"
          style={{ maxHeight: "60vh" }}
        >
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className={cn(
              "max-w-full cursor-crosshair touch-none",
              tool === "eraser" && "cursor-cell"
            )}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>

        {/* Info */}
        <div className="p-2 bg-muted/20 border-t text-xs text-muted-foreground text-center">
          {paths.length} anotação{paths.length !== 1 ? "ões" : ""} • Desenhe diretamente na radiografia
        </div>
      </CardContent>
    </Card>
  );
}
