import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, ArrowRight, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const sessionId = searchParams.get("session_id");
  const plan = searchParams.get("plan");

  const planNames: Record<string, string> = {
    por_caso: "Por Caso",
    mensal: "Mensal",
    anual: "Anual",
  };

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setError("Sessão de pagamento não encontrada.");
        setVerifying(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("verify-session", {
          body: { sessionId },
        });

        if (error || !data?.verified) {
          setError(data?.error || "Pagamento não verificado.");
          setVerifying(false);
          return;
        }

        setVerified(true);
        setEmail(data.email);
        setVerifying(false);

        // If user is already logged in, redirect to dashboard
        if (user) {
          setTimeout(() => navigate("/dashboard"), 2000);
        }
      } catch (err) {
        console.error("Verification error:", err);
        setError("Erro ao verificar pagamento.");
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [sessionId, user, navigate]);

  const handleContinue = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      // Redirect to register with email and plan info
      navigate(`/register?email=${encodeURIComponent(email || "")}&plan=${plan}&session_id=${sessionId}`);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-12">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Verificando pagamento...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader className="pb-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mb-4">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>
            <CardTitle className="text-2xl text-foreground">
              Erro no Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">{error}</p>
            <Button variant="default" onClick={() => navigate("/plans")}>
              Voltar para Planos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            Seu plano <strong className="text-foreground">{plan ? planNames[plan] || plan : ""}</strong> foi confirmado com sucesso.
          </p>
          
          {!user && (
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                Agora, complete seu cadastro para começar a usar o OdontoVision AI Pro.
              </p>
            </div>
          )}

          <Button 
            variant="hero" 
            size="lg" 
            className="w-full"
            onClick={handleContinue}
          >
            {user ? "Ir para o Dashboard" : "Completar Cadastro"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
