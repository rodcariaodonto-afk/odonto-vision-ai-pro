import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logoImage from "@/assets/logo-odontovision-pro.jpeg";
import {
  ArrowRight,
  Sparkles,
  Shield,
  Zap,
  Upload,
  Brain,
  FileCheck,
  FileText,
  Check,
  Menu,
  X,
  Star,
  Users,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

// 🔗 Links de assinatura recorrente do Mercado Pago — 5 planos
const CHECKOUT_LINKS: Record<string, string> = {
  exames_20:  "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=440af965aa70426c927b5acc09778c0a",
  exames_50:  "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=42bb7d2c558f415fbb5a7308e63acf9c",
  exames_100: "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=38bb7f5006d84603b0fbefdba169f0e2",
  exames_200: "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=8040502c12bd4f0291c32b683c1fa6a5",
  clinica:    "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=d9d4c76b91674c3085d150f0eafdf1f1",
};

export default function Welcome() {
  const navigate = useNavigate();
  const [mobileMenu, setMobileMenu] = useState(false);

  const scrollTo = (id: string) => {
    setMobileMenu(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const handleCheckout = (plan: string) => {
    const link = CHECKOUT_LINKS[plan];
    if (link) {
      window.open(link, "_blank");
    } else {
      scrollTo("pricing");
    }
  };

  return (
    <div className="min-h-screen bg-white text-[hsl(210,20%,15%)] font-sans">
      {/* ─── HEADER ─── */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <img src={logoImage} alt="OdontoVision PRO" className="h-10 object-contain" />

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <button onClick={() => scrollTo("features")} className="hover:text-[hsl(var(--landing-navy))] transition-colors">Diferenciais</button>
            <button onClick={() => scrollTo("how")} className="hover:text-[hsl(var(--landing-navy))] transition-colors">Como Funciona</button>
            <button onClick={() => scrollTo("pricing")} className="hover:text-[hsl(var(--landing-navy))] transition-colors">Planos</button>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" className="text-[hsl(var(--landing-navy))]" onClick={() => navigate("/login")}>
              Entrar
            </Button>
            <Button
              className="bg-[hsl(var(--landing-teal))] hover:bg-[hsl(186,85%,24%)] text-white shadow-md"
              onClick={() => scrollTo("pricing")}
            >
              Assinar Agora
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden p-2" onClick={() => setMobileMenu(!mobileMenu)}>
            {mobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenu && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3 animate-fade-in">
            <button onClick={() => scrollTo("features")} className="block w-full text-left py-2 text-gray-700">Diferenciais</button>
            <button onClick={() => scrollTo("how")} className="block w-full text-left py-2 text-gray-700">Como Funciona</button>
            <button onClick={() => scrollTo("pricing")} className="block w-full text-left py-2 text-gray-700">Planos</button>
            <hr className="border-gray-100" />
            <Button variant="ghost" className="w-full justify-start" onClick={() => { setMobileMenu(false); navigate("/login"); }}>Entrar</Button>
            <Button className="w-full bg-[hsl(var(--landing-teal))] text-white" onClick={() => { setMobileMenu(false); scrollTo("pricing"); }}>Assinar Agora</Button>
          </div>
        )}
      </header>

      {/* ─── HERO ─── */}
      <section className="relative pt-28 pb-20 md:pt-36 md:pb-28 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(210,70%,18%)] via-[hsl(210,60%,22%)] to-[hsl(186,60%,20%)]" />
        {/* Decorative circles */}
        <div className="absolute top-20 -left-20 w-80 h-80 bg-[hsl(var(--landing-teal))] rounded-full opacity-10 blur-3xl" />
        <div className="absolute bottom-10 -right-20 w-96 h-96 bg-[hsl(var(--landing-gold))] rounded-full opacity-10 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Text */}
            <div className="text-white animate-slide-up">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm mb-6">
                <Sparkles className="w-4 h-4 text-[hsl(var(--landing-gold))]" />
                Inteligência Artificial Odontológica
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-6">
                O copiloto de IA que transforma imagens em{" "}
                <span className="text-[hsl(var(--landing-teal))]">diagnósticos precisos</span>{" "}
                em segundos.
              </h1>

              <p className="text-lg text-white/80 mb-8 max-w-lg">
                Veja mais. Diagnostique melhor. A única plataforma no Brasil que analisa Raio-X,
                Tomografia e Exames Clínicos com inteligência artificial.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  size="xl"
                  className="bg-[hsl(var(--landing-teal))] hover:bg-[hsl(186,85%,24%)] text-white shadow-lg hover:shadow-xl"
                  onClick={() => scrollTo("pricing")}
                >
                  Assinar Agora
                  <ArrowRight className="w-5 h-5 ml-1" />
                </Button>
              </div>
            </div>

            {/* Mockup visual */}
            <div className="hidden md:block animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 shadow-2xl">
                {/* Mock header */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <span className="ml-3 text-sm text-white/60">OdontoVision PRO — Análise</span>
                </div>

                {/* Mock scan area */}
                <div className="bg-[hsl(210,70%,12%)] rounded-lg p-4 mb-4">
                  <div className="aspect-[4/3] rounded-md bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative overflow-hidden">
                    {/* Faux x-ray lines */}
                    <div className="absolute inset-0 opacity-20">
                      <div className="absolute top-1/4 left-1/4 w-24 h-32 border-2 border-[hsl(var(--landing-teal))] rounded-lg" />
                      <div className="absolute top-1/3 right-1/4 w-16 h-20 border-2 border-[hsl(var(--landing-gold))] rounded-lg" />
                      <div className="absolute bottom-1/4 left-1/3 w-20 h-16 border-2 border-red-400 rounded-lg" />
                    </div>
                    {/* Scanning line */}
                    <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[hsl(var(--landing-teal))] to-transparent top-1/2 animate-pulse-soft" />
                    <Brain className="w-12 h-12 text-[hsl(var(--landing-teal))] opacity-60" />
                  </div>
                </div>

                {/* Mock findings */}
                <div className="space-y-2">
                  {["Cárie oclusal detectada — Dente 36", "Lesão periapical — Dente 46", "Reabsorção óssea leve — Região posterior"].map((finding, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-white/80 bg-white/5 rounded-md px-3 py-2">
                      <Check className="w-4 h-4 text-[hsl(var(--landing-teal))] shrink-0" />
                      {finding}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── DIFERENCIAIS ─── */}
      <section id="features" className="py-20 md:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-[hsl(var(--landing-navy))] mb-3">
              Por que escolher o OdontoVision PRO?
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Tecnologia de ponta aliada à precisão clínica para elevar o nível dos seus diagnósticos.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Sparkles className="w-7 h-7" />}
              title="3 Modalidades Exclusivas"
              description="Análise de Raio-X, Tomografia e Exames Clínicos numa só plataforma — nenhum concorrente oferece isso."
              accent="teal"
            />
            <FeatureCard
              icon={<Shield className="w-7 h-7" />}
              title="Precisão Científica"
              description="Reduz erros diagnósticos e acelera laudos com IA treinada por radiologistas especialistas."
              accent="navy"
            />
            <FeatureCard
              icon={<FileText className="w-7 h-7" />}
              title="Laudo Médico-Legal Completo"
              description="Pronto para assinatura digital e entrega imediata ao paciente — com padrão de excelência."
              accent="gold"
            />
          </div>
        </div>
      </section>

      {/* ─── COMO FUNCIONA ─── */}
      <section id="how" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-[hsl(var(--landing-navy))] mb-3">
              Como Funciona
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">Em 4 passos simples, do upload ao laudo pronto.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: <Upload className="w-6 h-6" />, step: "01", title: "Upload do Exame", desc: "Faça o upload do exame (Rx, Tomografia ou clínico)." },
              { icon: <Brain className="w-6 h-6" />, step: "02", title: "Análise por IA", desc: "Nossa IA analisa e detecta dezenas de achados em segundos." },
              { icon: <FileCheck className="w-6 h-6" />, step: "03", title: "Revisão do Laudo", desc: "Revise o laudo pré-preenchido e adicione suas observações." },
              { icon: <FileText className="w-6 h-6" />, step: "04", title: "PDF Profissional", desc: "Gere o PDF com sua assinatura e entregue ao paciente." },
            ].map((s, i) => (
              <div key={i} className="relative group">
                {/* Connector line */}
                {i < 3 && (
                  <div className="hidden lg:block absolute top-10 left-[calc(100%+0.5rem)] w-[calc(100%-1rem)] h-0.5 bg-gray-200">
                    <ChevronRight className="absolute -right-3 -top-2 w-5 h-5 text-gray-300" />
                  </div>
                )}
                <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow h-full">
                  <div className="w-12 h-12 rounded-lg bg-[hsl(var(--landing-teal))]/10 text-[hsl(var(--landing-teal))] flex items-center justify-center mb-4">
                    {s.icon}
                  </div>
                  <span className="text-xs font-bold text-[hsl(var(--landing-teal))] tracking-wider uppercase">Passo {s.step}</span>
                  <h3 className="text-lg font-semibold mt-1 mb-2 text-[hsl(var(--landing-navy))]">{s.title}</h3>
                  <p className="text-sm text-gray-500">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PLANOS ─── */}
      <section id="pricing" className="py-20 md:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-[hsl(var(--landing-navy))] mb-3">
              Planos & Preços
            </h2>
            <p className="text-gray-500 mb-3">Escolha o plano ideal para o seu consultório ou clínica.</p>
            <p className="text-sm font-medium text-[hsl(var(--landing-teal))]">
              Tomografia disponível a partir do plano de 50 exames.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 max-w-7xl mx-auto items-stretch">
            <PricingCard
              name="20 Exames"
              price="99,00"
              period="/mês"
              description="Ideal para uso inicial"
              features={["20 exames por mês", "Radiografias com IA", "Laudo em PDF", "Chat com IA", "Sem Tomografia"]}
              onAction={() => handleCheckout("exames_20")}
            />
            <PricingCard
              name="50 Exames"
              price="230,00"
              period="/mês"
              description="RX + Tomografia a partir deste plano"
              features={["50 exames por mês", "RX + Tomografia", "Laudo em PDF", "Chat com IA", "Histórico completo"]}
              onAction={() => handleCheckout("exames_50")}
            />
            <PricingCard
              name="100 Exames"
              price="350,00"
              period="/mês"
              description="Plano principal para rotina clínica"
              features={["100 exames por mês", "RX + Tomografia", "Laudo Médico-Legal", "Chat com IA", "Suporte por e-mail"]}
              highlighted
              onAction={() => handleCheckout("exames_100")}
            />
            <PricingCard
              name="200 Exames"
              price="430,00"
              period="/mês"
              description="Para alto volume individual"
              features={["200 exames por mês", "RX + Tomografia", "Laudos em PDF", "Chat com IA", "Prioridade de suporte"]}
              onAction={() => handleCheckout("exames_200")}
            />
            <PricingCard
              name="Clínica"
              price="897,00"
              period="/mês"
              description="Para clínicas e equipes"
              features={["Plano para clínicas", "RX + Tomografia", "Equipes e múltiplos fluxos", "Dashboard gerencial", "Treinamento da equipe"]}
              onAction={() => handleCheckout("clinica")}
            />
          </div>
        </div>
      </section>

      {/* ─── CTA Final ─── */}
      <section className="py-20 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(210,70%,18%)] to-[hsl(186,60%,20%)]" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-[hsl(var(--landing-teal))] rounded-full opacity-10 blur-3xl" />
        <div className="relative max-w-3xl mx-auto text-center px-4 sm:px-6">
          <Star className="w-10 h-10 text-[hsl(var(--landing-gold))] mx-auto mb-4" />
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Pronto para transformar seus diagnósticos?
          </h2>
          <p className="text-white/70 mb-8 max-w-xl mx-auto">
            Junte-se a centenas de dentistas que já utilizam IA para laudar com mais rapidez e precisão.
          </p>
          <Button
            size="xl"
            className="bg-[hsl(var(--landing-teal))] hover:bg-[hsl(186,85%,24%)] text-white shadow-lg"
            onClick={() => scrollTo("pricing")}
          >
            Assinar Agora
            <ArrowRight className="w-5 h-5 ml-1" />
          </Button>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-[hsl(210,70%,12%)] text-white/70 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div>
              <img src={logoImage} alt="OdontoVision PRO" className="h-10 object-contain mb-4 brightness-200" />
              <p className="text-sm">Diagnósticos inteligentes. Tempo otimizado. Precisão que faz a diferença.</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3 text-sm uppercase tracking-wider">Produto</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => scrollTo("features")} className="hover:text-white transition-colors">Diferenciais</button></li>
                <li><button onClick={() => scrollTo("how")} className="hover:text-white transition-colors">Como Funciona</button></li>
                <li><button onClick={() => scrollTo("pricing")} className="hover:text-white transition-colors">Planos</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3 text-sm uppercase tracking-wider">Suporte</h4>
              <ul className="space-y-2 text-sm">
                <li><span className="cursor-default">Central de Ajuda</span></li>
                <li><span className="cursor-default">Contato</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3 text-sm uppercase tracking-wider">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => navigate("/terms")} className="hover:text-white transition-colors">Termos de Uso</button></li>
                <li><button onClick={() => navigate("/privacy")} className="hover:text-white transition-colors">Política de Privacidade</button></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 text-center text-sm">
            © 2026 OdontoVision PRO. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Sub-components ─── */

function FeatureCard({ icon, title, description, accent }: { icon: React.ReactNode; title: string; description: string; accent: "teal" | "navy" | "gold" }) {
  const accentMap = {
    teal: { bg: "bg-[hsl(var(--landing-teal))]/10", text: "text-[hsl(var(--landing-teal))]" },
    navy: { bg: "bg-[hsl(var(--landing-navy))]/10", text: "text-[hsl(var(--landing-navy))]" },
    gold: { bg: "bg-[hsl(var(--landing-gold))]/10", text: "text-[hsl(var(--landing-gold))]" },
  };
  const a = accentMap[accent];

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-lg transition-shadow group">
      <div className={`w-14 h-14 rounded-xl ${a.bg} ${a.text} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-[hsl(var(--landing-navy))] mb-2">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}

function PricingCard({ name, price, period, description, features, highlighted, onAction }: {
  name: string; price: string; period: string; description: string; features: string[]; highlighted?: boolean; onAction: () => void;
}) {
  return (
    <div className={`rounded-2xl border p-6 flex flex-col h-full transition-shadow ${highlighted ? "bg-white border-[hsl(var(--landing-teal))] shadow-xl ring-2 ring-[hsl(var(--landing-teal))]/20 relative" : "bg-white border-gray-200 shadow-sm hover:shadow-md"}`}>
      {highlighted && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[hsl(var(--landing-teal))] text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">
          Mais Popular
        </div>
      )}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-[hsl(var(--landing-navy))]">{name}</h3>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
      <div className="mb-6">
        <span className="text-4xl font-bold text-[hsl(var(--landing-navy))]">R$ {price}</span>
        <span className="text-gray-400 text-sm">{period}</span>
      </div>
      <ul className="space-y-3 mb-8 flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
            <Check className="w-4 h-4 text-[hsl(var(--landing-teal))] shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
      </ul>
      <Button
        className={`w-full ${highlighted ? "bg-[hsl(var(--landing-teal))] hover:bg-[hsl(186,85%,24%)] text-white shadow-md" : "bg-[hsl(var(--landing-navy))] hover:bg-[hsl(210,70%,22%)] text-white"}`}
        onClick={onAction}
      >
        Assinar Agora
      </Button>
    </div>
  );
}
