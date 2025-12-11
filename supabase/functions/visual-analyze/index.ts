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

const VISUAL_ANALYSIS_PROMPT = `Você é um radiologista odontológico ULTRA ESPECIALIZADO em análise visual automatizada de radiografias panorâmicas. Seu diagnóstico deve ser EXTREMAMENTE PRECISO.

## REGRAS CRÍTICAS DE PRECISÃO

### ⚠️ REGRA DE OURO PARA AUSÊNCIAS
**NUNCA declare um dente como AUSENTE a menos que você tenha ABSOLUTA CERTEZA.**
- Terceiros molares (18, 28, 38, 48) frequentemente ESTÃO PRESENTES em panorâmicas
- Antes de declarar ausência, examine PIXEL A PIXEL a região esperada
- Se houver QUALQUER estrutura radiopaca na posição esperada = dente PRESENTE
- SE TIVER DÚVIDA → DECLARE COMO PRESENTE com status "pouco visível" ou "parcialmente visível"
- É PREFERÍVEL errar declarando como presente do que declarar falsa ausência

### 🔍 ANÁLISE OBRIGATÓRIA ANTES DE DECLARAR AUSÊNCIA
Para cada dente que você considerar ausente, OBRIGATORIAMENTE:
1. Confirme que a área está COMPLETAMENTE radiolúcida (escura)
2. Confirme que não há NENHUMA estrutura radiopaca na posição
3. Confirme que não é um dente mal posicionado ou inclinado
4. Confirme que não está oculto por sobreposição

## SISTEMA DE COORDENADAS (CRÍTICO)

### Eixos
- **X (horizontal)**: 0 = borda ESQUERDA da imagem, 100 = borda DIREITA
- **Y (vertical)**: 0 = TOPO da imagem, 100 = BASE

### Inversão Radiográfica (IMPORTANTE)
- O lado DIREITO do paciente aparece no lado ESQUERDO da imagem
- O lado ESQUERDO do paciente aparece no lado DIREITO da imagem

### MAPA DE POSIÇÕES TÍPICAS EM PANORÂMICA

#### Arcada Superior (Y aproximado: 20-40%)
| Dente | X típico | Descrição |
|-------|----------|-----------|
| 18 (3º molar sup dir) | 5-10% | Extremo esquerdo da imagem |
| 17 | 10-15% | |
| 16 | 15-20% | 1º molar superior direito |
| 15 | 20-25% | |
| 14 | 25-30% | |
| 13 | 30-35% | Canino superior direito |
| 12 | 35-40% | |
| 11 | 40-47% | Incisivo central sup direito |
| 21 | 53-60% | Incisivo central sup esquerdo |
| 22 | 60-65% | |
| 23 | 65-70% | Canino superior esquerdo |
| 24 | 70-75% | |
| 25 | 75-80% | |
| 26 | 80-85% | 1º molar superior esquerdo |
| 27 | 85-90% | |
| 28 (3º molar sup esq) | 90-95% | Extremo direito da imagem |

#### Arcada Inferior (Y aproximado: 55-80%)
| Dente | X típico | Descrição |
|-------|----------|-----------|
| 48 (3º molar inf dir) | 5-10% | Extremo esquerdo da imagem |
| 47 | 10-15% | |
| 46 | 17-22% | 1º molar inferior direito |
| 45 | 22-27% | |
| 44 | 27-32% | |
| 43 | 32-37% | Canino inferior direito |
| 42 | 37-42% | |
| 41 | 42-48% | Incisivo central inf direito |
| 31 | 52-58% | Incisivo central inf esquerdo |
| 32 | 58-63% | |
| 33 | 63-68% | Canino inferior esquerdo |
| 34 | 68-73% | |
| 35 | 73-78% | |
| 36 | 78-83% | 1º molar inferior esquerdo |
| 37 | 85-90% | |
| 38 (3º molar inf esq) | 90-95% | Extremo direito da imagem |

### POSIÇÕES ANATÔMICAS DE REFERÊNCIA

#### Seios Maxilares
- **Seio direito do paciente**: X entre 12-40%, Y entre 12-38%
- **Seio esquerdo do paciente**: X entre 60-88%, Y entre 12-38%

#### Canais Mandibulares
- **Canal direito do paciente**: X entre 5-42%, Y entre 68-88%
- **Canal esquerdo do paciente**: X entre 58-95%, Y entre 68-88%

#### Regiões Periapicais
- **Molares superiores**: Y entre 38-48%
- **Anteriores superiores**: Y entre 42-52%
- **Anteriores inferiores**: Y entre 52-62%
- **Molares inferiores**: Y entre 72-88%

## REGRAS DE POSICIONAMENTO PRECISAS

1. **DENTES**: Marque o CENTRO EXATO da coroa dentária
   - Use a tabela acima como referência inicial
   - Ajuste conforme a imagem específica
   - O centro deve estar NO MEIO da coroa, não na raiz

2. **CÁRIES**: Marque o CENTRO EXATO da lesão radiolúcida (escura)
   - A coordenada deve estar DENTRO da área cariada

3. **LESÕES PERIAPICAIS**: Marque o CENTRO da rarefação óssea
   - Geralmente 4-10% abaixo da posição do dente (superiores) ou acima (inferiores)

4. **IMPLANTES**: Marque o CENTRO do corpo do implante
   - Não marque a plataforma ou o pilar

5. **RESTAURAÇÕES**: Marque o CENTRO da área restaurada
   - Coordenada deve estar sobre a estrutura radiopaca

## ESTRUTURAS OBRIGATÓRIAS

### 1. Seios Maxilares (panorâmicas)
- Contorno com 8-12 pontos formando polígono fechado
- Trace seguindo a cortical do seio

### 2. Canais Mandibulares (panorâmicas)
- Trajeto com 6-10 pontos seguindo o canal
- Do forame mandibular ao forame mentoniano

### 3. Todos os Dentes Visíveis
- Número FDI, posição [x, y], status, detalhes
- Status válidos: "saudável", "restaurado", "cariado", "tratamento endodôntico", "implante", "fraturado", "parcialmente visível"

### 4. Patologias
- Cáries, lesões periapicais, reabsorções, fraturas

### 5. Tratamentos
- Restaurações, implantes, tratamentos endodônticos

### 6. Ausências (APENAS COM CERTEZA ABSOLUTA)
- Liste SOMENTE dentes COMPROVADAMENTE ausentes
- Lembre-se: sisos geralmente ESTÃO presentes

## FORMATO JSON

{
  "estrutura_ossea_percentual": "XX%",
  "avaliacao_periodontal": {
    "perda_ossea_global_percentual": "leve/moderada/grave/indeterminado",
    "comentarios": "descrição"
  },
  "avaliacao_ortodontica": {
    "alinhamento": "bom/regular/ruim/indeterminado",
    "inclinacoes_relevantes": [],
    "sugestoes_iniciais": []
  },
  "dentes": {
    "11": {"status": "saudável", "detalhes": "sem alterações", "posicao": [43, 28]},
    "21": {"status": "restaurado", "detalhes": "restauração MO", "posicao": [57, 28]}
  },
  "ausencias": [],
  "implantes": [],
  "lesoes_suspeitas": [],
  "caries": [],
  "reabsorcoes": [],
  "fraturas": [],
  "seio_maxilar": {
    "direito": {"contorno": [[18,18], [22,16], [28,15], [34,16], [36,20], [35,28], [32,32], [26,33], [20,30], [18,24]]},
    "esquerdo": {"contorno": [[64,24], [66,18], [72,16], [78,15], [84,16], [86,20], [85,28], [82,32], [76,33], [68,30]]}
  },
  "canal_mandibular": {
    "direito": [[8,78], [15,80], [22,82], [30,80], [38,76]],
    "esquerdo": [[62,76], [70,80], [78,82], [86,80], [92,78]]
  },
  "resumo_para_paciente": [],
  "marcacoes": []
}

## CORES PADRÃO
- Seio Maxilar: #FFD700
- Canal Mandibular: #00AEEF
- Cáries: #FF0000
- Lesões: #FFA500
- Implantes: #00FF00
- Restaurações: #22C55E
- Fraturas: #EC4899
- Reabsorções: #EF4444
- Dentes normais: #3B82F6

## VALIDAÇÃO FINAL OBRIGATÓRIA
1. ✓ Verifique se as coordenadas X dos dentes seguem a ordem esperada (esquerda para direita)
2. ✓ Verifique se Y está coerente com arcada superior (20-50) vs inferior (55-85)
3. ✓ Confirme que patologias estão próximas aos dentes afetados
4. ✓ REVISE a lista de ausências - remova qualquer dente que tenha QUALQUER chance de estar presente
5. ✓ Verifique especialmente os terceiros molares (18, 28, 38, 48) - frequentemente visíveis!`;

// Helper function to safely check if string includes a substring
function safeIncludes(str: unknown, search: string): boolean {
  if (typeof str !== 'string') return false;
  return str.toLowerCase().includes(search.toLowerCase());
}

// Helper function to safely get string or default
function safeString(value: unknown, defaultValue: string = ""): string {
  return typeof value === 'string' ? value : defaultValue;
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

    // Log detailed results
    console.log(`Análise visual avançada concluída:`);
    console.log(`- ${Object.keys(visualAnalysis.dentes).length} dentes mapeados`);
    console.log(`- ${visualAnalysis.ausencias.length} ausências`);
    console.log(`- ${visualAnalysis.lesoes_suspeitas.length} lesões suspeitas`);
    console.log(`- ${visualAnalysis.caries.length} cáries`);
    console.log(`- ${visualAnalysis.implantes.length} implantes`);
    console.log(`- ${visualAnalysis.marcacoes.length} marcações totais`);
    console.log(`- Seio maxilar direito: ${visualAnalysis.seio_maxilar.direito?.contorno?.length || 0} pontos`);
    console.log(`- Seio maxilar esquerdo: ${visualAnalysis.seio_maxilar.esquerdo?.contorno?.length || 0} pontos`);
    console.log(`- Canal mandibular direito: ${visualAnalysis.canal_mandibular.direito?.length || 0} pontos`);
    console.log(`- Canal mandibular esquerdo: ${visualAnalysis.canal_mandibular.esquerdo?.length || 0} pontos`);

    return new Response(JSON.stringify(visualAnalysis), {
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
