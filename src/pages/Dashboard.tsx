import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Activity, TrendingUp, Brain, Heart } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analysesCount, setAnalysesCount] = useState(0);
  const [latestBioAge, setLatestBioAge] = useState<number | null>(null);
  const [latestHealthIndex, setLatestHealthIndex] = useState<number | null>(null);
  const [ageTrend, setAgeTrend] = useState<string | null>(null);
  const [recentAnalyses, setRecentAnalyses] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [trendMeta, setTrendMeta] = useState<{ name: string; unit: string } | null>(null);
  const [trendCategories, setTrendCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchProfile();
    fetchAnalysesStats();
    fetchBiomarkerTrend();
  }, []);

  const fetchAnalysesStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Получаем все анализы пользователя
      const { data: analyses, error: analysesError } = await supabase
        .from("analyses")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });

      if (analysesError) throw analysesError;

      // Получаем последний анализ с показателями
      if (analyses && analyses.length > 0) {
        const latestAnalysis = analyses[0];
        
        // Получаем количество биомаркеров в последнем анализе
        const { data: valuesCount } = await supabase
          .from("analysis_values")
          .select("id", { count: "exact" })
          .eq("analysis_id", latestAnalysis.id);

        setAnalysesCount(analyses.length);
        setLatestBioAge(latestAnalysis.biological_age);
        setLatestHealthIndex(latestAnalysis.health_index);
        setRecentAnalyses(analyses.slice(0, 3)); // Последние 3 анализа
        
        // Рассчитываем тренд если есть предыдущий анализ
        if (analyses.length > 1) {
          const prevAnalysis = analyses[1];
          if (latestAnalysis.biological_age && prevAnalysis.biological_age) {
            const trend = prevAnalysis.biological_age - latestAnalysis.biological_age;
            setAgeTrend(trend > 0 ? `−${trend}` : trend < 0 ? `+${Math.abs(trend)}` : "0");
          }
        }
      }
    } catch (error) {
      console.error("Error fetching analyses stats:", error);
    }
  };

  const fetchBiomarkerTrend = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const monthsAgo = new Date();
      monthsAgo.setMonth(monthsAgo.getMonth() - 6);

      const { data, error } = await supabase
        .from("analysis_values")
        .select(`
          value,
          biomarker_id,
          biomarkers (name, unit, category, normal_min, normal_max),
          analyses!inner (
            date,
            user_id
          )
        `)
        .eq("analyses.user_id", user.id)
        .gte("analyses.date", monthsAgo.toISOString().split("T")[0])
        .order("analyses(date)", { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        setTrendData([]);
        setTrendMeta(null);
        return;
      }

      // Группируем по датам и категориям
      const dateMap: Record<string, Record<string, { sum: number; count: number }>> = {};
      
      data.forEach((item: any) => {
        const date = new Date(item.analyses.date).toLocaleDateString("ru-RU", { 
          day: "numeric", 
          month: "short" 
        });
        const category = item.biomarkers?.category || "Прочее";
        
        if (!dateMap[date]) dateMap[date] = {};
        if (!dateMap[date][category]) dateMap[date][category] = { sum: 0, count: 0 };
        
        // Просто суммируем значения без нормализации
        dateMap[date][category].sum += item.value;
        dateMap[date][category].count += 1;
      });

      // Определяем все категории с данными
      const categoryStats: Record<string, number> = {};
      Object.values(dateMap).forEach(dateData => {
        Object.entries(dateData).forEach(([cat, stats]) => {
          categoryStats[cat] = (categoryStats[cat] || 0) + stats.count;
        });
      });
      
      const allCategories = Object.entries(categoryStats)
        .sort((a, b) => b[1] - a[1])
        .map(([cat]) => cat);

      // Формируем данные для графика с усреднением
      const categoryAverages: Record<string, number[]> = {};
      allCategories.forEach(cat => {
        categoryAverages[cat] = [];
      });

      Object.entries(dateMap).forEach(([date, categories]) => {
        allCategories.forEach(cat => {
          if (categories[cat]) {
            const avg = categories[cat].sum / categories[cat].count;
            categoryAverages[cat].push(avg);
          } else {
            categoryAverages[cat].push(NaN);
          }
        });
      });

      // Нормализуем относительно первого значения (индексация: первое = 100)
      const formatted = Object.keys(dateMap).map((date, idx) => {
        const point: any = { date };
        allCategories.forEach(cat => {
          const values = categoryAverages[cat];
          const firstValue = values.find(v => !isNaN(v));
          const currentValue = values[idx];
          
          if (firstValue && !isNaN(currentValue)) {
            point[cat] = Math.round((currentValue / firstValue) * 100);
          }
        });
        return point;
      });

      setTrendData(formatted);
      setTrendMeta({ 
        name: allCategories.join(", "),
        unit: "индекс (первое = 100%)" 
      });
      setTrendCategories(allCategories);
    } catch (error) {
      console.error("Error fetching biomarker trend:", error);
    }
  };

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Загрузка...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Добро пожаловать, {profile?.full_name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Хронологический возраст: <span className="text-primary font-medium">{profile?.birth_date ? calculateAge(profile.birth_date) : "—"} лет</span>
          </p>
        </div>

        {/* Top Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border bg-card backdrop-blur-sm hover:border-primary/30 transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Биологический возраст</CardTitle>
              <Brain className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {latestBioAge || "—"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {latestBioAge ? "лет" : "Требуется анализ"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card backdrop-blur-sm hover:border-primary/30 transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Индекс здоровья</CardTitle>
              <Heart className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {latestHealthIndex || "—"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">0-100 шкала</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card backdrop-blur-sm hover:border-primary/30 transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Всего анализов</CardTitle>
              <Activity className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{analysesCount}</div>
              <p className="text-xs text-muted-foreground mt-1">За всё время</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card backdrop-blur-sm hover:border-primary/30 transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Тренд</CardTitle>
              <TrendingUp className="h-5 w-5 text-status-good" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {ageTrend || "—"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Изменение за месяц</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Large Chart - Biomarkers Over Time */}
          <Card className="lg:col-span-2 border-border bg-card backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Динамика биомаркеров</CardTitle>
            </CardHeader>
            <CardContent>
              {trendData.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <span className="text-sm text-muted-foreground">
                      Все категории (индекс изменений: базовое = 100%)
                    </span>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis 
                        dataKey="date" 
                        stroke="hsl(var(--foreground))" 
                        style={{ fontSize: '12px' }} 
                      />
                      <YAxis 
                        stroke="hsl(var(--foreground))" 
                        style={{ fontSize: '12px' }} 
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          color: "hsl(var(--foreground))",
                        }}
                      />
                      {trendCategories.map((category, index) => {
                        const colors = [
                          "hsl(var(--primary))",
                          "hsl(var(--accent))",
                          "hsl(var(--secondary))",
                          "#10b981", // green
                          "#f59e0b", // amber
                          "#8b5cf6", // violet
                          "#ec4899", // pink
                          "#06b6d4", // cyan
                        ];
                        const color = colors[index % colors.length];
                        return (
                          <Line
                            key={category}
                            type="monotone"
                            dataKey={category}
                            stroke={color}
                            strokeWidth={2}
                            dot={{ fill: color, r: 4 }}
                            name={category}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Activity className="h-16 w-16 mx-auto mb-4 opacity-20" />
                    <p className="text-sm">Нет данных для отображения</p>
                    <p className="text-xs mt-2">Добавьте анализы для просмотра трендов</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Circular Progress - Health Score */}
          <Card className="border-border bg-card backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Общая оценка</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center">
                  <div className="relative w-48 h-48">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="96"
                        cy="96"
                        r="88"
                        stroke="hsl(var(--border))"
                        strokeWidth="12"
                        fill="none"
                      />
                      {latestHealthIndex && (
                        <circle
                          cx="96"
                          cy="96"
                          r="88"
                          stroke="hsl(var(--primary))"
                          strokeWidth="12"
                          fill="none"
                          strokeDasharray="552.92"
                          strokeDashoffset={552.92 - (552.92 * latestHealthIndex) / 100}
                          className="transition-all duration-1000"
                          style={{ filter: 'drop-shadow(0 0 4px hsl(var(--primary) / 0.5))' }}
                        />
                      )}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-bold text-primary">
                        {latestHealthIndex || "—"}
                      </span>
                      <span className="text-xs text-muted-foreground mt-1">
                        {latestHealthIndex ? "из 100" : "Нет данных"}
                      </span>
                    </div>
                  </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-border bg-card backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Недавние анализы</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentAnalyses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">Анализы отсутствуют</p>
                    <button 
                      onClick={() => navigate("/analyses")}
                      className="mt-4 text-primary hover:text-primary-hover text-sm font-medium transition-colors"
                    >
                      Добавить первый анализ →
                    </button>
                  </div>
                ) : (
                  recentAnalyses.map((analysis) => (
                    <div
                      key={analysis.id}
                      onClick={() => navigate(`/analyses/${analysis.id}`)}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-all border border-border/30 hover:border-primary/30"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {new Date(analysis.date).toLocaleDateString("ru-RU", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                        {analysis.lab_name && (
                          <p className="text-xs text-muted-foreground mt-0.5">{analysis.lab_name}</p>
                        )}
                      </div>
                      {analysis.biological_age && (
                        <div className="text-right">
                          <p className="text-sm font-semibold text-primary">
                            {analysis.biological_age} лет
                          </p>
                          <p className="text-xs text-muted-foreground">био. возраст</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Ключевые рекомендации</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Рекомендации появятся после анализа</p>
                <button 
                  onClick={() => navigate("/recommendations")}
                  className="mt-4 text-primary hover:text-primary-hover text-sm font-medium transition-colors"
                >
                  Смотреть все рекомендации →
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
