import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { AuthBackground } from "@/components/AuthBackground";
import { Mail, Lock, ArrowLeft, PhoneIcon, KeyRound, ArrowRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { PhoneInput, isPhoneValid } from "@/components/ui/phone-input";
import { ThemedLogo } from "@/components/ThemedLogo";
import { withTimeout } from "@/lib/authTimeout";
import { clearLogoutInProgress, isLogoutRedirect } from "@/lib/authLogout";

// Функция для определения посадочной страницы по ролям
const getDefaultRouteForUser = async (userId: string): Promise<string> => {
  try {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (!roles || roles.length === 0) {
      return "/dashboard"; // Дефолт для пользователей без роли
    }

    const roleList = roles.map(r => r.role);

    // Проверяем роли в порядке приоритета
    if (roleList.includes("superadmin") || roleList.includes("admin") || roleList.includes("doctor")) {
      return "/admin/patients"; // Стафф идет на страницу пациентов
    }
    
    if (roleList.includes("patient")) {
      return "/dashboard"; // Пациенты идут на дашборд
    }

    return "/dashboard"; // Дефолт
  } catch (error) {
    console.error("Error getting user role:", error);
    return "/dashboard";
  }
};

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpStep, setOtpStep] = useState<"phone" | "code">("phone");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpResendIn, setOtpResendIn] = useState(0);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (otpResendIn <= 0) return;
    const t = setInterval(() => setOtpResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [otpResendIn]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError(null);
    if (!isPhoneValid(phone)) {
      setPhoneError("Введите корректный номер телефона");
      return;
    }
    setOtpLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("phone-otp-send", { body: { phone } });
      if (error) {
        setPhoneError(error.message || "Не удалось отправить код");
        return;
      }
      if (data?.error) {
        setPhoneError(data.error);
        if (data.resendInSec) setOtpResendIn(data.resendInSec);
        return;
      }
      setOtp("");
      setOtpStep("code");
      setOtpResendIn(data?.resendInSec ?? 60);
      toast({ title: "Код отправлен", description: "Введите 4-значный код из SMS" });
    } catch (e: any) {
      setPhoneError(e?.message || "Не удалось отправить код");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 4) return;
    setOtpLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("phone-otp-verify", {
        body: { phone, code: otp },
      });
      if (error) {
        toast({ title: "Ошибка", description: error.message || "Неверный код", variant: "destructive" });
        setOtp("");
        return;
      }
      if (data?.error) {
        toast({ title: "Ошибка", description: data.error, variant: "destructive" });
        setOtp("");
        return;
      }
      if (!data?.token_hash || !data?.email) {
        toast({ title: "Ошибка", description: "Не удалось войти", variant: "destructive" });
        return;
      }
      const { error: vErr } = await supabase.auth.verifyOtp({
        type: "magiclink",
        email: data.email,
        token_hash: data.token_hash,
      } as any);
      if (vErr) {
        toast({ title: "Ошибка входа", description: vErr.message, variant: "destructive" });
        return;
      }
      toast({ title: "Добро пожаловать!", description: "Вы успешно вошли" });
    } catch (e: any) {
      toast({ title: "Ошибка", description: e?.message || "Не удалось проверить код", variant: "destructive" });
    } finally {
      setOtpLoading(false);
    }
  };


  const redirectAuthenticatedSession = useCallback(async (incomingSession: Session, source: string) => {
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
  }, [location, navigate, queryClient]);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.info("[auth-debug] Auth state change", { event, hasSession: !!session });
        if (!session) {
          setSession(null);
          return;
        }
        setTimeout(() => {
          redirectAuthenticatedSession(session, `auth-state:${event}`);
        }, 0);
      }
    );

    // Check for existing session
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearLogoutInProgress();
    if (new URLSearchParams(location.search).get("logout") === "1") {
      window.history.replaceState(null, "", "/auth");
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      toast({
        title: "Добро пожаловать!",
        description: "Вы успешно вошли в систему",
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Произошла ошибка. Попробуйте снова.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({
        title: "Письмо отправлено",
        description: "Проверьте почту — мы отправили ссылку для сброса пароля",
      });
      setForgotMode(false);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось отправить письмо",
        variant: "destructive",
      });
    } finally {
      setForgotLoading(false);
    }
  };

  if (session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4 relative overflow-hidden">
      <AuthBackground />
      
      <div className="w-full max-w-md relative z-10">
        {/* Header with Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 mb-2">
            <ThemedLogo eager className="h-32 w-auto md:animate-hue-shift" />
          </div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">
            {forgotMode ? "Сброс пароля" : "Добро пожаловать"}
          </h1>
          <p className="text-muted-foreground text-lg">
            {forgotMode ? "Введите email для восстановления" : "Войдите в свой аккаунт ReAge"}
          </p>
        </div>

        {/* Card */}
        <Card
          className="p-6 md:p-8 bg-card md:bg-card/80 md:backdrop-blur-xl border-border/50 shadow-2xl relative overflow-hidden animate-fade-in"
          style={{ animationDelay: "0.2s", isolation: "isolate", contain: "paint" as any }}
        >
          <div className="hidden md:block absolute inset-0 bg-gradient-primary opacity-5 rounded-lg" />
          <div className="hidden md:block absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
          <div className="hidden md:block absolute -bottom-24 -left-24 w-48 h-48 bg-accent/10 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            {forgotMode ? (
              <form onSubmit={handleForgotPassword} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" />
                    Email
                  </Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="your@email.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    className="h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-primary hover:shadow-neon-primary transition-all duration-300 text-base font-medium" 
                  disabled={forgotLoading}
                >
                  {forgotLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Отправка...
                    </span>
                  ) : (
                    "Отправить ссылку"
                  )}
                </Button>
                <button
                  type="button"
                  onClick={() => setForgotMode(false)}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Вернуться к входу
                </button>
              </form>
            ) : (
              <Tabs value={authMethod} onValueChange={(v) => setAuthMethod(v as "email" | "phone")} className="w-full">
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

                <TabsContent value="email" className="mt-0 animate-fade-in">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-primary" />
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        className="h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="flex items-center gap-2">
                          <Lock className="h-4 w-4 text-primary" />
                          Пароль
                        </Label>
                        <button
                          type="button"
                          onClick={() => { setForgotMode(true); setForgotEmail(formData.email); }}
                          className="text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                          Забыли пароль?
                        </button>
                      </div>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                        className="h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-12 bg-gradient-primary hover:shadow-neon-primary transition-all duration-300 text-base font-medium"
                      disabled={loading}
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Загрузка...
                        </span>
                      ) : (
                        "Войти"
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="phone" className="mt-0 animate-fade-in">
                  {otpStep === "phone" ? (
                    <form onSubmit={handleSendOtp} className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="flex items-center gap-2">
                          <PhoneIcon className="h-4 w-4 text-primary" />
                          Номер телефона
                        </Label>
                        <PhoneInput
                          id="phone"
                          value={phone}
                          onChange={setPhone}
                          placeholder="+7 (999) 123-45-67"
                          className="w-full"
                          inputClassName="bg-background/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                        <p className="text-xs text-muted-foreground pt-1">
                          Мы отправим SMS с одноразовым кодом для входа
                        </p>
                      </div>
                      <Button
                        type="submit"
                        className="w-full h-12 bg-gradient-primary hover:shadow-neon-primary transition-all duration-300 text-base font-medium group"
                        disabled={otpLoading}
                      >
                        {otpLoading ? (
                          <span className="flex items-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Отправка...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            Получить код
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                          </span>
                        )}
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-6">
                      <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                          <KeyRound className="h-4 w-4 text-primary" />
                          Код из SMS
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Отправили 4-значный код на{" "}
                          <span className="text-foreground font-medium">{phone}</span>
                        </p>
                        <div className="flex justify-center pt-2">
                          <InputOTP maxLength={4} value={otp} onChange={setOtp} autoFocus>
                            <InputOTPGroup>
                              <InputOTPSlot index={0} className="h-14 w-14 text-2xl border-border/50 bg-background/50" />
                              <InputOTPSlot index={1} className="h-14 w-14 text-2xl border-border/50 bg-background/50" />
                              <InputOTPSlot index={2} className="h-14 w-14 text-2xl border-border/50 bg-background/50" />
                              <InputOTPSlot index={3} className="h-14 w-14 text-2xl border-border/50 bg-background/50" />
                            </InputOTPGroup>
                          </InputOTP>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="w-full h-12 bg-gradient-primary hover:shadow-neon-primary transition-all duration-300 text-base font-medium"
                        disabled={otpLoading || otp.length !== 4}
                      >

                        {otpLoading ? (
                          <span className="flex items-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Проверка...
                          </span>
                        ) : (
                          "Войти"
                        )}
                      </Button>

                      <div className="flex items-center justify-between text-sm">
                        <button
                          type="button"
                          onClick={() => { setOtpStep("phone"); setOtp(""); }}
                          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ArrowLeft className="h-3 w-3" />
                          Изменить номер
                        </button>
                        <button
                          type="button"
                          disabled={otpResendIn > 0 || otpLoading}
                          onClick={() => handleSendOtp(new Event("submit") as any)}
                          className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 disabled:hover:text-muted-foreground"
                        >
                          {otpResendIn > 0 ? `Отправить снова через ${otpResendIn}с` : "Отправить код снова"}
                        </button>

                      </div>
                    </form>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </Card>

        {/* Register Link */}
        {!forgotMode && (
          <div className="text-center mt-6 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <p className="text-sm text-muted-foreground">
              Нет аккаунта?{" "}
              <button
                type="button"
                onClick={() => navigate('/register')}
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
