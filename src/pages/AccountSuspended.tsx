import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ban, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function AccountSuspended() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full text-center">
        <CardContent className="py-8 space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center">
            <Ban className="w-8 h-8 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Conta Suspensa
            </h1>
            <p className="text-muted-foreground">
              Sua conta foi bloqueada por um administrador. Entre em contato com o
              suporte para mais informações.
            </p>
          </div>
          <Button variant="outline" size="lg" className="w-full" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
