## Objetivo

Quando o exame enviado é **laboratorial**, a tela de resultados não deve mais usar terminologia radiográfica nem exibir JSON cru. Os parâmetros e diagnósticos devem aparecer em texto clínico amigável.

## Diagnóstico

- `src/pages/Upload.tsx` já calcula `examCategories.every(c => c === "laboratorial")` em alguns pontos (PDF, e-mail), mas a **renderização na tela** das seções "4) Achados Radiográficos" e "6) Diagnósticos Diferenciais" usa títulos e textos fixos.
- A IA (`supabase/functions/analyze-exam/index.ts`) está retornando os itens de `achados_radiograficos` e `diagnosticos_diferenciais` como **strings que contêm JSON** (ex.: `{"exame":"ERITROGRAMA","parametro":"Hemácias",...}`), e o `ResultCard` apenas imprime a string — daí o JSON aparecer na UI.
- Também há mistura de linguagem (interpretação clínica fala em "radiográfico" mesmo em laudo laboratorial).

## Mudanças

### 1. `src/pages/Upload.tsx` (frontend, somente apresentação)

a) Derivar um flag `isLabOnly = examCategories.length > 0 && examCategories.every(c => c === "laboratorial")`.

b) Criar helpers locais:
- `tryParseJsonItem(str)` — tenta `JSON.parse` em uma string que começa com `{`/`[`; retorna objeto ou `null`.
- `renderLabParameter(obj)` — formata `{ exame, parametro, valor_encontrado, unidade, valor_referencia, status }` como:
  `Parâmetro: valor unidade — Referência: X — Status: Normal/Alterado`
  Agrupa visualmente por `exame` (Eritrograma, Leucograma, Plaquetograma, etc.).
- `renderDiagnosis(obj)` — formata `{ diagnostico_primario|secundario|terciario, justificativa }` como dois blocos rotulados ("Diagnóstico primário:" / "Justificativa:").
- Capitaliza status (`NORMAL` → `Normal`, `ALTERADO LEVE - Abaixo do limite inferior` → `Alterado leve, abaixo do limite inferior`) e colore por severidade.

c) Substituir a renderização condicional:
- Se `isLabOnly`: trocar `ResultCard` por um novo `LabParametersCard` com título **"4) Parâmetros Laboratoriais Analisados"**, agrupando itens parseados por `exame`. Fallback: itens que não são JSON renderizam como texto simples.
- Senão: mantém "4) Achados Radiográficos" como hoje.

d) Diagnósticos diferenciais:
- Novo `DiagnosesCard` com título "6) Diagnósticos Diferenciais" que parseia objetos `{diagnostico_*, justificativa}` e renderiza com labels. Mantém fallback para strings normais.

e) Interpretação clínica (seção 5): título dinâmico — `isLabOnly` → "5) Interpretação Laboratorial"; senão "5) Interpretação Clínica / Radiológica".

f) Mesma lógica de título dinâmico para "7) Alterações Relevantes" vs "Riscos e Alertas" e "8) Sugestão de Conduta Clínica" vs "Recomendações Clínicas" quando `isLabOnly`.

g) Card "Qualidade do Documento" já tem versão lab — manter.

### 2. `supabase/functions/analyze-exam/index.ts` (prompt + normalização)

a) Ajustar o prompt para que, quando o input for laboratorial, a IA:
- preencha `achados_radiograficos` com **objetos** estruturados (`{exame, parametro, valor_encontrado, unidade, valor_referencia, status}`) — não strings JSON;
- preencha `diagnosticos_diferenciais` com **objetos** `{diagnostico_primario|secundario|terciario, justificativa}`;
- escreva `interpretacao_clinica`, `riscos_alertas`, `recomendacoes_clinicas` em linguagem laboratorial (parâmetros, valores de referência, alterações hematológicas/bioquímicas, correlação clínica) — proibir explicitamente termos "radiográfico", "imagem", "estruturas ósseas".

b) No `toArr`, preservar objetos quando o item já for objeto (em vez de transformar tudo em string via `JSON.stringify`). O frontend lida com objeto OU string.

### 3. Sem mudanças de banco, sem mudanças em PDF/e-mail nesta passada (escopo limitado à tela conforme pedido principal).

## Arquivos tocados

- `src/pages/Upload.tsx` — novos componentes `LabParametersCard` / `DiagnosesCard`, flag `isLabOnly`, títulos dinâmicos.
- `supabase/functions/analyze-exam/index.ts` — prompt laboratorial + `toArr` aceitando objetos.

## Fora de escopo

- Refatorar PDF e e-mail (já têm título dinâmico básico; manter como está).
- Outras telas (Chat, Cases) — apresentam os mesmos campos mas o pedido foi sobre o resultado do upload.
