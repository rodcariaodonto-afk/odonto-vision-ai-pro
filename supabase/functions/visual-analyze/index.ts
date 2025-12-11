import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Marcacao {
  id: string;
  tipo: "rect" | "circle" | "polygon" | "ellipse" | "path";
  coords: number[];
  label: string;
  descricao: string;
  cor: string;
  severidade: "baixa" | "media" | "alta" | "info";
  categoria: string;
}

interface DenteInfo {
  status: string;
  detalhes: string;
  posicao: [number, number];
}

interface LesaoSuspeita {
  dente: string;
  descricao: string;
  posicao: [number, number];
  tipo?: string;
}

interface Carie {
  dente: string;
  superficie: string;
  posicao: [number, number];
}

interface Reabsorcao {
  dente: string;
  tipo: "externa" | "interna";
  posicao: [number, number];
}

interface Fratura {
  dente: string;
  descricao: string;
  posicao: [number, number];
}

interface Implante {
  dente: string;
  posicao: [number, number];
  detalhes?: string;
}

interface AnaliseVisualCompleta {
  estrutura_ossea_percentual: string;
  avaliacao_periodontal: {
    perda_ossea_global_percentual: "leve" | "moderada" | "grave" | "indeterminado";
    comentarios: string;
  };
  avaliacao_ortodontica: {
    alinhamento: "regular" | "bom" | "ruim" | "indeterminado";
    inclinacoes_relevantes: string[];
    sugestoes_iniciais: string[];
  };
  dentes: Record<string, DenteInfo>;
  ausencias: string[];
  implantes: Implante[];
  lesoes_suspeitas: LesaoSuspeita[];
  caries: Carie[];
  reabsorcoes: Reabsorcao[];
  fraturas: Fratura[];
  seio_maxilar: {
    direito?: { contorno: Array<[number, number]> };
    esquerdo?: { contorno: Array<[number, number]> };
  };
  canal_mandibular: {
    direito?: Array<[number, number]>;
    esquerdo?: Array<[number, number]>;
  };
  resumo_para_paciente: string[];
  marcacoes: Marcacao[];
}

const VISUAL_ANALYSIS_PROMPT = `Você é um radiologista odontológico ULTRA ESPECIALIZADO em análise visual automatizada de radiografias panorâmicas. Seu diagnóstico deve ser EXTREMAMENTE PRECISO e COMPLETO.

## REGRAS CRÍTICAS ABSOLUTAS

### ⚠️ REGRA #1: DETECTAR TODOS OS ACHADOS - SEM EXCEÇÃO
**VOCÊ DEVE identificar ABSOLUTAMENTE TODOS os achados visíveis:**
- TODOS os implantes dentários (estruturas metálicas radiopacas cilíndricas)
- TODAS as restaurações (áreas radiopacas de alta densidade)
- TODOS os tratamentos endodônticos (canais preenchidos com material radiopaco)
- TODAS as cáries (áreas radiolúcidas em esmalte/dentina)
- TODAS as lesões periapicais (áreas radiolúcidas ao redor dos ápices)
- TODAS as reabsorções (internas ou externas)
- TODAS as fraturas visíveis

### ⚠️ REGRA #2: IDENTIFICAR IMPLANTES (CRÍTICO)
**Implantes dentários são ALTAMENTE RADIOPACOS (muito brancos/claros na imagem):**
- Formato cilíndrico ou cônico característico
- Geralmente com roscas visíveis (linhas horizontais finas)
- Podem ter pilar protético no topo
- NUNCA confunda implante com dente natural
- Se vir estrutura metálica cilíndrica no local de um dente = IMPLANTE
- Marque em "implantes" com a posição do dente substituído

### ⚠️⚠️⚠️ REGRA #3: TERCEIROS MOLARES (SISOS) - REGRA DE OURO
**ESTA É A REGRA MAIS IMPORTANTE PARA SISOS (18, 28, 38, 48):**

ANTES de declarar qualquer siso como PRESENTE, você DEVE verificar:
1. Existe estrutura RADIOPACA CLARA e DISTINTA na posição anatômica do terceiro molar?
2. A estrutura tem formato ANATÔMICO de dente (coroa + raízes)?
3. Consegue diferenciar claramente do segundo molar adjacente?

**SE NÃO HOUVER** estrutura visível clara na posição do terceiro molar → **DECLARE COMO AUSENTE**
**SE HOUVER DÚVIDA** → **DECLARE COMO AUSENTE** (é mais seguro)

NUNCA invente sisos que não são claramente visíveis na imagem!
Sisos frequentemente estão ausentes (extraídos ou não erupcionados).

### ⚠️ REGRA #4: CANAL MANDIBULAR - TRAJETÓRIA CORRETA
O canal mandibular SEMPRE segue esta trajetória em radiografias panorâmicas:
- **Início**: Região do forame mandibular (Y ≈ 0.75, extremidades X)
- **Trajeto**: ABAIXO dos ápices dos molares inferiores (Y entre 0.72-0.82)
- **Término**: Forame mentoniano (região dos pré-molares, Y ≈ 0.68-0.72)

Trajetória típica do CANAL DIREITO (6-8 pontos):
[[0.06, 0.78], [0.12, 0.80], [0.18, 0.80], [0.24, 0.78], [0.30, 0.75], [0.36, 0.72]]

Trajetória típica do CANAL ESQUERDO (6-8 pontos):
[[0.64, 0.72], [0.70, 0.75], [0.76, 0.78], [0.82, 0.80], [0.88, 0.80], [0.94, 0.78]]

## IMPORTANTE — INSTRUÇÕES PARA AS COORDENADAS DAS MARCAÇÕES

### NÍVEL 1 — COORDENADAS NORMALIZADAS (0 a 1)
Todas as coordenadas DEVEM estar no formato NORMALIZADO:
- **X**: 0.0 = borda ESQUERDA da imagem, 1.0 = borda DIREITA da imagem
- **Y**: 0.0 = TOPO da imagem, 1.0 = BASE da imagem
- Use "posicao": [x_normalizado, y_normalizado]
- **NUNCA retorne valores maiores que 1 ou menores que 0**

### NÍVEL 2 — MAPA ANATÔMICO CALIBRADO (CRÍTICO!)

**ARCADA SUPERIOR (dentes 11-18 e 21-28):**
- Y OBRIGATÓRIO entre **0.38 e 0.50** (centro das coroas superiores)

| Dente | X     | Y     |
|-------|-------|-------|
| 18    | 0.06  | 0.46  |
| 17    | 0.11  | 0.44  |
| 16    | 0.16  | 0.42  |
| 15    | 0.21  | 0.41  |
| 14    | 0.26  | 0.40  |
| 13    | 0.31  | 0.39  |
| 12    | 0.37  | 0.39  |
| 11    | 0.44  | 0.40  |
| 21    | 0.56  | 0.40  |
| 22    | 0.63  | 0.39  |
| 23    | 0.69  | 0.39  |
| 24    | 0.74  | 0.40  |
| 25    | 0.79  | 0.41  |
| 26    | 0.84  | 0.42  |
| 27    | 0.89  | 0.44  |
| 28    | 0.94  | 0.46  |

**ARCADA INFERIOR (dentes 31-38 e 41-48):**
- Y OBRIGATÓRIO entre **0.54 e 0.68** (centro das coroas inferiores)

| Dente | X     | Y     |
|-------|-------|-------|
| 48    | 0.06  | 0.62  |
| 47    | 0.11  | 0.60  |
| 46    | 0.17  | 0.58  |
| 45    | 0.22  | 0.57  |
| 44    | 0.27  | 0.56  |
| 43    | 0.32  | 0.55  |
| 42    | 0.38  | 0.55  |
| 41    | 0.44  | 0.55  |
| 31    | 0.56  | 0.55  |
| 32    | 0.62  | 0.55  |
| 33    | 0.68  | 0.55  |
| 34    | 0.73  | 0.56  |
| 35    | 0.78  | 0.57  |
| 36    | 0.83  | 0.58  |
| 37    | 0.89  | 0.60  |
| 38    | 0.94  | 0.62  |

### LOCALIZAÇÕES ANATÔMICAS
- **Seios Maxilares**: Y entre 0.18 e 0.38
  - Direito: X entre 0.08 e 0.35
  - Esquerdo: X entre 0.65 e 0.92
- **Canais Mandibulares**: Y entre 0.72 e 0.82 (ABAIXO dos ápices)
  - Direito: X entre 0.06 e 0.42
  - Esquerdo: X entre 0.58 e 0.94

## FORMATO JSON OBRIGATÓRIO

{
  "estrutura_ossea_percentual": "XX%",
  "avaliacao_periodontal": {
    "perda_ossea_global_percentual": "leve/moderada/grave/indeterminado",
    "comentarios": "descrição detalhada"
  },
  "avaliacao_ortodontica": {
    "alinhamento": "bom/regular/ruim/indeterminado",
    "inclinacoes_relevantes": [],
    "sugestoes_iniciais": []
  },
  "dentes": {
    "11": {"status": "saudável", "detalhes": "sem alterações", "posicao": [0.44, 0.40]}
  },
  "ausencias": ["18", "28", "38", "48"],
  "implantes": [],
  "lesoes_suspeitas": [],
  "caries": [],
  "reabsorcoes": [],
  "fraturas": [],
  "seio_maxilar": {
    "direito": {"contorno": [[0.10,0.22], [0.18,0.18], [0.28,0.18], [0.35,0.25], [0.35,0.35], [0.28,0.38], [0.18,0.38], [0.10,0.30]]},
    "esquerdo": {"contorno": [[0.65,0.30], [0.72,0.38], [0.82,0.38], [0.90,0.35], [0.90,0.25], [0.82,0.18], [0.72,0.18], [0.65,0.22]]}
  },
  "canal_mandibular": {
    "direito": [[0.06,0.78], [0.12,0.80], [0.18,0.80], [0.24,0.78], [0.30,0.75], [0.36,0.72]],
    "esquerdo": [[0.64,0.72], [0.70,0.75], [0.76,0.78], [0.82,0.80], [0.88,0.80], [0.94,0.78]]
  },
  "resumo_para_paciente": [],
  "marcacoes": []
}

## CORES PADRÃO
- Implantes: #8B5CF6 (roxo)
- Cáries: #FF0000 (vermelho)
- Lesões: #FFA500 (laranja)
- Restaurações: #22C55E (verde)
- Fraturas: #EC4899 (rosa)
- Reabsorções: #EF4444 (vermelho escuro)
- Dentes saudáveis: #3B82F6 (azul)
- Seio Maxilar: #FFD700 (amarelo)
- Canal Mandibular: #00AEEF (azul claro)

## CHECKLIST FINAL OBRIGATÓRIO

Antes de retornar, VERIFIQUE:
1. ✓ TODAS as coordenadas estão entre 0 e 1?
2. ✓ Dentes superiores têm Y entre 0.38 e 0.50?
3. ✓ Dentes inferiores têm Y entre 0.54 e 0.68?
4. ✓ Canal mandibular tem Y entre 0.72 e 0.82?
5. ✓ Sisos (18,28,38,48) foram verificados CUIDADOSAMENTE antes de declarar?
6. ✓ Se siso NÃO É CLARAMENTE VISÍVEL → está em "ausencias"?
7. ✓ Implantes foram identificados (estruturas metálicas cilíndricas)?`;

// Helper function to safely check if string includes a substring
function safeIncludes(str: unknown, search: string): boolean {
  if (typeof str !== 'string') return false;
  return str.toLowerCase().includes(search.toLowerCase());
}

// Helper function to safely get string or default
function safeString(value: unknown, defaultValue: string = ""): string {
  return typeof value === 'string' ? value : defaultValue;
}

// Validação e correção de coordenadas pós-análise
function validateAndCorrectCoordinates(analysis: AnaliseVisualCompleta): AnaliseVisualCompleta {
  const corrected = { ...analysis };
  
  // Coordenadas típicas para dentes (usadas para correção forçada)
  const TYPICAL_COORDS: Record<string, [number, number]> = {
    "18": [0.06, 0.46], "17": [0.11, 0.44], "16": [0.16, 0.42], "15": [0.21, 0.41],
    "14": [0.26, 0.40], "13": [0.31, 0.39], "12": [0.37, 0.39], "11": [0.44, 0.40],
    "21": [0.56, 0.40], "22": [0.63, 0.39], "23": [0.69, 0.39], "24": [0.74, 0.40],
    "25": [0.79, 0.41], "26": [0.84, 0.42], "27": [0.89, 0.44], "28": [0.94, 0.46],
    "48": [0.06, 0.62], "47": [0.11, 0.60], "46": [0.17, 0.58], "45": [0.22, 0.57],
    "44": [0.27, 0.56], "43": [0.32, 0.55], "42": [0.38, 0.55], "41": [0.44, 0.55],
    "31": [0.56, 0.55], "32": [0.62, 0.55], "33": [0.68, 0.55], "34": [0.73, 0.56],
    "35": [0.78, 0.57], "36": [0.83, 0.58], "37": [0.89, 0.60], "38": [0.94, 0.62],
  };
  
  // Função para forçar coordenadas típicas
  const forceTypicalCoords = (denteNum: string): [number, number] => {
    return TYPICAL_COORDS[denteNum] || [0.5, 0.5];
  };
  
  // Corrigir coordenadas dos dentes
  if (corrected.dentes) {
    const correctedDentes: Record<string, DenteInfo> = {};
    for (const [num, dente] of Object.entries(corrected.dentes)) {
      const typicalPos = forceTypicalCoords(num);
      correctedDentes[num] = {
        ...dente,
        posicao: typicalPos, // FORÇAR coordenadas típicas
      };
    }
    corrected.dentes = correctedDentes;
  }
  
  // Corrigir implantes
  if (corrected.implantes?.length) {
    corrected.implantes = corrected.implantes.map(impl => ({
      ...impl,
      posicao: impl.dente ? forceTypicalCoords(impl.dente) : impl.posicao,
    }));
  }
  
  // Corrigir cáries (posicionar próximo ao dente)
  if (corrected.caries?.length) {
    corrected.caries = corrected.caries.map(carie => {
      if (carie.dente) {
        const toothPos = forceTypicalCoords(carie.dente);
        const isUpper = parseInt(carie.dente) < 30 || (parseInt(carie.dente) >= 11 && parseInt(carie.dente) <= 28);
        return {
          ...carie,
          posicao: [toothPos[0], toothPos[1] + (isUpper ? 0.03 : -0.03)] as [number, number],
        };
      }
      return carie;
    });
  }
  
  // Corrigir lesões periapicais
  if (corrected.lesoes_suspeitas?.length) {
    corrected.lesoes_suspeitas = corrected.lesoes_suspeitas.map(lesao => {
      if (lesao.dente) {
        const toothPos = forceTypicalCoords(lesao.dente);
        const isUpper = parseInt(lesao.dente) < 30 || (parseInt(lesao.dente) >= 11 && parseInt(lesao.dente) <= 28);
        return {
          ...lesao,
          posicao: [toothPos[0], toothPos[1] + (isUpper ? 0.06 : -0.06)] as [number, number],
        };
      }
      return lesao;
    });
  }
  
  // Forçar canal mandibular na posição correta
  corrected.canal_mandibular = {
    direito: [[0.06, 0.78], [0.12, 0.80], [0.18, 0.80], [0.24, 0.78], [0.30, 0.75], [0.36, 0.72]],
    esquerdo: [[0.64, 0.72], [0.70, 0.75], [0.76, 0.78], [0.82, 0.80], [0.88, 0.80], [0.94, 0.78]],
  };
  
  // Forçar seio maxilar na posição correta
  corrected.seio_maxilar = {
    direito: { contorno: [[0.10, 0.22], [0.16, 0.18], [0.24, 0.18], [0.32, 0.22], [0.34, 0.30], [0.30, 0.36], [0.20, 0.36], [0.12, 0.30]] },
    esquerdo: { contorno: [[0.66, 0.30], [0.70, 0.36], [0.80, 0.36], [0.88, 0.30], [0.90, 0.22], [0.84, 0.18], [0.76, 0.18], [0.68, 0.22]] },
  };
  
  console.log("Coordenadas validadas e corrigidas com mapa anatômico forçado");
  
  return corrected;
}

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

    console.log("Iniciando análise visual avançada...");
    console.log("Tipo da imagem:", imageType);

    const base64Data = imageBase64.includes("base64,") 
      ? imageBase64.split("base64,")[1] 
      : imageBase64;

    console.log("Chamando API OpenAI com modelo gpt-4.1...");
    
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
              { 
                type: "text", 
                text: `ANÁLISE VISUAL COMPLETA - Analise esta radiografia odontológica e retorne o JSON completo.

⚠️ ATENÇÃO ESPECIAL PARA TERCEIROS MOLARES (SISOS):
- Dentes 18, 28, 38, 48 frequentemente ESTÃO PRESENTES
- Examine CUIDADOSAMENTE as extremidades da imagem
- Se houver QUALQUER estrutura dentária nas extremidades = SISO PRESENTE
- NÃO declare sisos ausentes sem certeza ABSOLUTA

REGRAS CRÍTICAS DE POSICIONAMENTO:
- TODAS as posições devem ser o CENTRO GEOMÉTRICO EXATO da estrutura
- Para dentes: centro da coroa visível (use a tabela de posições como referência)
- Para cáries: centro da área radiolúcida (escura)
- Para lesões: centro da rarefação óssea
- Para implantes: centro do corpo metálico
- NÃO marque bordas ou extremidades, SEMPRE o ponto central

OBRIGATÓRIO identificar e marcar:
1. SEIOS MAXILARES - trace o contorno COMPLETO de ambos (8-12 pontos cada)
2. CANAIS MANDIBULARES - trace o trajeto COMPLETO de ambos (6-10 pontos cada)  
3. TODOS os dentes visíveis com posição CENTRAL da coroa e status
4. TODAS as patologias com posição CENTRAL (cáries, lesões, reabsorções)
5. TODOS os tratamentos existentes com posição CENTRAL (restaurações, implantes, endodontias)
6. Ausências APENAS com certeza absoluta (examine 2x antes de declarar)

Use coordenadas PERCENTUAIS precisas (0-100). Retorne JSON válido.`
              },
              { 
                type: "image_url", 
                image_url: { 
                  url: `data:${imageType || "image/jpeg"};base64,${base64Data}`, 
                  detail: "high" 
                } 
              },
            ],
          },
        ],
        max_completion_tokens: 8192,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      throw new Error(`Erro na API OpenAI: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("Resposta vazia da API");

    console.log("Resposta bruta da API recebida");

    let visualAnalysis: AnaliseVisualCompleta;
    try {
      visualAnalysis = JSON.parse(content);
    } catch (parseError) {
      console.error("Erro ao parsear JSON:", parseError);
      throw new Error("Erro ao processar resposta da análise visual");
    }

    // Ensure all required fields exist with defaults
    visualAnalysis = {
      estrutura_ossea_percentual: visualAnalysis.estrutura_ossea_percentual || "indeterminado",
      avaliacao_periodontal: visualAnalysis.avaliacao_periodontal || {
        perda_ossea_global_percentual: "indeterminado",
        comentarios: "Não foi possível avaliar"
      },
      avaliacao_ortodontica: visualAnalysis.avaliacao_ortodontica || {
        alinhamento: "indeterminado",
        inclinacoes_relevantes: [],
        sugestoes_iniciais: []
      },
      dentes: visualAnalysis.dentes || {},
      ausencias: Array.isArray(visualAnalysis.ausencias) ? visualAnalysis.ausencias : [],
      implantes: Array.isArray(visualAnalysis.implantes) ? visualAnalysis.implantes : [],
      lesoes_suspeitas: Array.isArray(visualAnalysis.lesoes_suspeitas) ? visualAnalysis.lesoes_suspeitas : [],
      caries: Array.isArray(visualAnalysis.caries) ? visualAnalysis.caries : [],
      reabsorcoes: Array.isArray(visualAnalysis.reabsorcoes) ? visualAnalysis.reabsorcoes : [],
      fraturas: Array.isArray(visualAnalysis.fraturas) ? visualAnalysis.fraturas : [],
      seio_maxilar: visualAnalysis.seio_maxilar || {},
      canal_mandibular: visualAnalysis.canal_mandibular || {},
      resumo_para_paciente: Array.isArray(visualAnalysis.resumo_para_paciente) ? visualAnalysis.resumo_para_paciente : [],
      marcacoes: Array.isArray(visualAnalysis.marcacoes) ? visualAnalysis.marcacoes : []
    };

    // Sanitize dentes - ensure all have valid status
    const sanitizedDentes: Record<string, DenteInfo> = {};
    if (visualAnalysis.dentes && typeof visualAnalysis.dentes === 'object') {
      Object.entries(visualAnalysis.dentes).forEach(([num, dente]) => {
        if (dente && typeof dente === 'object') {
          sanitizedDentes[num] = {
            status: safeString(dente.status, "não avaliado"),
            detalhes: safeString(dente.detalhes, ""),
            posicao: Array.isArray(dente.posicao) ? dente.posicao : [50, 50]
          };
        }
      });
    }
    visualAnalysis.dentes = sanitizedDentes;

    // Process and validate marcacoes
    visualAnalysis.marcacoes = visualAnalysis.marcacoes.map((m, index) => ({
      ...m,
      id: m.id || `marcacao_${index}`,
      label: safeString(m.label, `Marcação ${index + 1}`),
      descricao: safeString(m.descricao, ""),
      coords: Array.isArray(m.coords) ? m.coords.map(c => Math.max(0, Math.min(100, Number(c) || 0))) : [0, 0, 5, 5],
      cor: m.cor || "#3B82F6",
      severidade: m.severidade || "info",
      categoria: m.categoria || "anatomia",
    }));

    // Auto-generate marcacoes from dentes if sparse
    const autoMarcacoes: Marcacao[] = [];

    // Add marcacoes for each tooth
    Object.entries(visualAnalysis.dentes).forEach(([num, dente]) => {
      if (dente && dente.posicao && !visualAnalysis.marcacoes.some(m => m.id === `dente_${num}`)) {
        const status = safeString(dente.status, "");
        const isHealthy = safeIncludes(status, "saudável") || safeIncludes(status, "normal");
        const detalhes = safeString(dente.detalhes, "sem detalhes");
        autoMarcacoes.push({
          id: `dente_${num}`,
          tipo: "ellipse",
          coords: [dente.posicao[0], dente.posicao[1], 3, 4],
          label: `Dente ${num}`,
          descricao: `${status} - ${detalhes}`,
          cor: isHealthy ? "#3B82F6" : "#F59E0B",
          severidade: isHealthy ? "info" : "media",
          categoria: "anatomia"
        });
      }
    });

    // Add marcacoes for lesoes_suspeitas
    visualAnalysis.lesoes_suspeitas.forEach((lesao, i) => {
      if (lesao && lesao.posicao) {
        const denteStr = safeString(lesao.dente, "");
        const labelText = safeString(lesao.dente, `desconhecido_${i}`);
        if (!visualAnalysis.marcacoes.some(m => safeIncludes(m.label, denteStr) && m.categoria === "patologia")) {
          autoMarcacoes.push({
            id: `lesao_${labelText}_${i}`,
            tipo: "circle",
            coords: [lesao.posicao[0], lesao.posicao[1], 2.5, 2.5],
            label: `Lesão ${labelText}`,
            descricao: safeString(lesao.descricao, "Lesão suspeita"),
            cor: "#FFA500",
            severidade: "alta",
            categoria: "patologia"
          });
        }
      }
    });

    // Add marcacoes for caries
    visualAnalysis.caries.forEach((carie, i) => {
      if (carie && carie.posicao) {
        const denteStr = safeString(carie.dente, "");
        const labelText = safeString(carie.dente, `desconhecido_${i}`);
        if (!visualAnalysis.marcacoes.some(m => safeIncludes(m.label, denteStr) && safeIncludes(m.descricao, "cárie"))) {
          autoMarcacoes.push({
            id: `carie_${labelText}_${i}`,
            tipo: "circle",
            coords: [carie.posicao[0], carie.posicao[1], 2, 2],
            label: `Cárie ${labelText}`,
            descricao: `Cárie na superfície ${safeString(carie.superficie, "não especificada")}`,
            cor: "#FF0000",
            severidade: "media",
            categoria: "patologia"
          });
        }
      }
    });

    // Add marcacoes for implantes
    visualAnalysis.implantes.forEach((implante, i) => {
      if (implante && implante.posicao) {
        const labelText = safeString(implante.dente, `desconhecido_${i}`);
        if (!visualAnalysis.marcacoes.some(m => safeIncludes(m.label, "Implante") && safeIncludes(m.label, labelText))) {
          autoMarcacoes.push({
            id: `implante_${labelText}_${i}`,
            tipo: "rect",
            coords: [implante.posicao[0] - 1.5, implante.posicao[1] - 3, 3, 6],
            label: `Implante ${labelText}`,
            descricao: safeString(implante.detalhes, "Implante dentário"),
            cor: "#00FF00",
            severidade: "info",
            categoria: "tratamento"
          });
        }
      }
    });

    // Add marcacoes for fraturas
    visualAnalysis.fraturas.forEach((fratura, i) => {
      if (fratura && fratura.posicao) {
        const labelText = safeString(fratura.dente, `desconhecido_${i}`);
        if (!visualAnalysis.marcacoes.some(m => safeIncludes(m.label, "Fratura"))) {
          autoMarcacoes.push({
            id: `fratura_${labelText}_${i}`,
            tipo: "rect",
            coords: [fratura.posicao[0] - 0.5, fratura.posicao[1] - 2, 1, 4],
            label: `Fratura ${labelText}`,
            descricao: safeString(fratura.descricao, "Fratura identificada"),
            cor: "#EC4899",
            severidade: "alta",
            categoria: "patologia"
          });
        }
      }
    });

    // Add marcacoes for reabsorcoes
    visualAnalysis.reabsorcoes.forEach((reab, i) => {
      if (reab && reab.posicao) {
        const labelText = safeString(reab.dente, `desconhecido_${i}`);
        if (!visualAnalysis.marcacoes.some(m => safeIncludes(m.label, "Reabsorção"))) {
          autoMarcacoes.push({
            id: `reabsorcao_${labelText}_${i}`,
            tipo: "circle",
            coords: [reab.posicao[0], reab.posicao[1], 2, 2],
            label: `Reabsorção ${labelText}`,
            descricao: `Reabsorção ${safeString(reab.tipo, "não especificada")}`,
            cor: "#EF4444",
            severidade: "alta",
            categoria: "patologia"
          });
        }
      }
    });

    // Merge auto-generated marcacoes
    visualAnalysis.marcacoes = [...visualAnalysis.marcacoes, ...autoMarcacoes];

    // APLICAR VALIDAÇÃO E CORREÇÃO FORÇADA DAS COORDENADAS
    const correctedAnalysis = validateAndCorrectCoordinates(visualAnalysis);

    // Log detailed results
    console.log(`Análise visual avançada concluída:`);
    console.log(`- ${Object.keys(correctedAnalysis.dentes).length} dentes mapeados`);
    console.log(`- ${correctedAnalysis.ausencias.length} ausências`);
    console.log(`- ${correctedAnalysis.lesoes_suspeitas.length} lesões suspeitas`);
    console.log(`- ${correctedAnalysis.caries.length} cáries`);
    console.log(`- ${correctedAnalysis.implantes.length} implantes`);
    console.log(`- ${correctedAnalysis.marcacoes.length} marcações totais`);
    console.log(`- Seio maxilar direito: ${correctedAnalysis.seio_maxilar.direito?.contorno?.length || 0} pontos`);
    console.log(`- Seio maxilar esquerdo: ${correctedAnalysis.seio_maxilar.esquerdo?.contorno?.length || 0} pontos`);
    console.log(`- Canal mandibular direito: ${correctedAnalysis.canal_mandibular.direito?.length || 0} pontos`);
    console.log(`- Canal mandibular esquerdo: ${correctedAnalysis.canal_mandibular.esquerdo?.length || 0} pontos`);

    return new Response(JSON.stringify(correctedAnalysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro na análise visual:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erro desconhecido", 
        estrutura_ossea_percentual: "indeterminado",
        avaliacao_periodontal: { perda_ossea_global_percentual: "indeterminado", comentarios: "" },
        avaliacao_ortodontica: { alinhamento: "indeterminado", inclinacoes_relevantes: [], sugestoes_iniciais: [] },
        dentes: {},
        ausencias: [],
        implantes: [],
        lesoes_suspeitas: [],
        caries: [],
        reabsorcoes: [],
        fraturas: [],
        seio_maxilar: {},
        canal_mandibular: {},
        resumo_para_paciente: ["Não foi possível realizar a análise visual."],
        marcacoes: []
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
