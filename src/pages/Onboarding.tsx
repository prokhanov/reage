import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Onboarding() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    mainComplaints: "",
    goals: [] as string[],
    lifestyle: "",
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  const goalsOptions = [
    "Похудеть",
    "Больше энергии",
    "Лучший сон",
    "Здоровье сердца",
    "Замедлить старение",
  ];

  const toggleGoal = (goal: string) => {
    setFormData((prev) => ({
      ...prev,
      goals: prev.goals.includes(goal)
        ? prev.goals.filter((g) => g !== goal)
        : [...prev.goals, goal],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Пользователь не авторизован");

      const { error } = await supabase.from("complaints").insert({
        user_id: user.id,
        main_complaints: formData.mainComplaints,
        goals: formData.goals.join(", "),
        lifestyle: formData.lifestyle,
      });

      if (error) throw error;

      toast({
        title: "Отлично!",
        description: "Анкета сохранена. Перенаправляем на главную страницу...",
      });

      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось сохранить анкету",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-2xl shadow-neon-secondary border-secondary/30 bg-gradient-to-br from-card to-card/50">
        <CardHeader>
          <CardTitle className="text-3xl font-bold bg-gradient-secondary bg-clip-text text-transparent">
            Давайте познакомимся
          </CardTitle>
          <CardDescription>
            Расскажите о своем здоровье и целях, чтобы мы могли дать вам персонализированные
            отчёты
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="complaints">Что вас больше всего беспокоит?</Label>
              <Textarea
                id="complaints"
                placeholder="Например: усталость, проблемы со сном, лишний вес..."
                value={formData.mainComplaints}
                onChange={(e) => setFormData({ ...formData, mainComplaints: e.target.value })}
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Ваши цели</Label>
              <div className="flex flex-wrap gap-2">
                {goalsOptions.map((goal) => (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => toggleGoal(goal)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                      formData.goals.includes(goal)
                        ? "bg-primary text-primary-foreground shadow-neon-primary scale-105"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 border border-border"
                    }`}
                  >
                    {goal}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lifestyle">Образ жизни</Label>
              <Textarea
                id="lifestyle"
                placeholder="Курение, алкоголь, физическая активность, режим дня..."
                value={formData.lifestyle}
                onChange={(e) => setFormData({ ...formData, lifestyle: e.target.value })}
                className="min-h-[100px]"
              />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Сохранение..." : "Сохранить и перейти к дашборду"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
