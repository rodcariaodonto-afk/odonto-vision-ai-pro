

## Plano: Adicionar/Excluir Usuários pelo Admin

### Contexto

O admin precisa de dois recursos na tela de Gestão de Usuários:
1. **Botao "Adicionar Usuário"** - cria um usuário com acesso ativo (sem pagamento), usando a mesma lógica do `create-test-user` mas com acesso permanente (sem expiração de 7 dias)
2. **Botao "Excluir Usuário"** - remove o usuário completamente do sistema

### Mudanças Necessárias

#### 1. Nova Edge Function: `manage-user/index.ts`

Função que suporta duas ações:
- **create**: Cria usuário no Auth (email auto-confirmado), insere no `profiles`, e insere no `test_users` com `expires_at` muito distante (ex: 100 anos) e `analyses_limit: 9999` para acesso ilimitado
- **delete**: Remove o usuário do Auth (via `admin.deleteUser`), do `profiles`, do `test_users`, e do `cases`

Ambas ações verificam se o chamador é admin via `has_role`.

#### 2. Modificar `check-subscription/index.ts`

Nenhuma mudança necessária - o sistema já reconhece usuários na tabela `test_users` com `is_active: true` e `expires_at` no futuro. Basta inserir com data de expiração distante.

#### 3. Modificar `AdminUsers.tsx`

- **Botão "Adicionar Usuário"** no topo da página (ao lado do título)
- **Dialog de criação** com campos: Nome, Email, Senha
- **Botão "Excluir"** no dialog de detalhes do usuário (substituir o "Suspender" atual)
- **Confirmação** antes de excluir (AlertDialog)
- Recarregar lista após criar/excluir

### Arquivos

| Arquivo | Ação |
|---------|------|
| `supabase/functions/manage-user/index.ts` | Criar (nova edge function) |
| `src/pages/admin/AdminUsers.tsx` | Modificar (adicionar dialogs e ações) |
| `supabase/config.toml` | Adicionar config da nova function (verify_jwt = false) |

### Fluxo

```text
Admin clica "Adicionar Usuário"
  → Preenche nome, email, senha
  → Edge function cria no Auth + profiles + test_users (sem expiração)
  → Usuário aparece na lista e pode logar imediatamente

Admin clica "Excluir Usuário"
  → Confirma exclusão
  → Edge function remove de Auth + profiles + test_users + cases
  → Usuário desaparece da lista
```

