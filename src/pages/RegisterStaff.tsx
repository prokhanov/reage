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
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    const validateInvite = async () => {
      const token = searchParams.get("invite");
      
      if (!token) {
        setInviteError("Отсутствует токен приглашения");
        return;
      }

      const { data, error } = await supabase
        .from("invite_tokens")
        .select("*")
        .eq("token", token)
        .is("used_by", null)
        .maybeSingle();

      if (error) {
        console.error("Invite validation error:", error);
        setInviteError("Ошибка при проверке приглашения");
        return;
      }

      if (!data) {
        setInviteError("Недействительное или использованное приглашение");
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
        const nameParts = (metadata.name || "").split(" ");
        setFormData(prev => ({
          ...prev,
          firstName: nameParts[1] || "",
          lastName: nameParts[0] || "",
          email: data.invited_email || prev.email,
        }));
      } else if (data.invited_email) {
        setFormData(prev => ({ ...prev, email: data.invited_email }));
      }
    };

    validateInvite();
  }, [searchParams]);

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
      const redirectUrl = `${window.location.origin}/`;

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: `${formData.firstName} ${formData.lastName}`.trim()
          }
        }
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("Не удалось создать пользователя");

      const metadata = inviteToken.metadata as any;
      
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: authData.user.id,
          name: metadata?.name || `${formData.firstName} ${formData.lastName}`.trim(),
          gender: metadata?.gender || "male",
          birth_date: metadata?.birth_date || new Date().toISOString().split('T')[0],
        });

      if (profileError) throw profileError;

      // Применить все роли из metadata или одну роль из invite
      const rolesToInsert = metadata?.roles || [inviteToken.role];
      const roleInserts = rolesToInsert.map((role: string) => ({
        user_id: authData.user.id,
        role: role,
      }));

      const { error: roleError } = await supabase
        .from("user_roles")
        .insert(roleInserts);

      if (roleError) throw roleError;

      const { error: updateError } = await supabase
        .from("invite_tokens")
        .update({
          used_by: authData.user.id,
          used_at: new Date().toISOString(),
        })
        .eq("id", inviteToken.id);

      if (updateError) throw updateError;

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
          {inviteError ? (
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
