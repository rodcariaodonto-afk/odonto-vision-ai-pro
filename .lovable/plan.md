

## Plano: Páginas de Política de Privacidade e Termos de Uso

### Resumo

Criar duas páginas completas (`/privacy` e `/terms`) com conteúdo jurídico profissional, header/footer consistentes com a landing page, layout otimizado para leitura com índice lateral sticky em desktop.

### Arquivos

| Arquivo | Ação |
|---|---|
| `src/pages/PrivacyPolicy.tsx` | Criar |
| `src/pages/TermsOfUse.tsx` | Criar |
| `src/App.tsx` | Adicionar rotas `/privacy` e `/terms` |
| `src/pages/Welcome.tsx` | Atualizar links do footer (Termos de Uso e Política de Privacidade) para usar `navigate` |

### Design

- Header fixo com logo + botão "Voltar para Início"
- Layout: conteúdo centralizado `max-w-4xl` com índice lateral sticky (`hidden lg:block`) à esquerda para navegação por âncoras
- Mesmo footer da Welcome page (extraído inline, mesmo padrão visual)
- Paleta Navy/Teal/Gold consistente
- Títulos H1/H2 com numeração de cláusulas nos Termos
- Responsivo: índice lateral some em mobile, aparece link "Voltar ao topo"

### Conteúdo

**Política de Privacidade** — 8 seções: Introdução, Dados Coletados (nome/email/telefone), Finalidade, Compartilhamento com terceiros (APIs), Retenção (1 ano), Cookies e Analytics, Conformidade LGPD, Contato (privacidade@odontovisionpro.com.br).

**Termos de Uso** — 9 cláusulas numeradas: Aceitação, Descrição do Serviço (SaaS de IA), Aviso sobre Saúde (ferramenta de suporte, responsabilidade do dentista), Uso Aceitável, Propriedade Intelectual, Limitação de Responsabilidade, Integrações de Terceiros, Modificações, Foro (Brasil).

### Rotas

- `/privacy` — público, sem wrapper `PublicRoute`
- `/terms` — público, sem wrapper `PublicRoute`

