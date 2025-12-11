import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Marcacao {
  id: string;
  tipo: "rect" | "circle" | "polygon" | "ellipse";
  coords: number[];
  label: string;
  descricao: string;
  cor: string;
  severidade: "baixa" | "media" | "alta" | "info";
  categoria: string;
}

interface VisualAnalysisResponse {
  marcacoes: Marcacao[];
  resumo: string;
  observacoes: string;
}

const VISUAL_ANALYSIS_PROMPT = `Você é um especialista em radiologia odontológica. Analise esta radiografia e identifique TODAS as estruturas anatômicas e achados clínicos importantes.

TAREFA: Retorne um JSON com coordenadas PERCENTUAIS (0-100) de cada região de interesse na imagem.

ESTRUTURAS PARA IDENTIFICAR (quando visíveis):
1. Canal mandibular - trajeto e proximidade com raízes
2. Seio maxilar - limites e conteúdo
3. Dentes presentes - numerar cada dente visível
4. Ausências dentárias - espaços edêntulos
5. Implantes - posição e integração óssea
6. Restaurações - tipo e localização
7. Tratamentos endodônticos - qualidade de obturação
8. Lesões periapicais - localização e tamanho
9. Perda óssea - áreas de reabsorção
10. Cáries - localização
11. Cálculo dentário - depósitos
12. Corpos estranhos ou anomalias

FORMATO DE RESPOSTA (JSON ESTRITO):
{
  "marcacoes": [
    {
      "id": "identificador_unico",
      "tipo": "rect" | "circle" | "ellipse",
      "coords": [x%, y%, largura%, altura%],
      "label": "Nome curto da estrutura",
      "descricao": "Descrição detalhada do achado",
      "cor": "#hexcolor",
      "severidade": "baixa" | "media" | "alta" | "info",
      "categoria": "anatomia" | "patologia" | "tratamento" | "anomalia"
    }
  ],
  "resumo": "Resumo geral dos achados visuais",
  "observacoes": "Limitações da análise ou sugestões de exames complementares"
}

CORES POR SEVERIDADE:
- info (estruturas normais): #3B82F6 (azul)
- baixa (achados menores): #22C55E (verde)
- media (atenção recomendada): #F59E0B (amarelo/laranja)
- alta (achado importante): #EF4444 (vermelho)

COORDENADAS:
- Use PERCENTUAIS de 0 a 100
- Para "rect": [x_esquerda%, y_topo%, largura%, altura%]
- Para "circle": [centro_x%, centro_y%, raio%, raio%]
- Para "ellipse": [centro_x%, centro_y%, raio_x%, raio_y%]

IMPORTANTE:
- Seja PRECISO nas coordenadas
- Identifique TODAS as estruturas visíveis
- Marque achados patológicos com cores apropriadas
- Retorne APENAS o JSON, sem texto adicional`;

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

    console.log("Iniciando análise visual da imagem...");
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
              { type: "text", text: "Analise esta radiografia odontológica e retorne as coordenadas de todas as estruturas e achados identificados em formato JSON." },
              { type: "image_url", image_url: { url: `data:${imageType || "image/jpeg"};base64,${base64Data}`, detail: "high" } },
            ],
          },
        ],
        max_completion_tokens: 4096,
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

    let visualAnalysis: VisualAnalysisResponse;
    try {
      visualAnalysis = JSON.parse(content);
    } catch (parseError) {
      console.error("Erro ao parsear JSON:", parseError);
      throw new Error("Erro ao processar resposta da análise visual");
    }

    if (!visualAnalysis.marcacoes || !Array.isArray(visualAnalysis.marcacoes)) {
      visualAnalysis.marcacoes = [];
    }

    visualAnalysis.marcacoes = visualAnalysis.marcacoes.map((m, index) => ({
      ...m,
      id: m.id || `marcacao_${index}`,
      coords: m.coords.map(c => Math.max(0, Math.min(100, Number(c) || 0))),
      cor: m.cor || "#3B82F6",
      severidade: m.severidade || "info",
      categoria: m.categoria || "anatomia",
    }));

    console.log(`Análise visual concluída: ${visualAnalysis.marcacoes.length} marcações encontradas`);

    return new Response(JSON.stringify(visualAnalysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro na análise visual:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido", marcacoes: [], resumo: "", observacoes: "Não foi possível realizar a análise visual." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
