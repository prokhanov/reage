import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, User, AlertCircle } from "lucide-react";

export default function RegisterStaff() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [inviteToken, setInviteToken] = useState<any>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    const validateInvite = async () => {
      // Сначала проверяем, залогинен ли пользователь
      setSessionLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const hasSession = !!sessionData.session;
      setIsAuthenticated(hasSession);
      setSessionLoading(false);

      const token = searchParams.get("invite");
      
      console.info("Invite link opened", token, { hasSession });
      
      if (!token) {
        setInviteError("Отсутствует токен приглашения");
        return;
      }

      // Если пользователь залогинен, не проверяем токен
      if (hasSession) {
        return;
      }

      const { data, error } = await supabase
        .from("invite_tokens")
        .select("*")
        .eq("token", token)
        .maybeSingle();

      console.log("Token validation:", { token, data, error });

      if (error) {
        console.error("Invite validation error:", error);
        setInviteError("Ошибка проверки приглашения");
        return;
      }

      if (!data) {
        console.warn("Token not found:", token);
        setInviteError("Недействительное приглашение. Попросите администратора обновить ссылку.");
        return;
      }

      if (data.used_by) {
        console.warn("Token already used:", token);
        setInviteError("Приглашение уже использовано");
        return;
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setInviteError("Срок действия приглашения истек");
        return;
      }

      // Получить display_name для роли
      const { data: roleData } = await supabase
        .from("custom_roles")
        .select("display_name")
        .eq("name", data.role)
        .maybeSingle();

      setInviteToken({
        ...data,
        role_display_name: roleData?.display_name || data.role
      });
      
      // Предзаполнить данные из metadata
      if (data.metadata && typeof data.metadata === 'object') {
        const metadata = data.metadata as any;
        setFormData(prev => ({
          ...prev,
          firstName: metadata.firstName || "",
          lastName: metadata.lastName || "",
          email: data.invited_email || prev.email,
        }));
      } else if (data.invited_email) {
        setFormData(prev => ({ ...prev, email: data.invited_email }));
      }
    };

    validateInvite();
  }, [searchParams]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteToken) return;

    if (formData.password.length < 6) {
      toast({
        title: "Ошибка",
        description: "Пароль должен содержать минимум 6 символов",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Call Edge Function to register staff
      const { data, error } = await supabase.functions.invoke('register-staff', {
        body: {
          inviteToken: inviteToken.token,
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Sign in the user after successful registration
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) throw signInError;

      toast({
        title: "Регистрация успешна",
        description: "Добро пожаловать в ReAge!",
      });

      navigate("/dashboard");
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Ошибка регистрации",
        description: error.message || "Произошла ошибка при регистрации",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">ReAge</CardTitle>
          {inviteToken && (
            <CardDescription className="text-base mt-4">
              Вас пригласили присоединиться как{" "}
              <span className="font-semibold text-foreground">
                {inviteToken.role_display_name || inviteToken.role}
              </span>
              .<br />
              Пожалуйста, создайте аккаунт, чтобы принять приглашение.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {sessionLoading ? (
            <div className="text-center text-muted-foreground">Загрузка...</div>
          ) : isAuthenticated ? (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Вы уже авторизованы в системе. Чтобы зарегистрироваться по приглашению, выйдите из аккаунта.
                </AlertDescription>
              </Alert>
              <div className="flex flex-col gap-2">
                <Button onClick={handleSignOut} variant="default" className="w-full">
                  Выйти и продолжить регистрацию
                </Button>
                <Button onClick={() => navigate("/dashboard")} variant="outline" className="w-full">
                  Перейти на Dashboard
                </Button>
              </div>
            </div>
          ) : inviteError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{inviteError}</AlertDescription>
            </Alert>
          ) : inviteToken ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Имя *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Иван"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Фамилия *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Иванов"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={!!inviteToken.invited_email}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Пароль *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Минимум 6 символов"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                    className="pl-10"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Регистрация..." : "Зарегистрироваться"}
              </Button>

              <div className="text-center text-sm">
                Уже есть аккаунт?{" "}
                <Button
                  type="button"
                  variant="link"
                  className="p-0"
                  onClick={() => navigate("/auth")}
                >
                  Войти
                </Button>
              </div>
            </form>
          ) : (
            <div className="text-center text-muted-foreground">Загрузка...</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
