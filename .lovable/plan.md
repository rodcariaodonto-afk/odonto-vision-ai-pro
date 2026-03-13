

## Plano: Inserir Novo Prompt do Dr. Dani Imagem nos Agentes de IA

### Contexto

O novo prompt fornecido é um sistema completo de radiologia odontológica com persona "Dr. Dani Imagem", protocolo de raciocínio diagnóstico em 6 etapas, regras anti-erro, e formato de laudo estruturado. Precisa ser integrado nas 3 edge functions que contêm prompts de IA.

### Funções Afetadas

| Edge Function | Mudança |
|---|---|
| `supabase/functions/analyze-exam/index.ts` | Reescrever `buildSystemPrompt()` com o novo prompt completo (persona, protocolo de raciocínio, formato de laudo, regras anti-erro). Manter a lógica de JSON output e campos dinâmicos (nome paciente, categoria exame) |
| `supabase/functions/odonto-chat/index.ts` | Atualizar `SYSTEM_PROMPT` com a persona Dr. Dani Imagem, especialidades, regras anti-erro e estilo de comunicação do novo prompt |
| `supabase/functions/visual-analyze/index.ts` | Atualizar `CONSERVATIVE_VISUAL_PROMPT` com as regras anti-erro e protocolo de raciocínio, mantendo o formato JSON de coordenadas |

### Detalhes da Integração

#### 1. `analyze-exam/index.ts` — Mudança Principal

A função `buildSystemPrompt()` (linhas 45-408) será reescrita para incorporar:

- **Persona**: Dr. Dani Imagem, radiologista com 30+ anos
- **Protocolo de Raciocínio em 6 Etapas**: Qualidade técnica → Varredura anatômica → Caracterização de lesão → Diagnóstico diferencial ranqueado → Correlação clínica → Recomendação
- **Capacidades por tipo de exame**: Periapicais, Panorâmicas (avaliação sistemática de 12 regiões), CBCT (multiplanar), Fotos clínicas
- **Formato de Laudo**: Novo formato com emojis (📋, 🔍, 🦷, ⚕️, 🔴, 📌, 📚) mantendo compatibilidade com o JSON output existente
- **Regras Anti-Erro**: 8 regras de calibração (variantes anatômicas ≠ patologia, regra das duas incidências, simetria bilateral, etc.)
- **Linguagem**: Português brasileiro, terminologia FDI, calibração de confiança

O JSON output final será preservado para compatibilidade com o frontend, adicionando campos do novo formato quando possível.

#### 2. `odonto-chat/index.ts` — Atualização de Persona

O `SYSTEM_PROMPT` (linhas 9-181) será atualizado para:
- Adotar a persona Dr. Dani Imagem
- Incorporar as regras anti-erro do novo prompt
- Manter a capacidade multidisciplinar existente (já bem completa)
- Adicionar o protocolo de raciocínio diagnóstico quando análise de imagem for solicitada no chat

#### 3. `visual-analyze/index.ts` — Regras Anti-Erro

O `CONSERVATIVE_VISUAL_PROMPT` será enriquecido com:
- As 8 regras anti-erro (variantes anatômicas, regra SLOB, etc.)
- Protocolo de avaliação sistemática de panorâmica (12 regiões)
- Mantém formato JSON de coordenadas inalterado

### Compatibilidade

- O formato JSON de resposta do `analyze-exam` será mantido para não quebrar o frontend
- As seções do laudo serão mapeadas: "Impressão Diagnóstica" → `diagnosticos_diferenciais`, "Achados Radiográficos" → `achados_radiograficos`, etc.
- A seção "Nota Educacional" será incluída dentro de `observacoes`
- Redeploy automático das 3 edge functions

