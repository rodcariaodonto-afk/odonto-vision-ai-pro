

# Correções da Cefalometria — 6 problemas

## 1. Detecção real de landmarks (fim do "Demo")

A causa real do "Demo" e das linhas tortas: a API HuggingFace `hrnet-cephalometric-landmark-detection` está retornando erro/instável, então a função cai no `generateDemoLandmarks()` (coordenadas fixas que não batem com a imagem). Vamos:

- Substituir HuggingFace por **Lovable AI Gateway com `google/gemini-2.5-pro` (vision)** na edge function `analyze-cephalometry`. Gemini Pro recebe a imagem e devolve, via **tool calling estruturado**, as 19 coordenadas de landmarks proporcionais (0–1 do tamanho da imagem) já com nomes em pt-BR.
- A função multiplica pelas dimensões reais da imagem (lemos com `createImageBitmap`) antes de calcular medidas.
- Remover totalmente o `generateDemoLandmarks` e o badge `Demo`. Se o Gemini falhar, retornamos erro com toast claro ("Não foi possível detectar landmarks — tente uma imagem mais nítida") em vez de mostrar dados fake.
- Tratar 429/402 do gateway com mensagem amigável.

## 2. Múltiplas análises na mesma radiografia

- Trocar o seletor de **single** para **multi-select** (checkboxes nos cards). State vira `selectedAnalyses: AnalysisType[]` (mínimo 1).
- Edge function aceita `analysisTypes: AnalysisType[]` e retorna `results: { [type]: { measurements, interpretation } }` — landmarks são detectados **uma vez só** e reaproveitados (eficiente em tokens).
- UI de resultado vira **Tabs internas** (uma aba por análise selecionada), cada uma com seu próprio canvas (linhas/cores próprias), tabela e interpretação.
- Botão fica `Analisar com {N} análise(s)`.
- PDF exportado contém **uma seção por análise** (cabeçalho + canvas + tabela + interpretação) com quebra de página entre elas.
- "Salvar Caso" grava todas as análises num único caso (campo `analysis.analyses[]`).

## 3. Visualizador interativo com zoom + ferramenta de desenho

Criar componente `<CephalometricViewer>` reutilizável:

- **Zoom**: botões `+ / − / Reset` + scroll-wheel (escala 0.5×–4×) + pan por arrastar quando zoom > 1.
- **Toolbar de desenho** sobre a imagem:
  - Caneta livre (cor selecionável: azul/vermelho/verde/amarelo)
  - Régua/linha reta
  - Borracha
  - Limpar tudo
- Camadas separadas: imagem base → linhas da análise (com landmarks) → camada de anotação manual (preservada quando o usuário troca de análise).
- Anotações salvas no canvas final e incluídas no PDF.
- Mover landmarks: arrastar um ponto reposiciona o landmark e **recalcula** as medidas no client (recálculo local com as funções `angle/distance` portadas do edge para `src/lib/cephalometric-math.ts`).

## 4. Histórico clicável — reabrir análise completa

- Cada item do histórico vira **card clicável**.
- Ao clicar: restaura `selectedAnalyses`, `patientId`, `patientName`, `imagePreview` (carregando imagem do Storage via `image_storage_path`), `result.landmarks` e `result.measurements`, redesenha overlay e rola para o resultado.
- Adicionar botões de **Excluir** (ícone lixeira) e **Exportar PDF** direto no item.

## 5. Página atualizando ao trocar de aba

A causa: o `<Layout>` consome `subscription` do `AuthContext` e o evento `SIGNED_IN` é re-disparado pelo Supabase quando a aba volta ao foco (rehidratação de sessão), o que chama `checkSubscription()` → re-render que reseta o `useState` da página.

Correções em `AuthContext.tsx`:
- No listener `onAuthStateChange`, ignorar `SIGNED_IN` quando `newSession?.user?.id === user?.id` (sessão idêntica = apenas rehidratação, não login real).
- Adicionar `if (document.visibilityState === 'hidden') return;` para evitar disparo durante mudança de aba.
- Mover persistência do form da Cefalometria para `sessionStorage` (`cephalo_draft`) — patientId, patientName, selectedAnalyses, result e imagePreview — para que mesmo um re-render acidental não perca o trabalho.

## 6. PDF "não funcionava"

Já está implementado em `handleExportPDF`, mas falhava porque o canvas tinha `crossOrigin` ausente quando a imagem vinha do Storage público, gerando "tainted canvas" no `toDataURL()`. Correção:
- Adicionar `img.crossOrigin = "anonymous"` no `drawAnalysisOverlay` antes de `img.src = imagePreview`.
- Quando `imagePreview` for `data:` URL (preview local), funciona direto.
- Quando vier do Storage (reabertura de histórico), o bucket `cephalometric-images` precisa ter CORS habilitado — adicionar via migração SQL no `storage.buckets`.

## Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/analyze-cephalometry/index.ts` | Trocar HF por Lovable AI (Gemini 2.5 Pro vision + tool calling); aceitar `analysisTypes[]`; remover demo |
| `src/types/cephalometric-analyses.ts` | Sem mudança estrutural |
| `src/lib/cephalometric-math.ts` | **Novo** — `angle()`, `distance()`, `calculateMeasurementsByAnalysis()` (mesma lógica do edge, no client) |
| `src/components/cephalometry/CephalometricViewer.tsx` | **Novo** — canvas com zoom/pan/desenho/landmarks arrastáveis |
| `src/components/cephalometry/AnalysisResultTabs.tsx` | **Novo** — tabs com tabela+interpretação por análise |
| `src/pages/Cephalometry.tsx` | Multi-select; histórico clicável; sessionStorage; usar Viewer e Tabs; PDF multi-análise |
| `src/contexts/AuthContext.tsx` | Ignorar `SIGNED_IN` redundante e `visibilityState === 'hidden'` |
| Migração SQL | Habilitar CORS no bucket `cephalometric-images`; coluna `analysis_types text[]` (mantém `analysis_type` legado) |

## Fluxo final

```text
1. Marca 1+ análises (Steiner ☑ Jarabak ☑ McNamara ☐ ...)
2. Preenche paciente + upload da telerradiografia
3. Gemini detecta landmarks reais → calcula todas as análises marcadas
4. Viewer mostra a imagem com:
   • zoom/pan
   • linhas+landmarks da análise ativa (tab)
   • toolbar de desenho manual (caneta/régua/borracha)
   • landmarks arrastáveis (recalcula medidas ao soltar)
5. Tabs alternam entre análises sem reanalisar
6. Salvar Caso (todas) / Exportar PDF (todas, multi-página)
7. Histórico: clicar reabre tudo, com imagem, landmarks e medidas
8. Trocar de aba do navegador NÃO refaz nada
```

