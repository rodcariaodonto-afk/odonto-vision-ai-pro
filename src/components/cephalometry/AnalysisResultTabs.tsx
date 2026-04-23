import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ruler, FileText } from "lucide-react";
import {
  AnalysisType, ANALYSES_BY_ID,
  getStatus, formatRange,
} from "@/types/cephalometric-analyses";
import { Landmark, Measurements } from "@/lib/cephalometric-math";
import CephalometricViewer from "./CephalometricViewer";

export interface AnalysisResultEntry {
  measurements: Measurements;
  interpretation: string;
}

interface Props {
  imageSrc: string;
  landmarks: Landmark[];
  onLandmarksChange: (lm: Landmark[]) => void;
  results: Partial<Record<AnalysisType, AnalysisResultEntry>>;
  selectedTypes: AnalysisType[];
  registerCanvas?: (type: AnalysisType, canvas: HTMLCanvasElement | null) => void;
}

export default function AnalysisResultTabs({
  imageSrc, landmarks, onLandmarksChange, results, selectedTypes, registerCanvas,
}: Props) {
  const [active, setActive] = useState<AnalysisType>(selectedTypes[0]);
  const def = ANALYSES_BY_ID[active];
  const cur = results[active];

  return (
    <div className="space-y-4">
      <Tabs value={active} onValueChange={(v) => setActive(v as AnalysisType)}>
        <TabsList className="flex flex-wrap h-auto">
          {selectedTypes.map((t) => (
            <TabsTrigger key={t} value={t} className="text-xs">
              {ANALYSES_BY_ID[t].name}
            </TabsTrigger>
          ))}
        </TabsList>

        {selectedTypes.map((t) => (
          <TabsContent key={t} value={t} className="mt-4 space-y-4">
            <CephalometricViewer
              imageSrc={imageSrc}
              landmarks={landmarks}
              onLandmarksChange={onLandmarksChange}
              analysisType={t}
              measurements={results[t]?.measurements ?? {}}
              registerCanvas={(c) => registerCanvas?.(t, c)}
            />
          </TabsContent>
        ))}
      </Tabs>

      {cur && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Ruler className="w-4 h-4 text-primary" />
              Medidas — {def.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Medida</th>
                    <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Valor</th>
                    <th className="text-center py-2 px-3 font-semibold text-muted-foreground">Referência</th>
                    <th className="text-center py-2 px-3 font-semibold text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {def.measures.map((m) => {
                    const v = cur.measurements[m.key];
                    if (v === undefined || v === null) return null;
                    const s = getStatus(m, v);
                    return (
                      <tr key={m.key} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2 px-3 font-medium">
                          <div>{m.name}</div>
                          <div className="text-xs text-muted-foreground font-normal">{m.description}</div>
                        </td>
                        <td className="py-2 px-3 text-right font-bold">{v}{m.unit}</td>
                        <td className="py-2 px-3 text-center text-muted-foreground text-xs">{formatRange(m)}</td>
                        <td className="py-2 px-3 text-center">
                          {s === "normal" && <Badge className="bg-green-100 text-green-700 text-xs">Normal</Badge>}
                          {s === "high" && <Badge className="bg-red-100 text-red-700 text-xs">Aumentado</Badge>}
                          {s === "low" && <Badge className="bg-amber-100 text-amber-700 text-xs">Reduzido</Badge>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {cur?.interpretation && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-4 h-4 text-primary" />
              Interpretação Clínica — {def.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{cur.interpretation}</p>
            <p className="text-xs text-muted-foreground mt-3 border-t pt-3">
              Análise gerada por IA. Ferramenta de apoio ao raciocínio clínico — deve ser validada pelo cirurgião-dentista.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}