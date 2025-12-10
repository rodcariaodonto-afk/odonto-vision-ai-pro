import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CaseData {
  id: string;
  name: string;
  exam_type: string;
  created_at: string;
  analysis: {
    identificacao_paciente?: {
      nome?: string;
      data_nascimento?: string;
      data_analise?: string;
    };
    tipo_exame?: string;
    qualidade_imagem?: string;
    achados_radiograficos?: string[];
    interpretacao_clinica?: string;
    diagnosticos_diferenciais?: string[];
    riscos_alertas?: string[];
    recomendacoes_clinicas?: string[];
    observacoes?: string;
  } | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cases, patientName } = await req.json();
    
    if (!cases || !Array.isArray(cases) || cases.length < 2) {
      throw new Error("É necessário selecionar pelo menos 2 exames para comparar");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    console.log(`Comparando ${cases.length} exames do paciente: ${patientName}`);

    // Sort cases by date
    const sortedCases = [...cases].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    // Build comparison prompt
    const casesDescription = sortedCases.map((c: CaseData, i: number) => {
      const date = new Date(c.created_at).toLocaleDateString("pt-BR");
      const analysis = c.analysis;
      
      return `
-------------------------------------------------------------------
EXAME ${i + 1}: ${c.exam_type} - ${date}
-------------------------------------------------------------------
Nome: ${c.name}
Data: ${date}
Tipo: ${analysis?.tipo_exame || c.exam_type}
Qualidade: ${analysis?.qualidade_imagem || "Não avaliada"}

ACHADOS:
${analysis?.achados_radiograficos?.map(a => `• ${a}`).join('\n') || "Não disponível"}

INTERPRETAÇÃO:
${analysis?.interpretacao_clinica || "Não disponível"}

DIAGNÓSTICOS:
${analysis?.diagnosticos_diferenciais?.map(d => `• ${d}`).join('\n') || "Não disponível"}

RISCOS/ALERTAS:
${analysis?.riscos_alertas?.map(r => `• ${r}`).join('\n') || "Não disponível"}

RECOMENDAÇÕES:
${analysis?.recomendacoes_clinicas?.map(r => `• ${r}`).join('\n') || "Não disponível"}
`;
    }).join('\n\n');

    const systemPrompt = `
Você é um especialista em Radiologia Odontológica realizando uma ANÁLISE COMPARATIVA EVOLUTIVA de exames do mesmo paciente ao longo do tempo.

Sua tarefa é analisar os exames fornecidos e identificar:
1. EVOLUÇÃO das condições dentárias/ósseas
2. MUDANÇAS significativas entre os exames
3. MELHORAS observadas
4. PIORAS ou novas patologias
5. CONDIÇÕES ESTÁVEIS (sem alteração)
6. EFICÁCIA de tratamentos realizados (se identificáveis)
7. RECOMENDAÇÕES baseadas na evolução observada

-------------------------------------------------------------------
📋 FORMATO DO RELATÓRIO COMPARATIVO
-------------------------------------------------------------------

Retorne um JSON com esta estrutura:

{
  "resumo_executivo": "Parágrafo resumindo as principais conclusões da comparação",
  "periodo_analisado": {
    "data_inicial": "DD/MM/AAAA",
    "data_final": "DD/MM/AAAA",
    "duracao": "X meses/anos"
  },
  "evolucao_geral": "stable" | "improved" | "worsened" | "mixed",
  "achados_comparativos": [
    {
      "estrutura": "Nome da estrutura/região analisada",
      "status": "improved" | "worsened" | "stable" | "new" | "resolved",
      "descricao": "Descrição detalhada da evolução",
      "exame_anterior": "Como estava antes",
      "exame_atual": "Como está agora"
    }
  ],
  "melhoras_observadas": ["Lista de melhoras identificadas"],
  "pioras_observadas": ["Lista de pioras ou novas condições"],
  "condicoes_estaveis": ["Condições que permaneceram sem alteração"],
  "eficacia_tratamentos": "Avaliação da eficácia de tratamentos identificáveis",
  "recomendacoes_evolutivas": ["Recomendações baseadas na evolução observada"],
  "proximos_passos": ["Sugestões para acompanhamento futuro"],
  "alertas_criticos": ["Alertas importantes baseados na comparação"],
  "observacoes": "Observações adicionais e limitações da análise"
}

-------------------------------------------------------------------
⚠️ INSTRUÇÕES IMPORTANTES
-------------------------------------------------------------------

1. Compare CRONOLOGICAMENTE - do exame mais antigo ao mais recente
2. Seja ESPECÍFICO sobre as mudanças observadas
3. Use terminologia técnica odontológica
4. Destaque mudanças clinicamente significativas
5. Identifique padrões de evolução
6. Relacione achados entre os diferentes exames
7. Considere o intervalo de tempo entre os exames
8. NÃO invente informações - baseie-se apenas nos dados fornecidos
9. Se não houver informação suficiente para comparar algo, indique isso

-------------------------------------------------------------------
📝 REGRAS DE QUALIDADE
-------------------------------------------------------------------

- Use português correto, sem erros ortográficos
- Seja objetivo e técnico
- Forneça informações acionáveis para o dentista
- Sempre termine com o disclaimer de que a análise é uma ferramenta de apoio
`;

    const userPrompt = `
Analise comparativamente os seguintes exames do paciente ${patientName || "não identificado"}:

${casesDescription}

Forneça um relatório comparativo detalhado no formato JSON especificado, identificando a evolução das condições ao longo do tempo.
`;

    console.log("Enviando para análise comparativa...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro da API:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Erro na API: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Resposta vazia da IA");
    }

    console.log("Análise comparativa concluída");

    // Parse JSON from response
    let comparison;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      comparison = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.log("Falha ao parsear JSON, retornando conteúdo bruto");
      comparison = {
        resumo_executivo: content,
        evolucao_geral: "mixed",
        achados_comparativos: [],
        melhoras_observadas: [],
        pioras_observadas: [],
        condicoes_estaveis: [],
        recomendacoes_evolutivas: [],
        proximos_passos: [],
        alertas_criticos: [],
        observacoes: "Análise gerada em formato de texto livre"
      };
    }

    return new Response(JSON.stringify({ comparison, rawContent: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Erro na comparação:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro ao processar comparação";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
