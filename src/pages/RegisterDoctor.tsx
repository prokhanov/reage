import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Heart, User, Mail, Lock, AlertCircle, Check
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function RegisterDoctor() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteToken, setInviteToken] = useState<any>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const validateInviteToken = async () => {
      const inviteParam = searchParams.get('invite');
      
      if (!inviteParam) {
        setInviteError("Регистрация возможна только по пригласительной ссылке");
        return;
      }

      const { data, error } = await supabase
        .from("invite_tokens")
        .select("*")
        .eq("token", inviteParam)
        .maybeSingle();

      if (error || !data) {
        setInviteError("Недействительная пригласительная ссылка");
        return;
      }

      if (data.used_at) {
        setInviteError("Эта пригласительная ссылка уже была использована");
        return;
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setInviteError("Срок действия пригласительной ссылки истек");
        return;
      }

      // Pre-fill email if provided
      if (data.invited_email) {
        setFormData(prev => ({ ...prev, email: data.invited_email }));
      }

      setInviteToken(data);
      setInviteError(null);
    };

    validateInviteToken();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteToken) {
      toast({
        title: "Ошибка",
        description: "Регистрация возможна только по пригласительной ссылке",
        variant: "destructive"
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Ошибка",
        description: "Пароли не совпадают",
        variant: "destructive"
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Ошибка",
        description: "Пароль должен содержать минимум 6 символов",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Sign up user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name: formData.name
          }
        }
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("Не удалось создать пользователя");

      // 2. Create profile (simplified for doctors)
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          name: formData.name,
          gender: 'male', // Default value
          birth_date: '1990-01-01', // Default value
        });

      if (profileError) throw profileError;

      // 3. Assign role from invite token
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: inviteToken.role
        });

      if (roleError) throw roleError;

      // 4. Mark invite token as used
      const { error: tokenError } = await supabase
        .from('invite_tokens')
        .update({
          used_at: new Date().toISOString(),
          used_by: authData.user.id
        })
        .eq('id', inviteToken.id);

      if (tokenError) console.error('Failed to mark token as used:', tokenError);

      toast({
        title: "Регистрация успешна! 🎉",
        description: "Добро пожаловать в ReAge"
      });

      navigate('/dashboard');
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: "Ошибка регистрации",
        description: error.message || "Попробуйте еще раз",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <Heart className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-primary mb-2">ReAge</h1>
          <p className="text-muted-foreground">Регистрация врача</p>
        </div>

        {/* Invite Error Alert */}
        {inviteError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Ошибка приглашения</AlertTitle>
            <AlertDescription>{inviteError}</AlertDescription>
          </Alert>
        )}

        {!inviteError && inviteToken && (
          <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Создание учетной записи
              </CardTitle>
              <CardDescription>
                Заполните данные для регистрации в системе
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">ФИО *</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Иванов Иван Иванович"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="doctor@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={!!inviteToken.invited_email}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Пароль *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Минимум 6 символов"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Подтвердите пароль *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Повторите пароль"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    "Регистрация..."
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Зарегистрироваться
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Login Link */}
        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            Уже есть аккаунт?{" "}
            <button 
              onClick={() => navigate('/auth')}
              className="text-primary hover:underline font-medium"
            >
              Войти
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
