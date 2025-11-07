import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Check, Calendar, TrendingUp, AlertCircle, Scale } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useViewAsUser } from "@/hooks/useViewAsUser";

const symptomCategories = [
  {
    emoji: "🧠",
    title: "Энергия и фокус",
    symptoms: [
      "Постоянная усталость",
      "Просыпаюсь уставшим",
      "Днём тянет спать",
      "Нужен кофе, чтобы \"запуститься\"",
      "Нет мотивации",
      "Трудно сосредоточиться",
      "Голова как \"в тумане\"",
      "Память ухудшилась",
      "Становлюсь рассеянным",
      "Часто злюсь без причины",
      "Уровень энергии скачет в течение дня"
    ]
  },
  {
    emoji: "😴",
    title: "Сон и восстановление",
    symptoms: [
      "Трудно заснуть",
      "Просыпаюсь ночью",
      "Поверхностный сон",
      "Сны тревожные, частые",
      "Рано просыпаюсь и не могу уснуть",
      "После сна не чувствую отдыха",
      "Храп, апноэ",
      "Часто встаю в туалет ночью",
      "Ложусь поздно, не могу уснуть до 2 ночи"
    ]
  },
  {
    emoji: "💪",
    title: "Обмен веществ и вес",
    symptoms: [
      "Сложно худеть",
      "Вес растёт, даже если ем мало",
      "Быстро набираю после диеты",
      "Часто тянет на сладкое",
      "После еды клонит в сон",
      "Чувство тяжести после еды",
      "Вздутие живота",
      "Запоры или нестабельный стул",
      "Часто отёки по утрам",
      "Потею сильнее обычного",
      "Живот увеличился, особенно низ",
      "Холодные руки и ноги"
    ]
  },
  {
    emoji: "❤️",
    title: "Сердце и сосуды",
    symptoms: [
      "Сердцебиения",
      "Повышенное давление",
      "Пониженное давление",
      "Головокружения",
      "Мушки перед глазами",
      "Пульс стал чаще",
      "Покалывания или сжатие в груди",
      "Быстро устаю при нагрузке"
    ]
  },
  {
    emoji: "🧘‍♂️",
    title: "Гормоны и либидо",
    symptoms: [
      "Пониженное либидо",
      "Эрекция слабая или нестабильная",
      "У женщин — снижение чувствительности",
      "Сложно получить оргазм",
      "У мужчин — уменьшение утренних эрекций",
      "Цикл стал нерегулярным",
      "У женщин — ПМС, раздражительность перед месячными",
      "Выпадают волосы",
      "Повышенная жирность кожи",
      "Потеря мышечной массы",
      "Настроение \"качели\"",
      "Частая раздражительность"
    ]
  },
  {
    emoji: "🦴",
    title: "Микроэлементы и кости",
    symptoms: [
      "Судороги ног, особенно ночью",
      "Мышцы \"сводит\"",
      "Ломкие ногти",
      "Волосы стали тоньше",
      "Часто трещины на губах",
      "Кожа сухая",
      "Мурашки без причины",
      "Зубы стали чувствительными",
      "Ломота в костях"
    ]
  },
  {
    emoji: "💉",
    title: "Иммунитет и воспаление",
    symptoms: [
      "Часто болею",
      "Простуды затягиваются",
      "Слизистые воспаляются",
      "Повышенная температура \"без причины\"",
      "Болят суставы",
      "Подташнивает время от времени",
      "Есть хронические воспаления (гайморит, кожа, ЖКТ)",
      "Медленно заживают раны",
      "Слабая переносимость жары или холода"
    ]
  },
  {
    emoji: "🌿",
    title: "Витамины и антиоксиданты",
    symptoms: [
      "Бледная кожа",
      "Тусклый цвет лица",
      "Сухие губы",
      "Мешки под глазами",
      "Зрение ухудшилось",
      "Частые головные боли",
      "После тренировок долго восстанавливаюсь",
      "Повышенная чувствительность к солнцу",
      "Руки дрожат при усталости"
    ]
  },
  {
    emoji: "🧠",
    title: "Эмоции и стресс",
    symptoms: [
      "Частая тревожность",
      "Панические атаки",
      "Эмоциональные качели",
      "Не могу расслабиться",
      "Раздражает всё",
      "Ощущение внутреннего напряжения",
      "Плаксивость",
      "Невозможность \"остановить мысли\"",
      "Ощущение апатии",
      "Устал от людей",
      "Нет желания что-либо делать"
    ]
  },
  {
    emoji: "💧",
    title: "Внешний вид",
    symptoms: [
      "Кожа сероватая, сухая или тусклая",
      "Прыщи у взрослых",
      "Отёки под глазами",
      "Волосы ломаются и выпадают",
      "Лицо выглядит \"усталым\"",
      "Морщины усилились",
      "Потеря упругости кожи",
      "Пигментные пятна"
    ]
  },
  {
    emoji: "⚙️",
    title: "Старение и долголетие",
    symptoms: [
      "Ощущение, что \"старею быстро\"",
      "Меньше выносливости, чем раньше",
      "После стрессов восстанавливаюсь медленно",
      "Мышцы теряют тонус",
      "Ногти растут медленнее",
      "Дольше восстанавливаюсь после болезней",
      "Хуже перевариваю пищу",
      "Часто чувствую \"тяжесть\" во всём теле"
    ]
  }
];

const severityLevels = [
  { value: 0, label: "Нет", color: "text-muted-foreground", badgeVariant: "secondary" as const },
  { value: 1, label: "Легко", color: "text-yellow-500", badgeVariant: "outline" as const },
  { value: 2, label: "Средне", color: "text-orange-500", badgeVariant: "outline" as const },
  { value: 3, label: "Сильно", color: "text-red-500", badgeVariant: "destructive" as const }
];

interface SymptomRecord {
  id: string;
  category: string;
  symptom: string;
  severity: number;
  tracked_at: string;
}

const categoryEmojis: Record<string, string> = {
  "Энергия и фокус": "🧠",
  "Сон и восстановление": "😴",
  "Обмен веществ и вес": "💪",
  "Сердце и сосуды": "❤️",
  "Гормоны и либидо": "🧘‍♂️",
  "Микроэлементы и кости": "🦴",
  "Иммунитет и воспаление": "💉",
  "Витамины и антиоксиданты": "🌿",
  "Эмоции и стресс": "🧠",
  "Внешний вид": "💧",
  "Старение и долголетие": "⚙️"
};

export default function MyState() {
  const { getUserId, isViewMode } = useViewAsUser();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [symptoms, setSymptoms] = useState<SymptomRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [lastTrackedDate, setLastTrackedDate] = useState<string | null>(null);
  const [weight, setWeight] = useState<string>("");
  const [isSavingWeight, setIsSavingWeight] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const currentCategory = symptomCategories[currentStep];
  const progress = ((currentStep + 1) / symptomCategories.length) * 100;

  useEffect(() => {
    fetchSymptoms();
    fetchWeight();
  }, []);

  const fetchWeight = async () => {
    try {
      const userId = await getUserId();
      if (!userId) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('weight')
        .eq('id', userId)
        .single();

      if (error) throw error;
      if (data?.weight) {
        setWeight(data.weight.toString());
      }
    } catch (error) {
      console.error('Error fetching weight:', error);
    }
  };

  const handleSaveWeight = async () => {
    if (isViewMode) {
      toast({
        title: "Действие недоступно",
        description: "Сохранение данных недоступно в режиме просмотра",
        variant: "destructive"
      });
      return;
    }

    if (!weight || parseFloat(weight) <= 0) {
      toast({
        title: "Ошибка",
        description: "Введите корректный вес",
        variant: "destructive"
      });
      return;
    }

    setIsSavingWeight(true);
    try {
      const userId = await getUserId();
      if (!userId) {
        toast({
          title: "Ошибка",
          description: "Необходимо войти в систему",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ weight: parseFloat(weight) })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Успешно сохранено! ✅",
        description: "Вес обновлен"
      });
    } catch (error) {
      console.error('Error saving weight:', error);
      toast({
        title: "Ошибка сохранения",
        description: "Попробуйте еще раз",
        variant: "destructive"
      });
    } finally {
      setIsSavingWeight(false);
    }
  };

  const fetchSymptoms = async () => {
    try {
      const userId = await getUserId();
      
      if (!userId) return;

      const { data, error } = await supabase
        .from('user_symptoms')
        .select('*')
        .eq('user_id', userId)
        .order('tracked_at', { ascending: false });

      if (error) throw error;

      setSymptoms(data || []);
      
      if (data && data.length > 0) {
        setLastTrackedDate(data[0].tracked_at);
      }
    } catch (error) {
      console.error('Error fetching symptoms:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleAnswerChange = (symptom: string, severity: number) => {
    setAnswers(prev => ({
      ...prev,
      [`${currentCategory.title}|${symptom}`]: severity
    }));
  };

  const handleNext = () => {
    if (currentStep < symptomCategories.length - 1) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = async () => {
    if (isViewMode) {
      toast({
        title: "Действие недоступно",
        description: "Сохранение данных недоступно в режиме просмотра",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const userId = await getUserId();
      
      if (!userId) {
        toast({
          title: "Ошибка",
          description: "Необходимо войти в систему",
          variant: "destructive"
        });
        return;
      }

      await supabase
        .from('user_symptoms')
        .delete()
        .eq('user_id', userId);

      const symptomsData = Object.entries(answers)
        .filter(([_, severity]) => severity > 0)
        .map(([key, severity]) => {
          const [category, symptom] = key.split('|');
          return {
            user_id: userId,
            category,
            symptom,
            severity
          };
        });

      if (symptomsData.length === 0) {
        toast({
          title: "Все отлично! 🎉",
          description: "У вас не отмечено ни одного симптома"
        });
        await fetchSymptoms();
        return;
      }

      const { error } = await supabase
        .from('user_symptoms')
        .insert(symptomsData);

      if (error) throw error;

      toast({
        title: "Успешно сохранено! ✅",
        description: `Отслеживается ${symptomsData.length} симптомов`
      });

      await fetchSymptoms();
    } catch (error) {
      console.error('Error saving symptoms:', error);
      toast({
        title: "Ошибка сохранения",
        description: "Попробуйте еще раз",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const groupedByCategory = symptoms.reduce((acc, symptom) => {
    if (!acc[symptom.category]) {
      acc[symptom.category] = [];
    }
    acc[symptom.category].push(symptom);
    return acc;
  }, {} as Record<string, SymptomRecord[]>);

  const getSeverityConfig = (severity: number) => {
    return severityLevels[severity] || severityLevels[0];
  };

  const getTotalSymptomsByLevel = () => {
    const counts = { mild: 0, moderate: 0, severe: 0 };
    symptoms.forEach(s => {
      if (s.severity === 1) counts.mild++;
      if (s.severity === 2) counts.moderate++;
      if (s.severity === 3) counts.severe++;
    });
    return counts;
  };

  const stats = getTotalSymptomsByLevel();

  return (
    <DashboardLayout>
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Мое состояние</h1>
          <p className="text-muted-foreground">
            Отслеживайте свои симптомы и следите за изменениями
          </p>
        </div>

        {/* Weight Tracker */}
        <Card className="p-6 mb-8 max-w-2xl mx-auto">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Scale className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-1">Текущий вес</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Отслеживайте изменения веса для контроля прогресса
              </p>
              <div className="flex gap-3">
                <div className="flex-1 max-w-xs">
                  <div className="relative">
                    <Input
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="Введите вес"
                      step="0.1"
                      min="0"
                      max="500"
                      className="pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      кг
                    </span>
                  </div>
                </div>
                <Button 
                  onClick={handleSaveWeight}
                  disabled={isSavingWeight || !weight}
                >
                  {isSavingWeight ? "Сохранение..." : "Сохранить"}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Tabs defaultValue="survey" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="survey">Опросник</TabsTrigger>
            <TabsTrigger value="history">История</TabsTrigger>
          </TabsList>

          {/* Survey Tab */}
          <TabsContent value="survey" className="space-y-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    Шаг {currentStep + 1} из {symptomCategories.length}
                  </span>
                  <span className="text-sm font-medium">
                    {Math.round(progress)}%
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              <Card className="p-6 md:p-8 bg-card/50 backdrop-blur border-border/50">
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-4xl">{currentCategory.emoji}</span>
                    <h2 className="text-2xl font-bold">{currentCategory.title}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Отметьте все симптомы, которые вы испытываете
                  </p>
                </div>

                <div className="space-y-6">
                  {currentCategory.symptoms.map((symptom, index) => {
                    const key = `${currentCategory.title}|${symptom}`;
                    const currentValue = answers[key] || 0;

                    return (
                      <div 
                        key={index}
                        className="p-4 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
                      >
                        <div className="mb-3">
                          <label className="text-sm font-medium leading-relaxed">
                            {symptom}
                          </label>
                        </div>
                        
                        <RadioGroup
                          value={currentValue.toString()}
                          onValueChange={(value) => handleAnswerChange(symptom, parseInt(value))}
                          className="flex gap-2"
                        >
                          {severityLevels.map((level) => (
                            <div key={level.value} className="flex-1">
                              <Label
                                htmlFor={`${key}-${level.value}`}
                                className={`
                                  flex flex-col items-center gap-2 p-3 rounded-md border-2 cursor-pointer
                                  transition-all hover:border-primary/50
                                  ${currentValue === level.value 
                                    ? 'border-primary bg-primary/10' 
                                    : 'border-border/50 bg-background/50'
                                  }
                                `}
                              >
                                <RadioGroupItem
                                  value={level.value.toString()}
                                  id={`${key}-${level.value}`}
                                  className="sr-only"
                                />
                                <span className={`text-xs font-medium ${level.color}`}>
                                  {level.label}
                                </span>
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-3 mt-8">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentStep === 0}
                    className="flex-1"
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Назад
                  </Button>

                  {currentStep < symptomCategories.length - 1 ? (
                    <Button
                      onClick={handleNext}
                      className="flex-1"
                    >
                      Далее
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="flex-1"
                    >
                      {isSubmitting ? "Сохранение..." : "Завершить"}
                      <Check className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            {loadingHistory ? (
              <div className="animate-pulse space-y-4">
                <div className="h-32 bg-muted rounded"></div>
                <div className="h-64 bg-muted rounded"></div>
              </div>
            ) : symptoms.length === 0 ? (
              <Card className="p-12 text-center">
                <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Нет записей</h2>
                <p className="text-muted-foreground">
                  Пройдите опросник, чтобы начать отслеживать симптомы
                </p>
              </Card>
            ) : (
              <>
                {lastTrackedDate && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">
                      Последнее обновление: {format(new Date(lastTrackedDate), "d MMMM yyyy, HH:mm", { locale: ru })}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Всего симптомов</p>
                        <p className="text-2xl font-bold">{symptoms.length}</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-primary" />
                    </div>
                  </Card>

                  <Card className="p-6 bg-yellow-500/5">
                    <div>
                      <p className="text-sm text-muted-foreground">Легкие</p>
                      <p className="text-2xl font-bold text-yellow-500">{stats.mild}</p>
                    </div>
                  </Card>

                  <Card className="p-6 bg-orange-500/5">
                    <div>
                      <p className="text-sm text-muted-foreground">Средние</p>
                      <p className="text-2xl font-bold text-orange-500">{stats.moderate}</p>
                    </div>
                  </Card>

                  <Card className="p-6 bg-red-500/5">
                    <div>
                      <p className="text-sm text-muted-foreground">Сильные</p>
                      <p className="text-2xl font-bold text-red-500">{stats.severe}</p>
                    </div>
                  </Card>
                </div>

                <div className="space-y-6">
                  {Object.entries(groupedByCategory).map(([category, categorySymptoms]) => {
                    const emoji = categoryEmojis[category] || "📋";
                    
                    return (
                      <Card key={category} className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="text-3xl">{emoji}</span>
                          <div>
                            <h2 className="text-xl font-bold">{category}</h2>
                            <p className="text-sm text-muted-foreground">
                              {categorySymptoms.length} {categorySymptoms.length === 1 ? 'симптом' : 'симптомов'}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {categorySymptoms.map((symptom) => {
                            const config = getSeverityConfig(symptom.severity);
                            
                            return (
                              <div
                                key={symptom.id}
                                className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
                              >
                                <span className="text-sm flex-1">{symptom.symptom}</span>
                                <Badge 
                                  variant={config.badgeVariant}
                                  className={config.color}
                                >
                                  {config.label}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
