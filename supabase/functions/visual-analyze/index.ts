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
  avaliacao_periodontal: {
    perda_ossea: string;
    comentarios: string;
  };
  avaliacao_ortodontica: {
    alinhamento: string;
    observacoes: string;
  };
  resumo_para_paciente: string[];
  raciocinio_sisos?: {
    "18": string;
    "28": string;
    "38": string;
    "48": string;
  };
}

// Prompt COMPLETO com Chain of Thought, análise sistemática e raciocínio obrigatório
const VISUAL_ANALYSIS_PROMPT = `Você é um radiologista odontológico ESPECIALISTA em análise visual de radiografias panorâmicas e tomografias.

## 🔬 METODOLOGIA "CHAIN OF THOUGHT" - OBRIGATÓRIA

VOCÊ DEVE seguir esta metodologia ANTES de concluir qualquer achado:
1. PRIMEIRO: Descreva O QUE VOCÊ VÊ na região (sem interpretar)
2. SEGUNDO: Analise as características visuais
3. TERCEIRO: Só então conclua o achado

Esta metodologia EVITA erros de interpretação precipitada.

## 📋 ANÁLISE SISTEMÁTICA POR QUADRANTE - OBRIGATÓRIA

Analise CADA dente na ordem FDI, um por um, sem pular nenhum:

### QUADRANTE 1 (Superior Direito) - Analise na ordem:
18 → 17 → 16 → 15 → 14 → 13 → 12 → 11

### QUADRANTE 2 (Superior Esquerdo) - Analise na ordem:
21 → 22 → 23 → 24 → 25 → 26 → 27 → 28

### QUADRANTE 3 (Inferior Esquerdo) - Analise na ordem:
31 → 32 → 33 → 34 → 35 → 36 → 37 → 38

### QUADRANTE 4 (Inferior Direito) - Analise na ordem:
41 → 42 → 43 → 44 → 45 → 46 → 47 → 48

Para CADA dente, responda mentalmente:
- Há estrutura dental visível nesta posição? (SIM/NÃO)
- Se SIM: Qual a condição? (hígido, restaurado, tratado, cariado, fraturado)
- Se NÃO: O espaço está edêntulo ou há implante?

## ⚠️⚠️⚠️ CHECKLIST OBRIGATÓRIO PARA TERCEIROS MOLARES (SISOS) ⚠️⚠️⚠️

ANTES de declarar QUALQUER siso (18, 28, 38, 48) como ausente, você DEVE:

### CHECKLIST SISO 18 (Superior Direito Posterior):
□ Analisei região X: 0.03-0.10, Y: 0.30-0.45? 
□ Vejo estrutura radiopaca (branca/cinza) com formato dental?
□ Se vejo QUALQUER estrutura → PRESENTE
□ Só se 100% radiolúcido (escuro total) → considerar AUSENTE

### CHECKLIST SISO 28 (Superior Esquerdo Posterior):
□ Analisei região X: 0.90-0.97, Y: 0.30-0.45?
□ Vejo estrutura radiopaca com formato dental?
□ Se vejo QUALQUER estrutura → PRESENTE
□ Só se 100% radiolúcido (escuro total) → considerar AUSENTE

### CHECKLIST SISO 38 (Inferior Esquerdo Posterior):
□ Analisei região X: 0.90-0.97, Y: 0.55-0.70?
□ Vejo estrutura radiopaca com formato dental?
□ Há sobreposição com ramo mandibular? → pode estar escondido
□ Se vejo QUALQUER estrutura → PRESENTE

### CHECKLIST SISO 48 (Inferior Direito Posterior):
□ Analisei região X: 0.03-0.10, Y: 0.55-0.70?
□ Vejo estrutura radiopaca com formato dental?
□ Há sobreposição com ramo mandibular? → pode estar escondido
□ Se vejo QUALQUER estrutura → PRESENTE

## 📝 CAMPO OBRIGATÓRIO: raciocinio_sisos

Você DEVE preencher o campo "raciocinio_sisos" justificando CADA decisão:

{
  "raciocinio_sisos": {
    "18": "DESCRIÇÃO: Observo na região X:0.05, Y:0.38 estrutura radiopaca oval com densidade compatível com coroa dental. ANÁLISE: Forma dental identificável, raízes parcialmente visíveis. CONCLUSÃO: PRESENTE.",
    "28": "DESCRIÇÃO: Região X:0.93, Y:0.40 mostra estrutura dental erupcionada. ANÁLISE: Coroa e raízes visíveis, posição normal. CONCLUSÃO: PRESENTE.",
    "38": "DESCRIÇÃO: Região X:0.94, Y:0.62 apresenta dente impactado horizontal. ANÁLISE: Coroa visível atrás do segundo molar, posição mesioangulada. CONCLUSÃO: PRESENTE (impactado).",
    "48": "DESCRIÇÃO: Região X:0.06, Y:0.63 completamente radiolúcida. ANÁLISE: Nenhuma estrutura dental visível, rebordo alveolar contínuo. CONCLUSÃO: AUSENTE."
  }
}

## 🚨 ERROS PROIBIDOS - LEIA COM ATENÇÃO

❌ NUNCA declare siso ausente sem preencher o raciocinio_sisos
❌ NUNCA copie o exemplo JSON literalmente - ANALISE A IMAGEM REAL
❌ NUNCA assuma ausência porque "não vejo claramente"
❌ NUNCA ignore sisos impactados, semi-inclusos ou com sobreposição
❌ NUNCA retorne mais de 6 dentes ausentes sem justificativa extrema
❌ NUNCA confunda implante com tratamento endodôntico

✅ SEMPRE preencha raciocinio_sisos para os 4 terceiros molares
✅ SEMPRE descreva O QUE VÊ antes de concluir
✅ SEMPRE analise quadrante por quadrante na ordem FDI
✅ SEMPRE declare PRESENTE se houver QUALQUER dúvida sobre sisos

## COORDENADAS - APENAS PARA ESTRUTURAS ANATÔMICAS

### O QUE GERAR COM COORDENADAS (0 a 1):
1. **Seios maxilares** (direito e esquerdo) - contorno com 8-12 pontos
2. **Canais mandibulares** (direito e esquerdo) - trajeto com 6-8 pontos

### O QUE NÃO GERAR COM COORDENADAS:
- Dentes, cáries, lesões, implantes - apenas TEXTO

## MAPA ANATÔMICO
- **Seio maxilar**: Y entre 0.15 e 0.40
  - Direito: X entre 0.08 e 0.35
  - Esquerdo: X entre 0.65 e 0.92
- **Canal mandibular**: Y entre 0.70 e 0.85
  - Direito: X entre 0.06 e 0.40
  - Esquerdo: X entre 0.60 e 0.94

## CONTORNOS DE REFERÊNCIA

Seio maxilar DIREITO (8 pontos):
[[0.10, 0.20], [0.16, 0.16], [0.24, 0.16], [0.32, 0.20], [0.34, 0.30], [0.30, 0.38], [0.18, 0.38], [0.10, 0.28]]

Seio maxilar ESQUERDO (8 pontos):
[[0.66, 0.28], [0.70, 0.38], [0.82, 0.38], [0.90, 0.30], [0.90, 0.20], [0.84, 0.16], [0.76, 0.16], [0.68, 0.20]]

Canal mandibular DIREITO (6 pontos):
[[0.08, 0.76], [0.14, 0.80], [0.20, 0.80], [0.26, 0.78], [0.32, 0.75], [0.38, 0.72]]

Canal mandibular ESQUERDO (6 pontos):
[[0.62, 0.72], [0.68, 0.75], [0.74, 0.78], [0.80, 0.80], [0.86, 0.80], [0.92, 0.76]]

## REGRA DE OURO PARA TERCEIROS MOLARES

### DECLARE COMO PRESENTE SE:
- Houver QUALQUER estrutura radiopaca na região
- Mesmo parcialmente visível, impactado ou semi-incluso
- Mesmo com sobreposição do ramo mandibular
- Mesmo em posição horizontal, mesioangulada ou distoangulada

### CASOS QUE PARECEM AUSENTES MAS ESTÃO PRESENTES:
- Siso HORIZONTAL impactado (aparece "deitado")
- Siso SEMI-INCLUSO (só coroa visível)
- Siso com SOBREPOSIÇÃO do ramo mandibular
- Siso em posição MESIOANGULADA ou DISTOANGULADA
- Siso PROFUNDAMENTE incluso (apenas ápice visível)

### DECLARE COMO AUSENTE SOMENTE SE:
- Região 100% radiolúcida (completamente escura)
- Rebordo alveolar contínuo e liso
- ABSOLUTA CERTEZA (100%) de ausência
- NUNCA declare ausente se houver QUALQUER dúvida!

## DIFERENCIAÇÃO: IMPLANTE vs ENDODONTIA

### IMPLANTE DENTÁRIO:
- Estrutura metálica ÚNICA formato PARAFUSO
- NÃO HÁ raiz natural - implante SUBSTITUI a raiz
- Roscas/espiras visíveis
- Se há implante → dente está AUSENTE (listar em dentes_ausentes E implantes)

### TRATAMENTO ENDODÔNTICO:
- Material radiopaco DENTRO do canal de dente NATURAL
- RAIZ NATURAL PRESENTE ao redor do material
- Estrutura dental preservada

## LESÕES PERIAPICAIS - ANÁLISE ULTRA-CRÍTICA

Identifique TODAS as lesões, mesmo sutis:
- Radiolucência ao redor do ápice
- Espessamento do ligamento periodontal
- Interrupção da lâmina dura
- Rarefação óssea periapical

Classificação:
- **Granuloma**: Lesão <10mm circunscrita
- **Cisto**: Lesão >10mm, limites definidos
- **Abscesso**: Radiolucência difusa
- **Osteíte condensante**: Área radiopaca adjacente

## FORMATO JSON OBRIGATÓRIO

{
  "raciocinio_sisos": {
    "18": "DESCRIÇÃO: [o que vejo]. ANÁLISE: [características]. CONCLUSÃO: PRESENTE/AUSENTE porque [razão].",
    "28": "DESCRIÇÃO: [o que vejo]. ANÁLISE: [características]. CONCLUSÃO: PRESENTE/AUSENTE porque [razão].",
    "38": "DESCRIÇÃO: [o que vejo]. ANÁLISE: [características]. CONCLUSÃO: PRESENTE/AUSENTE porque [razão].",
    "48": "DESCRIÇÃO: [o que vejo]. ANÁLISE: [características]. CONCLUSÃO: PRESENTE/AUSENTE porque [razão]."
  },
  "seio_maxilar": {
    "direito": { "contorno_normalizado": [[x,y], ...] },
    "esquerdo": { "contorno_normalizado": [[x,y], ...] }
  },
  "canal_mandibular": {
    "direito": [[x,y], ...],
    "esquerdo": [[x,y], ...]
  },
  "achados_clinicos": {
    "dentes_presentes": ["18", "17", "16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26", "27", "28", "47", "46", "45", "44", "43", "42", "41", "31", "32", "33", "34", "35", "36", "37", "38"],
    "dentes_ausentes": ["48"],
    "caries_suspeitas": ["Dente XX: cárie [superfície] [profundidade]"],
    "lesoes_suspeitas": ["Dente XX: lesão periapical [tipo] ~Xmm"],
    "implantes": ["Região do XX: implante osseointegrado"],
    "restauracoes": ["Dente XX: restauração [tipo] [superfície]"],
    "tratamentos_endodonticos": ["Dente XX: tratamento endodôntico [status]"],
    "observacoes": "Observações gerais da análise"
  },
  "avaliacao_periodontal": {
    "perda_ossea": "leve/moderada/grave/indeterminado",
    "comentarios": "descrição"
  },
  "avaliacao_ortodontica": {
    "alinhamento": "bom/regular/ruim",
    "observacoes": "descrição"
  },
  "resumo_para_paciente": [
    "Frase simples 1",
    "Frase simples 2"
  ]
}

## ⚠️ LEMBRETE FINAL

1. PREENCHA raciocinio_sisos OBRIGATORIAMENTE para os 4 terceiros molares
2. Siga a metodologia DESCRIÇÃO → ANÁLISE → CONCLUSÃO
3. Analise quadrante por quadrante na ordem FDI
4. NA DÚVIDA sobre siso → PRESENTE
5. NÃO COPIE o exemplo - analise a imagem REAL`;

// Contornos padrão para fallback
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

// Validação do raciocínio dos sisos
function validateWisdomTeethReasoning(analysis: any): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const raciocinio = analysis.raciocinio_sisos;
  
  if (!raciocinio) {
    issues.push("⚠️ Campo raciocinio_sisos não preenchido!");
    return { valid: false, issues };
  }
  
  const sisos = ["18", "28", "38", "48"];
  for (const siso of sisos) {
    const justificativa = raciocinio[siso];
    if (!justificativa) {
      issues.push(`⚠️ Justificativa para siso ${siso} não fornecida!`);
    } else {
      // Verificar se segue o padrão DESCRIÇÃO → ANÁLISE → CONCLUSÃO
      const hasDescricao = justificativa.toLowerCase().includes("descrição") || justificativa.toLowerCase().includes("observo") || justificativa.toLowerCase().includes("vejo");
      const hasAnalise = justificativa.toLowerCase().includes("análise") || justificativa.toLowerCase().includes("característica");
      const hasConclusao = justificativa.toLowerCase().includes("conclusão") || justificativa.toLowerCase().includes("presente") || justificativa.toLowerCase().includes("ausente");
      
      if (!hasConclusao) {
        issues.push(`⚠️ Siso ${siso}: Falta conclusão clara (PRESENTE/AUSENTE)`);
      }
      
      console.log(`📝 Raciocínio siso ${siso}: ${justificativa.substring(0, 100)}...`);
    }
  }
  
  return { valid: issues.length === 0, issues };
}

// Validação de sanidade para detectar padrões suspeitos
function validateSanityCheck(analysis: any): { corrected: boolean; dentesAusentes: string[]; dentesPresentes: string[] } {
  const achados = analysis.achados_clinicos || {};
  let dentesAusentes = Array.isArray(achados.dentes_ausentes) ? [...achados.dentes_ausentes] : [];
  let dentesPresentes = Array.isArray(achados.dentes_presentes) ? [...achados.dentes_presentes] : [];
  let corrected = false;
  
  const wisdomTeeth = ["18", "28", "38", "48"];
  
  // Verificar se todos os 4 sisos estão ausentes (padrão muito suspeito)
  const absentWisdom = wisdomTeeth.filter(tooth => 
    dentesAusentes.some((d: string) => d.toString() === tooth || d.toString().includes(tooth))
  );
  
  if (absentWisdom.length === 4) {
    console.warn("⚠️⚠️⚠️ ALERTA CRÍTICO: Modelo retornou TODOS os 4 sisos como ausentes!");
    console.warn("⚠️ Isso indica possível cópia cega do exemplo ou análise incorreta.");
    
    // Verificar o raciocínio para cada siso
    const raciocinio = analysis.raciocinio_sisos || {};
    let hasValidReasoning = false;
    
    for (const siso of wisdomTeeth) {
      const justificativa = raciocinio[siso] || "";
      // Se a justificativa menciona explicitamente que é radiolúcido/ausente com detalhes, aceitar
      if (justificativa.toLowerCase().includes("radiolúcido") && 
          justificativa.toLowerCase().includes("ausente") &&
          justificativa.length > 50) {
        hasValidReasoning = true;
        console.log(`✅ Siso ${siso} tem justificativa válida para ausência`);
      }
    }
    
    if (!hasValidReasoning) {
      console.warn("⚠️ Aplicando correção: movendo sisos 18, 28, 38 para 'presentes'");
      
      // Corrigir: mover 18, 28, 38 para presentes (manter 48 como ausente - mais comum)
      dentesAusentes = dentesAusentes.filter((d: string) => 
        !["18", "28", "38"].some(siso => d.toString() === siso || d.toString().includes(siso))
      );
      
      ["18", "28", "38"].forEach(siso => {
        if (!dentesPresentes.some((d: string) => d.toString() === siso)) {
          dentesPresentes.push(siso);
          console.log(`✅ Adicionado dente ${siso} aos presentes (correção automática)`);
        }
      });
      
      corrected = true;
    }
  }
  
  // Verificar se há muitos dentes ausentes (>8 é muito suspeito para adulto normal)
  if (dentesAusentes.length > 8) {
    console.warn(`⚠️ ALERTA: ${dentesAusentes.length} dentes ausentes - quantidade incomum, verificar análise!`);
  }
  
  return { corrected, dentesAusentes, dentesPresentes };
}

// Validação e correção de coordenadas
function validateAndCorrectCoordinates(analysis: any): AnaliseVisualSimplificada {
  console.log("Validando e corrigindo coordenadas...");
  
  // Validar raciocínio dos sisos
  const { valid: reasoningValid, issues } = validateWisdomTeethReasoning(analysis);
  if (!reasoningValid) {
    issues.forEach(issue => console.warn(issue));
  }
  
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
  } else {
    console.log("Usando seio maxilar direito padrão");
  }
  
  if (analysis.seio_maxilar?.esquerdo?.contorno_normalizado?.length >= 4) {
    const normalized = analysis.seio_maxilar.esquerdo.contorno_normalizado.map(normalizePoint);
    seioEsquerdo = forceYRange(normalized, 0.15, 0.40);
    console.log("Seio maxilar esquerdo validado:", seioEsquerdo.length, "pontos");
  } else {
    console.log("Usando seio maxilar esquerdo padrão");
  }
  
  // Processar canal mandibular
  let canalDireito = DEFAULT_CANAL_DIREITO;
  let canalEsquerdo = DEFAULT_CANAL_ESQUERDO;
  
  if (analysis.canal_mandibular?.direito?.length >= 3) {
    const normalized = analysis.canal_mandibular.direito.map(normalizePoint);
    canalDireito = forceYRange(normalized, 0.70, 0.85);
    console.log("Canal mandibular direito validado:", canalDireito.length, "pontos");
  } else {
    console.log("Usando canal mandibular direito padrão");
  }
  
  if (analysis.canal_mandibular?.esquerdo?.length >= 3) {
    const normalized = analysis.canal_mandibular.esquerdo.map(normalizePoint);
    canalEsquerdo = forceYRange(normalized, 0.70, 0.85);
    console.log("Canal mandibular esquerdo validado:", canalEsquerdo.length, "pontos");
  } else {
    console.log("Usando canal mandibular esquerdo padrão");
  }
  
  // Validação de sanidade
  const { corrected, dentesAusentes, dentesPresentes } = validateSanityCheck(analysis);
  if (corrected) {
    console.warn("⚠️ ATENÇÃO: Correção automática aplicada. Recomenda-se análise manual.");
  }
  
  const achados = analysis.achados_clinicos || {};
  
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
    avaliacao_periodontal: {
      perda_ossea: analysis.avaliacao_periodontal?.perda_ossea || "indeterminado",
      comentarios: analysis.avaliacao_periodontal?.comentarios || "",
    },
    avaliacao_ortodontica: {
      alinhamento: analysis.avaliacao_ortodontica?.alinhamento || "indeterminado",
      observacoes: analysis.avaliacao_ortodontica?.observacoes || "",
    },
    resumo_para_paciente: Array.isArray(analysis.resumo_para_paciente) ? analysis.resumo_para_paciente : [],
    raciocinio_sisos: analysis.raciocinio_sisos || undefined,
  };
  
  console.log("Análise simplificada gerada:");
  console.log("- Dentes presentes:", result.achados_clinicos.dentes_presentes.length);
  console.log("- Dentes ausentes:", result.achados_clinicos.dentes_ausentes.length);
  console.log("- Cáries suspeitas:", result.achados_clinicos.caries_suspeitas.length);
  console.log("- Lesões suspeitas:", result.achados_clinicos.lesoes_suspeitas.length);
  console.log("- Raciocínio sisos incluído:", !!result.raciocinio_sisos);
  
  return result;
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

    console.log("Iniciando análise visual com Chain of Thought...");
    console.log("Tipo da imagem:", imageType);

    const base64Data = imageBase64.includes("base64,") 
      ? imageBase64.split("base64,")[1] 
      : imageBase64;

    console.log("Chamando API OpenAI com modelo gpt-4.1 e metodologia CoT...");
    
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
                text: `## INSTRUÇÕES CRÍTICAS PARA ESTA ANÁLISE

### METODOLOGIA OBRIGATÓRIA - SIGA EXATAMENTE:

1. **PASSO 1 - ANÁLISE QUADRANTE POR QUADRANTE**
   Analise cada dente na ordem FDI:
   - Quadrante 1: 18→17→16→15→14→13→12→11
   - Quadrante 2: 21→22→23→24→25→26→27→28
   - Quadrante 3: 31→32→33→34→35→36→37→38
   - Quadrante 4: 41→42→43→44→45→46→47→48

2. **PASSO 2 - CHECKLIST DOS SISOS (CRÍTICO)**
   Para cada terceiro molar (18, 28, 38, 48):
   - Localize a região anatômica específica
   - Descreva O QUE VOCÊ VÊ (estruturas visíveis)
   - APENAS declare ausente se 100% radiolúcido
   - NA DÚVIDA → PRESENTE

3. **PASSO 3 - PREENCHA raciocinio_sisos OBRIGATORIAMENTE**
   Para CADA siso, escreva: "DESCRIÇÃO: [o que vejo]. ANÁLISE: [características]. CONCLUSÃO: PRESENTE/AUSENTE porque [razão específica]."

4. **PASSO 4 - IDENTIFIQUE TODOS OS ACHADOS**
   - Cáries (superfície e profundidade)
   - Lesões periapicais (tipo e tamanho)
   - Restaurações (tipo e superfície)
   - Tratamentos endodônticos
   - Implantes (lembrar: implante = dente ausente!)

### ⚠️ REGRAS ABSOLUTAS:
- NUNCA copie o exemplo JSON - analise a imagem REAL
- NUNCA declare 4 sisos ausentes sem justificativa detalhada
- SEMPRE preencha raciocinio_sisos com descrição + análise + conclusão
- Se em DÚVIDA sobre siso → declare PRESENTE

Retorne JSON válido com todos os campos, especialmente raciocinio_sisos.`
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
        max_completion_tokens: 6000,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      throw new Error(`Erro na API OpenAI: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("Resposta vazia da API");

    console.log("Resposta da API recebida");

    let rawAnalysis: any;
    try {
      rawAnalysis = JSON.parse(content);
    } catch (parseError) {
      console.error("Erro ao parsear JSON:", parseError);
      throw new Error("Erro ao processar resposta da análise visual");
    }

    // Log do raciocínio dos sisos para debug
    if (rawAnalysis.raciocinio_sisos) {
      console.log("📝 RACIOCÍNIO DOS SISOS:");
      Object.entries(rawAnalysis.raciocinio_sisos).forEach(([siso, raciocinio]) => {
        console.log(`  Siso ${siso}: ${(raciocinio as string).substring(0, 150)}...`);
      });
    } else {
      console.warn("⚠️ Modelo não preencheu raciocinio_sisos!");
    }

    // Validar e corrigir coordenadas
    const validatedAnalysis = validateAndCorrectCoordinates(rawAnalysis);

    console.log("Análise visual com CoT concluída com sucesso!");

    return new Response(JSON.stringify(validatedAnalysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro na análise visual:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erro desconhecido",
        details: "Falha na análise visual"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
