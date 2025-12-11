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

const VISUAL_ANALYSIS_PROMPT = `Você é o módulo de análise visual do OdontoVision AI Pro. Sua função é analisar radiografias odontológicas e retornar um JSON estruturado com TODAS as estruturas identificadas.

## COORDENADAS PERCENTUAIS PRECISAS (0-100)
- Todas as coordenadas devem ser PERCENTUAIS da imagem
- X = 0 é a borda ESQUERDA, X = 100 é a borda DIREITA
- Y = 0 é o TOPO, Y = 100 é a BASE

### REGRAS DE POSICIONAMENTO PRECISAS
1. **Para DENTES**: A posição [x, y] deve ser o CENTRO EXATO da coroa dentária visível
2. **Para CÁRIES**: A posição deve ser o CENTRO EXATO da área radiolúcida da cárie
3. **Para LESÕES PERIAPICAIS**: A posição deve ser o CENTRO da rarefação óssea ao redor do ápice
4. **Para IMPLANTES**: A posição deve ser o CENTRO do corpo do implante (não a plataforma)
5. **Para RESTAURAÇÕES**: A posição deve ser o CENTRO da área restaurada
6. **Para FRATURAS**: A posição deve ser o PONTO MÉDIO da linha de fratura
7. **Para REABSORÇÕES**: A posição deve ser o CENTRO da área de reabsorção

### PRECISÃO OBRIGATÓRIA
- NÃO marque bordas ou extremidades - SEMPRE o centro geométrico
- Para estruturas alongadas (implantes, fraturas), use o ponto médio do eixo principal
- Para lesões irregulares, use o centroide aproximado da área

## ESTRUTURAS OBRIGATÓRIAS PARA IDENTIFICAR

### 1. SEIOS MAXILARES (OBRIGATÓRIO para panorâmicas)
Trace o contorno COMPLETO de cada seio maxilar como um polígono fechado.
- O seio maxilar DIREITO do paciente aparece no LADO ESQUERDO da imagem (sua direita olhando)
- O seio maxilar ESQUERDO do paciente aparece no LADO DIREITO da imagem (sua esquerda olhando)
- Use 8-12 pontos para definir cada contorno de forma precisa
- Coordenadas típicas: Y entre 15-40%, X entre 5-40% (direito) e 60-95% (esquerdo)

### 2. CANAIS MANDIBULARES (OBRIGATÓRIO para panorâmicas)
Trace o trajeto COMPLETO de cada canal mandibular como uma linha.
- Canal DIREITO do paciente: lado ESQUERDO da imagem
- Canal ESQUERDO do paciente: lado DIREITO da imagem
- Use 6-10 pontos para definir cada trajeto
- Coordenadas típicas: Y entre 65-85%, seguindo a curvatura da mandíbula

### 3. TODOS OS DENTES VISÍVEIS
Para CADA dente visível na imagem:
- Identifique pelo número FDI (11-18, 21-28, 31-38, 41-48)
- Informe a posição CENTRAL da coroa [x%, y%]
- Descreva o status (saudável, restaurado, cariado, tratado endodonticamente, etc.)

### 4. PATOLOGIAS (marcar TODAS encontradas)
- **Cáries**: Áreas radiolúcidas na estrutura dentária - cor #FF0000
- **Lesões periapicais**: Rarefações ao redor dos ápices - cor #FFA500  
- **Reabsorções**: Internas ou externas - cor #EF4444
- **Fraturas**: Linhas de descontinuidade - cor #EC4899

### 5. TRATAMENTOS EXISTENTES
- **Restaurações**: Áreas radiopacas (amálgama) ou levemente radiopacas (resina) - cor #22C55E
- **Implantes**: Estruturas metálicas em forma de parafuso - cor #00FF00
- **Tratamentos endodônticos**: Canais obturados (radiopacos) - cor #8B5CF6

### 6. AUSÊNCIAS
Liste TODOS os espaços edêntulos (dentes ausentes)

## FORMATO DE SAÍDA JSON

{
  "estrutura_ossea_percentual": "XX%",
  "avaliacao_periodontal": {
    "perda_ossea_global_percentual": "leve/moderada/grave/indeterminado",
    "comentarios": "descrição da condição periodontal"
  },
  "avaliacao_ortodontica": {
    "alinhamento": "bom/regular/ruim/indeterminado",
    "inclinacoes_relevantes": [],
    "sugestoes_iniciais": []
  },
  "dentes": {
    "11": {"status": "saudável", "detalhes": "sem alterações", "posicao": [48, 25]},
    "12": {"status": "restaurado", "detalhes": "restauração MOD", "posicao": [44, 26]}
  },
  "ausencias": ["18", "28", "38", "48"],
  "implantes": [
    {"dente": "36", "posicao": [35, 72], "detalhes": "osseointegrado"}
  ],
  "lesoes_suspeitas": [
    {"dente": "46", "descricao": "rarefação periapical", "posicao": [65, 78], "tipo": "periapical"}
  ],
  "caries": [
    {"dente": "37", "superficie": "oclusal", "posicao": [28, 68]}
  ],
  "reabsorcoes": [],
  "fraturas": [],
  "seio_maxilar": {
    "direito": {"contorno": [[10,18], [15,15], [25,14], [35,16], [38,22], [35,32], [25,35], [15,33], [10,25]]},
    "esquerdo": {"contorno": [[62,18], [68,15], [78,14], [88,16], [90,22], [88,32], [78,35], [68,33], [62,25]]}
  },
  "canal_mandibular": {
    "direito": [[8,75], [15,78], [22,80], [28,78], [35,75], [40,72]],
    "esquerdo": [[60,72], [65,75], [72,78], [78,80], [85,78], [92,75]]
  },
  "resumo_para_paciente": [
    "Seus dentes estão em bom estado geral",
    "Identificamos alguns pontos de atenção"
  ],
  "marcacoes": []
}

## CORES PADRÃO
- Seio Maxilar: #FFD700 (dourado) - contorno tracejado
- Canal Mandibular: #00AEEF (azul claro) - linha contínua
- Cáries: #FF0000 (vermelho)
- Lesões: #FFA500 (laranja)
- Implantes: #00FF00 (verde)
- Restaurações: #22C55E (verde claro)
- Fraturas: #EC4899 (rosa)
- Reabsorções: #EF4444 (vermelho)
- Dentes normais: #3B82F6 (azul)

## REGRAS CRÍTICAS
1. SEMPRE trace os seios maxilares e canais mandibulares em panorâmicas
2. Use coordenadas PERCENTUAIS precisas (0-100)
3. Lembre-se: lado DIREITO do paciente = lado ESQUERDO da imagem
4. Retorne APENAS JSON válido, sem texto adicional
5. NUNCA invente achados - se não estiver claro, use "indeterminado"
6. Seja EXAUSTIVO - marque TODAS as estruturas visíveis`;


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

REGRA CRÍTICA DE POSICIONAMENTO:
- TODAS as posições devem ser o CENTRO GEOMÉTRICO EXATO da estrutura
- Para dentes: centro da coroa visível
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
6. TODAS as ausências dentárias

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

    // Auto-generate marcacoes from dentes if sparse
    const autoMarcacoes: Marcacao[] = [];

    // Add marcacoes for each tooth
    Object.entries(visualAnalysis.dentes).forEach(([num, dente]) => {
      if (dente.posicao && !visualAnalysis.marcacoes.some(m => m.id === `dente_${num}`)) {
        const isHealthy = dente.status.toLowerCase().includes("saudável") || dente.status.toLowerCase().includes("normal");
        autoMarcacoes.push({
          id: `dente_${num}`,
          tipo: "ellipse",
          coords: [dente.posicao[0], dente.posicao[1], 3, 4],
          label: `Dente ${num}`,
          descricao: `${dente.status} - ${dente.detalhes}`,
          cor: isHealthy ? "#3B82F6" : "#F59E0B",
          severidade: isHealthy ? "info" : "media",
          categoria: "anatomia"
        });
      }
    });

    // Add marcacoes for lesoes_suspeitas
    visualAnalysis.lesoes_suspeitas.forEach((lesao, i) => {
      if (lesao.posicao && !visualAnalysis.marcacoes.some(m => m.label.includes(lesao.dente) && m.categoria === "patologia")) {
        autoMarcacoes.push({
          id: `lesao_${lesao.dente}_${i}`,
          tipo: "circle",
          coords: [lesao.posicao[0], lesao.posicao[1], 2.5, 2.5],
          label: `Lesão ${lesao.dente}`,
          descricao: lesao.descricao,
          cor: "#FFA500",
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
          cor: "#FF0000",
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
          coords: [implante.posicao[0] - 1.5, implante.posicao[1] - 3, 3, 6],
          label: `Implante ${implante.dente}`,
          descricao: implante.detalhes || "Implante dentário",
          cor: "#00FF00",
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
          coords: [fratura.posicao[0] - 0.5, fratura.posicao[1] - 2, 1, 4],
          label: `Fratura ${fratura.dente}`,
          descricao: fratura.descricao,
          cor: "#EC4899",
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
