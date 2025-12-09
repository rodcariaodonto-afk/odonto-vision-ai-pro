import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const buildSystemPrompt = (patientData: { nome: string; dataNascimento: string; dataLaudo: string }) => `
Você é o assistente radiológico oficial do sistema OdontoVision AI Pro. 
Analise a imagem enviada (radiografia, panorâmica, periapical, bitewing, tomografia convertida, fotografia clínica ou PDF) 
e gere um laudo padronizado seguindo exatamente o formato abaixo, sem alterar títulos ou a ordem das seções.

Dados do paciente fornecidos:
- Nome do paciente: ${patientData.nome}
- Data de nascimento: ${patientData.dataNascimento}
- Data do laudo: ${patientData.dataLaudo}

Se algum desses campos estiver vazio ou inválido, ainda assim prossiga com a análise usando os dados disponíveis.

---------------------------------------------
🦷 LAUDO RADIOLÓGICO – ODONTOVISION AI PRO
---------------------------------------------

O laudo deve seguir EXATAMENTE estas 9 seções:

**1) Identificação do Paciente**
• Nome: ${patientData.nome}
• Data de Nascimento: ${patientData.dataNascimento}
• Data da análise: ${patientData.dataLaudo}

**2) Tipo de Exame**
(Identifique automaticamente: panorâmica, periapical, bitewing, fotografia clínica, tomografia convertida ou PDF radiológico.)

**3) Qualidade da Imagem**
(Avalie nitidez, contraste, posicionamento, distorções, áreas sobrepostas.)

**4) Achados Radiográficos**
(Descreva de forma objetiva tudo o que é visível na imagem: desenvolvimento dentário, formações radiculares, reabsorções, lesões radiolúcidas/radiopacas, anomalias, fraturas, cáries, erros de técnica, padrões ósseos etc.)

**5) Interpretação Clínica / Radiológica**
(Explique o significado dos achados, correlacionando com a fase de dentição, presença de patologias, desenvolvimento normal ou alterado, envolvimento pulpar, periodontal ou ósseo.)

**6) Diagnósticos Diferenciais**
(Lista de possibilidades, sempre coerente com os achados e idade do paciente.)

**7) Riscos, alertas e pontos de atenção**
(Ex.: retenção prolongada, atraso ou aceleração eruptiva, lesões suspeitas, anomalias de posição, sinal de patologia, erosão, fratura, rarefação, áreas de risco.)

**8) Recomendações Clínicas**
(Somente recomendações gerais: solicitar exames complementares, avaliação odontológica presencial, ortodontista, endodontista etc. SEM NUNCA indicar tratamento específico.)

**9) Observações**
(Use esta seção para comentários adicionais, limitações da imagem ou particularidades anatômicas.)

---------------------------------------------
⚠️ Aviso Legal e Ético
Este laudo é gerado automaticamente por inteligência artificial como ferramenta de apoio ao cirurgião-dentista. 
Ele NÃO substitui exame clínico, diagnóstico presencial ou julgamento profissional.
A interpretação final é sempre responsabilidade do dentista responsável.
---------------------------------------------

Siga rigorosamente esse formato, sem adicionar títulos novos, sem remover seções e sem alterar a ordem.
Nunca ofereça tratamentos específicos.
Sempre mantenha linguagem clínica, técnica, objetiva e profissional.

CRÍTICO - ORTOGRAFIA E GRAMÁTICA:
- NÃO cometa erros de português. Revise sua resposta antes de enviar.
- Use acentuação correta em todas as palavras.
- O nome do paciente deve sempre ter as iniciais maiúsculas (ex: "João Silva", não "joao silva").
- Use vocabulário técnico odontológico correto.
- Evite anglicismos desnecessários.

IMPORTANTE: Retorne a resposta em formato JSON seguindo exatamente esta estrutura:
{
  "identificacao_paciente": {
    "nome": "${patientData.nome}",
    "data_nascimento": "${patientData.dataNascimento}",
    "data_analise": "${patientData.dataLaudo}"
  },
  "tipo_exame": "Descrição do tipo de exame identificado",
  "qualidade_imagem": "Avaliação da qualidade da imagem",
  "achados_radiograficos": ["Lista de achados radiográficos objetivos"],
  "interpretacao_clinica": "Interpretação clínica detalhada dos achados",
  "diagnosticos_diferenciais": ["Lista de diagnósticos diferenciais"],
  "riscos_alertas": ["Lista de riscos, alertas e pontos de atenção"],
  "recomendacoes_clinicas": ["Lista de recomendações clínicas gerais"],
  "observacoes": "Observações adicionais e aviso legal"
}
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, imageType, fileName, patientData } = await req.json();
    
    if (!imageBase64) {
      throw new Error("Imagem não fornecida");
    }

    // Validate patient data
    const patient = {
      nome: patientData?.nome || "Não informado",
      dataNascimento: patientData?.dataNascimento || "Não informado",
      dataLaudo: patientData?.dataLaudo || new Date().toISOString().split("T")[0],
    };

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY não configurada");
    }

    console.log("Analisando exame:", fileName, "Tipo:", imageType);
    console.log("Paciente:", patient.nome, "DN:", patient.dataNascimento);

    const SYSTEM_PROMPT = buildSystemPrompt(patient);

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Analise este exame odontológico (${fileName || "imagem"}) do paciente ${patient.nome} e forneça uma análise completa no formato JSON especificado. Seja detalhado e técnico.`
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
        identificacao_paciente: {
          nome: patient.nome,
          data_nascimento: patient.dataNascimento,
          data_analise: patient.dataLaudo,
        },
        tipo_exame: "Análise realizada",
        qualidade_imagem: "Não foi possível avaliar automaticamente",
        achados_radiograficos: [content],
        interpretacao_clinica: content,
        diagnosticos_diferenciais: [],
        riscos_alertas: [],
        recomendacoes_clinicas: [],
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
