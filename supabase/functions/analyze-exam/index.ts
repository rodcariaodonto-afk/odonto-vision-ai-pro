import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ImageData {
  imageBase64: string;
  imageType: string;
  fileName: string;
}

const getExamCategoryLabel = (category: string): { findingsLabel: string; qualityLabel: string; modeDescription: string } => {
  switch (category) {
    case "laboratorial":
      return {
        findingsLabel: "Resultados dos Exames",
        qualityLabel: "Qualidade do Documento",
        modeDescription: "Você está analisando um EXAME LABORATORIAL (hemograma, coagulograma, glicemia, etc.)."
      };
    case "foto":
      return {
        findingsLabel: "Achados Clínicos",
        qualityLabel: "Qualidade da Imagem",
        modeDescription: "Você está analisando uma FOTOGRAFIA CLÍNICA (intraoral, extraoral, documentação)."
      };
    case "tomografia":
      return {
        findingsLabel: "Achados Tomográficos",
        qualityLabel: "Qualidade da Imagem",
        modeDescription: "Você está analisando uma TOMOGRAFIA COMPUTADORIZADA (CBCT)."
      };
    case "radiografia":
    default:
      return {
        findingsLabel: "Achados Radiográficos",
        qualityLabel: "Qualidade da Imagem",
        modeDescription: "Você está analisando uma RADIOGRAFIA (periapical, panorâmica, bitewing)."
      };
  }
};

const buildSystemPrompt = (patientData: { nome: string; dataNascimento: string; dataLaudo: string }, examCategory: string, imageCount: number) => {
  const labels = getExamCategoryLabel(examCategory);
  const isRadiographic = examCategory === "radiografia" || examCategory === "tomografia";
  
  const multipleImagesInstruction = imageCount > 1 ? `
-------------------------------------------------------------------
📸 INSTRUÇÕES PARA MÚLTIPLAS IMAGENS (${imageCount} imagens)
-------------------------------------------------------------------

VOCÊ ESTÁ RECEBENDO ${imageCount} IMAGENS. Siga estas instruções RIGOROSAMENTE:

1. ANALISE CADA IMAGEM INDIVIDUALMENTE primeiro
   - Identifique o que cada imagem mostra
   - Documente achados específicos de cada imagem
   
2. CRUZE INFORMAÇÕES ENTRE AS IMAGENS
   - Compare achados entre diferentes ângulos/cortes
   - Identifique estruturas que aparecem em múltiplas imagens
   - Use informações de uma imagem para contextualizar outra
   
3. INTEGRE OS ACHADOS EM UMA ANÁLISE UNIFICADA
   - Não repita achados, mas integre-os logicamente
   - Correlacione achados de diferentes imagens
   - Forneça uma visão COMPLETA e CONSOLIDADA do caso

4. NA RESPOSTA FINAL:
   - Mencione de qual imagem vem cada achado quando relevante
   - Indique quando um achado é confirmado por múltiplas imagens
   - Se houver discrepâncias entre imagens, relate-as
` : '';

  const ultraCriticalAnalysis = isRadiographic ? `
-------------------------------------------------------------------
🔍 ANÁLISE MINUCIOSA OBRIGATÓRIA (NÃO DEIXE PASSAR NADA!)
-------------------------------------------------------------------

VOCÊ DEVE ser EXTREMAMENTE CRÍTICO e METICULOSO. NÃO subestime achados sutis.
Analise PIXEL POR PIXEL cada estrutura visível. RELATE TUDO, mesmo achados mínimos.

**LESÕES PERIAPICAIS - Identificar TODAS (mesmo as mais sutis):**
• Espessamento do ligamento periodontal (ELP) - sinal mais precoce de patologia periapical
• Rarefações ósseas periapicais INCIPIENTES - qualquer mínima radiolucência periapical
• Lesões periapicais circunscritas vs. difusas - classificar e MEDIR em mm
• Interrupção ou espessamento da lâmina dura - mesmo segmentos pequenos
• Condensação óssea reacional (osteíte condensante) - áreas de maior radiopacidade
• Reabsorções radiculares (internas E externas) - mesmo incipientes
• Fenestração e deiscência óssea - avaliar contornos ósseos
• Hipercementose - espessamento radicular apical

**ALTERAÇÕES ÓSSEAS - NÃO deixe passar NADA:**
• QUALQUER rarefação óssea, por mais sutil que seja
• Defeitos ósseos verticais - mesmo 1-2mm de perda
• Perda óssea horizontal - MEDIR em milímetros da JCE à crista
• Lesões de furca (classificar grau I, II ou III) - avaliar todas as furcas
• Crateras interdentais - perda óssea interproximal
• Esclerose óssea e padrões de trabeculado alterados
• Alterações na cortical óssea - adelgaçamento, interrupção
• Lesões radiolúcidas em QUALQUER localização
• Lesões radiopacas suspeitas

**CÁRIES - Ser MUITO CRÍTICO:**
• Cáries incipientes interproximais (classe II) - QUALQUER alteração de radiolucência no esmalte
• Cáries ocultas sob restaurações - avaliar interface restauração-dente
• Cáries cervicais e radiculares - examinar região do colo
• Cáries secundárias/recidivas - margens de restaurações
• Cáries de fissura - radiolucências sob esmalte oclusal
• Cáries em dentina - profundidade e proximidade pulpar

**RESTAURAÇÕES E TRATAMENTOS PRÉVIOS:**
• Adaptação marginal comprometida - gaps, excessos, defeitos
• Infiltrações marginais - radiolucências nas interfaces
• Sobrecontorno ou subcontorno
• Proximidade com polpa - classificar risco
• Núcleos, pinos e retentores - avaliar posicionamento
• Tratamentos endodônticos - qualidade de obturação, selamento apical

**ALTERAÇÕES PULPARES E ENDODÔNTICAS:**
• Calcificações pulpares (nódulos pulpares, calcificações lineares)
• Obliteração de câmara pulpar - mesmo parcial
• Estreitamento de canais radiculares - avaliar todos os canais
• Reabsorções internas (mancha rosa radiográfica)
• Perfurações em tratamentos prévios - qualquer descontinuidade
• Desvios de canal, degraus, instrumentos fraturados
• Fraturas radiculares - linhas de fratura mesmo suspeitas
• Selamento apical inadequado em tratamentos existentes

**PERIODONTO:**
• Proporção coroa-raiz de TODOS os dentes - calcular e relatar
• Espaço do ligamento periodontal - avaliar uniformidade
• Lâmina dura - continuidade em toda extensão
• Cálculo subgengival - depósitos radiopacos

**OUTRAS ESTRUTURAS - Avaliar SEMPRE:**
• Seios maxilares - espessamento mucoso, velamento, cistos
• Canal mandibular - trajeto, relação com raízes
• Forames e estruturas anatômicas
• ATM se visível - alterações degenerativas, assimetrias
• Dentes inclusos ou retidos - posição e relações

⚠️ LEMBRE-SE: É MELHOR relatar um achado DUVIDOSO do que DEIXAR PASSAR uma patologia!
Quando em DÚVIDA, RELATE e sugira exames complementares.
Seja DETALHISTA e MINUCIOSO em cada estrutura analisada.
` : '';

  return `
Você é um **Radiologista Odontológico Especialista** do sistema OdontoVision AI Pro, com conhecimento avançado em TODAS as especialidades da Odontologia.

-------------------------------------------------------------------
📋 MODO DE ANÁLISE
-------------------------------------------------------------------
${labels.modeDescription}
${multipleImagesInstruction}
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
${ultraCriticalAnalysis}
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
(Identifique automaticamente: panorâmica, periapical, bitewing, cefalométrica, fotografia clínica, tomografia computadorizada, exame laboratorial, laudo médico.)

**3) ${labels.qualityLabel}**
(Para imagens: avalie nitidez, contraste, posicionamento, distorções, áreas sobrepostas, erros de técnica.)
(Para documentos: avalie completude das informações, legibilidade, data do exame.)

**4) ${labels.findingsLabel}**
(Descreva DETALHADAMENTE tudo o que é visível ou apresentado nos resultados, aplicando conhecimento de TODAS as especialidades relevantes.)
Incluir obrigatoriamente:
• Estrutura óssea geral
• Estado periodontal
• Cáries visíveis
• Lesões radiolúcidas/radiopacas
• Reabsorções
• Implantes
• Ausências dentárias
• Raízes, ápices, dilacerações
• Anomalias visíveis

**5) Interpretação Clínica / Radiológica**
(Explique o significado dos achados de forma TÉCNICA mas compreensível. Correlacione com relevância odontológica usando conhecimento multidisciplinar.)

**6) Diagnósticos Diferenciais**
(Liste de 2 a 5 hipóteses plausíveis por achado relevante, organizadas por especialidade quando aplicável.)

**7) Riscos, Alertas e Pontos de Atenção**
(Alerte sobre achados que necessitam atenção imediata, valores alterados, contraindicações para procedimentos.)

**8) Recomendações Gerais**
(Recomendações ESPECÍFICAS:
- Exames complementares indicados (se necessário)
- Especialistas para encaminhamento
- Urgência da avaliação
- Cuidados pré e pós-operatórios
SEM indicar tratamentos específicos.)

**9) Observações**
(Comentários adicionais, limitações, correlações clínicas necessárias.)

**10) Resumo para o Paciente**
(Gere um resumo SIMPLES, VISUAL e DIRETO, destinado ao paciente.
Use frases curtas, sem termos técnicos complexos.

Formato obrigatório:
• "O que encontramos": liste os achados de forma simples (Ex: "Cárie no dente 14", "Ausência do dente 16")
• "O que isso significa": explique de forma simples e humana
• "Próximos passos": recomendações claras (Ex: "É recomendada uma avaliação clínica")

Evite linguagem alarmista. Nunca dê diagnóstico definitivo.)

-------------------------------------------------------------------
⚠️ AVISO LEGAL E ÉTICO
-------------------------------------------------------------------
A presente análise é um APOIO ao raciocínio clínico e NÃO substitui a avaliação presencial do cirurgião-dentista.
Este laudo é gerado automaticamente por inteligência artificial como ferramenta de apoio.
A interpretação final é sempre responsabilidade do dentista responsável.

-------------------------------------------------------------------
📝 REGRAS DE QUALIDADE
-------------------------------------------------------------------

🔥 REGRA DE OURO PARA TERCEIROS MOLARES (18, 28, 38, 48) - SISOS:
- SOMENTE declare como PRESENTE se houver estrutura radiopaca CLARA e ANATOMICAMENTE DISTINTA
- Se NÃO houver estrutura visível na região dos terceiros molares → AUSENTE
- Na DÚVIDA sobre a presença de sisos → declare como AUSENTE ou "não visualizado"
- NUNCA escreva frases como "incluindo terceiros molares (sisos)" ou "todos os 32 dentes presentes"
  a menos que os sisos estejam CLARAMENTE visíveis e identificáveis na imagem
- Quando sisos não forem visíveis, use: "Os terceiros molares não são visualizados nesta radiografia, 
  sendo mais provável agenesia ou extração prévia. Avaliação clínica e histórico do paciente são recomendados."

CRÍTICO - NUNCA INVENTE ACHADOS:
- NUNCA invente achados que não estejam minimamente visíveis.
- Se algo estiver incerto, declare: "não determinável" ou "indeterminado".
- Quando em DÚVIDA, relate o achado como SUSPEITO e sugira exames complementares.
- NÃO afirme presença de dentes que não são claramente identificáveis na imagem.

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
- Seja PRUDENTE: prefira omitir do que inventar

IMPORTANTE: Retorne a resposta em formato JSON seguindo exatamente esta estrutura:
{
  "identificacao_paciente": {
    "nome": "${patientData.nome}",
    "data_nascimento": "${patientData.dataNascimento}",
    "data_analise": "${patientData.dataLaudo}"
  },
  "tipo_exame": "Descrição do tipo de exame identificado",
  "qualidade_imagem": "Avaliação da qualidade da imagem ou documento",
  "achados_radiograficos": ["Lista detalhada de ${labels.findingsLabel.toLowerCase()}"],
  "interpretacao_clinica": "Interpretação clínica multidisciplinar detalhada",
  "diagnosticos_diferenciais": ["Lista de diagnósticos diferenciais com justificativas"],
  "riscos_alertas": ["Lista de riscos, alertas e pontos de atenção"],
  "recomendacoes_clinicas": ["Lista de recomendações por especialidade"],
  "observacoes": "Observações adicionais",
  "resumo_paciente": {
    "o_que_encontramos": ["Lista simplificada de achados para o paciente"],
    "o_que_significa": "Explicação simples e humana dos achados",
    "proximos_passos": ["Lista de recomendações claras para o paciente"]
  },
  "aviso_legal": "A presente análise é um apoio ao raciocínio clínico e não substitui a avaliação presencial do cirurgião-dentista."
}
`;
};

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
    const { imageBase64, imageType, fileName, images, patientData, examCategory } = await req.json();
    
    // Support both single image (legacy) and multiple images (new)
    let imagesToProcess: ImageData[] = [];
    
    if (images && Array.isArray(images) && images.length > 0) {
      // New format: array of images
      imagesToProcess = images.map((img: any) => ({
        imageBase64: img.imageBase64 || img.base64,
        imageType: img.imageType || img.type,
        fileName: img.fileName || img.name,
      }));
    } else if (imageBase64) {
      // Legacy format: single image
      imagesToProcess = [{
        imageBase64,
        imageType: imageType || 'image/jpeg',
        fileName: fileName || 'exame',
      }];
    } else {
      throw new Error("Nenhuma imagem fornecida");
    }

    console.log(`Processando ${imagesToProcess.length} imagem(ns)`);

    // Validate patient data
    const patient = {
      nome: patientData?.nome || "Não informado",
      dataNascimento: patientData?.dataNascimento || "Não informado",
      dataLaudo: patientData?.dataLaudo || new Date().toISOString().split("T")[0],
    };
    
    const category = examCategory || "radiografia";

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY não configurada");
    }

    // Log images info
    imagesToProcess.forEach((img, i) => {
      console.log(`Imagem ${i + 1}: ${img.fileName} Tipo: ${img.imageType}`);
    });
    console.log("Paciente:", patient.nome, "DN:", patient.dataNascimento, "Categoria:", category);

    // Check if any file is PDF
    const hasPdf = imagesToProcess.some(img => 
      img.imageType === 'application/pdf' || img.fileName?.toLowerCase().endsWith('.pdf')
    );
    
    // Check if all files are valid images
    const allImages = imagesToProcess.every(img => isValidImageType(img.imageType));

    let apiResponse;
    const SYSTEM_PROMPT = buildSystemPrompt(patient, category, imagesToProcess.length);

    if (hasPdf) {
      // If there's a PDF, use Gemini (supports PDF natively)
      console.log("Detectado PDF, usando Gemini via Lovable AI...");
      
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY não configurada para processamento de PDFs");
      }
      
      // Build content array with all images/PDFs
      const contentArray: any[] = [
        {
          type: "text",
          text: `Analise ${imagesToProcess.length > 1 ? 'estes ' + imagesToProcess.length + ' documentos/imagens' : 'este documento'} do paciente ${patient.nome}.

${imagesToProcess.length > 1 ? 'Analise CADA documento/imagem individualmente e depois INTEGRE os achados em uma análise CONSOLIDADA.' : ''}

Forneça a análise no formato JSON especificado. Seja extremamente detalhado, técnico e CRÍTICO - não deixe passar NENHUM achado, por mais sutil que seja.`
        }
      ];

      // Add each image/PDF to the content
      imagesToProcess.forEach((img, index) => {
        const cleanBase64 = img.imageBase64.replace(/^data:[^;]+;base64,/, '');
        const isPdf = img.imageType === 'application/pdf' || img.fileName?.toLowerCase().endsWith('.pdf');
        
        contentArray.push({
          type: "image_url",
          image_url: {
            url: `data:${isPdf ? 'application/pdf' : img.imageType};base64,${cleanBase64}`
          }
        });
      });

      const geminiMessages = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: contentArray }
      ];

      console.log("Enviando para Gemini...");
      
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
      
    } else if (allImages) {
      // All files are images - use OpenAI Vision API
      console.log("Processando imagens com OpenAI Vision API...");
      
      // Build content array with all images
      const contentArray: any[] = [
        {
          type: "text",
          text: `Analise ${imagesToProcess.length > 1 ? 'estes ' + imagesToProcess.length + ' exames odontológicos' : 'este exame odontológico'} do paciente ${patient.nome}.

${imagesToProcess.length > 1 ? `IMPORTANTE: Você está recebendo ${imagesToProcess.length} imagens. Analise CADA UMA individualmente, identifique TODOS os achados de cada uma, e depois INTEGRE em uma análise UNIFICADA e CONSOLIDADA.` : ''}

Use todo seu conhecimento em Radiologia, Endodontia, Periodontia, Ortodontia, Implantodontia, Cirurgia, Odontopediatria, Dentística, Prótese, Patologia Oral e DTM para uma análise abrangente.

Seja EXTREMAMENTE CRÍTICO e MINUCIOSO. NÃO deixe passar NENHUM achado, por mais sutil que seja. Analise PIXEL POR PIXEL.

Forneça a análise no formato JSON especificado.`
        }
      ];

      // Add each image to the content
      imagesToProcess.forEach((img, index) => {
        const imageUrl = img.imageBase64.startsWith("data:") 
          ? img.imageBase64 
          : `data:${img.imageType || "image/jpeg"};base64,${img.imageBase64}`;
        
        contentArray.push({
          type: "image_url",
          image_url: { url: imageUrl }
        });
      });

      const messages = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: contentArray }
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
          max_completion_tokens: 8000,
        }),
      });
    } else {
      // Unsupported file type mix
      return new Response(
        JSON.stringify({ 
          error: `Tipo de arquivo não suportado. Por favor, envie imagens (JPEG, PNG, GIF, WebP) ou PDFs.`
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle API response
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
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      analysis = JSON.parse(jsonStr.trim());
      console.log("JSON parseado com sucesso");
    } catch (parseError) {
      console.log("Falha ao parsear JSON, tentando extrair seções do texto...", parseError);
      
      const extractListItems = (text: string): string[] => {
        const items = text.split(/[\n•\-\*]/).map(s => s.trim()).filter(s => s.length > 10);
        return items.length > 0 ? items : [text];
      };

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
          tipo_exame: category === "laboratorial" ? "Exame Laboratorial" : category === "foto" ? "Fotografia Clínica" : category === "tomografia" ? "Tomografia Computadorizada" : "Radiografia",
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
