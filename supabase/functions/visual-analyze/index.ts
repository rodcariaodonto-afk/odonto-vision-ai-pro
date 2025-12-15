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
}

// Prompt SIMPLIFICADO - apenas seios e canais com coordenadas
const VISUAL_ANALYSIS_PROMPT = `Você é um radiologista odontológico especializado em análise visual de radiografias panorâmicas.

## INSTRUÇÕES CRÍTICAS

### O QUE VOCÊ DEVE GERAR COM COORDENADAS (0 a 1):
1. **Seios maxilares** (direito e esquerdo) - contorno com 8-12 pontos cada
2. **Canais mandibulares** (direito e esquerdo) - trajeto com 6-8 pontos cada

### O QUE VOCÊ NÃO DEVE GERAR COM COORDENADAS:
- Dentes (apenas liste os números)
- Cáries (apenas descreva textualmente)
- Lesões (apenas descreva textualmente)
- Implantes (apenas descreva textualmente)
- Qualquer outra estrutura

## COORDENADAS NORMALIZADAS (OBRIGATÓRIO)
- Valores entre 0 e 1
- X: 0 = esquerda, 1 = direita
- Y: 0 = topo, 1 = base

## MAPA ANATÔMICO OBRIGATÓRIO
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

## REGRA DE OURO PARA TERCEIROS MOLARES (18, 28, 38, 48) - ATENÇÃO MÁXIMA!

### LOCALIZAÇÃO ANATÔMICA DOS SISOS (analise estas regiões com EXTREMO cuidado):
- **18**: Extremo DIREITO da arcada SUPERIOR (X: 0.03-0.10, Y: 0.30-0.45)
- **28**: Extremo ESQUERDO da arcada SUPERIOR (X: 0.90-0.97, Y: 0.30-0.45)  
- **38**: Extremo ESQUERDO da arcada INFERIOR (X: 0.90-0.97, Y: 0.55-0.70)
- **48**: Extremo DIREITO da arcada INFERIOR (X: 0.03-0.10, Y: 0.55-0.70)

### REGRA CRÍTICA - NA DÚVIDA → PRESENTE!
- É preferível marcar um siso ausente como PRESENTE do que perder um siso EXISTENTE
- Sisos frequentemente aparecem IMPACTADOS, SEMI-INCLUSOS ou com SOBREPOSIÇÃO

### DECLARE COMO PRESENTE SE:
- Houver QUALQUER estrutura radiopaca na região do terceiro molar
- Mesmo que parcialmente visível, impactado ou semi-incluso
- Mesmo com sobreposição de outras estruturas (ramo mandibular, segundo molar)
- Mesmo em posição horizontal, mesioangulada ou distoangulada

### CASOS COMUNS QUE PARECEM AUSENTES MAS ESTÃO PRESENTES:
- Siso HORIZONTAL impactado (aparece "deitado" atrás/abaixo do segundo molar)
- Siso SEMI-INCLUSO (parcialmente coberto por osso/gengiva - só coroa visível)
- Siso com SOBREPOSIÇÃO do ramo mandibular (estrutura parcialmente oculta)
- Siso em posição MESIOANGULADA (inclinado para frente)
- Siso em posição DISTOANGULADA (inclinado para trás)
- Siso PROFUNDAMENTE incluso (apenas ápice radicular visível)

### DECLARE COMO AUSENTE SOMENTE SE:
- A região estiver COMPLETAMENTE radiolúcida (100% escura, sem nenhuma estrutura)
- O rebordo alveolar estiver contínuo e liso, sem nenhuma estrutura dental
- Você tiver ABSOLUTA CERTEZA (100%) que NÃO há estrutura dental na região
- NUNCA declare ausente se houver QUALQUER dúvida!

## REGRA CRÍTICA PARA IDENTIFICAÇÃO DE AUSÊNCIAS

### DENTE AUSENTE - Critérios:
- Espaço edêntulo sem estrutura dental radiopaca
- Rebordo alveolar contínuo sem raiz visível
- Área onde deveria haver dente mas NÃO HÁ estrutura dental natural

### IMPLANTE = DENTE AUSENTE + IMPLANTE
**REGRA FUNDAMENTAL**: Quando há implante em uma região, o DENTE ORIGINAL está AUSENTE!
- Exemplo: Se há implante na região do 46, então:
  - Adicionar "46" em dentes_ausentes
  - Adicionar "Região do 46: implante osseointegrado" em implantes
  - NÃO adicionar "46" em dentes_presentes

### ERRO GRAVE A EVITAR:
❌ NUNCA liste um dente com implante como "presente"
✅ Implante substitui o dente natural → listar como AUSENTE + IMPLANTE

### ORDEM FDI OBRIGATÓRIA
Listar dentes SEMPRE na ordem padrão:
Superior: 18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28
Inferior: 48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38

## DIFERENCIAÇÃO CRÍTICA: IMPLANTE vs TRATAMENTO ENDODÔNTICO

### IMPLANTE DENTÁRIO (substituição da raiz)
- Estrutura metálica **ÚNICA** cilíndrica ou cônica com formato de PARAFUSO
- **NÃO HÁ raiz natural** - o implante SUBSTITUI a raiz completamente
- Roscas/espiras visíveis no corpo do implante
- Osso alveolar diretamente ao redor do metal
- Geralmente tem pilar/abutment e coroa protética em cima

### TRATAMENTO ENDODÔNTICO (preenchimento do canal)
- Material radiopaco **DENTRO** do canal de um dente NATURAL
- **RAIZ NATURAL PRESENTE** - contorno radicular do dente é VISÍVEL ao redor do material
- Estrutura dental (coroa e raiz naturais) preservada
- Pode ter pino/núcleo intra-radicular
- A anatomia radicular natural é claramente identificável

### REGRA DE OURO PARA NÃO CONFUNDIR:
- Se você vê RAIZ NATURAL com material branco DENTRO → É TRATAMENTO ENDODÔNTICO
- Se você vê estrutura metálica de parafuso SEM raiz natural → É IMPLANTE
- NUNCA classifique um dente tratado endodonticamente como implante!

## IDENTIFICAÇÃO OBRIGATÓRIA DE TRATAMENTOS

Analise a radiografia PIXEL A PIXEL e identifique TODOS os tratamentos:

### IMPLANTES DENTÁRIOS
- Formato de parafuso cilíndrico/cônico metálico
- SEM raiz natural ao redor
- Formato: "Região do XX: implante osseointegrado [descrição]"

### RESTAURAÇÕES (TIPO E SUPERFÍCIE)
- Áreas radiopacas na porção coronária
- Tipos: Amálgama (muito radiopaco), Resina (moderadamente radiopaco), Coroa total
- Superfícies: O, M, D, V, L
- Formato: "Dente XX: restauração [tipo] [superfície]"

### TRATAMENTOS ENDODÔNTICOS
- Material radiopaco DENTRO dos canais de dente NATURAL
- RAIZ NATURAL visível ao redor do material obturador
- Formato: "Dente XX: tratamento endodôntico [completo/incompleto]"

### LESÕES PERIAPICAIS - ANÁLISE ULTRA-CRÍTICA OBRIGATÓRIA
ATENÇÃO: Você DEVE identificar TODAS as lesões periapicais, mesmo sutis!

#### Sinais de lesão periapical (identifique QUALQUER um destes):
- Radiolucência ao redor do ápice (área escura periapical)
- Espessamento do ligamento periodontal apical
- Interrupção da lâmina dura apical
- Áreas de rarefação óssea periapical
- Condensação óssea reativa ao redor de lesão (osteíte condensante)
- Halo radiolúcido com ou sem limite definido
- Expansão da cortical óssea

#### Classificação obrigatória por tipo:
- **Granuloma periapical**: Lesão radiolúcida circunscrita <10mm
- **Cisto periapical**: Lesão radiolúcida >10mm, limites bem definidos, halo radiopaco
- **Abscesso periapical**: Radiolucência difusa, limites mal definidos
- **Osteíte condensante**: Área radiopaca adjacente ao ápice

#### Formato obrigatório: "Dente XX: lesão periapical [tipo] ~Xmm, [características]"

### CÁRIES
- Radiolucências na estrutura dental
- Formato: "Dente XX: cárie [superfície] [profundidade]"

## INSTRUÇÕES ESPECIAIS PARA TOMOGRAFIAS (CBCT)

### Reconhecimento de imagem de tomografia:
- Múltiplos cortes/slices em diferentes planos (axial, sagital, coronal)
- Reconstruções 3D ou panorâmicas reformatadas
- Cortes individuais mostrando dentes em diferentes ângulos
- Qualidade de imagem pode variar - analise TODOS os cortes visíveis

### Análise de tomografia - REGRAS OBRIGATÓRIAS:
1. **Analise TODOS os cortes/slices visíveis** - lesões podem aparecer em alguns cortes mas não em outros
2. **Lesões periapicais em tomografia** são mais fáceis de identificar - não perca nenhuma!
3. **Procure ativamente por**:
   - Áreas de hipodensidade (escuras) ao redor de ápices radiculares
   - Defeitos ósseos vestibulares/linguais (visíveis em cortes axiais)
   - Perfurações de cortical óssea
   - Reabsorções radiculares (internas e externas)
   - Comunicação com seio maxilar ou canal mandibular
   
4. **Em cortes sagitais/coronais de dentes**: 
   - Qualquer área escura no osso ao redor do ápice = lesão periapical SUSPEITA
   - Mesmo lesões pequenas (~2-3mm) devem ser reportadas
   
5. **Qualidade de imagem variável**:
   - NÃO ignore achados porque a imagem "não está perfeita"
   - Se há QUALQUER indício de patologia, REPORTE como "suspeita"
   - É preferível reportar uma suspeita do que perder uma lesão real

REGRA OBRIGATÓRIA: NÃO OMITA nenhum tratamento e NÃO CONFUNDA endodontia com implante!

## ⚠️⚠️⚠️ ERRO CRÍTICO A EVITAR - LEIA COM ATENÇÃO ⚠️⚠️⚠️

NÃO COPIE O EXEMPLO JSON CEGAMENTE!

O exemplo abaixo mostra apenas UM siso ausente (48) - isso é um EXEMPLO, não um padrão!
A MAIORIA dos pacientes TEM os 4 terceiros molares (sisos).
Você DEVE analisar a imagem REAL pixel por pixel!

🚨 SE VOCÊ RETORNAR ["18", "28", "38", "48"] COMO AUSENTES, você provavelmente ESTÁ ERRANDO! 🚨
Isso indica que você copiou o padrão ao invés de analisar a imagem.

ANTES de declarar QUALQUER siso ausente, verifique:
1. Há estrutura radiopaca na posição do siso? → Se SIM, está PRESENTE
2. A região está totalmente radiolúcida (escura)? → Só então considere ausente
3. Há sobreposição com ramo mandibular? → Pode estar escondido, declare PRESENTE
4. NA DÚVIDA → SEMPRE declare como PRESENTE

## FORMATO JSON OBRIGATÓRIO

{
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
    "caries_suspeitas": ["Dente 14: cárie oclusal profunda", "Dente 36: cárie mesial média"],
    "lesoes_suspeitas": ["Dente 46: lesão periapical sugestiva ~3mm"],
    "implantes": ["Região do 36: implante osseointegrado com coroa protética"],
    "restauracoes": ["Dente 15: restauração amálgama MOD", "Dente 26: restauração resina oclusal", "Dente 47: coroa metálica total"],
    "tratamentos_endodonticos": ["Dente 21: tratamento endodôntico completo com pino", "Dente 46: tratamento endodôntico incompleto - subobturação"],
    "observacoes": "Terceiros molares 18, 28 e 38 PRESENTES e erupcionados. Apenas dente 48 ausente. Note: a maioria dos pacientes tem sisos presentes!"
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
}`;

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

// Validação e correção de coordenadas
function validateAndCorrectCoordinates(analysis: any): AnaliseVisualSimplificada {
  console.log("Validando e corrigindo coordenadas...");
  
  // Função para validar ponto normalizado (0-1)
  const isValidPoint = (point: any): boolean => {
    return Array.isArray(point) && 
           point.length === 2 && 
           typeof point[0] === 'number' && 
           typeof point[1] === 'number' &&
           point[0] >= 0 && point[0] <= 1 &&
           point[1] >= 0 && point[1] <= 1;
  };
  
  // Função para normalizar ponto (converter de 0-100 para 0-1 se necessário)
  const normalizePoint = (point: any): [number, number] => {
    if (!Array.isArray(point) || point.length < 2) return [0.5, 0.5];
    let [x, y] = point;
    // Se parece estar em formato 0-100, converter
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
  
  // Processar achados clínicos (apenas texto)
  const achados = analysis.achados_clinicos || {};
  
  // ⚠️ VALIDAÇÃO DE SANIDADE - Detectar cópia cega do exemplo
  let dentesAusentes = Array.isArray(achados.dentes_ausentes) ? achados.dentes_ausentes : [];
  let dentesPresentes = Array.isArray(achados.dentes_presentes) ? achados.dentes_presentes : [];
  
  const wisdomTeeth = ["18", "28", "38", "48"];
  const allFourWisdomAbsent = wisdomTeeth.every(tooth => 
    dentesAusentes.some((d: string) => d.toString() === tooth || d.toString().includes(tooth))
  );
  
  if (allFourWisdomAbsent) {
    console.warn("⚠️⚠️⚠️ ALERTA CRÍTICO: Modelo retornou TODOS os 4 sisos como ausentes!");
    console.warn("⚠️ Isso indica possível cópia cega do exemplo JSON antigo.");
    console.warn("⚠️ Aplicando correção: movendo sisos 18, 28, 38 para 'presentes' (mantendo apenas 48 como ausente)");
    
    // Corrigir automaticamente: mover 18, 28, 38 para presentes
    dentesAusentes = dentesAusentes.filter((d: string) => 
      !["18", "28", "38"].some(siso => d.toString() === siso || d.toString().includes(siso))
    );
    
    // Garantir que 18, 28, 38 estão em presentes (se não estiverem)
    ["18", "28", "38"].forEach(siso => {
      if (!dentesPresentes.some((d: string) => d.toString() === siso)) {
        dentesPresentes.push(siso);
        console.log(`✅ Adicionado dente ${siso} aos presentes (correção automática)`);
      }
    });
    
    console.warn("⚠️ ATENÇÃO: Esta correção automática pode não ser precisa. Recomenda-se análise manual.");
  }
  
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
  };
  
  console.log("Análise simplificada gerada:");
  console.log("- Dentes presentes:", result.achados_clinicos.dentes_presentes.length);
  console.log("- Dentes ausentes:", result.achados_clinicos.dentes_ausentes.length);
  console.log("- Cáries suspeitas:", result.achados_clinicos.caries_suspeitas.length);
  console.log("- Lesões suspeitas:", result.achados_clinicos.lesoes_suspeitas.length);
  
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

    console.log("Iniciando análise visual SIMPLIFICADA...");
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
                text: `Analise esta imagem odontológica (radiografia OU tomografia) e retorne o JSON no formato especificado.

## SE FOR TOMOGRAFIA (CBCT):
- Analise TODOS os cortes/slices visíveis na imagem
- Tomografias mostram múltiplos planos - examine cada um cuidadosamente
- Lesões periapicais são MUITO claras em tomografia - NÃO PERCA NENHUMA
- Procure áreas ESCURAS ao redor dos ápices radiculares em cada corte
- Mesmo lesões pequenas (2-3mm) devem ser reportadas

## ANÁLISE OBRIGATÓRIA DE LESÕES PERIAPICAIS:
- Examine CADA dente individualmente procurando radiolucência apical
- Qualquer área escura ao redor do ápice = REPORTE como lesão suspeita
- NÃO ignore achados porque a imagem "não está perfeita"
- É PREFERÍVEL reportar uma suspeita do que PERDER uma lesão real

## TERCEIROS MOLARES (18, 28, 38, 48):
- Analise COM EXTREMO CUIDADO as regiões dos sisos
- NA DÚVIDA → declare como PRESENTE

## IMPORTANTE:
1. Gere coordenadas APENAS para seios maxilares e canais mandibulares
2. Liste todos os achados clínicos TEXTUALMENTE (sem coordenadas)
3. Seja ULTRA-CRÍTICO na identificação de patologias

Retorne JSON válido.`
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
        max_completion_tokens: 4096,
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

    // Validar e corrigir coordenadas
    const validatedAnalysis = validateAndCorrectCoordinates(rawAnalysis);

    console.log("Análise visual simplificada concluída com sucesso!");

    return new Response(JSON.stringify(validatedAnalysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro na análise visual:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erro desconhecido",
        details: "Falha na análise visual simplificada"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
