

## Plano: Inserir links do Mercado Pago nos botões de checkout

### Alteração

| Arquivo | Mudança |
|---|---|
| `src/pages/Welcome.tsx` | Preencher o objeto `CHECKOUT_LINKS` com os 3 links fornecidos |

### Links

- **Starter**: `https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=5d19f5f7091643bda243eb27a75c7fe8`
- **PRO**: `https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=f8370c98a597452e9d56042701076dfb`
- **Clínica**: `https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=2f220063afa948feafb0b13c53b12147`

### Detalhes

Os links do Mercado Pago são de assinatura recorrente (não diferenciam mensal/anual), então o mesmo link será usado para ambos os ciclos de cada plano. O `handleCheckout` já abre via `window.open` em nova aba.

