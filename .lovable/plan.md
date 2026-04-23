

# Sistema de Análises Cefalométricas com Seletor

Vou expandir a página de Cefalometria atual para suportar **6 tipos de análises** (Steiner, Jarabak, McNamara, Ricketts, Tweed, Downs), com seleção prévia ao upload, cálculo de medidas específicas por análise, linhas desenhadas na imagem, tabela de status (Normal/Aumentado/Reduzido) e PDF dinâmico.

## O que será entregue

1. **Seletor de tipo de análise** — cards visuais com nome, autor, ano e descrição das 6 análises antes do upload.
2. **Medidas dinâmicas** — cada análise calcula apenas suas próprias medidas (ex: Steiner = SNA/SNB/ANB/SN-GoGn/FMA/U1-NA/L1-NB/IMPA; Jarabak = LAFH/TAFH/proporção; McNamara = Co-A/Co-Gn/A-Nperp/Pog-Nperp; etc.).
3. **Visualizador com linhas** — canvas desenha automaticamente as linhas de referência da análise escolhida (SN, NA, NB, FH, GoGn, N-Pog, etc.) sobre a radiografia, com rótulos coloridos e valores.
4. **Tabela de resultados** — cada medida mostra valor encontrado, faixa de referência, e badge de status (Normal/Aumentado/Reduzido) com cores.
5. **PDF dinâmico** — laudo com cabeçalho, dados do paciente, imagem com linhas desenhadas, tabela completa da análise específica, interpretação clínica e disclaimer.
6. **Salvar Caso** e **Histórico** continuam funcionando, agora gravando o `analysis_type` usado.

## Arquitetura técnica

### Novo arquivo: `src/types/cephalometric-analyses.ts`
Define `AnalysisType` (`steiner | jarabak | mcnamara | ricketts | tweed | downs`), `CephalometricMeasure` (key, name, unit, min, normal, max, description), `CephalometricLine` (point1, point2, color, type) e exporta as 6 constantes `STEINER_ANALYSIS`, `JARABAK_ANALYSIS`, `MCNAMARA_ANALYSIS`, `RICKETTS_ANALYSIS`, `TWEED_ANALYSIS`, `DOWNS_ANALYSIS` mais um mapa `ANALYSES_BY_ID`.

### Edge Function: `supabase/functions/analyze-cephalometry/index.ts`
- Aceita novo parâmetro `analysisType` no body.
- Função `calculateMeasurementsByAnalysis(landmarks, analysisType)` substitui o `calculateMeasurements` atual e retorna apenas as medidas pertinentes àquela análise (mantendo os helpers `angle()`/`distance()`).
- Adiciona suporte a landmark **Condílio** (Co) para McNamara/Ricketts.
- `generateInterpretation(measurements, analysisType, patientName)` ajustada para interpretar medidas específicas.
- Persiste `analysis_type` na tabela.

### Migração DB
Adicionar coluna `analysis_type TEXT NOT NULL DEFAULT 'steiner'` em `cephalometric_analyses` para armazenar qual análise foi feita.

### Página `src/pages/Cephalometry.tsx` (refatorada)
- Novo state `selectedAnalysis: AnalysisType` (default `steiner`).
- Bloco "Selecione o tipo de análise" com 6 cards clicáveis acima do formulário do paciente.
- Card de info da análise selecionada (nome, autor, ano, descrição, lista de medidas).
- Botão de análise muda dinamicamente: `Analisar com {nomeDaAnálise}`.
- `drawLandmarks()` substituído por `drawAnalysisOverlay()` que percorre `currentAnalysis.lines`, encontra os landmarks por nome, traça a linha colorida com `ctx.stroke()` e escreve o nome+valor.
- Tabela de resultados itera sobre `currentAnalysis.measures` e mostra: medida, valor, normal, status (badge verde/amber/red).
- `handleSaveToCases` inclui `analysis_type` nos dados gravados.
- `handleExportPDF` usa `currentAnalysis.measures` para montar a tabela do PDF com status colorido por linha; título do PDF inclui o nome da análise.

### Histórico
- Lista mostra também o tipo de análise (badge ao lado do nome do paciente).
- Ao reabrir um item, restaura `selectedAnalysis` salvo.

## Fluxo do usuário

```text
1. Seleciona tipo de análise (Steiner/Jarabak/McNamara/Ricketts/Tweed/Downs)
2. Preenche dados do paciente
3. Faz upload da telerradiografia
4. Clica "Analisar com {Análise}"
5. Edge function detecta 19 landmarks (HRNet) → calcula medidas específicas
6. Canvas desenha linhas + valores sobre a imagem
7. Tabela mostra cada medida com status colorido
8. Usuário pode: Salvar Caso / Exportar PDF dinâmico
```

## Compatibilidade
- Análises antigas (sem `analysis_type`) caem no default `steiner` via DEFAULT da coluna.
- Plano `plano_20` continua sem acesso a Tomografia; cefalometria permanece habilitada para todos os planos pagos como hoje.

