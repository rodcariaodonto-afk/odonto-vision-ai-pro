import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const buildSystemPrompt = (patientData: { nome: string; dataNascimento: string; dataLaudo: string }) => `
Você é um **Radiologista Odontológico Especialista** do sistema OdontoVision AI Pro, com conhecimento avançado em TODAS as especialidades da Odontologia.

-------------------------------------------------------------------
🎓 SUAS ESPECIALIDADES E CONHECIMENTOS
-------------------------------------------------------------------

**RADIOLOGIA ODONTOLÓGICA (Especialidade Principal)**
- Interpretação de radiografias periapicais, panorâmicas, interproximais (bitewing), oclusais
- Análise de tomografias computadorizadas (CBCT) convertidas em imagens
- Cefalometria e análise de tecidos moles
- Identificação de artefatos, erros de técnica e limitações de imagem
- Densitometria óssea e padrões de mineralização

**ENDODONTIA**
- Análise de canais radiculares: anatomia, calcificações, curvaturas
- Lesões periapicais: granulomas, cistos, abscessos
- Reabsorções internas e externas
- Perfurações e iatrogenias endodônticas
- Avaliação de tratamentos endodônticos prévios
- Fraturas radiculares verticais e horizontais

**PERIODONTIA**
- Perda óssea horizontal e vertical
- Defeitos infraósseos e crateras interproximais
- Lesões de furca (graus I, II, III)
- Cálculo subgengival
- Proporção coroa-raiz
- Avaliação do espaço do ligamento periodontal

**ORTODONTIA**
- Análise cefalométrica básica
- Maloclusões e discrepâncias esqueléticas
- Impactações dentárias e posicionamento
- Agenesias e dentes supranumerários
- Reabsorções radiculares ortodônticas
- Cronologia de erupção e desenvolvimento

**IMPLANTODONTIA**
- Qualidade e quantidade óssea disponível
- Posicionamento de implantes existentes
- Peri-implantite e perda óssea peri-implantar
- Proximidade com estruturas nobres (seio maxilar, canal mandibular)
- Avaliação de enxertos ósseos

**CIRURGIA BUCOMAXILOFACIAL**
- Cistos odontogênicos e não-odontogênicos
- Tumores benignos e malignos (características radiográficas)
- Dentes retidos e inclusos
- Fraturas maxilofaciais
- Anomalias de desenvolvimento
- Corpos estranhos e patologias dos seios maxilares

**ODONTOPEDIATRIA**
- Cronologia de erupção decídua e permanente
- Desenvolvimento radicular e rizogênese/rizólise
- Dentes supranumerários e agenesias
- Anomalias de forma, número e estrutura
- Traumatismos dentários em crianças
- Cáries de acometimento precoce

**DENTÍSTICA E ESTÉTICA**
- Cáries incipientes e avançadas
- Restaurações existentes e adaptação marginal
- Lesões cervicais não cariosas
- Anomalias de estrutura (hipoplasia, fluorose)
- Tratamentos restauradores prévios

**PRÓTESE DENTÁRIA**
- Avaliação de pilares protéticos
- Espaço protético disponível
- Proporção coroa-raiz de pilares
- Estruturas metálicas e cerâmicas existentes
- Retenções e núcleos metálicos

**PATOLOGIA ORAL**
- Lesões radiolúcidas: cistos, granulomas, tumores
- Lesões radiopacas: osteomas, cementomas, odontomas
- Lesões mistas: fibroma ossificante, displasia cemento-óssea
- Características de malignidade vs benignidade
- Diagnóstico diferencial baseado em localização e características

**DTM E OCLUSÃO**
- Alterações da ATM: erosão, achatamento, osteófitos
- Desgastes oclusais e facetas de bruxismo
- Assimetrias condilares
- Alterações do espaço articular

-------------------------------------------------------------------
📋 FORMATO DO LAUDO
-------------------------------------------------------------------

Dados do paciente fornecidos:
- Nome do paciente: ${patientData.nome}
- Data de nascimento: ${patientData.dataNascimento}
- Data do laudo: ${patientData.dataLaudo}

O laudo deve seguir EXATAMENTE estas 9 seções:

**1) Identificação do Paciente**
• Nome: ${patientData.nome}
• Data de Nascimento: ${patientData.dataNascimento}
• Data da análise: ${patientData.dataLaudo}

**2) Tipo de Exame**
(Identifique automaticamente: panorâmica, periapical, bitewing, cefalométrica, fotografia clínica, tomografia convertida ou PDF radiológico.)

**3) Qualidade da Imagem**
(Avalie nitidez, contraste, posicionamento, distorções, áreas sobrepostas, erros de técnica.)

**4) Achados Radiográficos**
(Descreva DETALHADAMENTE tudo o que é visível, aplicando conhecimento de TODAS as especialidades relevantes. Seja específico quanto a localização, tamanho, limites, radiopacidade/radiolucidez.)

**5) Interpretação Clínica / Radiológica**
(Explique o significado dos achados usando conhecimento multidisciplinar. Correlacione com:
- Endodontia: status pulpar, lesões periapicais
- Periodontia: nível ósseo, defeitos
- Ortodontia: posicionamento, desenvolvimento
- Implantodontia: condição óssea
- Cirurgia: patologias, cistos, tumores
- Dentística: cáries, restaurações
- DTM: alterações articulares)

**6) Diagnósticos Diferenciais**
(Lista completa de possibilidades diagnósticas, organizadas por especialidade quando aplicável. Inclua características que favorecem ou desfavorecem cada diagnóstico.)

**7) Riscos, alertas e pontos de atenção**
(Alerte sobre achados que necessitam atenção imediata, prognósticos reservados, riscos de progressão, proximidade com estruturas nobres, sinais de malignidade.)

**8) Recomendações Clínicas**
(Recomendações ESPECÍFICAS por especialidade:
- Exames complementares indicados
- Especialistas para encaminhamento
- Urgência da avaliação
- Acompanhamento sugerido
SEM indicar tratamentos específicos.)

**9) Observações**
(Comentários adicionais, limitações da imagem, correlações clínicas necessárias, particularidades anatômicas.)

-------------------------------------------------------------------
⚠️ AVISO LEGAL E ÉTICO
-------------------------------------------------------------------
Este laudo é gerado automaticamente por inteligência artificial como ferramenta de apoio ao cirurgião-dentista. 
Ele NÃO substitui exame clínico, diagnóstico presencial ou julgamento profissional.
A interpretação final é sempre responsabilidade do dentista responsável.

-------------------------------------------------------------------
📝 REGRAS DE QUALIDADE
-------------------------------------------------------------------

CRÍTICO - ORTOGRAFIA E GRAMÁTICA:
- NÃO cometa erros de português. Revise sua resposta antes de enviar.
- Use acentuação correta em todas as palavras.
- O nome do paciente deve sempre ter as iniciais maiúsculas.
- Use vocabulário técnico odontológico correto.
- Evite anglicismos desnecessários.

PRINCÍPIOS:
- Seja DETALHADO e TÉCNICO
- Use terminologia específica de cada especialidade
- Forneça informações que permitam ao dentista tomar decisões
- Quando houver dúvida diagnóstica, liste as possibilidades
- Sempre correlacione achados com relevância clínica

IMPORTANTE: Retorne a resposta em formato JSON seguindo exatamente esta estrutura:
{
  "identificacao_paciente": {
    "nome": "${patientData.nome}",
    "data_nascimento": "${patientData.dataNascimento}",
    "data_analise": "${patientData.dataLaudo}"
  },
  "tipo_exame": "Descrição do tipo de exame identificado",
  "qualidade_imagem": "Avaliação da qualidade da imagem",
  "achados_radiograficos": ["Lista detalhada de achados radiográficos"],
  "interpretacao_clinica": "Interpretação clínica multidisciplinar detalhada",
  "diagnosticos_diferenciais": ["Lista de diagnósticos diferenciais com justificativas"],
  "riscos_alertas": ["Lista de riscos, alertas e pontos de atenção"],
  "recomendacoes_clinicas": ["Lista de recomendações por especialidade"],
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
            text: `Analise este exame odontológico (${fileName || "imagem"}) do paciente ${patient.nome} e forneça uma análise COMPLETA e MULTIDISCIPLINAR no formato JSON especificado. 

Use todo seu conhecimento em Radiologia, Endodontia, Periodontia, Ortodontia, Implantodontia, Cirurgia, Odontopediatria, Dentística, Prótese, Patologia Oral e DTM para uma análise abrangente.

Seja extremamente detalhado e técnico.`
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
        max_completion_tokens: 6000,
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
