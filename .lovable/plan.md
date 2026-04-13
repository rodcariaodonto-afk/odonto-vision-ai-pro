

## Plano: Checkout direto da Landing Page via Mercado Pago

### Resumo
Remover o redirecionamento para `/plans` e fazer os botões "Assinar Agora" da landing page abrirem diretamente os links de checkout do Mercado Pago.

### O que muda

| Arquivo | Alteração |
|---|---|
| `src/pages/Welcome.tsx` | Substituir `navigate("/plans")` nos botões de pricing por `window.open(mercadoPagoLink, "_blank")` com o link correspondente a cada plano |
| `src/pages/Welcome.tsx` | Atualizar os botões "Assinar Agora" do header, hero e CTA final para apontar para o plano PRO (mais popular) ou scroll para a seção de pricing |

### Detalhes

1. Criar um mapa de links no topo do componente:
```text
CHECKOUT_LINKS = {
  starter: "link_mercado_pago_starter",
  pro:     "link_mercado_pago_pro",
  clinica: "link_mercado_pago_clinica",
}
```

2. Cada `PricingCard` receberá o link direto ao invés de `navigate("/plans")`

3. Os botões genéricos "Assinar Agora" (header, hero, CTA final) farão scroll para a seção `#pricing` ao invés de navegar para `/plans`

4. URL de retorno pós-pagamento: `https://odonto-vision-ai-pro.lovable.app/payment-success`

### Aguardando
Os 3 links de checkout do Mercado Pago para implementar.

