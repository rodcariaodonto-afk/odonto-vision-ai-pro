import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Upload,
  MessageSquare,
  FolderOpen,
  CreditCard,
  User,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Upload, label: "Enviar Exame", path: "/upload" },
  { icon: MessageSquare, label: "Chat IA", path: "/chat" },
  { icon: FolderOpen, label: "Meus Casos", path: "/cases" },
  { icon: CreditCard, label: "Planos", path: "/plans" },
  { icon: User, label: "Perfil", path: "/profile" },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    toast.success("Você foi desconectado");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-muted flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-card border-r border-border">
        <div className="p-6">
          <Logo size="md" />
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant={location.pathname === item.path ? "default" : "ghost"}
              className={cn(
                "w-full justify-start gap-3",
                location.pathname === item.path && "shadow-md"
              )}
              onClick={() => navigate(item.path)}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Button>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <Button variant="ghost" className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleLogout}>
            <LogOut className="w-5 h-5" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <Logo size="sm" />
        <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </Button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="absolute right-0 top-14 bottom-0 w-64 bg-card border-l border-border animate-slide-in-right" onClick={(e) => e.stopPropagation()}>
            <nav className="p-4 space-y-1">
              {navItems.map((item) => (
                <Button
                  key={item.path}
                  variant={location.pathname === item.path ? "default" : "ghost"}
                  className="w-full justify-start gap-3"
                  onClick={() => {
                    navigate(item.path);
                    setIsMobileMenuOpen(false);
                  }}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Button>
              ))}
              <Button variant="ghost" className="w-full justify-start gap-3 text-destructive hover:text-destructive" onClick={handleLogout}>
                <LogOut className="w-5 h-5" />
                Sair
              </Button>
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:p-8 p-4 pt-20 lg:pt-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
