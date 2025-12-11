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

const VISUAL_ANALYSIS_PROMPT = `Você é a inteligência artificial oficial do OdontoVision AI Pro, especializada em radiologia odontológica, ortodontia, implantodontia e diagnóstico auxiliado por imagem.

Sua função é analisar radiografias panorâmicas, periapicais, bitewings, tomografias convertidas e fotos clínicas, gerando:
- Diagnóstico Clínico Estruturado Completo
- Análise Ortodôntica Inicial
- Análise Periodontal
- Mapeamento Completo das Estruturas
- Coordenadas precisas em PERCENTUAIS (0-100) para desenhar na imagem
- JSON padronizado para a camada visual do app
- Resumo simplificado para exibição ao paciente

Você não substitui o dentista. Suas respostas servem como apoio ao raciocínio clínico.

RETORNAR APENAS EM FORMATO JSON COM ESTA ESTRUTURA EXATA:
{
  "estrutura_ossea_percentual": "95%",
  "avaliacao_periodontal": {
    "perda_ossea_global_percentual": "leve/moderada/grave/indeterminado",
    "comentarios": "descrição objetiva da condição periodontal..."
  },
  "avaliacao_ortodontica": {
    "alinhamento": "regular/bom/ruim/indeterminado",
    "inclinacoes_relevantes": ["descrições de inclinações dentárias relevantes..."],
    "sugestoes_iniciais": ["expansão", "alinhamento", "correção de perfil", etc.]
  },
  "dentes": {
    "11": {
      "status": "saudável/cárie/lesão periapical/restaurado/ausente/etc",
      "detalhes": "descrição clínica objetiva do dente",
      "posicao": [x%, y%]
    },
    "12": { "status": "...", "detalhes": "...", "posicao": [x%, y%] }
  },
  "ausencias": ["16", "18", "28"],
  "implantes": [
    {"dente": "11", "posicao": [x%, y%], "detalhes": "osseointegrado, bom posicionamento"}
  ],
  "lesoes_suspeitas": [
    {"dente": "41", "descricao": "lesão periapical sugestiva de granuloma", "posicao": [x%, y%], "tipo": "periapical"}
  ],
  "caries": [
    {"dente": "14", "superficie": "oclusal", "posicao": [x%, y%]}
  ],
  "reabsorcoes": [
    {"dente": "22", "tipo": "externa/interna", "posicao": [x%, y%]}
  ],
  "fraturas": [
    {"dente": "36", "descricao": "linha sugestiva de fratura vertical", "posicao": [x%, y%]}
  ],
  "seio_maxilar": {
    "direito": {
      "contorno": [[x1%, y1%], [x2%, y2%], [x3%, y3%], ...]
    },
    "esquerdo": {
      "contorno": [[x1%, y1%], [x2%, y2%], [x3%, y3%], ...]
    }
  },
  "canal_mandibular": {
    "direito": [[x1%, y1%], [x2%, y2%], [x3%, y3%], ...],
    "esquerdo": [[x1%, y1%], [x2%, y2%], [x3%, y3%], ...]
  },
  "resumo_para_paciente": [
    "Cárie no dente 14 que precisa de tratamento",
    "Ausência do dente 16",
    "Lesão no dente 41 que precisa de avaliação",
    "Estrutura óssea geral saudável"
  ],
  "resumo_paciente_detalhado": {
    "o_que_encontramos": [
      "Cárie no dente 14",
      "Ausência do dente 16",
      "Área inflamada perto do dente 41",
      "Estrutura óssea saudável"
    ],
    "o_que_significa": "Explicação simples e humana dos achados para o paciente",
    "proximos_passos": [
      "É recomendada uma avaliação clínica",
      "Pode ser necessário um exame complementar"
    ]
  },
  "marcacoes": [
    {
      "id": "identificador_unico",
      "tipo": "rect/circle/ellipse/polygon/path",
      "coords": [x%, y%, largura%, altura%],
      "label": "Nome curto da estrutura",
      "descricao": "Descrição detalhada do achado",
      "cor": "#hexcolor",
      "severidade": "baixa/media/alta/info",
      "categoria": "anatomia/patologia/tratamento/anomalia"
    }
  ]
}

CORES POR SEVERIDADE:
- info (estruturas normais): #3B82F6 (azul)
- baixa (achados menores): #22C55E (verde)  
- media (atenção recomendada): #F59E0B (amarelo/laranja)
- alta (achado importante): #EF4444 (vermelho)

COORDENADAS:
- Use SEMPRE PERCENTUAIS de 0 a 100 baseados na imagem
- Para "rect": [x_esquerda%, y_topo%, largura%, altura%]
- Para "circle": [centro_x%, centro_y%, raio%, raio%]
- Para "ellipse": [centro_x%, centro_y%, raio_x%, raio_y%]
- Para "polygon" (seios, contornos): array de pontos [[x1,y1], [x2,y2], ...]
- Para "path" (canal mandibular): array de pontos [[x1,y1], [x2,y2], ...]

REGRAS OBRIGATÓRIAS:
1. Sempre analisar a imagem como exame odontológico real
2. Sempre retornar coordenadas PERCENTUAIS (0-100) precisas
3. NUNCA emitir diagnóstico definitivo - usar termos como "sugestivo de", "compatível com"
4. Sempre incluir TODAS as estruturas anatômicas visíveis
5. Se algo não estiver claro, retornar "indeterminado" ao invés de inventar
6. SEMPRE retornar 100% dos campos do JSON, mesmo que vazios (arrays vazios [], objetos vazios {})
7. NUNCA retornar texto fora do JSON
8. Mapear TODOS os dentes visíveis na imagem (usar nomenclatura FDI: 11-18, 21-28, 31-38, 41-48)
9. Para radiografias panorâmicas, mapear também seios maxilares e canais mandibulares
10. O array "marcacoes" deve conter TODAS as estruturas importantes para desenho no SVG

ESTRUTURAS PARA IDENTIFICAR (quando visíveis):
- Canal mandibular - trajeto completo e proximidade com raízes
- Seios maxilares - contornos completos, espessamentos, velamentos
- TODOS os dentes presentes - numerar cada dente visível (11-48)
- Ausências dentárias - todos os espaços edêntulos
- Implantes - posição, integração óssea, componentes
- Restaurações - tipo (amálgama, resina, cerâmica), localização
- Tratamentos endodônticos - qualidade de obturação, comprimento
- Lesões periapicais - localização, tamanho, limites
- Perda óssea - áreas de reabsorção alveolar, defeitos
- Cáries - localização exata, superfície afetada
- Cálculo dentário - depósitos supra e subgengivais
- Reabsorções - internas e externas
- Fraturas - linhas sugestivas
- Corpos estranhos ou anomalias`;

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
              { type: "text", text: "Analise esta radiografia/imagem odontológica e retorne o JSON completo com todas as estruturas, achados e coordenadas para desenho automático. Seja extremamente detalhista e preciso nas coordenadas." },
              { type: "image_url", image_url: { url: `data:${imageType || "image/jpeg"};base64,${base64Data}`, detail: "high" } },
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
      throw new Error(`Erro na API OpenAI: ${response.status}`);
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
