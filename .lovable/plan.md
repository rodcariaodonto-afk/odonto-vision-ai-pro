

## Plano: Tornar Dr. Ricardo Bahls Admin

### O que será feito

Duas ações para dar ao Dr. Ricardo Bahls (servmaisdigital@gmail.com) os mesmos acessos de administrador:

1. **Inserir role admin** na tabela `user_roles` para o user_id `2bace43c-1a26-4320-be43-be687763c068`
2. **Atualizar `check-subscription/index.ts`** para incluir o email dele na lista de admins com acesso ilimitado (sem necessidade de pagamento), junto com o email existente `rodcaria.odonto@gmail.com`

### Arquivos

| Arquivo | Ação |
|---|---|
| Tabela `user_roles` | Inserir registro com role `admin` |
| `supabase/functions/check-subscription/index.ts` | Alterar verificação de admin para aceitar ambos os emails |

### Resultado

Dr. Ricardo Bahls poderá acessar o painel admin completo, gerenciar usuários, ver todos os casos, e terá análises ilimitadas sem necessidade de assinatura.

