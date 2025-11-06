import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Activity, TrendingUp, Brain, Heart } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Filter } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BodyHeatmap } from "@/components/BodyHeatmap";

export default function Dashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analysesCount, setAnalysesCount] = useState(0);
  const [latestBioAge, setLatestBioAge] = useState<number | null>(null);
  const [latestHealthIndex, setLatestHealthIndex] = useState<number | null>(null);
  const [ageTrend, setAgeTrend] = useState<string | null>(null);
  const [agingRate, setAgingRate] = useState<number | null>(null);
  const [recentAnalyses, setRecentAnalyses] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [trendMeta, setTrendMeta] = useState<{ name: string; unit: string } | null>(null);
  const [trendCategories, setTrendCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [bodyHeatmapData, setBodyHeatmapData] = useState<any[]>([]);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (profile) {
      fetchAnalysesStats();
      fetchBiomarkerTrend();
      fetchBodyHeatmapData();
    }
  }, [profile]);

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
        
        // Рассчитываем скорость старения
        if (latestAnalysis.biological_age && profile?.birth_date) {
          const chronologicalAge = calculateAge(profile.birth_date);
          const rate = latestAnalysis.biological_age / chronologicalAge;
          setAgingRate(rate);
        }
        
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
      setSelectedCategories(allCategories); // Select all by default
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

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const selectAllCategories = () => {
    setSelectedCategories(trendCategories);
  };

  const deselectAllCategories = () => {
    setSelectedCategories([]);
  };

  const fetchBodyHeatmapData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Получаем последний анализ
      const { data: analyses } = await supabase
        .from("analyses")
        .select("id")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(1);

      if (!analyses || analyses.length === 0) return;

      // Получаем биомаркеры последнего анализа с их нормами
      const { data: biomarkerValues, error } = await supabase
        .from("analysis_values")
        .select(`
          value,
          biomarkers (
            name,
            category,
            normal_min,
            normal_max
          )
        `)
        .eq("analysis_id", analyses[0].id);

      if (error) throw error;

      const formattedData = biomarkerValues?.map((item: any) => ({
        category: item.biomarkers.category,
        name: item.biomarkers.name,
        value: item.value,
        normal_min: item.biomarkers.normal_min,
        normal_max: item.biomarkers.normal_max
      })) || [];

      setBodyHeatmapData(formattedData);
    } catch (error) {
      console.error("Error fetching body heatmap data:", error);
    }
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

  const chronologicalAge = profile?.birth_date ? calculateAge(profile.birth_date) : null;
  const ageDifference = latestBioAge && chronologicalAge ? chronologicalAge - latestBioAge : null;
  const circleProgress = latestHealthIndex ? latestHealthIndex : 0;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Добро пожаловать, {profile?.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Паспортный возраст: <span className="text-primary font-medium">{chronologicalAge || "—"} лет</span>
          </p>
        </div>

        {/* Central Bio Age Circle */}
        <Card className="border-border bg-card backdrop-blur-sm">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16">
              {/* Circular Progress */}
              <div className="relative flex items-center justify-center">
                <svg className="w-64 h-64 transform -rotate-90">
                  {/* Background circle */}
                  <circle
                    cx="128"
                    cy="128"
                    r="112"
                    stroke="hsl(var(--border))"
                    strokeWidth="16"
                    fill="none"
                    opacity="0.2"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="128"
                    cy="128"
                    r="112"
                    stroke={
                      ageDifference && ageDifference > 0 
                        ? "hsl(var(--status-good))" 
                        : ageDifference && ageDifference < 0
                        ? "hsl(var(--status-danger))"
                        : "hsl(var(--primary))"
                    }
                    strokeWidth="16"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 112}`}
                    strokeDashoffset={`${2 * Math.PI * 112 * (1 - circleProgress / 100)}`}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                
                {/* Center content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <div className="text-6xl font-bold text-foreground animate-scale-in">
                    {latestBioAge ? latestBioAge.toFixed(1) : "—"}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    лет
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 px-4">
                    Биологический возраст
                  </div>
                </div>
              </div>

              {/* Age Comparison */}
              <div className="flex flex-col gap-4 text-center lg:text-left">
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-foreground">
                    Ваш биологический возраст
                  </h3>
                  {latestBioAge && chronologicalAge && ageDifference !== null ? (
                    <>
                    {ageDifference > 0 ? (
                      <p className="text-lg text-status-good animate-fade-in">
                        Это на <span className="font-bold text-2xl">{Math.abs(ageDifference).toFixed(1)}</span> {Math.abs(ageDifference) === 1 ? 'год' : 'года'} моложе, чем ваш паспортный возраст! 🎉
                      </p>
                    ) : ageDifference < 0 ? (
                      <p className="text-lg text-status-danger animate-fade-in">
                        Это на <span className="font-bold text-2xl">{Math.abs(ageDifference).toFixed(1)}</span> {Math.abs(ageDifference) === 1 ? 'год' : 'года'} старше вашего паспортного возраста
                      </p>
                      ) : (
                        <p className="text-lg text-muted-foreground animate-fade-in">
                          Это соответствует вашему паспортному возрасту
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-lg text-muted-foreground">
                      Добавьте анализ, чтобы узнать свой биологический возраст
                    </p>
                  )}
                </div>

                {/* Health Index */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 justify-center lg:justify-start">
                    <Heart className="h-5 w-5 text-accent" />
                    <span className="text-sm text-muted-foreground">Индекс здоровья:</span>
                    <span className="text-2xl font-bold text-foreground">{latestHealthIndex || "—"}</span>
                    <span className="text-sm text-muted-foreground">/100</span>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="flex flex-col items-center lg:items-start gap-1">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" />
                      <span className="text-sm text-muted-foreground">Анализов</span>
                    </div>
                    <span className="text-xl font-bold text-foreground">{analysesCount}</span>
                  </div>
                  <div className="flex flex-col items-center lg:items-start gap-1">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-status-good" />
                      <span className="text-sm text-muted-foreground">Скорость</span>
                    </div>
                    <span className="text-xl font-bold text-foreground">{agingRate ? agingRate.toFixed(2) : "—"}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Secondary Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border bg-card backdrop-blur-sm hover:border-primary/30 transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Разница в возрасте</CardTitle>
              <Brain className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${
                ageDifference && ageDifference > 0 
                  ? "text-status-good" 
                  : ageDifference && ageDifference < 0
                  ? "text-status-danger"
                  : "text-foreground"
              }`}>
                {ageDifference !== null ? (ageDifference > 0 ? `−${ageDifference.toFixed(1)}` : `+${Math.abs(ageDifference).toFixed(1)}`) : "—"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {ageDifference !== null ? "лет от паспортного" : "Требуется анализ"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card backdrop-blur-sm hover:border-primary/30 transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Скорость старения</CardTitle>
              <Activity className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${
                agingRate && agingRate < 1 
                  ? "text-status-good" 
                  : agingRate && agingRate > 1
                  ? "text-status-danger"
                  : "text-foreground"
              }`}>
                {agingRate ? agingRate.toFixed(2) : "—"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {agingRate ? (agingRate < 1 ? "Медленнее нормы" : agingRate > 1 ? "Быстрее нормы" : "Норма") : "Требуется анализ"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card backdrop-blur-sm hover:border-primary/30 transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Тренд за месяц</CardTitle>
              <TrendingUp className="h-5 w-5 text-status-good" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {ageTrend || "—"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Изменение возраста</p>
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
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Large Chart - Biomarkers Over Time */}
          <Card className="lg:col-span-2 border-border bg-card backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Динамика биомаркеров</CardTitle>
                {trendCategories.length > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Filter className="h-4 w-4" />
                        Категории ({selectedCategories.length}/{trendCategories.length})
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 bg-card border-border z-50" align="end">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-sm">Выберите категории</h4>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={selectAllCategories}
                              className="h-7 text-xs"
                            >
                              Все
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={deselectAllCategories}
                              className="h-7 text-xs"
                            >
                              Сброс
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {trendCategories.map((category, index) => {
                            const colors = [
                              "hsl(var(--primary))",
                              "hsl(var(--accent))",
                              "hsl(var(--secondary))",
                              "#10b981",
                              "#f59e0b",
                              "#8b5cf6",
                              "#ec4899",
                              "#06b6d4",
                            ];
                            const color = colors[index % colors.length];
                            
                            return (
                              <div key={category} className="flex items-center space-x-3">
                                <Checkbox
                                  id={category}
                                  checked={selectedCategories.includes(category)}
                                  onCheckedChange={() => toggleCategory(category)}
                                />
                                <label
                                  htmlFor={category}
                                  className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: color }}
                                  />
                                  {category}
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
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
                      {trendCategories
                        .filter(category => selectedCategories.includes(category))
                        .map((category, index) => {
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
                        const color = colors[trendCategories.indexOf(category) % colors.length];
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
              <CardTitle className="text-lg">Карта тела</CardTitle>
            </CardHeader>
            <CardContent>
              {bodyHeatmapData.length > 0 ? (
                <BodyHeatmap biomarkerData={bodyHeatmapData} />
              ) : (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Activity className="h-16 w-16 mx-auto mb-4 opacity-20" />
                    <p className="text-sm">Нет данных для отображения</p>
                    <p className="text-xs mt-2">Добавьте анализ для просмотра карты тела</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Health Score */}
          <Card className="border-border bg-card backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Общая оценка</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] flex items-center justify-center">
                  <div className="relative w-44 h-44">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="88"
                        cy="88"
                        r="76"
                        stroke="hsl(var(--border))"
                        strokeWidth="12"
                        fill="none"
                      />
                      {latestHealthIndex && (
                        <circle
                          cx="88"
                          cy="88"
                          r="76"
                          stroke="hsl(var(--primary))"
                          strokeWidth="12"
                          fill="none"
                          strokeDasharray="477.52"
                          strokeDashoffset={477.52 - (477.52 * latestHealthIndex) / 100}
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

          <Card className="border-border bg-card backdrop-blur-sm lg:col-span-2">
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
