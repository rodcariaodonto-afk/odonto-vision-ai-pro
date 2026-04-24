import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Building2, Zap, Star, Users, Loader2, ArrowLeft, Activity } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";

interface Plan {
  id: string;
  checkoutUrl: string;
  name: string;
  subtitle: string;
  price: string;
  period?: string;
  features: string[];
  highlighted?: boolean;
  badge?: string;
  icon: React.ReactNode;
  buttonText: string;
  buttonVariant: "default" | "hero" | "success" | "outline" | "secondary";
}

const plans: Plan[] = [
  {
    id: "exames_20",
    checkoutUrl: "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=440af965aa70426c927b5acc09778c0a",
    name: "20 Exames",
    subtitle: "Ideal para uso inicial",
    price: "R$ 99",
    period: "/mês",
    features: [
      "20 exames por mês",
      "Radiografias com IA",
      "Laudo em PDF",
      "Chat com IA",
      "Sem Tomografia",
    ],
    icon: <Zap className="w-6 h-6" />,
    buttonText: "Assinar Agora",
    buttonVariant: "outline",
  },
  {
    id: "exames_50",
    checkoutUrl: "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=42bb7d2c558f415fbb5a7308e63acf9c",
    name: "50 Exames",
    subtitle: "RX + Tomografia + Cefalometria",
    price: "R$ 230",
    period: "/mês",
    features: [
      "50 exames por mês",
      "RX + Tomografia",
      "Cefalometria liberada",
      "Laudo em PDF",
      "Chat com IA",
      "Histórico completo",
    ],
    icon: <Activity className="w-6 h-6" />,
    buttonText: "Assinar Agora",
    buttonVariant: "default",
  },
  {
    id: "exames_100",
    checkoutUrl: "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=38bb7f5006d84603b0fbefdba169f0e2",
    name: "100 Exames",
    subtitle: "Plano principal para rotina clínica",
    price: "R$ 350",
    period: "/mês",
    features: [
      "100 exames por mês",
      "RX + Tomografia",
      "Cefalometria liberada",
      "Laudo Médico-Legal",
      "Chat com IA",
      "Suporte por e-mail",
    ],
    highlighted: true,
    badge: "Mais Popular",
    icon: <Star className="w-6 h-6" />,
    buttonText: "Assinar Agora",
    buttonVariant: "hero",
  },
  {
    id: "exames_200",
    checkoutUrl: "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=8040502c12bd4f0291c32b683c1fa6a5",
    name: "200 Exames",
    subtitle: "Para alto volume individual",
    price: "R$ 430",
    period: "/mês",
    features: [
      "200 exames por mês",
      "RX + Tomografia",
      "Cefalometria liberada",
      "Laudos em PDF",
      "Chat com IA",
      "Prioridade de suporte",
    ],
    icon: <Users className="w-6 h-6" />,
    buttonText: "Assinar Agora",
    buttonVariant: "default",
  },
  {
    id: "clinica",
    checkoutUrl: "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=d9d4c76b91674c3085d150f0eafdf1f1",
    name: "Clínica",
    subtitle: "Para clínicas e equipes",
    price: "R$ 897",
    period: "/mês",
    features: [
      "Plano para clínicas",
      "RX + Tomografia",
      "Cefalometria liberada",
      "Equipes e múltiplos fluxos",
      "Dashboard gerencial",
      "Treinamento da equipe",
    ],
    icon: <Building2 className="w-6 h-6" />,
    buttonText: "Assinar Agora",
    buttonVariant: "secondary",
  },
];

export default function Plans() {
  const [showEnterprise, setShowEnterprise] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    clinicName: "",
    cnpj: "",
    dentists: "",
    phone: "",
    email: "",
  });

  const handlePlanClick = (plan: Plan) => {
    window.open(plan.checkoutUrl, "_blank");
    toast.success("Abrindo página de assinatura...");
  };

  const handleEnterpriseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setShowEnterprise(false);
    toast.success("Solicitação enviada! Nossa equipe entrará em contato em até 24h.");
    setFormData({ clinicName: "", cnpj: "", dentists: "", phone: "", email: "" });
  };

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <header className="p-4 flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <Logo size="md" />
        <div className="w-24" /> {/* Spacer for centering */}
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Escolha seu Plano</h1>
          <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
            Selecione o plano ideal para começar a usar o OdontoVision AI Pro.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={cn(
                "relative flex flex-col transition-all duration-300",
                plan.highlighted && "ring-2 ring-primary shadow-glow scale-105"
              )}
            >
              {plan.badge && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gradient-primary text-primary-foreground px-4">
                  <Sparkles className="w-3 h-3 mr-1" />
                  {plan.badge}
                </Badge>
              )}

              <CardHeader className="text-center pb-4">
                <div
                  className={cn(
                    "mx-auto p-3 rounded-xl mb-3",
                    plan.highlighted ? "gradient-primary text-primary-foreground" : "bg-muted text-primary"
                  )}
                >
                  {plan.icon}
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.subtitle}</CardDescription>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col">
                <div className="text-center mb-6">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  {plan.period && (
                    <span className="text-muted-foreground">{plan.period}</span>
                  )}
                  {plan.installments && (
                    <p className="text-sm text-primary mt-1 font-medium">
                      <CreditCard className="w-3 h-3 inline mr-1" />
                      {plan.installments}
                    </p>
                  )}
                </div>

                <ul className="space-y-3 flex-1">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className={cn("w-5 h-5 flex-shrink-0", plan.highlighted ? "text-primary" : "text-success")} />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.buttonVariant}
                  size="lg"
                  className="w-full mt-6"
                  onClick={() => handlePlanClick(plan)}
                  disabled={loadingPlan === plan.id}
                >
                  {loadingPlan === plan.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    plan.buttonText
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ or Trust Signals */}
        <Card className="bg-muted/50">
          <CardContent className="py-8">
            <div className="text-center max-w-2xl mx-auto">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Garantia de Satisfação
              </h3>
              <p className="text-muted-foreground">
                Todos os planos incluem 7 dias de garantia. Se não ficar satisfeito, devolvemos seu dinheiro sem perguntas.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Login link for existing users */}
        <div className="text-center">
          <p className="text-muted-foreground">
            Já tem uma conta?{" "}
            <Button variant="link" className="p-0 h-auto text-primary" onClick={() => navigate("/login")}>
              Faça login aqui
            </Button>
          </p>
        </div>

        {/* Enterprise Contact Dialog */}
        <Dialog open={showEnterprise} onOpenChange={setShowEnterprise}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Contato Enterprise
              </DialogTitle>
              <DialogDescription>
                Preencha os dados abaixo e nossa equipe entrará em contato em até 24h.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleEnterpriseSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome da Clínica</label>
                <Input
                  placeholder="Clínica Odontológica ABC"
                  value={formData.clinicName}
                  onChange={(e) => setFormData({ ...formData, clinicName: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">CNPJ</label>
                <Input
                  placeholder="00.000.000/0000-00"
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Número de Dentistas</label>
                <Input
                  type="number"
                  placeholder="Ex: 5"
                  value={formData.dentists}
                  onChange={(e) => setFormData({ ...formData, dentists: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Telefone</label>
                <Input
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">E-mail</label>
                <Input
                  type="email"
                  placeholder="contato@clinica.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <Button
                type="submit"
                variant="hero"
                size="lg"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4" />
                    Solicitar Contato
                  </>
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
