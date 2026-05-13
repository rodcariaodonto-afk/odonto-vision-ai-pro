# Governança de Dados — Odontovision Pro

Pacote completo de Data Governance para dados clínicos odontológicos. Espelha o padrão IRIS com rigor adicional para LGPD aplicada a saúde.

## Tabelas (todas com RLS)

| Tabela | Função | RLS resumida |
|---|---|---|
| `data_exports` | Histórico de exportações JSON | Usuário vê próprias; admin gerencia |
| `audit_logs` | Eventos sensíveis | Admin lê; insert via service-role |
| `data_subject_requests` | Pedidos LGPD (acesso, deleção, etc.) | Usuário vê próprios; admin gerencia |
| `consents` | Consentimentos clínicos com base legal | Usuário gerencia próprios; admin lê |
| `retention_policies` | Singleton de políticas | Authenticated lê; admin escreve |
| `deletion_queue` | Fila de exclusão com dupla confirmação | Admin gerencia; usuário vê próprias |

Bucket privado: **`governance-exports`** (SELECT só admin via signed URL).

## Edge Functions

| Função | JWT | Função |
|---|---|---|
| `governance-export` | sim | Gera JSON do titular (sem binários) e devolve signed URL |
| `governance-audit-log` | sim | Endpoint genérico para registrar eventos |
| `governance-delete` | sim | `schedule` / `confirm` / `cancel` exclusões |
| `governance-compliance-report` | sim | Relatório agregado de conformidade |
| `governance-retention-cron` | não | Job diário: expira exportações, executa exclusões confirmadas |

Todas validam sessão via `getUser` e papel admin via `user_roles`.

## Frontend

Rota `/admin/governance` com 8 abas (Visão geral · Exportações · Auditoria · Retenção · Conformidade · Titulares · Consentimentos · Políticas).

## Eventos auditados (severity)

- `export_download` (warn)
- `deletion_scheduled` (warn) · `deletion_executed` (critical) · `deletion_cancelled` (info)
- `consent_change` (info) · `policy_change` (warn) · `role_change` (critical)
- `exam_upload` · `ai_analysis` · `case_view` · `case_compare` · `cephalo_run`
- `support_message` · `support_close` · `subscription_change` · `admin_access`

`audit_logs.metadata` nunca contém texto clínico — apenas IDs, contagens e tipos.

## Fluxos

1. **Exportação:** admin escolhe escopo (user/account/case) → `governance-export` agrega dados sem binários, sobe JSON em `governance-exports`, gera signed URL com expiração configurável.
2. **Exclusão:** admin agenda → janela de 24h → confirmação dupla via modal → `governance-delete` remove arquivos do storage + linhas das tabelas → log crítico.
3. **DSR:** pedido criado → status workflow (open → in_progress → completed/rejected) → prazo padrão 15 dias.
4. **Retenção:** cron diário expira exports vencidos e executa exclusões confirmadas.

## Riscos remanescentes

- **Imagens em PDFs gerados pelo cliente** ficam no dispositivo do usuário; não controlados pelo backend.
- **Cache de provedor de IA externo (OpenAI/Gemini):** dados enviados podem permanecer em logs do provedor conforme política dele. Mitigar via toggle `ai_clinical_use_allowed`.
- **Logs de provedores (Supabase, MercadoPago):** fora do escopo deste pacote.
- **Backups automáticos** do banco contêm dados clínicos por padrão; coordenar política de purge com infra.
- **Bucket `cephalometric-images`** continua público — recomenda-se torná-lo privado em iteração futura.

## Próximas melhorias sugeridas

- Hook automatizado de auditoria nas Edge Functions clínicas existentes (`analyze-exam`, `visual-analyze`, `analyze-cephalometry`, `compare-exams`, `odonto-chat`).
- Banner de consentimento no fluxo de upload e tela de gerenciamento no perfil.
- Cron job (`pg_cron` + `pg_net`) chamando `governance-retention-cron` diariamente às 03:00 UTC.
- Tornar `cephalometric-images` privado e usar signed URLs.