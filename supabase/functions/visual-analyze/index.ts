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

const VISUAL_ANALYSIS_PROMPT = `Você é a inteligência artificial oficial do OdontoVision AI Pro, especializada em radiologia odontológica com MÁXIMA PRECISÃO e DETALHAMENTO.

FUNÇÃO PRINCIPAL: Analisar radiografias odontológicas identificando e marcando TODAS as estruturas visíveis com coordenadas PERCENTUAIS PRECISAS (0-100) baseadas na imagem.

## ANÁLISE ULTRA-DETALHADA OBRIGATÓRIA

Você DEVE identificar e marcar CADA UMA das seguintes estruturas quando visíveis:

### 1. TODOS OS DENTES (usar notação FDI 11-48)
- Identifique CADA dente individualmente com sua posição exata
- Descreva o status de cada dente (saudável, restaurado, cariado, etc.)
- Marque a posição CENTRAL de cada coroa dentária

### 2. ESTRUTURAS ANATÔMICAS
- **Seios Maxilares**: Trace o contorno COMPLETO de ambos (direito e esquerdo)
- **Canal Mandibular**: Trace o trajeto COMPLETO de ambos os lados
- **ATM**: Se visível, identifique as estruturas articulares
- **Osso Alveolar**: Avalie a altura e densidade
- **Cortical Óssea**: Avalie continuidade e espessura

### 3. ACHADOS PATOLÓGICOS (marcar TODOS)
- **Cáries**: Qualquer área radiolúcida sugestiva de cárie
- **Lesões Periapicais**: Rarefações, granulomas, cistos
- **Perda Óssea**: Áreas de reabsorção alveolar
- **Reabsorções**: Internas ou externas em qualquer dente
- **Fraturas**: Linhas sugestivas de fratura
- **Calcificações**: Tártaro, pulpolitos

### 4. TRATAMENTOS EXISTENTES
- **Restaurações**: Identifique TODAS (amálgama, resina, inlay/onlay)
- **Tratamentos Endodônticos**: Canais obturados, pinos, núcleos
- **Implantes**: Posição, osseointegração
- **Próteses**: Coroas, pontes, elementos protéticos
- **Aparelhos Ortodônticos**: Brackets, fios, bandas

### 5. AUSÊNCIAS E ANOMALIAS
- **Dentes Ausentes**: Liste TODOS os espaços edêntulos
- **Dentes Inclusos/Impactados**: Terceiros molares, supranumerários
- **Anomalias de Forma**: Geminação, fusão, dilaceração
- **Anomalias de Posição**: Giroversões, inclinações

## FORMATO DE SAÍDA JSON (OBRIGATÓRIO)

Retorne APENAS JSON válido com esta estrutura:

{
  "estrutura_ossea_percentual": "XX%",
  "avaliacao_periodontal": {
    "perda_ossea_global_percentual": "leve/moderada/grave/indeterminado",
    "comentarios": "descrição detalhada da condição periodontal observada"
  },
  "avaliacao_ortodontica": {
    "alinhamento": "regular/bom/ruim/indeterminado",
    "inclinacoes_relevantes": ["lista de inclinações observadas"],
    "sugestoes_iniciais": ["lista de sugestões terapêuticas"]
  },
  "dentes": {
    "11": {"status": "saudável/cárie/lesão/restaurado/ausente/etc", "detalhes": "descrição clínica", "posicao": [X, Y]},
    "12": {"status": "...", "detalhes": "...", "posicao": [X, Y]}
  },
  "ausencias": ["lista de números dos dentes ausentes"],
  "implantes": [
    {"dente": "XX", "posicao": [X, Y], "detalhes": "observações sobre o implante"}
  ],
  "lesoes_suspeitas": [
    {"dente": "XX", "descricao": "descrição da lesão", "posicao": [X, Y], "tipo": "periapical/lateral/furcal/etc"}
  ],
  "caries": [
    {"dente": "XX", "superficie": "oclusal/mesial/distal/vestibular/lingual", "posicao": [X, Y]}
  ],
  "reabsorcoes": [
    {"dente": "XX", "tipo": "externa/interna", "posicao": [X, Y]}
  ],
  "fraturas": [
    {"dente": "XX", "descricao": "descrição da fratura", "posicao": [X, Y]}
  ],
  "seio_maxilar": {
    "direito": {"contorno": [[X1,Y1], [X2,Y2], [X3,Y3], [X4,Y4], [X5,Y5], [X6,Y6]]},
    "esquerdo": {"contorno": [[X1,Y1], [X2,Y2], [X3,Y3], [X4,Y4], [X5,Y5], [X6,Y6]]}
  },
  "canal_mandibular": {
    "direito": [[X1,Y1], [X2,Y2], [X3,Y3], [X4,Y4], [X5,Y5]],
    "esquerdo": [[X1,Y1], [X2,Y2], [X3,Y3], [X4,Y4], [X5,Y5]]
  },
  "resumo_para_paciente": ["lista de achados em linguagem simples"],
  "resumo_paciente_detalhado": {
    "o_que_encontramos": ["achados em linguagem leiga"],
    "o_que_significa": "explicação simples para o paciente",
    "proximos_passos": ["recomendações em linguagem acessível"]
  },
  "marcacoes": [
    {
      "id": "dente_11",
      "tipo": "ellipse",
      "coords": [X, Y, largura, altura],
      "label": "Dente 11",
      "descricao": "Incisivo central superior direito - saudável",
      "cor": "#3B82F6",
      "severidade": "info",
      "categoria": "anatomia"
    },
    {
      "id": "carie_14",
      "tipo": "ellipse",
      "coords": [X, Y, 2, 2],
      "label": "Cárie 14",
      "descricao": "Lesão cariosa na superfície oclusal",
      "cor": "#F97316",
      "severidade": "media",
      "categoria": "patologia"
    }
  ]
}

## CORES POR TIPO DE ACHADO
- Dentes saudáveis/estruturas normais (info): #3B82F6 (azul)
- Achados menores/restaurações (baixa): #22C55E (verde)
- Cáries/atenção recomendada (media): #F97316 (laranja)
- Lesões/achados importantes (alta): #EF4444 (vermelho)
- Implantes: #8B5CF6 (roxo)
- Fraturas: #EC4899 (rosa)
- Reabsorções: #14B8A6 (teal)

## COORDENADAS PERCENTUAIS (0-100)
- Todas as posições devem ser em PERCENTUAL da imagem
- X = 0 é a borda esquerda, X = 100 é a borda direita
- Y = 0 é o topo, Y = 100 é a base
- Para "rect/ellipse": [centro_x%, centro_y%, largura%, altura%]
- Para contornos (seios/canal): array de pontos [[x1,y1], [x2,y2], ...]

## REGRAS CRÍTICAS
1. NUNCA deixe de marcar estruturas visíveis - seja EXAUSTIVO
2. Crie uma marcação no array "marcacoes" para CADA dente identificado
3. Crie marcações separadas para CADA achado patológico
4. Para radiografias panorâmicas, SEMPRE trace seios maxilares e canais mandibulares
5. Use coordenadas PRECISAS baseadas na posição real na imagem
6. Retorne SOMENTE JSON válido, sem texto adicional
7. NUNCA invente achados - se não estiver claro, use "indeterminado"
8. Use termos como "sugestivo de", "compatível com" - nunca diagnóstico definitivo`;


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

    console.log("Chamando API OpenAI com modelo gpt-4o...");
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: VISUAL_ANALYSIS_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "ANÁLISE VISUAL COMPLETA OBRIGATÓRIA: Analise esta radiografia odontológica de forma EXAUSTIVA. Você DEVE:\n\n1. Identificar e criar uma MARCAÇÃO para CADA DENTE VISÍVEL (use notação FDI: 11-48)\n2. Traçar os CONTORNOS COMPLETOS dos seios maxilares (direito e esquerdo)\n3. Traçar o TRAJETO COMPLETO dos canais mandibulares (direito e esquerdo)\n4. Marcar TODAS as patologias encontradas (cáries, lesões, reabsorções)\n5. Identificar TODAS as restaurações e tratamentos existentes\n6. Listar TODAS as ausências dentárias\n\nRetorne o JSON completo com coordenadas PERCENTUAIS PRECISAS (0-100) para cada estrutura. O array 'marcacoes' deve conter uma entrada para CADA dente e CADA achado. Seja EXTREMAMENTE DETALHISTA." },
              { type: "image_url", image_url: { url: `data:${imageType || "image/jpeg"};base64,${base64Data}`, detail: "high" } },
            ],
          },
        ],
        max_tokens: 8192,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      console.error("Detalhes do erro:", errorText);
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
      ausencias: visualAnalysis.ausencias || [],
      implantes: visualAnalysis.implantes || [],
      lesoes_suspeitas: visualAnalysis.lesoes_suspeitas || [],
      caries: visualAnalysis.caries || [],
      reabsorcoes: visualAnalysis.reabsorcoes || [],
      fraturas: visualAnalysis.fraturas || [],
      seio_maxilar: visualAnalysis.seio_maxilar || {},
      canal_mandibular: visualAnalysis.canal_mandibular || {},
      resumo_para_paciente: visualAnalysis.resumo_para_paciente || [],
      marcacoes: visualAnalysis.marcacoes || []
    };

    // Process and validate marcacoes
    if (!Array.isArray(visualAnalysis.marcacoes)) {
      visualAnalysis.marcacoes = [];
    }

    visualAnalysis.marcacoes = visualAnalysis.marcacoes.map((m, index) => ({
      ...m,
      id: m.id || `marcacao_${index}`,
      coords: Array.isArray(m.coords) ? m.coords.map(c => Math.max(0, Math.min(100, Number(c) || 0))) : [0, 0, 5, 5],
      cor: m.cor || "#3B82F6",
      severidade: m.severidade || "info",
      categoria: m.categoria || "anatomia",
    }));

    // Auto-generate marcacoes from other data if marcacoes array is sparse
    const autoMarcacoes: Marcacao[] = [];

    // Add marcacoes for lesoes_suspeitas
    visualAnalysis.lesoes_suspeitas.forEach((lesao, i) => {
      if (lesao.posicao && !visualAnalysis.marcacoes.some(m => m.label.includes(lesao.dente) && m.categoria === "patologia")) {
        autoMarcacoes.push({
          id: `lesao_${lesao.dente}_${i}`,
          tipo: "circle",
          coords: [lesao.posicao[0], lesao.posicao[1], 3, 3],
          label: `Lesão ${lesao.dente}`,
          descricao: lesao.descricao,
          cor: "#EF4444",
          severidade: "alta",
          categoria: "patologia"
        });
      }
    });

    // Add marcacoes for caries
    visualAnalysis.caries.forEach((carie, i) => {
      if (carie.posicao && !visualAnalysis.marcacoes.some(m => m.label.includes(carie.dente) && m.descricao.toLowerCase().includes("cárie"))) {
        autoMarcacoes.push({
          id: `carie_${carie.dente}_${i}`,
          tipo: "circle",
          coords: [carie.posicao[0], carie.posicao[1], 2, 2],
          label: `Cárie ${carie.dente}`,
          descricao: `Cárie na superfície ${carie.superficie}`,
          cor: "#F59E0B",
          severidade: "media",
          categoria: "patologia"
        });
      }
    });

    // Add marcacoes for implantes
    visualAnalysis.implantes.forEach((implante, i) => {
      if (implante.posicao && !visualAnalysis.marcacoes.some(m => m.label.includes("Implante") && m.label.includes(implante.dente))) {
        autoMarcacoes.push({
          id: `implante_${implante.dente}_${i}`,
          tipo: "rect",
          coords: [implante.posicao[0] - 2, implante.posicao[1] - 4, 4, 8],
          label: `Implante ${implante.dente}`,
          descricao: implante.detalhes || "Implante dentário",
          cor: "#8B5CF6",
          severidade: "info",
          categoria: "tratamento"
        });
      }
    });

    // Add marcacoes for fraturas
    visualAnalysis.fraturas.forEach((fratura, i) => {
      if (fratura.posicao && !visualAnalysis.marcacoes.some(m => m.label.includes("Fratura"))) {
        autoMarcacoes.push({
          id: `fratura_${fratura.dente}_${i}`,
          tipo: "rect",
          coords: [fratura.posicao[0] - 1, fratura.posicao[1] - 3, 2, 6],
          label: `Fratura ${fratura.dente}`,
          descricao: fratura.descricao,
          cor: "#EF4444",
          severidade: "alta",
          categoria: "patologia"
        });
      }
    });

    // Add marcacoes for reabsorcoes
    visualAnalysis.reabsorcoes.forEach((reab, i) => {
      if (reab.posicao && !visualAnalysis.marcacoes.some(m => m.label.includes("Reabsorção"))) {
        autoMarcacoes.push({
          id: `reabsorcao_${reab.dente}_${i}`,
          tipo: "circle",
          coords: [reab.posicao[0], reab.posicao[1], 2, 2],
          label: `Reabsorção ${reab.dente}`,
          descricao: `Reabsorção ${reab.tipo}`,
          cor: "#EF4444",
          severidade: "alta",
          categoria: "patologia"
        });
      }
    });

    // Merge auto-generated marcacoes
    visualAnalysis.marcacoes = [...visualAnalysis.marcacoes, ...autoMarcacoes];

    console.log(`Análise visual avançada concluída:`);
    console.log(`- ${Object.keys(visualAnalysis.dentes).length} dentes mapeados`);
    console.log(`- ${visualAnalysis.ausencias.length} ausências`);
    console.log(`- ${visualAnalysis.lesoes_suspeitas.length} lesões suspeitas`);
    console.log(`- ${visualAnalysis.caries.length} cáries`);
    console.log(`- ${visualAnalysis.marcacoes.length} marcações totais`);

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
