import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { useAdminRole } from "./hooks/useAdminRole";
import Index from "./pages/Index";
import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Plans from "./pages/Plans";
import PaymentSuccess from "./pages/PaymentSuccess";
import Layout from "./components/Layout";
import AdminLayout from "./components/AdminLayout";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Chat from "./pages/Chat";
import Cases from "./pages/Cases";
import Compare from "./pages/Compare";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminCases from "./pages/admin/AdminCases";
import AdminSupport from "./pages/admin/AdminSupport";
import AdminSettings from "./pages/admin/AdminSettings";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Lock, ArrowRight, Loader2 } from "lucide-react";

const queryClient = new QueryClient();

// Loading spinner component
function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
}

// Protected Route component - requires login AND active subscription
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, subscription, subscriptionLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminRole();

  if (loading || subscriptionLoading || adminLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admin always has access
  if (isAdmin) {
    return <>{children}</>;
  }

  // Check subscription status
  if (!subscription?.subscribed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-8 space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center">
              <Lock className="w-8 h-8 text-warning" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                Assinatura Necessária
              </h2>
              <p className="text-muted-foreground">
                Você precisa de um plano ativo para acessar o OdontoVision AI Pro.
              </p>
            </div>
            <Button 
              variant="hero" 
              size="lg" 
              className="w-full"
              onClick={() => window.location.href = "/plans"}
            >
              Ver Planos
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

// Admin Route component
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminRole();

  if (loading || adminLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-destructive mb-2">Acesso Restrito ao Administrador</h1>
          <p className="text-muted-foreground">Você não tem permissão para acessar esta seção.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Public Route that redirects authenticated users with subscription
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, subscription, subscriptionLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminRole();

  if (loading || adminLoading) {
    return <LoadingSpinner />;
  }

  // If user is logged in with active subscription or is admin, redirect to dashboard
  if (user && (subscription?.subscribed || isAdmin)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/welcome" element={<PublicRoute><Welcome /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/plans" element={<Plans />} />
      <Route path="/register" element={<Register />} />
      <Route path="/payment-success" element={<PaymentSuccess />} />
      
      {/* Protected Routes with Layout */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/cases" element={<Cases />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      {/* Admin Routes */}
      <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/cases" element={<AdminCases />} />
        <Route path="/admin/support" element={<AdminSupport />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
