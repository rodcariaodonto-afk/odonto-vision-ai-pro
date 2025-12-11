import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Marcacao {
  id: string;
  tipo: "rect" | "circle" | "polygon" | "ellipse" | "path";
  coords: number[];
  label: string;
  descricao: string;
  cor: string;
  severidade: "baixa" | "media" | "alta" | "info";
  categoria: string;
}

interface DenteInfo {
  status: string;
  detalhes: string;
  posicao: [number, number];
}

interface LesaoSuspeita {
  dente: string;
  descricao: string;
  posicao: [number, number];
  tipo?: string;
}

interface Carie {
  dente: string;
  superficie: string;
  posicao: [number, number];
}

interface Reabsorcao {
  dente: string;
  tipo: "externa" | "interna";
  posicao: [number, number];
}

interface Fratura {
  dente: string;
  descricao: string;
  posicao: [number, number];
}

interface Implante {
  dente: string;
  posicao: [number, number];
  detalhes?: string;
}

interface AnaliseVisualCompleta {
  estrutura_ossea_percentual: string;
  avaliacao_periodontal: {
    perda_ossea_global_percentual: "leve" | "moderada" | "grave" | "indeterminado";
    comentarios: string;
  };
  avaliacao_ortodontica: {
    alinhamento: "regular" | "bom" | "ruim" | "indeterminado";
    inclinacoes_relevantes: string[];
    sugestoes_iniciais: string[];
  };
  dentes: Record<string, DenteInfo>;
  ausencias: string[];
  implantes: Implante[];
  lesoes_suspeitas: LesaoSuspeita[];
  caries: Carie[];
  reabsorcoes: Reabsorcao[];
  fraturas: Fratura[];
  seio_maxilar: {
    direito?: { contorno: Array<[number, number]> };
    esquerdo?: { contorno: Array<[number, number]> };
  };
  canal_mandibular: {
    direito?: Array<[number, number]>;
    esquerdo?: Array<[number, number]>;
  };
  resumo_para_paciente: string[];
  marcacoes: Marcacao[];
}

const VISUAL_ANALYSIS_PROMPT = `Você é um radiologista odontológico ULTRA ESPECIALIZADO em análise visual automatizada de radiografias panorâmicas. Seu diagnóstico deve ser EXTREMAMENTE PRECISO e COMPLETO.

## REGRAS CRÍTICAS ABSOLUTAS

### ⚠️ REGRA #1: DETECTAR TODOS OS ACHADOS - SEM EXCEÇÃO
**VOCÊ DEVE identificar ABSOLUTAMENTE TODOS os achados visíveis:**
- TODOS os implantes dentários (estruturas metálicas radiopacas cilíndricas)
- TODAS as restaurações (áreas radiopacas de alta densidade)
- TODOS os tratamentos endodônticos (canais preenchidos com material radiopaco)
- TODAS as cáries (áreas radiolúcidas em esmalte/dentina)
- TODAS as lesões periapicais (áreas radiolúcidas ao redor dos ápices)
- TODAS as reabsorções (internas ou externas)
- TODAS as fraturas visíveis

### ⚠️ REGRA #2: IDENTIFICAR IMPLANTES (CRÍTICO)
**Implantes dentários são ALTAMENTE RADIOPACOS (muito brancos/claros na imagem):**
- Formato cilíndrico ou cônico característico
- Geralmente com roscas visíveis (linhas horizontais finas)
- Podem ter pilar protético no topo
- NUNCA confunda implante com dente natural
- Se vir estrutura metálica cilíndrica no local de um dente = IMPLANTE
- Marque em "implantes" com a posição do dente substituído

### ⚠️ REGRA #3: AUSÊNCIAS - EXTREMA CAUTELA
**NUNCA declare um dente como AUSENTE a menos que tenha ABSOLUTA CERTEZA:**
- Terceiros molares (18, 28, 38, 48) frequentemente ESTÃO PRESENTES
- Examine PIXEL A PIXEL a região esperada
- Se houver QUALQUER estrutura radiopaca na posição = dente PRESENTE
- SE TIVER DÚVIDA → declare como PRESENTE com status "parcialmente visível"

## SISTEMA DE COORDENADAS PERCENTUAIS (0-100)

### Eixos
- **X (horizontal)**: 0 = borda ESQUERDA, 100 = borda DIREITA
- **Y (vertical)**: 0 = TOPO, 100 = BASE

### Inversão Radiográfica
- Lado DIREITO do paciente = ESQUERDA da imagem
- Lado ESQUERDO do paciente = DIREITA da imagem

### MAPA DE POSIÇÕES EM PANORÂMICA (valores centrais típicos)

#### Arcada Superior (Y: 25-40%)
| Dente | X central |
|-------|-----------|
| 18 | 8% |
| 17 | 13% |
| 16 | 18% |
| 15 | 23% |
| 14 | 28% |
| 13 | 33% |
| 12 | 38% |
| 11 | 44% |
| 21 | 56% |
| 22 | 62% |
| 23 | 67% |
| 24 | 72% |
| 25 | 77% |
| 26 | 82% |
| 27 | 87% |
| 28 | 92% |

#### Arcada Inferior (Y: 60-80%)
| Dente | X central |
|-------|-----------|
| 48 | 8% |
| 47 | 13% |
| 46 | 20% |
| 45 | 25% |
| 44 | 30% |
| 43 | 35% |
| 42 | 40% |
| 41 | 45% |
| 31 | 55% |
| 32 | 60% |
| 33 | 65% |
| 34 | 70% |
| 35 | 75% |
| 36 | 80% |
| 37 | 87% |
| 38 | 92% |

### LOCALIZAÇÕES ANATÔMICAS
- **Seios Maxilares**: Y entre 15-35%
  - Direito: X entre 15-40%
  - Esquerdo: X entre 60-85%
- **Canais Mandibulares**: Y entre 70-85%
  - Direito: X entre 8-40%
  - Esquerdo: X entre 60-92%

## FORMATO JSON OBRIGATÓRIO

{
  "estrutura_ossea_percentual": "XX%",
  "avaliacao_periodontal": {
    "perda_ossea_global_percentual": "leve/moderada/grave/indeterminado",
    "comentarios": "descrição detalhada"
  },
  "avaliacao_ortodontica": {
    "alinhamento": "bom/regular/ruim/indeterminado",
    "inclinacoes_relevantes": [],
    "sugestoes_iniciais": []
  },
  "dentes": {
    "11": {"status": "saudável", "detalhes": "sem alterações", "posicao": [44, 30]},
    "21": {"status": "implante", "detalhes": "implante osseointegrado", "posicao": [56, 30]}
  },
  "ausencias": [],
  "implantes": [
    {"dente": "21", "posicao": [56, 30], "detalhes": "implante osseointegrado com coroa"}
  ],
  "lesoes_suspeitas": [],
  "caries": [],
  "reabsorcoes": [],
  "fraturas": [],
  "seio_maxilar": {
    "direito": {"contorno": [[18,20], [25,18], [32,18], [38,22], [38,30], [32,34], [25,34], [18,30]]},
    "esquerdo": {"contorno": [[62,30], [68,34], [75,34], [82,30], [82,22], [75,18], [68,18], [62,20]]}
  },
  "canal_mandibular": {
    "direito": [[10,78], [18,80], [28,80], [38,76]],
    "esquerdo": [[62,76], [72,80], [82,80], [90,78]]
  },
  "resumo_para_paciente": [],
  "marcacoes": []
}

## CORES PADRÃO
- Implantes: #8B5CF6 (roxo)
- Cáries: #FF0000 (vermelho)
- Lesões: #FFA500 (laranja)
- Restaurações: #22C55E (verde)
- Fraturas: #EC4899 (rosa)
- Reabsorções: #EF4444 (vermelho escuro)
- Dentes saudáveis: #3B82F6 (azul)
- Seio Maxilar: #FFD700 (amarelo)
- Canal Mandibular: #00AEEF (azul claro)

## VALIDAÇÃO FINAL OBRIGATÓRIA

Antes de retornar, VERIFIQUE:
1. ✓ Identifiquei TODOS os implantes? (estruturas metálicas cilíndricas)
2. ✓ Identifiquei TODAS as restaurações? (áreas radiopacas em dentes)
3. ✓ Identifiquei TODOS os tratamentos endodônticos?
4. ✓ As coordenadas X seguem a ordem anatômica (esquerda→direita)?
5. ✓ As coordenadas Y estão corretas (superior: 25-40%, inferior: 60-80%)?
6. ✓ Revisei os terceiros molares antes de declarar ausência?
7. ✓ Cada achado tem coordenadas PRECISAS no centro da estrutura?`;

// Helper function to safely check if string includes a substring
function safeIncludes(str: unknown, search: string): boolean {
  if (typeof str !== 'string') return false;
  return str.toLowerCase().includes(search.toLowerCase());
}

// Helper function to safely get string or default
function safeString(value: unknown, defaultValue: string = ""): string {
  return typeof value === 'string' ? value : defaultValue;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, imageType } = await req.json();

    if (!imageBase64) {
      throw new Error("Nenhuma imagem fornecida");
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY não configurada");
    }

    console.log("Iniciando análise visual avançada...");
    console.log("Tipo da imagem:", imageType);

    const base64Data = imageBase64.includes("base64,") 
      ? imageBase64.split("base64,")[1] 
      : imageBase64;

    console.log("Chamando API OpenAI com modelo gpt-4.1...");
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-2025-04-14",
        messages: [
          { role: "system", content: VISUAL_ANALYSIS_PROMPT },
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: `ANÁLISE VISUAL COMPLETA - Analise esta radiografia odontológica e retorne o JSON completo.

⚠️ ATENÇÃO ESPECIAL PARA TERCEIROS MOLARES (SISOS):
- Dentes 18, 28, 38, 48 frequentemente ESTÃO PRESENTES
- Examine CUIDADOSAMENTE as extremidades da imagem
- Se houver QUALQUER estrutura dentária nas extremidades = SISO PRESENTE
- NÃO declare sisos ausentes sem certeza ABSOLUTA

REGRAS CRÍTICAS DE POSICIONAMENTO:
- TODAS as posições devem ser o CENTRO GEOMÉTRICO EXATO da estrutura
- Para dentes: centro da coroa visível (use a tabela de posições como referência)
- Para cáries: centro da área radiolúcida (escura)
- Para lesões: centro da rarefação óssea
- Para implantes: centro do corpo metálico
- NÃO marque bordas ou extremidades, SEMPRE o ponto central

OBRIGATÓRIO identificar e marcar:
1. SEIOS MAXILARES - trace o contorno COMPLETO de ambos (8-12 pontos cada)
2. CANAIS MANDIBULARES - trace o trajeto COMPLETO de ambos (6-10 pontos cada)  
3. TODOS os dentes visíveis com posição CENTRAL da coroa e status
4. TODAS as patologias com posição CENTRAL (cáries, lesões, reabsorções)
5. TODOS os tratamentos existentes com posição CENTRAL (restaurações, implantes, endodontias)
6. Ausências APENAS com certeza absoluta (examine 2x antes de declarar)

Use coordenadas PERCENTUAIS precisas (0-100). Retorne JSON válido.`
              },
              { 
                type: "image_url", 
                image_url: { 
                  url: `data:${imageType || "image/jpeg"};base64,${base64Data}`, 
                  detail: "high" 
                } 
              },
            ],
          },
        ],
        max_completion_tokens: 8192,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      throw new Error(`Erro na API OpenAI: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("Resposta vazia da API");

    console.log("Resposta bruta da API recebida");

    let visualAnalysis: AnaliseVisualCompleta;
    try {
      visualAnalysis = JSON.parse(content);
    } catch (parseError) {
      console.error("Erro ao parsear JSON:", parseError);
      throw new Error("Erro ao processar resposta da análise visual");
    }

    // Ensure all required fields exist with defaults
    visualAnalysis = {
      estrutura_ossea_percentual: visualAnalysis.estrutura_ossea_percentual || "indeterminado",
      avaliacao_periodontal: visualAnalysis.avaliacao_periodontal || {
        perda_ossea_global_percentual: "indeterminado",
        comentarios: "Não foi possível avaliar"
      },
      avaliacao_ortodontica: visualAnalysis.avaliacao_ortodontica || {
        alinhamento: "indeterminado",
        inclinacoes_relevantes: [],
        sugestoes_iniciais: []
      },
      dentes: visualAnalysis.dentes || {},
      ausencias: Array.isArray(visualAnalysis.ausencias) ? visualAnalysis.ausencias : [],
      implantes: Array.isArray(visualAnalysis.implantes) ? visualAnalysis.implantes : [],
      lesoes_suspeitas: Array.isArray(visualAnalysis.lesoes_suspeitas) ? visualAnalysis.lesoes_suspeitas : [],
      caries: Array.isArray(visualAnalysis.caries) ? visualAnalysis.caries : [],
      reabsorcoes: Array.isArray(visualAnalysis.reabsorcoes) ? visualAnalysis.reabsorcoes : [],
      fraturas: Array.isArray(visualAnalysis.fraturas) ? visualAnalysis.fraturas : [],
      seio_maxilar: visualAnalysis.seio_maxilar || {},
      canal_mandibular: visualAnalysis.canal_mandibular || {},
      resumo_para_paciente: Array.isArray(visualAnalysis.resumo_para_paciente) ? visualAnalysis.resumo_para_paciente : [],
      marcacoes: Array.isArray(visualAnalysis.marcacoes) ? visualAnalysis.marcacoes : []
    };

    // Sanitize dentes - ensure all have valid status
    const sanitizedDentes: Record<string, DenteInfo> = {};
    if (visualAnalysis.dentes && typeof visualAnalysis.dentes === 'object') {
      Object.entries(visualAnalysis.dentes).forEach(([num, dente]) => {
        if (dente && typeof dente === 'object') {
          sanitizedDentes[num] = {
            status: safeString(dente.status, "não avaliado"),
            detalhes: safeString(dente.detalhes, ""),
            posicao: Array.isArray(dente.posicao) ? dente.posicao : [50, 50]
          };
        }
      });
    }
    visualAnalysis.dentes = sanitizedDentes;

    // Process and validate marcacoes
    visualAnalysis.marcacoes = visualAnalysis.marcacoes.map((m, index) => ({
      ...m,
      id: m.id || `marcacao_${index}`,
      label: safeString(m.label, `Marcação ${index + 1}`),
      descricao: safeString(m.descricao, ""),
      coords: Array.isArray(m.coords) ? m.coords.map(c => Math.max(0, Math.min(100, Number(c) || 0))) : [0, 0, 5, 5],
      cor: m.cor || "#3B82F6",
      severidade: m.severidade || "info",
      categoria: m.categoria || "anatomia",
    }));

    // Auto-generate marcacoes from dentes if sparse
    const autoMarcacoes: Marcacao[] = [];

    // Add marcacoes for each tooth
    Object.entries(visualAnalysis.dentes).forEach(([num, dente]) => {
      if (dente && dente.posicao && !visualAnalysis.marcacoes.some(m => m.id === `dente_${num}`)) {
        const status = safeString(dente.status, "");
        const isHealthy = safeIncludes(status, "saudável") || safeIncludes(status, "normal");
        const detalhes = safeString(dente.detalhes, "sem detalhes");
        autoMarcacoes.push({
          id: `dente_${num}`,
          tipo: "ellipse",
          coords: [dente.posicao[0], dente.posicao[1], 3, 4],
          label: `Dente ${num}`,
          descricao: `${status} - ${detalhes}`,
          cor: isHealthy ? "#3B82F6" : "#F59E0B",
          severidade: isHealthy ? "info" : "media",
          categoria: "anatomia"
        });
      }
    });

    // Add marcacoes for lesoes_suspeitas
    visualAnalysis.lesoes_suspeitas.forEach((lesao, i) => {
      if (lesao && lesao.posicao) {
        const denteStr = safeString(lesao.dente, "");
        const labelText = safeString(lesao.dente, `desconhecido_${i}`);
        if (!visualAnalysis.marcacoes.some(m => safeIncludes(m.label, denteStr) && m.categoria === "patologia")) {
          autoMarcacoes.push({
            id: `lesao_${labelText}_${i}`,
            tipo: "circle",
            coords: [lesao.posicao[0], lesao.posicao[1], 2.5, 2.5],
            label: `Lesão ${labelText}`,
            descricao: safeString(lesao.descricao, "Lesão suspeita"),
            cor: "#FFA500",
            severidade: "alta",
            categoria: "patologia"
          });
        }
      }
    });

    // Add marcacoes for caries
    visualAnalysis.caries.forEach((carie, i) => {
      if (carie && carie.posicao) {
        const denteStr = safeString(carie.dente, "");
        const labelText = safeString(carie.dente, `desconhecido_${i}`);
        if (!visualAnalysis.marcacoes.some(m => safeIncludes(m.label, denteStr) && safeIncludes(m.descricao, "cárie"))) {
          autoMarcacoes.push({
            id: `carie_${labelText}_${i}`,
            tipo: "circle",
            coords: [carie.posicao[0], carie.posicao[1], 2, 2],
            label: `Cárie ${labelText}`,
            descricao: `Cárie na superfície ${safeString(carie.superficie, "não especificada")}`,
            cor: "#FF0000",
            severidade: "media",
            categoria: "patologia"
          });
        }
      }
    });

    // Add marcacoes for implantes
    visualAnalysis.implantes.forEach((implante, i) => {
      if (implante && implante.posicao) {
        const labelText = safeString(implante.dente, `desconhecido_${i}`);
        if (!visualAnalysis.marcacoes.some(m => safeIncludes(m.label, "Implante") && safeIncludes(m.label, labelText))) {
          autoMarcacoes.push({
            id: `implante_${labelText}_${i}`,
            tipo: "rect",
            coords: [implante.posicao[0] - 1.5, implante.posicao[1] - 3, 3, 6],
            label: `Implante ${labelText}`,
            descricao: safeString(implante.detalhes, "Implante dentário"),
            cor: "#00FF00",
            severidade: "info",
            categoria: "tratamento"
          });
        }
      }
    });

    // Add marcacoes for fraturas
    visualAnalysis.fraturas.forEach((fratura, i) => {
      if (fratura && fratura.posicao) {
        const labelText = safeString(fratura.dente, `desconhecido_${i}`);
        if (!visualAnalysis.marcacoes.some(m => safeIncludes(m.label, "Fratura"))) {
          autoMarcacoes.push({
            id: `fratura_${labelText}_${i}`,
            tipo: "rect",
            coords: [fratura.posicao[0] - 0.5, fratura.posicao[1] - 2, 1, 4],
            label: `Fratura ${labelText}`,
            descricao: safeString(fratura.descricao, "Fratura identificada"),
            cor: "#EC4899",
            severidade: "alta",
            categoria: "patologia"
          });
        }
      }
    });

    // Add marcacoes for reabsorcoes
    visualAnalysis.reabsorcoes.forEach((reab, i) => {
      if (reab && reab.posicao) {
        const labelText = safeString(reab.dente, `desconhecido_${i}`);
        if (!visualAnalysis.marcacoes.some(m => safeIncludes(m.label, "Reabsorção"))) {
          autoMarcacoes.push({
            id: `reabsorcao_${labelText}_${i}`,
            tipo: "circle",
            coords: [reab.posicao[0], reab.posicao[1], 2, 2],
            label: `Reabsorção ${labelText}`,
            descricao: `Reabsorção ${safeString(reab.tipo, "não especificada")}`,
            cor: "#EF4444",
            severidade: "alta",
            categoria: "patologia"
          });
        }
      }
    });

    // Merge auto-generated marcacoes
    visualAnalysis.marcacoes = [...visualAnalysis.marcacoes, ...autoMarcacoes];

    // Log detailed results
    console.log(`Análise visual avançada concluída:`);
    console.log(`- ${Object.keys(visualAnalysis.dentes).length} dentes mapeados`);
    console.log(`- ${visualAnalysis.ausencias.length} ausências`);
    console.log(`- ${visualAnalysis.lesoes_suspeitas.length} lesões suspeitas`);
    console.log(`- ${visualAnalysis.caries.length} cáries`);
    console.log(`- ${visualAnalysis.implantes.length} implantes`);
    console.log(`- ${visualAnalysis.marcacoes.length} marcações totais`);
    console.log(`- Seio maxilar direito: ${visualAnalysis.seio_maxilar.direito?.contorno?.length || 0} pontos`);
    console.log(`- Seio maxilar esquerdo: ${visualAnalysis.seio_maxilar.esquerdo?.contorno?.length || 0} pontos`);
    console.log(`- Canal mandibular direito: ${visualAnalysis.canal_mandibular.direito?.length || 0} pontos`);
    console.log(`- Canal mandibular esquerdo: ${visualAnalysis.canal_mandibular.esquerdo?.length || 0} pontos`);

    return new Response(JSON.stringify(visualAnalysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro na análise visual:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erro desconhecido", 
        estrutura_ossea_percentual: "indeterminado",
        avaliacao_periodontal: { perda_ossea_global_percentual: "indeterminado", comentarios: "" },
        avaliacao_ortodontica: { alinhamento: "indeterminado", inclinacoes_relevantes: [], sugestoes_iniciais: [] },
        dentes: {},
        ausencias: [],
        implantes: [],
        lesoes_suspeitas: [],
        caries: [],
        reabsorcoes: [],
        fraturas: [],
        seio_maxilar: {},
        canal_mandibular: {},
        resumo_para_paciente: ["Não foi possível realizar a análise visual."],
        marcacoes: []
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
