import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, ArrowRight } from "lucide-react";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);
  const plan = searchParams.get("plan");

  const planNames: Record<string, string> = {
    por_caso: "Por Caso",
    mensal: "Mensal",
    anual: "Anual",
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/dashboard");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-4">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>
          <CardTitle className="text-2xl text-foreground">
            Pagamento Confirmado!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            Seu plano <strong className="text-foreground">{plan ? planNames[plan] || plan : ""}</strong> foi ativado com sucesso.
          </p>
          
          <div className="bg-muted rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              Você já pode começar a usar todas as funcionalidades do OdontoVision AI Pro.
            </p>
          </div>

          <div className="space-y-3">
            <Button 
              variant="hero" 
              size="lg" 
              className="w-full"
              onClick={() => navigate("/dashboard")}
            >
              Ir para o Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Redirecionando em {countdown}s...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
