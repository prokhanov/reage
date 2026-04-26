import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { getSessionWithTimeout } from "@/lib/authTimeout";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSlowMessage, setShowSlowMessage] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener (если бэкенд оживёт — всё ещё подхватим сессию)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        setSession(session);
        setLoading(false);
        setTimedOut(false);
      }
    );

    // Через 3 секунды показываем подсказку «Соединение с сервером…»
    const slowTimer = setTimeout(() => {
      if (mounted) setShowSlowMessage(true);
    }, 3000);

    // Защита от зависшего backend: жёсткий таймаут 5 сек.
    getSessionWithTimeout(5000).then(({ session, timedOut }) => {
      if (!mounted) return;
      setSession(session);
      setTimedOut(timedOut);
      setLoading(false);
    });

    return () => {
      mounted = false;
      clearTimeout(slowTimer);
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        {showSlowMessage && (
          <p className="text-sm text-muted-foreground">Соединение с сервером…</p>
        )}
      </div>
    );
  }

  // Если getSession упал по таймауту И нет сессии — отправляем на /auth,
  // чтобы пользователь мог перелогиниться вместо вечного спиннера.
  if (!session) {
    return <Navigate to="/auth" state={{ from: location, timedOut }} replace />;
  }

  return <>{children}</>;
};
