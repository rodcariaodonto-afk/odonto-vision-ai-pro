import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const buildSystemPrompt = (patientData: { nome: string; dataNascimento: string; dataLaudo: string }, isTextBased: boolean) => `
Você é um **Radiologista Odontológico Especialista** do sistema OdontoVision AI Pro, com conhecimento avançado em TODAS as especialidades da Odontologia.

${isTextBased ? `
-------------------------------------------------------------------
📄 MODO DE ANÁLISE: DOCUMENTO DE TEXTO/PDF
-------------------------------------------------------------------
Você está analisando um documento PDF/texto contendo dados de exames laboratoriais ou laudos.
Analise o conteúdo textual extraído e forneça interpretação clínica odontológica.
` : ''}

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

**FARMACOLOGIA E EXAMES LABORATORIAIS**
- Interpretação de hemogramas para procedimentos odontológicos
- Coagulograma e risco de sangramento
- Glicemia e controle metabólico
- Função renal e hepática para prescrições
- Interações medicamentosas relevantes

**CONSIDERAÇÕES SISTÊMICAS**
- Pacientes diabéticos, hipertensos, cardiopatas
- Uso de anticoagulantes e antiplaquetários
- Bifosfonatos e risco de osteonecrose
- Gestantes e lactantes
- Pacientes imunossuprimidos

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
(Identifique automaticamente: panorâmica, periapical, bitewing, cefalométrica, fotografia clínica, tomografia convertida, PDF radiológico, exame laboratorial, laudo médico.)

**3) Qualidade da Imagem/Documento**
(Para imagens: avalie nitidez, contraste, posicionamento, distorções, áreas sobrepostas, erros de técnica.)
(Para documentos: avalie completude das informações, legibilidade, data do exame.)

**4) Achados Radiográficos/Laboratoriais**
(Descreva DETALHADAMENTE tudo o que é visível ou apresentado nos resultados, aplicando conhecimento de TODAS as especialidades relevantes.)

**5) Interpretação Clínica / Radiológica**
(Explique o significado dos achados usando conhecimento multidisciplinar. Correlacione com relevância odontológica.)

**6) Diagnósticos Diferenciais**
(Lista completa de possibilidades diagnósticas, organizadas por especialidade quando aplicável.)

**7) Riscos, alertas e pontos de atenção**
(Alerte sobre achados que necessitam atenção imediata, valores alterados, contraindicações para procedimentos.)

**8) Recomendações Clínicas**
(Recomendações ESPECÍFICAS por especialidade:
- Exames complementares indicados
- Especialistas para encaminhamento
- Urgência da avaliação
- Cuidados pré e pós-operatórios
SEM indicar tratamentos específicos.)

**9) Observações**
(Comentários adicionais, limitações, correlações clínicas necessárias.)

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
  "qualidade_imagem": "Avaliação da qualidade da imagem ou documento",
  "achados_radiograficos": ["Lista detalhada de achados radiográficos ou laboratoriais"],
  "interpretacao_clinica": "Interpretação clínica multidisciplinar detalhada",
  "diagnosticos_diferenciais": ["Lista de diagnósticos diferenciais com justificativas"],
  "riscos_alertas": ["Lista de riscos, alertas e pontos de atenção"],
  "recomendacoes_clinicas": ["Lista de recomendações por especialidade"],
  "observacoes": "Observações adicionais e aviso legal"
}
`;

// Function to extract readable text from PDF base64
function extractTextFromPdfBase64(base64Data: string): string | null {
  try {
    // Remove data URL prefix if present
    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
    
    // Decode base64 to binary
    const binaryString = atob(cleanBase64);
    
    // Try to extract text content from PDF
    // PDFs contain text streams that we can try to extract
    let extractedText = '';
    
    // Look for text between stream and endstream markers
    const streamRegex = /stream\s*([\s\S]*?)\s*endstream/g;
    let match;
    
    while ((match = streamRegex.exec(binaryString)) !== null) {
      const streamContent = match[1];
      // Extract printable ASCII characters
      const textContent = streamContent.replace(/[^\x20-\x7E\n\r]/g, ' ').trim();
      if (textContent.length > 20) {
        extractedText += textContent + '\n';
      }
    }
    
    // Also try to find text objects (BT...ET blocks)
    const textObjRegex = /BT\s*([\s\S]*?)\s*ET/g;
    while ((match = textObjRegex.exec(binaryString)) !== null) {
      const textBlock = match[1];
      // Extract text from Tj and TJ operators
      const tjMatches = textBlock.match(/\((.*?)\)\s*Tj/g);
      if (tjMatches) {
        tjMatches.forEach(tj => {
          const text = tj.replace(/\((.*?)\)\s*Tj/, '$1');
          extractedText += text + ' ';
        });
      }
    }
    
    // Clean up extracted text
    extractedText = extractedText
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\d.,;:!?()[\]{}áéíóúâêîôûãõàèìòùäëïöüçÁÉÍÓÚÂÊÎÔÛÃÕÀÈÌÒÙÄËÏÖÜÇ\-/\\%@#$&*+=<>'"]+/gi, ' ')
      .trim();
    
    // If we extracted meaningful text, return it
    if (extractedText.length > 50) {
      return extractedText;
    }
    
    return null;
  } catch (error) {
    console.error("Erro ao extrair texto do PDF:", error);
    return null;
  }
}

// Check if the file type is an image that OpenAI Vision API accepts
function isValidImageType(mimeType: string): boolean {
  const validImageTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp'
  ];
  return validImageTypes.includes(mimeType.toLowerCase());
}

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

    const isPdf = imageType === 'application/pdf' || fileName?.toLowerCase().endsWith('.pdf');
    const isImage = isValidImageType(imageType);

    let messages;
    let isTextBased = false;

    if (isPdf) {
      // Handle PDF files - try to extract text
      console.log("Detectado arquivo PDF, extraindo texto...");
      const extractedText = extractTextFromPdfBase64(imageBase64);
      
      if (extractedText && extractedText.length > 50) {
        console.log("Texto extraído do PDF:", extractedText.substring(0, 200) + "...");
        isTextBased = true;
        
        const SYSTEM_PROMPT = buildSystemPrompt(patient, true);
        
        messages = [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Analise este documento/exame laboratorial do paciente ${patient.nome}.

O conteúdo extraído do documento PDF é:

---
${extractedText.substring(0, 15000)}
---

Forneça uma análise COMPLETA focada na relevância odontológica no formato JSON especificado.
Se for um exame laboratorial (hemograma, coagulograma, glicemia, etc.), interprete os valores em relação a procedimentos odontológicos.
Se for um laudo ou relatório, extraia as informações relevantes para o tratamento odontológico.`
          }
        ];
      } else {
        // Could not extract text from PDF
        console.log("Não foi possível extrair texto suficiente do PDF");
        return new Response(
          JSON.stringify({ 
            error: "Não foi possível analisar este PDF. Para documentos em PDF, por favor:\n\n1. Se for uma radiografia/imagem em PDF, converta para imagem (JPEG/PNG) antes de enviar\n2. Se for um exame laboratorial, tire uma foto ou screenshot do documento\n3. Certifique-se que o PDF contém texto legível (não apenas imagens escaneadas)"
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (isImage) {
      // Handle image files - use Vision API
      console.log("Processando imagem com Vision API...");
      const SYSTEM_PROMPT = buildSystemPrompt(patient, false);
      
      messages = [
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
    } else {
      // Unsupported file type
      return new Response(
        JSON.stringify({ 
          error: `Tipo de arquivo não suportado: ${imageType}. Por favor, envie imagens (JPEG, PNG, GIF, WebP) ou PDFs com texto legível.`
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
        tipo_exame: isTextBased ? "Documento PDF/Exame Laboratorial" : "Análise realizada",
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
