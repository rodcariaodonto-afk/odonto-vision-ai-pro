import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Interface simplificada - apenas estruturas anatômicas com coordenadas
interface AnaliseVisualSimplificada {
  seio_maxilar: {
    direito?: { contorno_normalizado: Array<[number, number]> };
    esquerdo?: { contorno_normalizado: Array<[number, number]> };
  };
  canal_mandibular: {
    direito?: Array<[number, number]>;
    esquerdo?: Array<[number, number]>;
  };
  achados_clinicos: {
    dentes_presentes: string[];
    dentes_ausentes: string[];
    caries_suspeitas: string[];
    lesoes_suspeitas: string[];
    implantes: string[];
    restauracoes: string[];
    tratamentos_endodonticos: string[];
    observacoes: string;
  };
  avaliacao_periodontal: {
    perda_ossea: string;
    comentarios: string;
  };
  avaliacao_ortodontica: {
    alinhamento: string;
    observacoes: string;
  };
  resumo_para_paciente: string[];
  raciocinio_sisos?: {
    "18": string;
    "28": string;
    "38": string;
    "48": string;
  };
}

// ============================================================================
// STEP 1: PROMPT DE DESCRIÇÃO PURA (apenas descrever o que vê)
// ============================================================================
const DESCRIPTION_PROMPT = `Você é um observador visual especializado em radiografias odontológicas.

## SUA ÚNICA TAREFA: DESCREVER O QUE VOCÊ VÊ

NÃO INTERPRETE. NÃO DIAGNOSTIQUE. Apenas DESCREVA as estruturas visíveis.

### INSTRUÇÕES:

Para cada região da radiografia, descreva EXATAMENTE o que você observa:

1. **REGIÃO SUPERIOR DIREITA (X: 0.03-0.15, Y: 0.25-0.50)**
   - Descreva as estruturas visíveis
   - Quantos dentes você vê nesta região?
   - Há estrutura dental na posição mais posterior (siso 18)?

2. **REGIÃO SUPERIOR ESQUERDA (X: 0.85-0.97, Y: 0.25-0.50)**
   - Descreva as estruturas visíveis
   - Quantos dentes você vê nesta região?
   - Há estrutura dental na posição mais posterior (siso 28)?

3. **REGIÃO INFERIOR DIREITA (X: 0.03-0.15, Y: 0.50-0.75)**
   - Descreva as estruturas visíveis
   - Quantos dentes você vê nesta região?
   - Há estrutura dental na posição mais posterior (siso 48)?

4. **REGIÃO INFERIOR ESQUERDA (X: 0.85-0.97, Y: 0.50-0.75)**
   - Descreva as estruturas visíveis
   - Quantos dentes você vê nesta região?
   - Há estrutura dental na posição mais posterior (siso 38)?

5. **CADA TERCEIRO MOLAR (SISOS)** - ANÁLISE DETALHADA:
   Para cada siso (18, 28, 38, 48), responda:
   - A região está escura (radiolúcida) ou clara (radiopaca)?
   - Você vê alguma forma que parece um dente?
   - Se sim, descreva a forma, tamanho e posição
   - Se não, descreva o que você vê no lugar

6. **ALTERAÇÕES VISÍVEIS**
   - Áreas escuras (radiolúcidas) anormais
   - Áreas claras (radiopacas) anormais
   - Estruturas metálicas visíveis
   - Qualquer outra observação

FORMATO DE RESPOSTA (JSON):
{
  "descricao_regiao_superior_direita": "Descreva detalhadamente...",
  "descricao_regiao_superior_esquerda": "Descreva detalhadamente...",
  "descricao_regiao_inferior_direita": "Descreva detalhadamente...",
  "descricao_regiao_inferior_esquerda": "Descreva detalhadamente...",
  "observacao_siso_18": "O que você vê na região do dente 18...",
  "observacao_siso_28": "O que você vê na região do dente 28...",
  "observacao_siso_38": "O que você vê na região do dente 38...",
  "observacao_siso_48": "O que você vê na região do dente 48...",
  "total_dentes_superiores_visiveis": numero,
  "total_dentes_inferiores_visiveis": numero,
  "alteracoes_observadas": ["lista de alterações"],
  "estruturas_metalicas": ["lista se houver"]
}`;

// ============================================================================
// STEP 2: PROMPT DE INTERPRETAÇÃO (baseado na descrição)
// ============================================================================
const buildInterpretationPrompt = (description: any) => `Você é um radiologista odontológico especialista.

## SUA TAREFA: INTERPRETAR A DESCRIÇÃO VISUAL

Baseado na descrição visual abaixo, forneça a análise clínica completa.

### DESCRIÇÃO VISUAL DA RADIOGRAFIA:
${JSON.stringify(description, null, 2)}

### REGRAS CRÍTICAS PARA INTERPRETAÇÃO:

1. **SISOS (18, 28, 38, 48)**:
   - Se a descrição menciona "estrutura radiopaca", "forma dental", "dente visível" → PRESENTE
   - Se a descrição menciona "região escura", "sem estrutura", "radiolúcido" → considerar AUSENTE
   - Se há QUALQUER dúvida na descrição → declare PRESENTE
   
2. **CONTAGEM DE DENTES**:
   - Use os números de dentes visíveis relatados
   - Arcada superior completa com sisos = 16 dentes
   - Arcada inferior completa com sisos = 16 dentes

3. **ACHADOS CLÍNICOS**:
   - Base seus achados APENAS no que foi descrito
   - Não invente achados não mencionados na descrição

### FORMATO JSON OBRIGATÓRIO:

{
  "raciocinio_sisos": {
    "18": "Baseado na descrição: '[quote da descrição]'. CONCLUSÃO: PRESENTE/AUSENTE.",
    "28": "Baseado na descrição: '[quote da descrição]'. CONCLUSÃO: PRESENTE/AUSENTE.",
    "38": "Baseado na descrição: '[quote da descrição]'. CONCLUSÃO: PRESENTE/AUSENTE.",
    "48": "Baseado na descrição: '[quote da descrição]'. CONCLUSÃO: PRESENTE/AUSENTE."
  },
  "seio_maxilar": {
    "direito": { "contorno_normalizado": [[0.10, 0.20], [0.16, 0.16], [0.24, 0.16], [0.32, 0.20], [0.34, 0.30], [0.30, 0.38], [0.18, 0.38], [0.10, 0.28]] },
    "esquerdo": { "contorno_normalizado": [[0.66, 0.28], [0.70, 0.38], [0.82, 0.38], [0.90, 0.30], [0.90, 0.20], [0.84, 0.16], [0.76, 0.16], [0.68, 0.20]] }
  },
  "canal_mandibular": {
    "direito": [[0.08, 0.76], [0.14, 0.80], [0.20, 0.80], [0.26, 0.78], [0.32, 0.75], [0.38, 0.72]],
    "esquerdo": [[0.62, 0.72], [0.68, 0.75], [0.74, 0.78], [0.80, 0.80], [0.86, 0.80], [0.92, 0.76]]
  },
  "achados_clinicos": {
    "dentes_presentes": ["lista de dentes presentes com numeração FDI"],
    "dentes_ausentes": ["lista de dentes ausentes"],
    "caries_suspeitas": ["lista se houver"],
    "lesoes_suspeitas": ["lista se houver"],
    "implantes": ["lista se houver"],
    "restauracoes": ["lista se houver"],
    "tratamentos_endodonticos": ["lista se houver"],
    "observacoes": "observações gerais"
  },
  "avaliacao_periodontal": {
    "perda_ossea": "leve/moderada/grave/indeterminado",
    "comentarios": "descrição"
  },
  "avaliacao_ortodontica": {
    "alinhamento": "bom/regular/ruim",
    "observacoes": "descrição"
  },
  "resumo_para_paciente": [
    "Frase simples sobre a condição geral",
    "Próximos passos recomendados"
  ]
}`;

// ============================================================================
// CONTORNOS PADRÃO
// ============================================================================
const DEFAULT_SEIO_DIREITO: Array<[number, number]> = [
  [0.10, 0.20], [0.16, 0.16], [0.24, 0.16], [0.32, 0.20], 
  [0.34, 0.30], [0.30, 0.38], [0.18, 0.38], [0.10, 0.28]
];

const DEFAULT_SEIO_ESQUERDO: Array<[number, number]> = [
  [0.66, 0.28], [0.70, 0.38], [0.82, 0.38], [0.90, 0.30], 
  [0.90, 0.20], [0.84, 0.16], [0.76, 0.16], [0.68, 0.20]
];

const DEFAULT_CANAL_DIREITO: Array<[number, number]> = [
  [0.08, 0.76], [0.14, 0.80], [0.20, 0.80], [0.26, 0.78], [0.32, 0.75], [0.38, 0.72]
];

const DEFAULT_CANAL_ESQUERDO: Array<[number, number]> = [
  [0.62, 0.72], [0.68, 0.75], [0.74, 0.78], [0.80, 0.80], [0.86, 0.80], [0.92, 0.76]
];

// ============================================================================
// CHAMADA AO MODELO GEMINI (via Lovable AI Gateway)
// ============================================================================
async function callGeminiVision(prompt: string, imageBase64: string, imageType: string): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY não configurada");
  }

  const base64Data = imageBase64.includes("base64,") 
    ? imageBase64.split("base64,")[1] 
    : imageBase64;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: prompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Analise esta radiografia odontológica seguindo as instruções do sistema. Retorne apenas JSON válido." },
            { 
              type: "image_url", 
              image_url: { 
                url: `data:${imageType || "image/jpeg"};base64,${base64Data}` 
              } 
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini API error:", response.status, errorText);
    
    if (response.status === 429) {
      throw new Error("Rate limit excedido. Tente novamente em alguns segundos.");
    }
    if (response.status === 402) {
      throw new Error("Créditos insuficientes no Lovable AI.");
    }
    throw new Error(`Erro na API Gemini: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error("Resposta vazia do modelo");
  }

  // Extrair JSON da resposta
  let jsonStr = content;
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  } else {
    // Tentar encontrar JSON diretamente
    const jsonStart = content.indexOf('{');
    const jsonEnd = content.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      jsonStr = content.substring(jsonStart, jsonEnd + 1);
    }
  }

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Erro ao parsear JSON do Gemini:", e);
    console.log("Conteúdo recebido:", content.substring(0, 500));
    throw new Error("Resposta do modelo não é JSON válido");
  }
}

// ============================================================================
// VALIDAÇÃO E CONSENSO
// ============================================================================
function applyConsensus(descriptions: any[]): any {
  console.log("Aplicando consenso de múltiplas análises...");
  
  // Para cada siso, verificar se a maioria diz presente ou ausente
  const wisdomTeeth = ["18", "28", "38", "48"];
  const consensus: Record<string, boolean> = {};
  
  for (const tooth of wisdomTeeth) {
    let presentCount = 0;
    let absentCount = 0;
    
    for (const desc of descriptions) {
      const obs = desc[`observacao_siso_${tooth}`] || "";
      const lower = obs.toLowerCase();
      
      // Palavras que indicam PRESENTE
      if (lower.includes("visível") || lower.includes("estrutura") || 
          lower.includes("dente") || lower.includes("radiopaco") ||
          lower.includes("presente") || lower.includes("incluso") ||
          lower.includes("impactado")) {
        presentCount++;
      } 
      // Palavras que indicam AUSENTE
      else if (lower.includes("ausente") || lower.includes("não há") ||
               lower.includes("não vejo") || lower.includes("radiolúcido") ||
               lower.includes("vazio") || lower.includes("sem estrutura")) {
        absentCount++;
      } else {
        // Na dúvida, conta como presente
        presentCount++;
      }
    }
    
    // Regra de consenso: maioria vence, empate = presente
    consensus[tooth] = presentCount >= absentCount;
    console.log(`Siso ${tooth}: ${presentCount} presente, ${absentCount} ausente → ${consensus[tooth] ? "PRESENTE" : "AUSENTE"}`);
  }
  
  return consensus;
}

function validateAndCorrectCoordinates(analysis: any, consensus?: Record<string, boolean>): AnaliseVisualSimplificada {
  console.log("Validando e corrigindo coordenadas...");
  
  // Função para normalizar ponto (converter de 0-100 para 0-1 se necessário)
  const normalizePoint = (point: any): [number, number] => {
    if (!Array.isArray(point) || point.length < 2) return [0.5, 0.5];
    let [x, y] = point;
    if (x > 1 || y > 1) {
      x = Math.min(1, Math.max(0, x / 100));
      y = Math.min(1, Math.max(0, y / 100));
    }
    return [x, y];
  };
  
  // Função para forçar Y dentro do range anatômico
  const forceYRange = (points: Array<[number, number]>, minY: number, maxY: number): Array<[number, number]> => {
    return points.map(([x, y]) => {
      const correctedY = Math.min(maxY, Math.max(minY, y));
      return [x, correctedY] as [number, number];
    });
  };
  
  // Processar seio maxilar
  let seioDireito = DEFAULT_SEIO_DIREITO;
  let seioEsquerdo = DEFAULT_SEIO_ESQUERDO;
  
  if (analysis.seio_maxilar?.direito?.contorno_normalizado?.length >= 4) {
    const normalized = analysis.seio_maxilar.direito.contorno_normalizado.map(normalizePoint);
    seioDireito = forceYRange(normalized, 0.15, 0.40);
    console.log("Seio maxilar direito validado:", seioDireito.length, "pontos");
  }
  
  if (analysis.seio_maxilar?.esquerdo?.contorno_normalizado?.length >= 4) {
    const normalized = analysis.seio_maxilar.esquerdo.contorno_normalizado.map(normalizePoint);
    seioEsquerdo = forceYRange(normalized, 0.15, 0.40);
    console.log("Seio maxilar esquerdo validado:", seioEsquerdo.length, "pontos");
  }
  
  // Processar canal mandibular
  let canalDireito = DEFAULT_CANAL_DIREITO;
  let canalEsquerdo = DEFAULT_CANAL_ESQUERDO;
  
  if (analysis.canal_mandibular?.direito?.length >= 3) {
    const normalized = analysis.canal_mandibular.direito.map(normalizePoint);
    canalDireito = forceYRange(normalized, 0.70, 0.85);
    console.log("Canal mandibular direito validado:", canalDireito.length, "pontos");
  }
  
  if (analysis.canal_mandibular?.esquerdo?.length >= 3) {
    const normalized = analysis.canal_mandibular.esquerdo.map(normalizePoint);
    canalEsquerdo = forceYRange(normalized, 0.70, 0.85);
    console.log("Canal mandibular esquerdo validado:", canalEsquerdo.length, "pontos");
  }
  
  const achados = analysis.achados_clinicos || {};
  let dentesPresentes = Array.isArray(achados.dentes_presentes) ? [...achados.dentes_presentes] : [];
  let dentesAusentes = Array.isArray(achados.dentes_ausentes) ? [...achados.dentes_ausentes] : [];
  
  // Aplicar consenso se disponível
  if (consensus) {
    const wisdomTeeth = ["18", "28", "38", "48"];
    for (const tooth of wisdomTeeth) {
      const shouldBePresent = consensus[tooth];
      const isInPresent = dentesPresentes.some(d => d.toString() === tooth);
      const isInAbsent = dentesAusentes.some(d => d.toString() === tooth);
      
      if (shouldBePresent && !isInPresent) {
        console.log(`📍 Consenso: Adicionando ${tooth} aos presentes`);
        dentesPresentes.push(tooth);
        dentesAusentes = dentesAusentes.filter(d => d.toString() !== tooth);
      } else if (!shouldBePresent && !isInAbsent) {
        console.log(`📍 Consenso: Adicionando ${tooth} aos ausentes`);
        dentesAusentes.push(tooth);
        dentesPresentes = dentesPresentes.filter(d => d.toString() !== tooth);
      }
    }
  }
  
  const result: AnaliseVisualSimplificada = {
    seio_maxilar: {
      direito: { contorno_normalizado: seioDireito },
      esquerdo: { contorno_normalizado: seioEsquerdo },
    },
    canal_mandibular: {
      direito: canalDireito,
      esquerdo: canalEsquerdo,
    },
    achados_clinicos: {
      dentes_presentes: dentesPresentes,
      dentes_ausentes: dentesAusentes,
      caries_suspeitas: Array.isArray(achados.caries_suspeitas) ? achados.caries_suspeitas : [],
      lesoes_suspeitas: Array.isArray(achados.lesoes_suspeitas) ? achados.lesoes_suspeitas : [],
      implantes: Array.isArray(achados.implantes) ? achados.implantes : [],
      restauracoes: Array.isArray(achados.restauracoes) ? achados.restauracoes : [],
      tratamentos_endodonticos: Array.isArray(achados.tratamentos_endodonticos) ? achados.tratamentos_endodonticos : [],
      observacoes: typeof achados.observacoes === 'string' ? achados.observacoes : "",
    },
    avaliacao_periodontal: {
      perda_ossea: analysis.avaliacao_periodontal?.perda_ossea || "indeterminado",
      comentarios: analysis.avaliacao_periodontal?.comentarios || "",
    },
    avaliacao_ortodontica: {
      alinhamento: analysis.avaliacao_ortodontica?.alinhamento || "indeterminado",
      observacoes: analysis.avaliacao_ortodontica?.observacoes || "",
    },
    resumo_para_paciente: Array.isArray(analysis.resumo_para_paciente) ? analysis.resumo_para_paciente : [],
    raciocinio_sisos: analysis.raciocinio_sisos || undefined,
  };
  
  console.log("Análise final:");
  console.log("- Dentes presentes:", result.achados_clinicos.dentes_presentes.length);
  console.log("- Dentes ausentes:", result.achados_clinicos.dentes_ausentes.length);
  console.log("- Raciocínio sisos incluído:", !!result.raciocinio_sisos);
  
  return result;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, imageType } = await req.json();

    if (!imageBase64) {
      throw new Error("Nenhuma imagem fornecida");
    }

    console.log("🔬 Iniciando análise visual com Two-Step + Consenso...");
    console.log("📷 Tipo da imagem:", imageType);
    console.log("🤖 Modelo: Google Gemini 2.5 Pro via Lovable AI");

    // ========================================================================
    // STEP 1: DESCRIÇÃO PURA (2 chamadas para consenso)
    // ========================================================================
    console.log("\n📝 STEP 1: Obtendo descrições visuais (2 análises independentes)...");
    
    const descriptions: any[] = [];
    
    // Primeira descrição
    console.log("  → Descrição 1...");
    try {
      const desc1 = await callGeminiVision(DESCRIPTION_PROMPT, imageBase64, imageType);
      descriptions.push(desc1);
      console.log("  ✅ Descrição 1 obtida");
    } catch (e) {
      console.error("  ❌ Erro na descrição 1:", e);
    }
    
    // Segunda descrição (para consenso)
    console.log("  → Descrição 2...");
    try {
      const desc2 = await callGeminiVision(DESCRIPTION_PROMPT, imageBase64, imageType);
      descriptions.push(desc2);
      console.log("  ✅ Descrição 2 obtida");
    } catch (e) {
      console.error("  ❌ Erro na descrição 2:", e);
    }

    if (descriptions.length === 0) {
      throw new Error("Não foi possível obter descrições da imagem");
    }

    // ========================================================================
    // CONSENSO DAS DESCRIÇÕES
    // ========================================================================
    console.log("\n🤝 Aplicando consenso das descrições...");
    const consensus = applyConsensus(descriptions);
    
    // Usar a primeira descrição como base
    const primaryDescription = descriptions[0];
    
    // Log das observações dos sisos
    console.log("\n📋 Observações dos sisos (descrição primária):");
    ["18", "28", "38", "48"].forEach(siso => {
      const obs = primaryDescription[`observacao_siso_${siso}`] || "Não descrito";
      console.log(`  Siso ${siso}: ${obs.substring(0, 100)}...`);
    });

    // ========================================================================
    // STEP 2: INTERPRETAÇÃO BASEADA NA DESCRIÇÃO
    // ========================================================================
    console.log("\n🧠 STEP 2: Interpretando descrição...");
    
    const interpretation = await callGeminiVision(
      buildInterpretationPrompt(primaryDescription), 
      imageBase64, 
      imageType
    );
    
    console.log("✅ Interpretação obtida");
    
    // Log do raciocínio dos sisos
    if (interpretation.raciocinio_sisos) {
      console.log("\n📝 Raciocínio dos sisos:");
      Object.entries(interpretation.raciocinio_sisos).forEach(([siso, raciocinio]) => {
        console.log(`  Siso ${siso}: ${(raciocinio as string).substring(0, 100)}...`);
      });
    }

    // ========================================================================
    // VALIDAÇÃO E APLICAÇÃO DO CONSENSO
    // ========================================================================
    const validatedAnalysis = validateAndCorrectCoordinates(interpretation, consensus);

    console.log("\n✅ Análise visual Two-Step + Consenso concluída com sucesso!");

    return new Response(JSON.stringify(validatedAnalysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Erro na análise visual:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erro desconhecido",
        details: "Falha na análise visual com Two-Step + Consenso"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
