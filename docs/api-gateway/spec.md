# Especificação: OdontoVision API Gateway — Integração com Clínicas

## 1. Visão Geral
- **Nome:** OdontoVision API Gateway
- **Objetivo:** Permitir que redes de clínicas integrem seus sistemas ao OdontoVision via API REST + Webhooks, com controle de acesso por plano e monitoramento de uso no painel admin.
- **Público-Alvo:** Admins do OdontoVision + Dev teams das clínicas parceiras

## 2. Requisitos Funcionais

### API Keys
- Admin pode criar API Keys por clínica com nome, plano e limite mensal
- Admin pode revogar (desativar) uma API Key sem deletar
- API Key tem formato `ovpro_live_[32chars]` ou `ovpro_test_[32chars]`
- Cada Key exibe: criado em, último uso, total de chamadas, status

### Endpoint Público `/api/v1/analyze`
- Autenticação via header `x-api-key: ovpro_live_...`
- Aceita POST com: `{ image_base64, image_type, exam_category, patient_name, patient_dob, clinical_context? }`
- Retorna: `{ id, status, analysis, review_score, created_at }`
- Rate limit por plano:
  - Básico: 100 análises/mês, sem webhook
  - Profissional: 500 análises/mês, 1 webhook URL
  - Enterprise: ilimitado, múltiplos webhooks, suporte prioritário

### Webhooks
- Admin cadastra URL de webhook por clínica
- Após análise, OdontoVision faz POST para a URL com o laudo completo
- Payload: `{ event: "analysis.completed", data: { id, patient, analysis, review_score } }`
- Header de segurança: `x-odontovision-signature: sha256(payload + secret)`
- Retry automático: 3 tentativas com backoff exponencial (1m, 5m, 30m)

### Painel Admin — Página API
- Lista de clínicas com API Keys
- Criar nova clínica + gerar Key
- Ver uso mensal por clínica (gráfico)
- Configurar webhook por clínica
- Log de chamadas recentes (últimas 50)

## 3. Regras de Negócio
- API Key Básico: bloqueia após 100 análises/mês → retorna 429 com mensagem
- API Key revogada: retorna 401 imediatamente
- Webhook falhou 3x: desativa automaticamente + alerta no admin
- Clínica sem plano: só pode ter 1 key ativa no modo Básico
- Enterprise: sem limite de análises, SLA de resposta 24h

## 4. Requisitos Não Funcionais
- **Segurança:** API Key nunca exposta no frontend após criação (só exibida uma vez)
- **Performance:** Edge Function < 30s (inclui análise IA)
- **Rastreabilidade:** Todo uso logado em `api_usage` com IP, timestamp, status
- **Idempotência:** Mesmo request com mesmo payload não gera análise duplicada

## 5. Casos Extremos
- Imagem corrompida/inválida → 422 com `{ error: "invalid_image" }`
- API Key válida mas limite excedido → 429 `{ error: "quota_exceeded", reset_at: "..." }`
- Webhook URL inválida ou timeout → marcar como falha + retry
- Payload muito grande (>10MB) → 413 `{ error: "payload_too_large" }`

## 6. Integrações
- Supabase: tabelas `clinics`, `api_keys`, `api_usage`, `webhook_configs`
- Edge Function `api-analyze`: endpoint público autenticado por API Key
- Edge Function `webhook-dispatcher`: dispara webhooks com retry
- Frontend Admin: página `AdminAPI.tsx`

## 7. Critérios de Aceite (BDD)
- Dado que uma clínica tem API Key Profissional, quando envia POST com imagem válida, então recebe laudo JSON completo em < 30s
- Dado que API Key está revogada, quando clínica tenta chamar, então recebe 401
- Dado que clínica Básica usou 100 análises, quando tenta a 101ª, então recebe 429
- Dado que webhook está configurado, quando análise conclui, então clínica recebe POST com laudo em < 5min
- Dado que admin cria API Key, quando Key é gerada, então é exibida UMA VEZ completa e depois mascarada
