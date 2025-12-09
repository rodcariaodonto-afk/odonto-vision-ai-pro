import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, FileImage, FileText, Download, Calendar, Clock, CheckCircle, Loader2, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface Case {
  id: string;
  name: string;
  type: string;
  date: string;
  status: "completed" | "analyzing";
  result?: {
    achados: string[];
    diagnosticos: string[];
    condutas: string[];
  };
}

const mockCases: Case[] = [
  {
    id: "1",
    name: "Radiografia Periapical - Elemento 46",
    type: "Periapical",
    date: "09/12/2024",
    status: "completed",
    result: {
      achados: ["Lesão radiolúcida periapical", "Restauração com infiltração"],
      diagnosticos: ["Periodontite apical crônica", "Cárie secundária"],
      condutas: ["Tratamento endodôntico", "Nova restauração"],
    },
  },
  {
    id: "2",
    name: "Panorâmica - Avaliação Geral",
    type: "Panorâmica",
    date: "08/12/2024",
    status: "completed",
    result: {
      achados: ["Terceiros molares impactados", "Perda óssea leve"],
      diagnosticos: ["Impactação dentária", "Doença periodontal inicial"],
      condutas: ["Avaliação cirúrgica", "Terapia periodontal"],
    },
  },
  {
    id: "3",
    name: "Tomografia - Implante região 36",
    type: "Tomografia",
    date: "07/12/2024",
    status: "completed",
    result: {
      achados: ["Altura óssea adequada", "Largura vestíbulo-lingual satisfatória"],
      diagnosticos: ["Condição favorável para implante"],
      condutas: ["Planejamento cirúrgico", "Guia cirúrgico"],
    },
  },
  {
    id: "4",
    name: "Bitewing - Cáries Interproximais",
    type: "Bitewing",
    date: "06/12/2024",
    status: "analyzing",
  },
];

export default function Cases() {
  const [search, setSearch] = useState("");
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);

  const filteredCases = mockCases.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.type.toLowerCase().includes(search.toLowerCase())
  );

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "periapical":
      case "panorâmica":
      case "bitewing":
        return <FileImage className="w-5 h-5" />;
      case "tomografia":
        return <FileText className="w-5 h-5" />;
      default:
        return <FileImage className="w-5 h-5" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Meus Casos</h1>
        <p className="text-muted-foreground mt-1">
          Histórico de análises realizadas
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Buscar casos..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Cases List */}
      <div className="space-y-3">
        {filteredCases.map((c) => (
          <Card
            key={c.id}
            variant="interactive"
            onClick={() => c.status === "completed" && setSelectedCase(c)}
            className={cn(c.status === "analyzing" && "opacity-70 cursor-default")}
          >
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "p-3 rounded-xl",
                    c.status === "completed" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}
                >
                  {getTypeIcon(c.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">
                    {c.name}
                  </h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {c.date}
                    </span>
                    <Badge variant={c.status === "completed" ? "default" : "secondary"}>
                      {c.type}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {c.status === "completed" ? (
                    <>
                      <span className="flex items-center gap-1 text-sm text-success">
                        <CheckCircle className="w-4 h-4" />
                        Concluído
                      </span>
                      <Button variant="ghost" size="icon">
                        <Eye className="w-5 h-5" />
                      </Button>
                    </>
                  ) : (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Em análise
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredCases.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Nenhum caso encontrado.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Case Detail Dialog */}
      <Dialog open={!!selectedCase} onOpenChange={() => setSelectedCase(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedCase && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-success" />
                  {selectedCase.name}
                </DialogTitle>
                <DialogDescription>
                  {selectedCase.type} • {selectedCase.date}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {selectedCase.result && (
                  <>
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Achados Clínicos</h4>
                      <ul className="space-y-1">
                        {selectedCase.result.achados.map((a, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Diagnósticos</h4>
                      <ul className="space-y-1">
                        {selectedCase.result.diagnosticos.map((d, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-success mt-2" />
                            {d}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Condutas Sugeridas</h4>
                      <ul className="space-y-1">
                        {selectedCase.result.condutas.map((c, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                <div className="flex gap-3 pt-4">
                  <Button variant="success" className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Baixar PDF
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedCase(null)}>
                    Fechar
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
