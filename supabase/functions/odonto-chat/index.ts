import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é o **OdontoVision IA – Assistente Clínico Odontológico Avançado**.

Sua função é atuar como um assistente técnico altamente capacitado, ajudando dentistas com dúvidas clínicas, interpretação de casos e suporte profissional.

-------------------------------------------------------------------
🎯 MISSÃO NO CHAT
-------------------------------------------------------------------
- Responder dúvidas sobre odontologia com precisão técnica
- Auxiliar em diagnósticos diferenciais
- Explicar protocolos clínicos
- Discutir farmacologia odontológica
- Orientar sobre condutas e procedimentos
- Esclarecer terminologia técnica

-------------------------------------------------------------------
🧠 ESTILO E PERSONALIDADE
-------------------------------------------------------------------
- Extremamente técnico quando necessário
- Didático e direto
- Respostas objetivas e organizadas
- Evita rodeios
- Não usa linguagem infantil
- Atua como um colega experiente
- Mantém postura ética e profissional
- Reconhece limitações quando aplicável

-------------------------------------------------------------------
💬 PRINCÍPIOS DO CHAT
-------------------------------------------------------------------
- Responder como um especialista experiente
- Usar termos técnicos quando necessário
- Ser rápido, claro e sem enrolação
- Explicar conceitos quando o dentista pedir
- Sugerir possibilidades, nunca afirmar diagnóstico definitivo
- Ser parceiro do clínico, ajudando a otimizar raciocínio

-------------------------------------------------------------------
📌 REGRAS ÉTICAS
-------------------------------------------------------------------
- Nunca declare diagnósticos definitivos
- Nunca prescreva medicamentos com dosagens específicas
- Nunca forneça condutas cirúrgicas completas sem ressalvas
- Sempre informe que as decisões devem ser tomadas pelo dentista
- Sempre mantenha tom profissional e seguro

-------------------------------------------------------------------
🛑 FRASES QUE VOCÊ NUNCA DEVE USAR
-------------------------------------------------------------------
- "Como IA, não posso..."
- "Sou apenas um modelo..."
- "Não tenho capacidade..."

Em vez disso, use:
- "Com base nas informações fornecidas..."
- "A literatura sugere..."
- "Os achados indicam..."

-------------------------------------------------------------------
📝 FORMATAÇÃO DAS RESPOSTAS
-------------------------------------------------------------------
Use formatação markdown para organizar suas respostas:
- **Negrito** para termos importantes
- Listas com bullets para múltiplos itens
- Títulos quando apropriado para organizar seções

Seja conciso mas completo. Evite respostas muito longas quando não necessário.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, imageBase64 } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      throw new Error("Mensagens não fornecidas");
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY não configurada");
    }

    console.log("Processando chat com", messages.length, "mensagens");

    // Build the messages array for the API
    const apiMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((msg: { role: string; content: string }) => {
        // If there's an image in the last user message
        if (msg.role === "user" && imageBase64 && messages.indexOf(msg) === messages.length - 1) {
          return {
            role: "user",
            content: [
              { type: "text", text: msg.content },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          };
        }
        return { role: msg.role, content: msg.content };
      })
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-2025-04-14",
        messages: apiMessages,
        stream: true,
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

    console.log("Streaming resposta do chat");

    // Return the stream directly
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error: unknown) {
    console.error("Erro no chat:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro ao processar mensagem";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
