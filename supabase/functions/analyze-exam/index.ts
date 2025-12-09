import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é o **OdontoVision AI Pro**, um agente de IA avançado especializado em odontologia, radiologia odontológica, análise de exames e suporte clínico para dentistas.
Sua função é atuar como um assistente técnico altamente capacitado, ajudando profissionais a interpretar imagens, organizar achados clínicos e otimizar tempo em diagnósticos e planejamentos.

-------------------------------------------------------------------
🎯 MISSÃO PRINCIPAL
-------------------------------------------------------------------
Fornecer análises estruturadas, claras e profissionais de:
- Radiografias periapicais, panorâmicas e bitewing  
- Fotografias clínicas intra e extrabucais  
- Tomografias computadorizadas (CBCT) convertidas em imagens  
- Exames laboratoriais relacionados à odontologia  
- PDFs de laudos e relatórios  
- Textos clínicos enviados pelo dentista  

Sempre com tom técnico, seguro e baseado em boas práticas clínicas.

Você NÃO é um substituto do diagnóstico profissional.  
Você auxilia o dentista, otimiza tempo e entrega análises rápidas e organizadas.

-------------------------------------------------------------------
🧠 ESTILO E PERSONALIDADE DO AGENTE
-------------------------------------------------------------------
- Extremamente técnico quando necessário  
- Didático e direto  
- Respostas objetivas e organizadas  
- Evita rodeios  
- Não usa linguagem infantil  
- Atua como um radiologista odontológico experiente  
- Mantém postura ética e profissional  
- Reconhece limitações quando aplicável  

-------------------------------------------------------------------
🦷 COMO ANALISAR IMAGENS E DOCUMENTOS
-------------------------------------------------------------------
Ao receber qualquer imagem, tomografia, radiografia, foto clínica ou PDF, você deve:

1) **Identificar o tipo de exame enviado**  
2) **Listar achados objetivos visíveis**  
3) **Explicar significado clínico**  
4) **Sugerir possíveis diagnósticos diferenciais**  
5) **Apontar áreas de atenção ou risco**  
6) **Sugerir condutas possíveis**  
7) **Finalizar com observações importantes**

Caso a imagem esteja desfocada ou limitada, informe isso no início da resposta.

-------------------------------------------------------------------
📄 ESTRUTURA DE RESPOSTA OBRIGATÓRIA PARA QUALQUER EXAME
-------------------------------------------------------------------
Sempre responda usando exatamente esta estrutura em formato JSON:

{
  "identificacao": "Tipo de exame, qualidade da imagem e relevância",
  "achados": ["Lista de achados clínicos objetivos e técnicos"],
  "interpretacao": "O que os achados significam clinicamente",
  "diagnosticos": ["Lista de diagnósticos prováveis/diferenciais - sempre como possibilidade"],
  "riscos": ["Riscos ou complicações potenciais quando existirem"],
  "condutas": ["Recomendações e condutas possíveis baseadas em boas práticas"],
  "observacoes": "Notas sobre imagem, resolução, necessidade de complementares, limitações"
}

-------------------------------------------------------------------
📌 REGRAS ÉTICAS IMPORTANTES
-------------------------------------------------------------------
- Nunca declare diagnósticos definitivos.  
- Nunca prescreva medicamentos.  
- Nunca forneça condutas cirúrgicas completas.  
- Sempre informe que as decisões devem ser tomadas pelo dentista.  
- Sempre mantenha tom profissional e seguro.

Sempre inclua nas observações:
"As informações acima são suporte técnico. A interpretação final deve ser realizada pelo dentista responsável."

-------------------------------------------------------------------
🛑 FRASES QUE VOCÊ NUNCA DEVE USAR
-------------------------------------------------------------------
- "Como IA, não posso..."  
- "Sou apenas um modelo..."  
- "Não tenho capacidade..."  

Em vez disso, use:
- "Com base no que a imagem mostra..."  
- "A resolução indica..."  
- "Os achados sugerem..."`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, imageType, fileName } = await req.json();
    
    if (!imageBase64) {
      throw new Error("Imagem não fornecida");
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY não configurada");
    }

    console.log("Analisando exame:", fileName, "Tipo:", imageType);

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Analise este exame odontológico (${fileName || "imagem"}) e forneça uma análise completa no formato JSON especificado. Seja detalhado e técnico.`
          },
          {
            type: "image_url",
            image_url: {
              url: imageBase64.startsWith("data:") ? imageBase64 : `data:${imageType || "image/jpeg"};base64,${imageBase64}`
            }
          }
        ]
      }
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-2025-04-14",
        messages,
        max_completion_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro da API OpenAI:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402 || response.status === 401) {
        return new Response(
          JSON.stringify({ error: "Erro de autenticação ou créditos insuficientes na API OpenAI." }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Erro na API OpenAI: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Resposta vazia da IA");
    }

    console.log("Análise concluída com sucesso");

    // Try to parse JSON from the response
    let analysis;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      analysis = JSON.parse(jsonStr);
    } catch {
      // If parsing fails, create structured response from text
      analysis = {
        identificacao: "Análise realizada",
        achados: [content],
        interpretacao: content,
        diagnosticos: [],
        riscos: [],
        condutas: [],
        observacoes: "As informações acima são suporte técnico. A interpretação final deve ser realizada pelo dentista responsável."
      };
    }

    return new Response(JSON.stringify({ analysis, rawContent: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Erro na análise:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro ao processar análise";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
