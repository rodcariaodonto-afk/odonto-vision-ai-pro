import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { Mail, Lock, User, BadgeCheck, ArrowLeft, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTestUser, setIsTestUser] = useState(false);
  const [checkingTestUser, setCheckingTestUser] = useState(false);
  
  // Get pre-filled data from URL params (after payment)
  const prefilledEmail = searchParams.get("email") || "";
  const testEmail = searchParams.get("test_email") || "";
  const plan = searchParams.get("plan");
  const sessionId = searchParams.get("session_id");
  const isPaidUser = !!sessionId && !!plan;

  const [formData, setFormData] = useState({
    name: "",
    email: prefilledEmail || testEmail,
    password: "",
    cro: "",
  });

  useEffect(() => {
    if (prefilledEmail) {
      setFormData(prev => ({ ...prev, email: prefilledEmail }));
    } else if (testEmail) {
      setFormData(prev => ({ ...prev, email: testEmail }));
      setIsTestUser(true);
    }
  }, [prefilledEmail, testEmail]);

  // Check if email is a test user when manually entered
  const checkTestUser = async (email: string) => {
    if (!email || isPaidUser) return;
    
    setCheckingTestUser(true);
    try {
      const { data, error } = await supabase
        .from("test_users")
        .select("email, is_active, expires_at")
        .eq("email", email.toLowerCase())
        .eq("is_active", true)
        .single();
      
      if (data && !error) {
        const expiresAt = new Date(data.expires_at);
        if (expiresAt > new Date()) {
          setIsTestUser(true);
        } else {
          setIsTestUser(false);
        }
      } else {
        setIsTestUser(false);
      }
    } catch {
      setIsTestUser(false);
    } finally {
      setCheckingTestUser(false);
    }
  };

  // Debounce email check
  useEffect(() => {
    if (!formData.email || isPaidUser) return;
    
    const timer = setTimeout(() => {
      checkTestUser(formData.email);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [formData.email, isPaidUser]);

  const planNames: Record<string, string> = {
    por_caso: "Por Caso",
    mensal: "Mensal",
    anual: "Anual",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (formData.password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      setIsLoading(false);
      return;
    }

    const { error } = await signUp(formData.email, formData.password, formData.name);
    
    if (error) {
      if (error.message.includes("already registered")) {
        setError("Este e-mail já está cadastrado. Faça login.");
      } else {
        setError(error.message);
      }
      setIsLoading(false);
      return;
    }

    // Update profile with CRO and plan info if provided
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const updateData: Record<string, string | null> = { 
        name: formData.name 
      };
      if (formData.cro) {
        updateData.cro = formData.cro;
      }
      
      await supabase
        .from("profiles")
        .update(updateData)
        .eq("user_id", user.id);
    }

    toast.success("Conta criada com sucesso!");
    navigate("/dashboard");
  };

  // Allow access if: paid user OR test user
  const canRegister = isPaidUser || isTestUser;

  // If user is not coming from payment and not a test user, redirect to plans
  if (!canRegister && !checkingTestUser) {
    return (
      <div className="min-h-screen bg-muted flex flex-col">
        <header className="p-4">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
        </header>
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Logo size="lg" />
              </div>
              <CardTitle className="text-2xl">Cadastro Requer Pagamento</CardTitle>
              <CardDescription>
                Para criar sua conta, você precisa primeiro escolher um plano e realizar o pagamento.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="hero"
                size="lg"
                className="w-full"
                onClick={() => navigate("/plans")}
              >
                Ver Planos e Preços
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Já tem uma conta?{" "}
                <Link to="/login" className="text-primary font-medium hover:underline">
                  Entrar
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      {/* Header */}
      <header className="p-4">
        <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md animate-scale-in">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <Logo size="lg" />
            </div>
            
            {/* Payment confirmed badge */}
            {isPaidUser && (
              <div className="flex items-center justify-center gap-2 mb-4 p-2 rounded-lg bg-success/10 text-success">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Plano {plan ? planNames[plan] : ""} confirmado!
                </span>
              </div>
            )}
            
            {/* Test user badge */}
            {isTestUser && !isPaidUser && (
              <div className="flex items-center justify-center gap-2 mb-4 p-2 rounded-lg bg-primary/10 text-primary">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Acesso de Teste (7 dias)
                </span>
              </div>
            )}

            <CardTitle className="text-2xl">Complete seu Cadastro</CardTitle>
            <CardDescription>
              Preencha seus dados para finalizar a criação da conta
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Nome completo
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Dr. João Silva"
                    className="pl-10"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    className="pl-10"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={!!prefilledEmail}
                  />
                </div>
                {prefilledEmail && (
                  <p className="text-xs text-muted-foreground">
                    E-mail vinculado ao pagamento
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Mínimo 6 caracteres</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  CRO <span className="text-muted-foreground">(opcional)</span>
                </label>
                <div className="relative">
                  <BadgeCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="CRO-SP 12345"
                    className="pl-10"
                    value={formData.cro}
                    onChange={(e) => setFormData({ ...formData, cro: e.target.value })}
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="hero"
                size="lg"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  "Finalizar Cadastro"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Já tem uma conta?{" "}
                <Link to="/login" className="text-primary font-medium hover:underline">
                  Entrar
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
