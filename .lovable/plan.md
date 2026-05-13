## Governança de Dados — Odontovision Pro

Pacote completo de Data Governance para dados clínicos odontológicos (exames, imagens, IA, cefalometria, casos, suporte, assinaturas), espelhando o padrão IRIS com rigor adicional para LGPD/HIPAA-like clínico.

---

### 1. Modelo de dados (novas tabelas, todas com RLS)

- `data_exports` — `user_id`, `account_id` (nullable), `case_id` (nullable), `requested_by`, `scope` (user|account|case), `status` (pending|processing|completed|failed|expired), `format` (json), `file_url`, `expires_at` (default +7 dias), `completed_at`, `error_message`, `metadata jsonb`, timestamps.
- `audit_logs` — `actor_id`, `actor_role`, `event_type` (enum amplo: exam_upload, ai_analysis, case_view, case_compare, cephalo_run, export_download, case_delete, profile_update, subscription_change, admin_access, support_message, support_close, role_change, policy_change, consent_change, dsr_action), `resource_type`, `resource_id`, `severity` (info|warn|critical), `ip_address`, `user_agent`, `metadata jsonb` (sem conteúdo clínico bruto), `created_at`.
- `data_subject_requests` — `user_id`, `subject_email`, `request_type` (access|rectification|portability|deletion|anonymization|restriction|consent_revocation), `linked_resource_type` (user|case|exam|image|analysis|support), `linked_resource_id`, `status` (open|in_progress|completed|rejected), `priority`, `due_date` (default +15 dias), `assigned_to`, `resolution_notes`, `resolved_at`, timestamps.
- `consents` — `user_id`, `consent_type` (image_upload|ai_processing|clinical_storage|support|product_improvement|communications), `consent_status` (granted|revoked|pending), `consent_source` (signup|profile|banner|api), `consent_given_at`, `consent_revoked_at`, `legal_basis` (consent|contract|legal_obligation|legitimate_interest), `ai_processing_allowed bool`, `clinical_data_processing_allowed bool`, `data_origin` (patient|professional|imported), `privacy_notes`, timestamps.
- `retention_policies` — singleton config (id fixo): `case_retention_days` (default 30 pós-cancelamento), `image_retention_days`, `export_expiration_days` (7), `clinical_access_logging bool`, `export_allowed_roles`, `deletion_allowed_roles`, `ai_clinical_use_allowed bool`, `support_retention_days`, `anonymization_strategy`, `updated_by`, `updated_at`.
- `deletion_queue` — `resource_type`, `resource_id`, `user_id`, `scheduled_for`, `confirmed_by`, `confirmed_at`, `executed_at`, `status` (pending|confirmed|executed|cancelled), `reason`.

RLS: todas com `has_role(auth.uid(),'admin')` para gestão; `data_exports`, `consents`, `data_subject_requests` com leitura própria por `user_id = auth.uid()`. `audit_logs` somente admin (insert via Edge Function service-role).

### 2. Edge Functions (novas, com `verify_jwt=true` + validação de role)

- `governance-export` — gera JSON com profile, subscription, cases (sem binários), cephalometric_analyses, exam_comparisons, case_feedback, chat_conversations, support_chats/messages, consents, audit_logs do titular. Imagens: apenas referências (`storage_path`, `file_name`, `file_type`, `created_at`). Upload do JSON num bucket privado `governance-exports`, signed URL com `expires_at`.
- `governance-audit-log` — endpoint interno chamado pelas demais funções e por hooks do front para registrar eventos.
- `governance-delete` — exclusão/anonimização de caso individual ou conta inteira; remove arquivos do `cephalometric-images` e quaisquer storages clínicos; exige confirmação dupla; registra em `audit_logs`.
- `governance-dsr` — cria/atualiza pedidos de titular, dispara workflow.
- `governance-retention-cron` — diário (pg_cron + pg_net): processa `deletion_queue`, expira exports, anonimiza casos pós-retenção.
- `governance-compliance-report` — agrega métricas e devolve JSON do relatório.

Todas validam sessão, papel admin quando aplicável, e relação `user_id = auth.uid()` para escopos próprios.

### 3. Hooks de auditoria nas funções existentes

Instrumentar `analyze-exam`, `analyze-cephalometry`, `compare-exams`, `visual-analyze`, `odonto-chat`, `manage-user`, `create-checkout`, `customer-portal`, `verify-session` para chamar `governance-audit-log` (event_type apropriado, sem payload clínico).

### 4. Frontend — nova área `/admin/governance`

Rota protegida por `useAdminRole`. Layout com `Tabs` no padrão existente (shadcn). Abas:

1. **Visão geral** — cards reais via queries: última export (`data_exports`), DSRs abertos, exclusões pendentes (`deletion_queue`), eventos críticos 30d (`audit_logs` severity=critical), política atual, assinatura ativa do admin, contagens (`cases`, `cephalometric_analyses`, `chat_conversations`, `support_chats`, admins via `user_roles`), score de risco calculado.
2. **Exportações** — formulário com escopo (user/account/case), seletor de usuário/caso, botão "Exportar JSON", lista histórica com download (signed URL), status, expiração.
3. **Auditoria** — tabela paginada filtrável por event_type, ator, severity, período; export CSV/JSON.
4. **Retenção & Exclusão** — visualizar policy, agendar exclusão de caso/conta, fila com dupla confirmação (modal `AlertDialog`), aviso explícito sobre imagens.
5. **Conformidade** — geração on-demand do relatório (RLS coverage, exports recentes, retenção, casos, imagens, IA, suporte, admins, eventos críticos, riscos), botão export JSON.
6. **Pedidos dos titulares** — CRUD de DSRs, atribuição, prazo, status, vínculo a recurso.
7. **Consentimentos** — visualização agregada e por usuário; toggles para revogar/registrar; histórico.
8. **Políticas** — formulário do `retention_policies` singleton (admin only), com auditoria de alterações.

Componentes reutilizando `Card`, `Tabs`, `Table`, `Dialog`, `Form`, `Input`, `Badge`. Sem dados fictícios — somente queries reais; estados vazios explícitos.

Adicionar item "Governança" no `AdminLayout` nav (ícone `Shield`).

### 5. Storage

Criar bucket privado `governance-exports` com RLS: leitura via signed URL apenas; escrita só pela service role das Edge Functions.

### 6. Cron

Job `governance-retention-daily` via `pg_cron` + `pg_net` chamando `governance-retention-cron` (diário 03:00 UTC).

### 7. Consentimento no fluxo do usuário

Adicionar checkbox de consentimento clínico no `Register.tsx` e ao primeiro upload em `Upload.tsx` (grava em `consents`). Banner no `Profile.tsx` para gerenciar.

### 8. Relatório técnico final

Documento entregue na aba Conformidade + markdown em `docs/GOVERNANCE.md` listando: tabelas, RLS, Edge Functions, rotas, permissões, eventos auditados, fluxos (export, exclusão, DSR, retenção), riscos remanescentes (ex.: imagens em PDFs gerados, cache de IA externa, logs de provedor).

---

### Detalhes técnicos

- Linguagem PT-BR em toda UI, design tokens existentes (Navy/Teal/Gold).
- Validação Zod em todos os endpoints.
- `audit_logs.metadata` nunca contém texto clínico — apenas IDs, tipos, contagens.
- Exports: JSON gzipped, máx 50MB; se exceder, particionar.
- Anonimização: substitui nome/CPF/email do paciente por hash, mantém estrutura para estatística.
- Exclusão de imagens: 2-step (schedule → confirm) com janela de 24h.
- Tudo respeita `has_role` para evitar privilege escalation; nenhuma role em `profiles`.

### Ordem de execução

1. Migração SQL (tabelas, RLS, bucket, policy singleton seed).
2. Edge Functions + config.toml.
3. Cron job (via insert tool, não migration).
4. Frontend admin/governance + nav.
5. Hooks de auditoria nas funções existentes.
6. Consentimento no signup/upload.
7. `docs/GOVERNANCE.md` + verificação.
