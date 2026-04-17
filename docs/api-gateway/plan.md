# Plano Técnico: OdontoVision API Gateway

## Arquitetura

### Banco de Dados — Novas tabelas

```sql
-- Clínicas parceiras
clinics: id, name, email, phone, plan (basic|professional|enterprise), active, created_at

-- API Keys
api_keys: id, clinic_id, name, key_hash (SHA256), key_preview (ovpro_live_xxxx...xxxx),
          plan, monthly_limit, usage_count, usage_reset_at, active, last_used_at, created_at

-- Log de uso
api_usage: id, api_key_id, clinic_id, endpoint, status_code, exam_category,
           processing_ms, ip_address, created_at

-- Configurações de webhook
webhook_configs: id, clinic_id, url, secret_hash, active, failure_count,
                 last_triggered_at, last_status, created_at
```

### Edge Functions

**`api-analyze` (NOVA — endpoint público)**
- Método: POST
- Auth: header `x-api-key`
- Fluxo:
  1. Valida API Key (hash comparison)
  2. Verifica quota do plano
  3. Chama lógica de análise (reutiliza buildSystemPrompt)
  4. Salva em `cases` com clinic_id
  5. Registra em `api_usage`
  6. Dispara webhook se configurado (async, não bloqueia resposta)
  7. Retorna laudo JSON

**`webhook-dispatcher` (NOVA — worker de webhooks)**
- Triggered by: pg_net / cron ou chamada direta
- Fluxo:
  1. Busca webhooks pendentes
  2. Faz POST para URL da clínica
  3. Assina payload com HMAC SHA256
  4. Retry com backoff se falhar
  5. Desativa após 3 falhas

### Frontend Admin — Nova página

**`AdminAPI.tsx`**
- Tab 1: Clínicas — lista, criar, editar plano
- Tab 2: API Keys — listar por clínica, criar (exibe key completa 1x), revogar
- Tab 3: Webhooks — URL, secret, status, histórico
- Tab 4: Uso — gráfico mensal por clínica, log de chamadas

### Rota no App.tsx
`/admin/api` → `AdminAPI`

### Nav item no AdminLayout
`{ icon: Code2, label: "API & Integrações", path: "/admin/api" }`

## Fluxo de Implementação
1. Migration SQL (clinics, api_keys, api_usage, webhook_configs)
2. Edge Function api-analyze
3. Edge Function webhook-dispatcher
4. AdminAPI.tsx — página completa
5. Registrar rota + nav item
