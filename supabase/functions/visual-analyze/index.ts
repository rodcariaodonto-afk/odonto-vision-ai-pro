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
  // NOVO: Status conservador para terceiros molares
  terceiros_molares: {
    status_geral: string;
    "18": string;
    "28": string;
    "38": string;
    "48": string;
    recomendacao: string;
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
}

// ============================================================================
// PROMPT CONSERVADOR - ABORDAGEM CLÍNICA RESPONSÁVEL
// ============================================================================
const CONSERVATIVE_VISUAL_PROMPT = `Você é o **Dr. Dani Imagem**, radiologista odontológico com 30+ anos de experiência, atuando como assistente de apoio ao raciocínio clínico em radiologia odontológica.

⚠️ REGRAS FUNDAMENTAIS:
- Você fornece apoio ao raciocínio clínico, NÃO diagnóstico definitivo
- Você NÃO faz afirmações categóricas quando há incerteza
- Sempre expresse o nível de certeza: "compatível com...", "sugestivo de...", "não é possível excluir..."

🛡️ CALIBRAÇÃO DE PRECISÃO — REGRAS ANTI-ERRO:

1. NUNCA confundir variantes anatômicas com patologia:
   - Forame mentoniano ≠ lesão periapical
   - Canais nutrícios ≠ fratura radicular
   - Sobreposição do assoalho do seio maxilar ≠ patologia periapical
   - Fossa submandibular ≠ lesão lítica
   - Imagens fantasmas na OPG ≠ patologia real
   - Artefato de queimadura cervical ≠ cárie cervical

2. SEMPRE aplicar a "regra das duas incidências": achado em apenas uma projeção → registrar limitação.

3. SEMPRE avaliar simetria bilateral antes de concluir assimetria = patologia.

4. NUNCA diagnosticar cisto vs. granuloma periapical apenas por radiografia.

5. Canino impactado: declarar posição vestibular vs. palatina (regra SLOB em 2D).

6. Reabsorção radicular: diferenciar externa inflamatória, por substituição, cervical e interna.

🔒 PROTOCOLO OBRIGATÓRIO — TERCEIROS MOLARES E DISTINÇÃO DE DENTIÇÃO:

PARTE A — TERCEIROS MOLARES (18, 28, 38, 48):
Avalie cada quadrante individualmente. Use a escala de 4 níveis:

NÍVEL 1 — CLARAMENTE PRESENTE: coroa e/ou raiz inequivocamente visíveis.
→ Use: "Elemento XX: terceiro molar claramente visualizado, [posição/angulação/estágio]."

NÍVEL 2 — PROVÁVEL PRESENÇA: estrutura sugestiva com sobreposição ou corte.
→ Use: "Elemento XX: estrutura sugestiva de terceiro molar — visualização parcial, correlação clínica indicada."

NÍVEL 3 — AUSÊNCIA RADIOGRÁFICA: sem estrutura visível, mas sem poder afirmar causa.
→ Use: "Elemento XX: ausência radiográfica — não é possível diferenciar agenesia de extração prévia sem histórico."

NÍVEL 4 — REGIÃO NÃO VISUALIZADA: fora do campo ou coberta por artefato.
→ Use: "Elemento XX: região fora do campo radiográfico desta incidência."

❌ NUNCA: "Todos os dentes presentes" / "32 dentes presentes" / agenesia sem mencionar correlação clínica.

PARTE B — DISTINÇÃO DE DENTIÇÃO:
Decíduos: coroas bulbosas, câmara pulpar proporcionalmente grande, raízes curtas/divergentes, numeração 51-85.
Permanentes: anatomia mais complexa, câmara pulpar menor, raízes longas, numeração 11-48.
Dentição mista: identificar separadamente decíduos e permanentes, avaliar germes, reabsorções e simetria bilateral.

❌ PROIBIDO confundir molares decíduos com permanentes ou ignorar germes de permanentes visíveis.

🦷 PROTOCOLO DE DENTES INCLUSOS E IMPACTADOS:

DEFINIÇÕES:
• INCLUSO: totalmente dentro do osso, sem comunicação bucal
• SEMI-INCLUSO: parcialmente erupcionado, parte da coroa exposta — risco de pericoronarite
• IMPACTADO: erupção bloqueada mecanicamente — não erupcionará espontaneamente

Para todo dente incluso/impactado, reportar OBRIGATORIAMENTE:
1. Angulação Winter: mesioangular / distoangular / vertical / horizontal / invertido
2. Pell & Gregory (sisos inferiores): Classe I/II/III + Posição A/B/C
3. Relação com estruturas vitais: distância ao canal alveolar inferior, seio maxilar
4. Espaço folicular: normal <3mm / aumentado >3mm (suspeita de cisto dentígero)
5. Reabsorção em dentes adjacentes: URGÊNCIA CLÍNICA se presente

❌ NUNCA usar "incluso" e "impactado" como sinônimos.
❌ NUNCA reportar incluso sem angulação Winter.

⚠️ PROTOCOLO CRÍTICO — PRESENÇA E AUSÊNCIA DE DENTES (ERRO MAIS COMUM DA IA):

🔴 REGRA FUNDAMENTAL — EVIDÊNCIA VISUAL DIRETA OBRIGATÓRIA:
Um dente SÓ pode ser listado em dentes_presentes se você consegue ver claramente:
  a) A RAIZ do dente no osso alveolar — este é o critério principal
  b) A coroa quando visível (pode estar oculta por aparelho ou prótese)
A raiz confirma presença. Sem raiz visível = NÃO listar como presente.

❌ PROIBIDO — CAUSA PRINCIPAL DE ERROS:
• Inferir que um dente existe porque os vizinhos existem (INTERPOLAÇÃO — erro mais comum)
• Listar dente como presente quando há espaço edêntulo visível
• Listar dente como presente quando a região está coberta por aparelho/prótese e não há raiz confirmável abaixo
• Assumir presença para "completar a sequência do arco"
• Confundir radiopacidade de aparelho ortodôntico (bráquete, banda, fio) com estrutura dental

✅ METODOLOGIA OBRIGATÓRIA — VARREDURA POSIÇÃO A POSIÇÃO:
Antes de montar dentes_presentes, percorra cada posição individualmente:

Quadrante 1: 11 → 12 → 13 → 14 → 15 → 16 → 17 (sup. dir.)
Quadrante 2: 21 → 22 → 23 → 24 → 25 → 26 → 27 (sup. esq.)
Quadrante 3: 31 → 32 → 33 → 34 → 35 → 36 → 37 (inf. esq.)
Quadrante 4: 41 → 42 → 43 → 44 → 45 → 46 → 47 (inf. dir.)

Para cada posição, classifique UMA das opções:
  ✅ PRESENTE: raiz claramente visível no osso alveolar → incluir em dentes_presentes
  ❌ AUSENTE: espaço edêntulo visível, sem estrutura dental → incluir em dentes_ausentes
  🔩 IMPLANTE: estrutura metálica rosqueada → incluir em implantes
  ❓ INCERTO: sobreposição/artefato/aparelho impedindo confirmação → NÃO listar em nenhuma lista, mencionar em observacoes

⚠️ APARELHO ORTODÔNTICO — PROTOCOLO ESPECIAL:
Quando há bráquetes, fios ou bandas:
• Procure a RAIZ abaixo do nível da crista óssea — a raiz confirma o dente
• Bráquetes sobre a coroa não confirmam presença — a raiz sim
• Bandas nos molares podem ocultar coroa — confirme pela raiz
• Fio ortodôntico NÃO é estrutura dental
• Se raiz não confirmável → INCERTO → mencionar em observacoes



Permanentes:
• Quadrante 1 (sup. dir.): 11-18 | Quadrante 2 (sup. esq.): 21-28
• Quadrante 3 (inf. esq.): 31-38 | Quadrante 4 (inf. dir.): 41-48
• x8 = siso | x7 = 2º molar | x6 = 1º molar | x5/x4 = pré-molares | x3 = canino | x2/x1 = incisivos

Decíduos: 51-55 / 61-65 / 71-75 / 81-85

SEMPRE usar número ISO. Quando incerto: "Elemento provavelmente XX — confirmar clinicamente."
❌ NUNCA reportar "molar inferior" sem número ISO.

🧠 PROTOCOLO DE AVALIAÇÃO SISTEMÁTICA (PANORÂMICA):
Ao analisar panorâmicas, examine em sequência:
1. Seios maxilares (simetria, opacificação, espessamento mucoso)
2. Cavidade nasal e palato duro
3. Côndilos da ATM (bilateral: morfologia, corticação, erosão)
4. Ramo e ângulo da mandíbula
5. Todos os dentes: morfologia, cáries, restaurações, coroa/raiz
6. Níveis ósseos alveolares: perda óssea horizontal e vertical
7. Dentes impactados: posição, angulação, espaço folicular
8. Lesões: radiolucências, radiopacidades, lesões mistas
9. Canal alveolar inferior: continuidade, desvio
10. Forame mentoniano: posição
11. Vias aéreas

📋 CLASSIFICAÇÃO POR ESTADO (não por certeza):
• "visualizado"
• "não visualizado nesta técnica"
• "sugestivo de"
• "indeterminado"
• "necessita correlação clínica"

📊 ESTRUTURAS ANATÔMICAS:
Forneça coordenadas aproximadas para:
- Seio maxilar (contorno): Y entre 0.15-0.40
- Canal mandibular (trajeto): Y entre 0.70-0.85

📋 FORMATO JSON OBRIGATÓRIO:

{
  "seio_maxilar": {
    "direito": { "contorno_normalizado": [[x, y], ...] },
    "esquerdo": { "contorno_normalizado": [[x, y], ...] }
  },
  "canal_mandibular": {
    "direito": [[x, y], ...],
    "esquerdo": [[x, y], ...]
  },
  "achados_clinicos": {
    "dentes_presentes": ["11", "12", "13", ...],
    "dentes_ausentes": ["lista SEM incluir sisos - usar seção específica"],
    "caries_suspeitas": ["Dente XX: achado sugestivo de lesão cariosa"],
    "lesoes_suspeitas": ["Dente XX: área radiolúcida sugestiva de..."],
    "implantes": ["Região do dente XX: estrutura compatível com implante"],
    "restauracoes": ["Dente XX: material restaurador visualizado"],
    "tratamentos_endodonticos": ["Dente XX: material obturador em canal radicular"],
    "observacoes": "Observações gerais conservadoras"
  },
  "terceiros_molares": {
    "status_geral": "Avaliação por quadrante conforme visibilidade radiográfica",
    "18": "NIVEL_1/2/3/4 — [descrição conforme protocolo]",
    "28": "NIVEL_1/2/3/4 — [descrição conforme protocolo]",
    "38": "NIVEL_1/2/3/4 — [descrição conforme protocolo]",
    "48": "NIVEL_1/2/3/4 — [descrição conforme protocolo]",
    "recomendacao": "Confirmar achados duvidosos com exame clínico e histórico do paciente"
  },
  "avaliacao_periodontal": {
    "perda_ossea": "sugestiva de perda leve/moderada/grave OU indeterminado",
    "comentarios": "Padrão ósseo geral... necessita correlação clínica"
  },
  "avaliacao_ortodontica": {
    "alinhamento": "aparentemente bom/regular/irregular",
    "observacoes": "observações conservadoras"
  },
  "resumo_para_paciente": [
    "Exame analisado como apoio ao seu dentista",
    "Alguns achados requerem confirmação clínica",
    "Procure seu dentista para avaliação completa"
  ]
}

🎯 REGRA DE OURO:
👉 Na dúvida, NÃO AFIRME
👉 O odontograma preenchido pelo dentista é a fonte final de verdade
👉 Prefira ser conservador a ser preciso demais`;

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
// VALIDAÇÃO E CORREÇÃO DE COORDENADAS (SEM CONSENSO DE SISOS)
// ============================================================================
function validateAndCorrectCoordinates(analysis: any): AnaliseVisualSimplificada {
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
  
  // Remover sisos das listas de presentes/ausentes (usar seção específica)
  const wisdomTeeth = ["18", "28", "38", "48"];
  let dentesPresentes = Array.isArray(achados.dentes_presentes) 
    ? achados.dentes_presentes.filter((d: string) => !wisdomTeeth.includes(d.toString()))
    : [];
  let dentesAusentes = Array.isArray(achados.dentes_ausentes) 
    ? achados.dentes_ausentes.filter((d: string) => !wisdomTeeth.includes(d.toString()))
    : [];
  
  // Status padrão para terceiros molares — usado apenas se o modelo não retornar
  const terceirosDefault = {
    status_geral: "Avaliação por quadrante conforme visibilidade radiográfica",
    "18": "NÍVEL 4 — Região não claramente avaliada nesta análise automática — correlação clínica necessária",
    "28": "NÍVEL 4 — Região não claramente avaliada nesta análise automática — correlação clínica necessária",
    "38": "NÍVEL 4 — Região não claramente avaliada nesta análise automática — correlação clínica necessária",
    "48": "NÍVEL 4 — Região não claramente avaliada nesta análise automática — correlação clínica necessária",
    recomendacao: "Confirmar achados com exame clínico e histórico do paciente"
  };
  
  // Usar terceiros molares do modelo se existir, senão usar padrão conservador
  const terceiros = analysis.terceiros_molares || terceirosDefault;
  
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
    terceiros_molares: {
      status_geral: terceiros.status_geral || terceirosDefault.status_geral,
      "18": terceiros["18"] || terceirosDefault["18"],
      "28": terceiros["28"] || terceirosDefault["28"],
      "38": terceiros["38"] || terceirosDefault["38"],
      "48": terceiros["48"] || terceirosDefault["48"],
      recomendacao: terceiros.recomendacao || terceirosDefault.recomendacao,
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
  };
  
  console.log("Análise final (abordagem conservadora):");
  console.log("- Dentes presentes (sem sisos):", result.achados_clinicos.dentes_presentes.length);
  console.log("- Dentes ausentes (sem sisos):", result.achados_clinicos.dentes_ausentes.length);
  console.log("- Status sisos: conservador");
  
  return result;
}

// ============================================================================
// MAIN HANDLER - ABORDAGEM CONSERVADORA (SEM CONSENSO MÚLTIPLO)
// ============================================================================
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, imageType, examCategory, clinicalContext } = await req.json();

    if (!imageBase64) {
      throw new Error("Nenhuma imagem fornecida");
    }

    const clinicalContextNote = (clinicalContext?.queixa || clinicalContext?.regiao)
      ? `\n\nCONTEXTO CLÍNICO FORNECIDO:\n${clinicalContext.queixa ? `- Queixa: ${clinicalContext.queixa}` : ''}\n${clinicalContext.regiao ? `- Região de interesse: ${clinicalContext.regiao}` : ''}\nDirecione atenção especial a esta região ao mapear as coordenadas.`
      : '';

    const examNote = examCategory ? `\nTIPO DE EXAME: ${examCategory.toUpperCase()}` : '';

    console.log("🔬 Iniciando análise visual CONSERVADORA...");
    console.log("📷 Tipo da imagem:", imageType);
    console.log("🤖 Modelo: Google Gemini 2.5 Pro via Lovable AI");
    console.log("📋 Abordagem: Conservadora (sem afirmações categóricas de sisos)");

    // ========================================================================
    // ANÁLISE ÚNICA COM PROMPT CONSERVADOR
    // ========================================================================
    console.log("\n📝 Obtendo análise visual conservadora...");
    
    const analysis = await callGeminiVision(CONSERVATIVE_VISUAL_PROMPT + examNote + clinicalContextNote, imageBase64, imageType);
    console.log("✅ Análise obtida");
    
    // Log do status dos sisos (deve ser conservador)
    if (analysis.terceiros_molares) {
      console.log("\n📝 Status dos terceiros molares:");
      console.log(`  Status geral: ${analysis.terceiros_molares.status_geral}`);
      ["18", "28", "38", "48"].forEach(siso => {
        console.log(`  Siso ${siso}: ${analysis.terceiros_molares[siso] || "não informado"}`);
      });
    }

    // ========================================================================
    // VALIDAÇÃO DE COORDENADAS
    // ========================================================================
    const validatedAnalysis = validateAndCorrectCoordinates(analysis);

    console.log("\n✅ Análise visual CONSERVADORA concluída!");

    return new Response(JSON.stringify(validatedAnalysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Erro na análise visual:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erro desconhecido",
        details: "Falha na análise visual conservadora"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
