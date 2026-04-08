

## Plano: Landing Page de Alta Conversão para OdontoVision PRO

### Resumo

Redesenhar completamente a página Welcome.tsx como uma landing page one-page profissional com as 6 seções solicitadas, usando a nova paleta de cores (Navy/Teal/Gold) e a logo enviada.

### Importante: O que NÃO será alterado

O projeto já possui banco de dados, autenticação, edge functions e planos funcionando. A landing page será apenas a vitrine — os botões de CTA direcionarão para as rotas existentes (`/login`, `/plans`, `/register`). Não serão criadas novas tabelas nem edge functions, pois tudo já existe.

Os planos exibidos na landing page (Starter/Pro/Clínica) serão apenas visuais/informativos nesta página. A lógica real de assinatura continua na página `/plans` existente.

### Mudanças

| Arquivo | Ação |
|---|---|
| `src/assets/logo-odontovision-pro.jpeg` | Copiar logo enviada pelo usuário |
| `src/pages/Welcome.tsx` | Reescrever completamente com as 6 seções |
| `src/index.css` | Adicionar variáveis CSS para Navy/Teal/Gold da landing page |

### Estrutura da Nova Landing Page (Welcome.tsx)

1. **Header** — Nav fixa com logo, links âncora (scroll suave), botões "Entrar" (ghost) e "Teste Grátis" (Teal solid)

2. **Hero** — Headline + subheadline conforme especificado, dois CTAs, mockup visual da plataforma (ilustração CSS/SVG de um raio-x com marcações de IA)

3. **Diferenciais** — Grid 3 colunas com cards glassmorphism: 3 Modalidades, Precisão Científica, Laudo Médico-Legal

4. **Como Funciona** — 4 passos com ícones numerados e linha conectora visual

5. **Planos** — 3 colunas (Starter R$147, Pro R$297 destacado, Clínica R$897) com toggle Mensal/Anual. Botão "Assinar Agora" redireciona para `/plans`

6. **Footer** — Logo, links, copyright 2026

### Detalhes Técnicos

- Paleta aplicada via classes Tailwind inline (não altera o design system global do app)
- Fonte Inter já importada no projeto
- Animações com Tailwind (fade-in, slide-up) para scroll
- Seções com `id` para navegação âncora
- Responsivo mobile-first com breakpoints sm/md/lg
- Bordas arredondadas, sombras suaves, glassmorphism leve nos cards

