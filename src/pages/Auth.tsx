import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { AuthBackground } from "@/components/AuthBackground";
import { Mail, ArrowLeft, PhoneIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemedLogo } from "@/components/ThemedLogo";
import { withTimeout } from "@/lib/authTimeout";
import { isLogoutRedirect } from "@/lib/authLogout";
import { EmailLoginForm } from "@/components/auth/EmailLoginForm";
import { PhoneLoginForm } from "@/components/auth/PhoneLoginForm";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

// Функция для определения посадочной страницы по ролям
const getDefaultRouteForUser = async (userId: string): Promise<string> => {
  try {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (!roles || roles.length === 0) return "/dashboard";
    const roleList = roles.map((r) => r.role);
    if (roleList.includes("superadmin") || roleList.includes("admin") || roleList.includes("doctor")) {
      return "/admin/patients";
    }
    if (roleList.includes("patient")) return "/dashboard";
    return "/dashboard";
  } catch (error) {
    console.error("Error getting user role:", error);
    return "/dashboard";
  }
};

const rootStyle: React.CSSProperties = { contain: "layout paint" as any };

export default function Auth() {
  const [session, setSession] = useState<Session | null>(null);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotInitialEmail, setForgotInitialEmail] = useState("");
  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email");

  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const redirectAuthenticatedSession = useCallback(
    async (incomingSession: Session, source: string) => {
      if (isLogoutRedirect()) {
        console.info("[auth-debug] Auth redirect skipped after logout", { source });
        setSession(null);
        return;
      }

      const userCheck = await withTimeout(supabase.auth.getUser(), 2500);
      const confirmedUser = userCheck.value?.data?.user;
      if (userCheck.timedOut || userCheck.error || !confirmedUser) {
        console.warn("[auth-debug] Auth stale session ignored", {
          source,
          timedOut: userCheck.timedOut,
          hasError: !!userCheck.error,
        });
        setSession(null);
        return;
      }

      setSession(incomingSession);
      queryClient.invalidateQueries({ queryKey: ["userRole"] });

      const from = (location.state as any)?.from?.pathname;
      if (from && from !== "/auth") {
        console.info("[auth-debug] Auth redirecting to previous route", { source, route: from });
        navigate(from, { replace: true });
        return;
      }

      const defaultRoute = await getDefaultRouteForUser(confirmedUser.id);
      console.info("[auth-debug] Auth redirecting to default route", { source, route: defaultRoute });
      navigate(defaultRoute, { replace: true });
    },
    [location, navigate, queryClient]
  );

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.info("[auth-debug] Auth state change", { event, hasSession: !!session });
      if (!session) {
        setSession(null);
        return;
      }
      setTimeout(() => {
        redirectAuthenticatedSession(session, `auth-state:${event}`);
      }, 0);
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.info("[auth-debug] Auth getSession", { hasSession: !!session, logoutRedirect: isLogoutRedirect() });
      if (!session) {
        setSession(null);
        return;
      }
      await redirectAuthenticatedSession(session, "initial-getSession");
    });

    return () => subscription.unsubscribe();
  }, [redirectAuthenticatedSession]);

  if (session) return null;

  const handleForgot = (email: string) => {
    setForgotInitialEmail(email);
    setForgotMode(true);
  };

  return (
    <div
      className="min-h-screen bg-gradient-dark flex items-center justify-center p-4 relative overflow-hidden"
      style={rootStyle}
    >
      <Link
        to="/"
        className="absolute top-4 left-4 md:top-8 md:left-8 z-20 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors duration-200 group p-2 -m-2 sm:p-0 sm:m-0"
      >
        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
        <span>На главную</span>
      </Link>

      <AuthBackground />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8 animate-fade-in">
          <Link to="/" className="inline-flex items-center gap-2 mb-2">
            <ThemedLogo eager className="h-32 w-auto md:animate-hue-shift" />
          </Link>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">
            {forgotMode ? "Сброс пароля" : "Добро пожаловать"}
          </h1>
          <p className="text-muted-foreground text-lg">
            {forgotMode ? "Введите email для восстановления" : "Войдите в свой аккаунт ReAge"}
          </p>
        </div>

        <Card
          className="p-6 md:p-8 bg-card md:bg-card/80 md:backdrop-blur-xl border-border/50 shadow-2xl relative overflow-hidden animate-fade-in"
          style={{ animationDelay: "0.2s", isolation: "isolate", contain: "paint" as any }}
        >
          <div className="hidden md:block absolute inset-0 bg-gradient-primary opacity-5 rounded-lg" />
          <div className="hidden md:block absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
          <div className="hidden md:block absolute -bottom-24 -left-24 w-48 h-48 bg-accent/10 rounded-full blur-3xl" />

          <div className="relative z-10">
            {forgotMode ? (
              <ForgotPasswordForm
                initialEmail={forgotInitialEmail}
                onBack={() => setForgotMode(false)}
              />
            ) : (
              <Tabs
                value={authMethod}
                onValueChange={(v) => setAuthMethod(v as "email" | "phone")}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 mb-6 h-12 p-1 bg-background/40 border border-border/50">
                  <TabsTrigger
                    value="email"
                    className="h-full data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-neon-primary transition-all duration-300 gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </TabsTrigger>
                  <TabsTrigger
                    value="phone"
                    className="h-full data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-neon-primary transition-all duration-300 gap-2"
                  >
                    <PhoneIcon className="h-4 w-4" />
                    Телефон
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="email" className="mt-0">
                  <EmailLoginForm onForgot={handleForgot} />
                </TabsContent>

                <TabsContent value="phone" className="mt-0">
                  <PhoneLoginForm />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </Card>

        {!forgotMode && (
          <div className="text-center mt-6 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <p className="text-sm text-muted-foreground">
              Нет аккаунта?{" "}
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="text-primary hover:text-primary-hover font-medium transition-all hover:underline"
              >
                Зарегистрируйтесь
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
