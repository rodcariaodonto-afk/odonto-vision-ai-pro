import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ArrowRight, Sparkles, Shield, Zap } from "lucide-react";

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-success rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo */}
        <div className="animate-slide-up">
          <Logo size="xl" variant="full" className="mb-8" />
        </div>

        {/* Tagline */}
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-primary-foreground text-center max-w-2xl mb-4 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          Diagnósticos inteligentes.
        </h1>
        <p className="text-lg md:text-xl text-primary-foreground/80 text-center max-w-xl mb-12 animate-slide-up" style={{ animationDelay: "0.2s" }}>
          Tempo otimizado. Precisão que faz a diferença.
        </p>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12 max-w-3xl w-full animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <FeatureCard
            icon={<Sparkles className="w-6 h-6" />}
            title="IA Avançada"
            description="Análise precisa de exames"
          />
          <FeatureCard
            icon={<Zap className="w-6 h-6" />}
            title="Resultados Rápidos"
            description="Em segundos, não minutos"
          />
          <FeatureCard
            icon={<Shield className="w-6 h-6" />}
            title="Dados Seguros"
            description="Criptografia de ponta"
          />
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md animate-slide-up" style={{ animationDelay: "0.4s" }}>
          <Button
            variant="success"
            size="xl"
            className="flex-1"
            onClick={() => navigate("/plans")}
          >
            Criar Conta
            <ArrowRight className="w-5 h-5" />
          </Button>
          <Button
            variant="glass"
            size="xl"
            className="flex-1 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/10"
            onClick={() => navigate("/login")}
          >
            Entrar
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative py-6 text-center text-primary-foreground/60 text-sm">
        © 2024 OdontoVision AI Pro. Todos os direitos reservados.
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-primary-foreground/10 backdrop-blur-xl rounded-xl p-4 border border-primary-foreground/20">
      <div className="text-success mb-2">{icon}</div>
      <h3 className="font-semibold text-primary-foreground mb-1">{title}</h3>
      <p className="text-sm text-primary-foreground/70">{description}</p>
    </div>
  );
}
