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

// Function to check if text is readable (not garbage/encoded)
function isTextReadable(text: string): boolean {
  if (!text || text.length < 50) return false;
  
  // Common Portuguese/medical words that should appear in lab exams
  const commonWords = [
    'hemograma', 'glicose', 'colesterol', 'hemoglobina', 'leucocitos', 'plaquetas',
    'resultado', 'exame', 'paciente', 'data', 'referencia', 'valor', 'unidade',
    'mg', 'dl', 'ml', 'normal', 'alto', 'baixo', 'laboratorio', 'sangue',
    'eritrocitos', 'hematocrito', 'vcm', 'hcm', 'rdw', 'basofilo', 'eosinofilo',
    'linfocito', 'monocito', 'neutrofilo', 'segmentado', 'bastao', 'creatinina',
    'ureia', 'acido', 'urico', 'triglicerides', 'hdl', 'ldl', 'vldl', 'tgo', 'tgp',
    'bilirrubina', 'fosfatase', 'gama', 'proteina', 'albumina', 'globulina',
    'sodio', 'potassio', 'calcio', 'ferro', 'ferritina', 'vitamina', 'tsh', 't4',
    'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto',
    'setembro', 'outubro', 'novembro', 'dezembro', 'anos', 'feminino', 'masculino'
  ];
  
  const textLower = text.toLowerCase();
  let wordMatchCount = 0;
  
  for (const word of commonWords) {
    if (textLower.includes(word)) {
      wordMatchCount++;
    }
  }
  
  // Should have at least 3 common words to be considered readable
  if (wordMatchCount >= 3) return true;
  
  // Check for numeric patterns (lab values like "4.5" or "120")
  const numericPattern = /\d+[.,]\d+|\d{2,}/g;
  const numericMatches = text.match(numericPattern) || [];
  
  // Check for word-like patterns (sequences of letters)
  const wordPattern = /[a-záéíóúâêîôûãõàèìòùäëïöüç]{4,}/gi;
  const wordMatches = text.match(wordPattern) || [];
  
  // If we have numbers and words, it's probably readable
  if (numericMatches.length >= 5 && wordMatches.length >= 10) return true;
  
  // Check for garbage patterns (repeating sequences, too many special chars)
  const garbagePattern = /(.{2,})\1{3,}/g; // Repeating patterns
  const hasGarbage = garbagePattern.test(text);
  
  // Calculate ratio of alphanumeric to total characters
  const alphanumeric = text.replace(/[^a-záéíóúâêîôûãõàèìòùäëïöüç0-9]/gi, '');
  const ratio = alphanumeric.length / text.length;
  
  // Good text should have >60% alphanumeric characters and no garbage patterns
  return ratio > 0.6 && !hasGarbage && wordMatches.length >= 5;
}

// Function to extract readable text from PDF base64
function extractTextFromPdfBase64(base64Data: string): string | null {
  try {
    // Remove data URL prefix if present
    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
    
    // Decode base64 to binary
    const binaryString = atob(cleanBase64);
    
    // Try to extract text content from PDF
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
    
    // If we extracted text, validate it's readable
    if (extractedText.length > 50) {
      if (isTextReadable(extractedText)) {
        return extractedText;
      } else {
        console.log("Texto extraído não é legível (provavelmente codificado), tentando extração de imagem...");
        return null;
      }
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

// Check if PDF is image-based (scanned) by looking for XObject references
function isPdfImageBased(base64Data: string): boolean {
  try {
    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
    const binaryString = atob(cleanBase64);
    
    // Count XObject (image) references vs text operators
    const xobjectCount = (binaryString.match(/\/XObject/g) || []).length;
    const textOperators = (binaryString.match(/BT[\s\S]*?ET/g) || []).length;
    
    // If there are XObjects but very few text blocks, it's likely image-based
    return xobjectCount > 0 && textOperators < 3;
  } catch {
    return false;
  }
}

// Extract embedded image from PDF XObject
function extractFirstImageFromPdf(base64Data: string): { imageBase64: string; mimeType: string } | null {
  try {
    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
    const binaryString = atob(cleanBase64);
    
    // Look for JPEG image markers (FFD8 start, FFD9 end)
    const jpegStart = binaryString.indexOf('\xFF\xD8');
    const jpegEnd = binaryString.lastIndexOf('\xFF\xD9');
    
    if (jpegStart !== -1 && jpegEnd !== -1 && jpegEnd > jpegStart) {
      const jpegData = binaryString.substring(jpegStart, jpegEnd + 2);
      const base64Image = btoa(jpegData);
      console.log("Imagem JPEG extraída do PDF, tamanho:", base64Image.length);
      return { imageBase64: base64Image, mimeType: 'image/jpeg' };
    }
    
    // Look for PNG image markers (89504E47 start)
    const pngSignature = '\x89PNG\r\n\x1a\n';
    const pngStart = binaryString.indexOf(pngSignature);
    
    if (pngStart !== -1) {
      // Find IEND chunk
      const iendMarker = 'IEND';
      const pngEnd = binaryString.indexOf(iendMarker, pngStart);
      
      if (pngEnd !== -1) {
        const pngData = binaryString.substring(pngStart, pngEnd + 8); // IEND + CRC
        const base64Image = btoa(pngData);
        console.log("Imagem PNG extraída do PDF, tamanho:", base64Image.length);
        return { imageBase64: base64Image, mimeType: 'image/png' };
      }
    }
    
    return null;
  } catch (error) {
    console.error("Erro ao extrair imagem do PDF:", error);
    return null;
  }
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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY não configurada");
    }

    console.log("Analisando exame:", fileName, "Tipo:", imageType);
    console.log("Paciente:", patient.nome, "DN:", patient.dataNascimento);

    const isPdf = imageType === 'application/pdf' || fileName?.toLowerCase().endsWith('.pdf');
    const isImage = isValidImageType(imageType);

    let apiResponse;
    let isTextBased = false;

    if (isPdf) {
      console.log("Detectado arquivo PDF, usando Gemini via Lovable AI (suporte nativo a PDF)...");
      
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY não configurada para processamento de PDFs");
      }
      
      const SYSTEM_PROMPT = buildSystemPrompt(patient, true);
      
      // Clean base64 data
      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
      
      // Use Gemini via Lovable AI gateway - it supports PDF directly
      const geminiMessages = [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analise este documento PDF (${fileName || "exame"}) do paciente ${patient.nome}.

Este é um exame laboratorial ou documento clínico. Leia TODO o conteúdo do PDF e forneça uma análise COMPLETA focada na relevância odontológica.

Se for um exame laboratorial (hemograma, coagulograma, glicemia, etc.), interprete TODOS os valores apresentados em relação a procedimentos odontológicos.
Se for um laudo ou relatório, extraia as informações relevantes para o tratamento odontológico.

Forneça a análise no formato JSON especificado. Seja extremamente detalhado e técnico.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:application/pdf;base64,${cleanBase64}`
              }
            }
          ]
        }
      ];

      console.log("Enviando PDF para Gemini...");
      
      apiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: geminiMessages,
        }),
      });

      isTextBased = true;
      
    } else if (isImage) {
      // Handle image files - use OpenAI Vision API
      console.log("Processando imagem com OpenAI Vision API...");
      const SYSTEM_PROMPT = buildSystemPrompt(patient, false);
      
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

      apiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
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
    } else {
      // Unsupported file type
      return new Response(
        JSON.stringify({ 
          error: `Tipo de arquivo não suportado: ${imageType}. Por favor, envie imagens (JPEG, PNG, GIF, WebP) ou PDFs.`
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle API response (works for both Gemini and OpenAI)
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error("Erro da API:", apiResponse.status, errorText);
      
      if (apiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (apiResponse.status === 402 || apiResponse.status === 401) {
        return new Response(
          JSON.stringify({ error: "Erro de autenticação ou créditos insuficientes na API." }),
          { status: apiResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Erro na API: ${apiResponse.status} - ${errorText}`);
    }

    const data = await apiResponse.json();
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
      analysis = JSON.parse(jsonStr.trim());
      console.log("JSON parseado com sucesso");
    } catch (parseError) {
      console.log("Falha ao parsear JSON, tentando extrair seções do texto...", parseError);
      
      // Try to extract sections from unstructured text
      const extractSection = (text: string, sectionName: string, nextSection?: string): string => {
        const regex = new RegExp(`(?:${sectionName}[:\\s]*)(.*?)(?=${nextSection ? `(?:${nextSection})` : '$'})`, 'is');
        const match = text.match(regex);
        return match ? match[1].trim() : '';
      };

      const extractListItems = (text: string): string[] => {
        const items = text.split(/[\n•\-\*]/).map(s => s.trim()).filter(s => s.length > 10);
        return items.length > 0 ? items : [text];
      };

      // Try to find JSON-like patterns anywhere in the content
      const findJsonObject = content.match(/\{[\s\S]*"identificacao_paciente"[\s\S]*\}/);
      if (findJsonObject) {
        try {
          analysis = JSON.parse(findJsonObject[0]);
          console.log("JSON encontrado em substring");
        } catch {
          console.log("Substring JSON também falhou, usando extração de texto");
        }
      }

      if (!analysis) {
        // Extract meaningful content from text response
        const achadosMatch = content.match(/(?:achados|findings|4\))[:\s]*([\s\S]*?)(?:5\)|interpreta|$)/i);
        const interpretacaoMatch = content.match(/(?:interpreta|5\))[:\s]*([\s\S]*?)(?:6\)|diagn|$)/i);
        const diagnosticosMatch = content.match(/(?:diagn|6\))[:\s]*([\s\S]*?)(?:7\)|risco|alert|$)/i);
        const riscosMatch = content.match(/(?:risco|alert|7\))[:\s]*([\s\S]*?)(?:8\)|recomenda|$)/i);
        const recomendacoesMatch = content.match(/(?:recomenda|8\))[:\s]*([\s\S]*?)(?:9\)|observa|$)/i);
        const observacoesMatch = content.match(/(?:observa|9\))[:\s]*([\s\S]*?)$/i);

        analysis = {
          identificacao_paciente: {
            nome: patient.nome,
            data_nascimento: patient.dataNascimento,
            data_analise: patient.dataLaudo,
          },
          tipo_exame: isTextBased ? "Documento PDF/Exame Laboratorial" : "Radiografia/Imagem Odontológica",
          qualidade_imagem: "Documento processado com sucesso",
          achados_radiograficos: achadosMatch ? extractListItems(achadosMatch[1]) : extractListItems(content.substring(0, 2000)),
          interpretacao_clinica: interpretacaoMatch ? interpretacaoMatch[1].trim() : content.substring(0, 1500),
          diagnosticos_diferenciais: diagnosticosMatch ? extractListItems(diagnosticosMatch[1]) : ["Consulte a interpretação clínica para diagnósticos diferenciais"],
          riscos_alertas: riscosMatch ? extractListItems(riscosMatch[1]) : ["Verifique valores alterados na análise completa"],
          recomendacoes_clinicas: recomendacoesMatch ? extractListItems(recomendacoesMatch[1]) : ["Avaliação clínica complementar recomendada"],
          observacoes: observacoesMatch ? observacoesMatch[1].trim() : "Este laudo é baseado na análise automática do documento. A interpretação final deve ser realizada pelo dentista responsável."
        };
      }
    }

    // Ensure all required fields exist
    analysis = {
      identificacao_paciente: analysis.identificacao_paciente || {
        nome: patient.nome,
        data_nascimento: patient.dataNascimento,
        data_analise: patient.dataLaudo,
      },
      tipo_exame: analysis.tipo_exame || "Exame Analisado",
      qualidade_imagem: analysis.qualidade_imagem || "Documento processado",
      achados_radiograficos: analysis.achados_radiograficos?.length > 0 ? analysis.achados_radiograficos : ["Análise detalhada disponível na interpretação clínica"],
      interpretacao_clinica: analysis.interpretacao_clinica || content.substring(0, 2000),
      diagnosticos_diferenciais: analysis.diagnosticos_diferenciais?.length > 0 ? analysis.diagnosticos_diferenciais : ["Ver interpretação clínica"],
      riscos_alertas: analysis.riscos_alertas?.length > 0 ? analysis.riscos_alertas : ["Avaliação de riscos incluída na análise"],
      recomendacoes_clinicas: analysis.recomendacoes_clinicas?.length > 0 ? analysis.recomendacoes_clinicas : ["Recomendações clínicas conforme análise"],
      observacoes: analysis.observacoes || "A interpretação final é responsabilidade do dentista responsável."
    };

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
