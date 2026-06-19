import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { performSafeLogout } from "@/lib/authLogout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2, LogIn, LogOut, UserPlus, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface RegisterGuardContextValue {
  requestRegister: () => void;
}

const RegisterGuardContext = createContext<RegisterGuardContextValue | null>(null);

export function RegisterGuardProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const checking = useRef(false);

  const requestRegister = useCallback(async () => {
    if (checking.current) return;
    checking.current = true;
    try {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) {
        setEmail(data.user.email ?? "вашим аккаунтом");
        setOpen(true);
        return;
      }
      navigate("/register");
    } catch {
      navigate("/register");
    } finally {
      checking.current = false;
    }
  }, [navigate]);

  const handleGoToDashboard = () => {
    setOpen(false);
    navigate("/dashboard");
  };

  const handleLogoutAndRegister = async () => {
    setLoggingOut(true);
    try {
      await performSafeLogout(queryClient);
    } finally {
      setLoggingOut(false);
      setOpen(false);
      navigate("/register");
    }
  };

  return (
    <RegisterGuardContext.Provider value={{ requestRegister }}>
      {children}
      <AlertDialog open={open} onOpenChange={(v) => !loggingOut && setOpen(v)}>
        <AlertDialogContent className="relative">
          <button
            type="button"
            onClick={() => !loggingOut && setOpen(false)}
            disabled={loggingOut}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Закрыть</span>
          </button>
          <AlertDialogHeader className="pr-8">
            <AlertDialogTitle>У вас уже есть активная сессия</AlertDialogTitle>
            <AlertDialogDescription>
              Вы вошли как <span className="font-medium text-foreground">{email}</span>.
              Чтобы зарегистрировать новый аккаунт, нужно сначала выйти из текущего.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleGoToDashboard}
              disabled={loggingOut}
            >
              <LogIn className="h-4 w-4 mr-2" />
              Войти в кабинет
            </Button>
            <AlertDialogAction asChild>
              <Button
                type="button"
                onClick={handleLogoutAndRegister}
                disabled={loggingOut}
                className="bg-gradient-primary shadow-neon-primary"
              >
                {loggingOut ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4 mr-2" />
                )}
                Выйти и зарегистрироваться
                <UserPlus className="h-4 w-4 ml-2" />
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </RegisterGuardContext.Provider>
  );
}

export function useRegisterGuard() {
  const ctx = useContext(RegisterGuardContext);
  if (!ctx) {
    // Fallback: direct nav if provider not mounted
    return {
      requestRegister: () => {
        if (typeof window !== "undefined") window.location.href = "/register";
      },
    };
  }
  return ctx;
}
