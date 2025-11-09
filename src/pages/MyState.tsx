import { useState, useEffect } from "react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Check, Calendar, TrendingUp, AlertCircle, Edit, CheckCircle, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import { ru } from "date-fns/locale";
import { useViewAsUser } from "@/hooks/useViewAsUser";
import { CompareRecordsDialog } from "@/components/symptom-history/CompareRecordsDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MyStateSkeleton } from "@/components/skeletons/MyStateSkeleton";

interface Prescription {
  id: string;
  prescription: string;
  effect: string | null;
  control_date: string | null;
  status: string;
}

const adherenceLevels = [
  { value: 0, label: "Почти не придерживался(ась)", color: "text-red-500", bgColor: "bg-red-500/10", borderColor: "border-red-500" },
  { value: 1, label: "Иногда пропускал(а)", color: "text-orange-500", bgColor: "bg-orange-500/10", borderColor: "border-orange-500" },
  { value: 2, label: "В основном да", color: "text-blue-500", bgColor: "bg-blue-500/10", borderColor: "border-blue-500" },
  { value: 3, label: "Всегда", color: "text-green-500", bgColor: "bg-green-500/10", borderColor: "border-green-500" }
];

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
  const [adherenceAnswers, setAdherenceAnswers] = useState<Record<string, number>>({});
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [symptoms, setSymptoms] = useState<SymptomRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [lastTrackedDate, setLastTrackedDate] = useState<string | null>(null);
  const [canTakeSurvey, setCanTakeSurvey] = useState(true);
  const [daysUntilNextSurvey, setDaysUntilNextSurvey] = useState(0);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const hasAdherenceStep = prescriptions.length > 0;
  const totalSteps = symptomCategories.length + (hasAdherenceStep ? 1 : 0);
  const isAdherenceStep = hasAdherenceStep && currentStep === 0;
  const categoryIndex = hasAdherenceStep ? currentStep - 1 : currentStep;
  const currentCategory = !isAdherenceStep && categoryIndex >= 0 ? symptomCategories[categoryIndex] : null;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  useEffect(() => {
    fetchPrescriptions();
    fetchSymptoms();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      const userId = await getUserId();
      if (!userId) return;

      const { data, error } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'confirmed')
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrescriptions(data || []);
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
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
        const lastDate = data[0].tracked_at;
        setLastTrackedDate(lastDate);
        
        // Проверяем, сколько дней прошло с последнего опроса
        const daysSinceLastSurvey = differenceInDays(new Date(), new Date(lastDate));
        const daysLeft = 10 - daysSinceLastSurvey;
        
        if (daysSinceLastSurvey < 10) {
          setCanTakeSurvey(false);
          setDaysUntilNextSurvey(daysLeft);
        } else {
          setCanTakeSurvey(true);
          setDaysUntilNextSurvey(0);
        }
      } else {
        setCanTakeSurvey(true);
        setDaysUntilNextSurvey(0);
      }
    } catch (error) {
      console.error('Error fetching symptoms:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleAnswerChange = (symptom: string, severity: number) => {
    if (currentCategory) {
      setAnswers(prev => ({
        ...prev,
        [`${currentCategory.title}|${symptom}`]: severity
      }));
    }
  };

  const handleAdherenceChange = (prescriptionId: string, level: number) => {
    setAdherenceAnswers(prev => ({
      ...prev,
      [prescriptionId]: level
    }));
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
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

      // Если редактируем существующую запись, удаляем старые данные за эту дату
      if (editingDate) {
        const recordSymptoms = groupedByDate[editingDate];
        const symptomIds = recordSymptoms.map(s => s.id);
        
        const { error: deleteError } = await supabase
          .from('user_symptoms')
          .delete()
          .in('id', symptomIds);
        
        if (deleteError) throw deleteError;
      }

      // Сначала сохраняем соблюдение назначений
      if (Object.keys(adherenceAnswers).length > 0) {
        const adherenceData = Object.entries(adherenceAnswers).map(([prescriptionId, level]) => ({
          user_id: userId,
          prescription_id: prescriptionId,
          adherence_level: level,
          tracked_at: new Date().toISOString()
        }));

        // @ts-ignore - Type will be available after DB types regeneration
        const { error: adherenceError } = await supabase.from('prescription_adherence').insert(adherenceData);

        if (adherenceError) throw adherenceError;
      }

      // Сохраняем симптомы (историческая запись)
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

      if (symptomsData.length === 0 && Object.keys(adherenceAnswers).length === 0) {
        toast({
          title: "Все отлично! 🎉",
          description: "Данные сохранены"
        });
        setEditingDate(null);
        setIsEditDialogOpen(false);
        await fetchSymptoms();
        return;
      }

      if (symptomsData.length > 0) {
        const { error } = await supabase
          .from('user_symptoms')
          .insert(symptomsData);

        if (error) throw error;
      }

      const adherenceCount = Object.keys(adherenceAnswers).length;
      const symptomsCount = symptomsData.length;
      const parts = [];
      if (adherenceCount > 0) parts.push(`Соблюдение: ${adherenceCount}`);
      if (symptomsCount > 0) parts.push(`Симптомы: ${symptomsCount}`);

      toast({
        title: "Успешно сохранено! ✅",
        description: parts.join(", ")
      });

      // Сбрасываем форму
      setAnswers({});
      setAdherenceAnswers({});
      setCurrentStep(0);
      setEditingDate(null);
      
      await fetchSymptoms();
    } catch (error) {
      console.error('Error saving data:', error);
      toast({
        title: "Ошибка сохранения",
        description: "Попробуйте еще раз",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Группировка по датам для истории
  const groupedByDate = symptoms.reduce((acc, symptom) => {
    const date = format(new Date(symptom.tracked_at), "yyyy-MM-dd");
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(symptom);
    return acc;
  }, {} as Record<string, SymptomRecord[]>);

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  if (loadingHistory) {
    return <MyStateSkeleton />;
  }

  const getSeverityConfig = (severity: number) => {
    return severityLevels[severity] || severityLevels[0];
  };

  const getTotalSymptomsByLevel = (symptomsToCount = symptoms) => {
    const counts = { mild: 0, moderate: 0, severe: 0 };
    symptomsToCount.forEach(s => {
      if (s.severity === 1) counts.mild++;
      if (s.severity === 2) counts.moderate++;
      if (s.severity === 3) counts.severe++;
    });
    return counts;
  };

  const latestSymptoms = sortedDates.length > 0 ? groupedByDate[sortedDates[0]] : [];
  const stats = getTotalSymptomsByLevel(latestSymptoms);

  const handleEditLastSurvey = () => {
    if (latestSymptoms.length === 0) return;
    
    // Загружаем последние ответы в форму
    const lastAnswers: Record<string, number> = {};
    latestSymptoms.forEach(symptom => {
      lastAnswers[`${symptom.category}|${symptom.symptom}`] = symptom.severity;
    });
    
    const dateToEdit = format(new Date(latestSymptoms[0].tracked_at), "yyyy-MM-dd");
    setEditingDate(dateToEdit);
    setAnswers(lastAnswers);
    setCurrentStep(0);
    setIsEditDialogOpen(true);
    
    toast({
      title: "Режим редактирования",
      description: "Вы можете изменить ответы из последнего опроса"
    });
  };

  const handleEditRecord = (date: string) => {
    const recordSymptoms = groupedByDate[date];
    if (recordSymptoms.length === 0) return;
    
    // Загружаем ответы за выбранную дату
    const recordAnswers: Record<string, number> = {};
    recordSymptoms.forEach(symptom => {
      recordAnswers[`${symptom.category}|${symptom.symptom}`] = symptom.severity;
    });
    
    setEditingDate(date);
    setAnswers(recordAnswers);
    setCurrentStep(0);
    setIsEditDialogOpen(true);
    
    toast({
      title: "Режим редактирования",
      description: `Загружены данные от ${format(new Date(date), "d MMMM yyyy", { locale: ru })}`
    });
  };

  const handleDeleteRecord = async (date: string) => {
    try {
      const recordSymptoms = groupedByDate[date];
      const symptomIds = recordSymptoms.map(s => s.id);
      
      const { error } = await supabase
        .from('user_symptoms')
        .delete()
        .in('id', symptomIds);
      
      if (error) throw error;
      
      toast({
        title: "Запись удалена",
        description: `Удалены данные от ${format(new Date(date), "d MMMM yyyy", { locale: ru })}`
      });
      
      await fetchSymptoms();
    } catch (error) {
      console.error('Error deleting record:', error);
      toast({
        title: "Ошибка удаления",
        description: "Попробуйте еще раз",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">Мое состояние</h1>
        <p className="text-muted-foreground">
          Отслеживайте свои симптомы и следите за изменениями
        </p>
      </div>

      <Tabs defaultValue="survey" className="w-full">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="survey">Опросник</TabsTrigger>
            <TabsTrigger value="history">История</TabsTrigger>
          </TabsList>

          {/* Survey Tab */}
          <TabsContent value="survey" className="space-y-6">
            <div className="max-w-4xl mx-auto">
              {!canTakeSurvey && (
                <Card className="p-8 text-center bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-primary" />
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold">Спасибо за заполнение! ✨</h3>
                      <p className="text-muted-foreground">
                        Вы уже заполнили опрос. Следующий опрос будет доступен через
                      </p>
                      <p className="text-3xl font-bold text-primary">
                        {daysUntilNextSurvey} {daysUntilNextSurvey === 1 ? 'день' : daysUntilNextSurvey < 5 ? 'дня' : 'дней'}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 mt-4">
                      <Button
                        onClick={handleEditLastSurvey}
                        variant="outline"
                        className="gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Редактировать последний опрос
                      </Button>
                    </div>

                    <div className="mt-6 p-4 bg-background/50 rounded-lg border">
                      <p className="text-sm text-muted-foreground">
                        Последнее заполнение: {lastTrackedDate && format(new Date(lastTrackedDate), "d MMMM yyyy, HH:mm", { locale: ru })}
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {canTakeSurvey && (
              <>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    Шаг {currentStep + 1} из {totalSteps}
                  </span>
                  <span className="text-sm font-medium">
                    {Math.round(progress)}%
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {isAdherenceStep ? (
                <Card className="p-6 md:p-8 bg-card/50 backdrop-blur border-border/50">
                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-4xl">📋</span>
                      <h2 className="text-2xl font-bold">Соблюдение назначений</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Оцените, как вы следовали рекомендациям
                    </p>
                  </div>

                  <div className="space-y-6">
                    {prescriptions.map((prescription) => (
                      <div key={prescription.id} className="space-y-4 p-4 border border-border rounded-lg bg-background/50">
                        <div>
                          <h3 className="font-semibold mb-1">{prescription.prescription}</h3>
                          {prescription.effect && (
                            <p className="text-sm text-muted-foreground">{prescription.effect}</p>
                          )}
                        </div>

                        <RadioGroup
                          value={adherenceAnswers[prescription.id]?.toString() || ""}
                          onValueChange={(value) => handleAdherenceChange(prescription.id, parseInt(value))}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {adherenceLevels.map((level) => (
                              <div key={level.value}>
                                <RadioGroupItem
                                  value={level.value.toString()}
                                  id={`${prescription.id}-${level.value}`}
                                  className="peer sr-only"
                                />
                                <Label
                                  htmlFor={`${prescription.id}-${level.value}`}
                                  className={`flex items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all ${level.bgColor} ${
                                    adherenceAnswers[prescription.id] === level.value
                                      ? `${level.borderColor} ring-2 ring-offset-2`
                                      : 'border-border hover:border-muted-foreground/50'
                                  }`}
                                >
                                  <span className={`text-sm font-medium ${level.color}`}>
                                    {level.label}
                                  </span>
                                </Label>
                              </div>
                            ))}
                          </div>
                        </RadioGroup>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-4 mt-8">
                    <Button
                      variant="outline"
                      onClick={handlePrevious}
                      disabled={currentStep === 0}
                      className="flex-1"
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Назад
                    </Button>

                    <Button
                      onClick={handleNext}
                      className="flex-1"
                    >
                      Далее
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ) : currentCategory ? (
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
              ) : null}
              </>
              )}
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
                        <p className="text-sm text-muted-foreground">Последняя запись</p>
                        <p className="text-2xl font-bold">{latestSymptoms.length}</p>
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
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>История заполнений: {sortedDates.length}</span>
                    </div>
                    <CompareRecordsDialog 
                      groupedByDate={groupedByDate}
                      sortedDates={sortedDates}
                    />
                  </div>

                  {sortedDates.map((date) => {
                    const dateSymptoms = groupedByDate[date];
                    const dateStats = getTotalSymptomsByLevel(dateSymptoms);
                    const groupedByCategory = dateSymptoms.reduce((acc, symptom) => {
                      if (!acc[symptom.category]) {
                        acc[symptom.category] = [];
                      }
                      acc[symptom.category].push(symptom);
                      return acc;
                    }, {} as Record<string, SymptomRecord[]>);
                    
                    return (
                      <Card key={date} className="p-6 border-2">
                        <div className="mb-6">
                          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                            <div>
                              <h3 className="text-xl font-bold">
                                {format(new Date(date), "d MMMM yyyy", { locale: ru })}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(dateSymptoms[0].tracked_at), "HH:mm", { locale: ru })}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="flex gap-2">
                                {dateStats.mild > 0 && (
                                  <Badge variant="outline" className="text-yellow-500">
                                    {dateStats.mild} легких
                                  </Badge>
                                )}
                                {dateStats.moderate > 0 && (
                                  <Badge variant="outline" className="text-orange-500">
                                    {dateStats.moderate} средних
                                  </Badge>
                                )}
                                {dateStats.severe > 0 && (
                                  <Badge variant="destructive">
                                    {dateStats.severe} сильных
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditRecord(date)}
                                  className="gap-2"
                                  disabled={isViewMode}
                                >
                                  <Edit className="w-4 h-4" />
                                  Редактировать
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteRecord(date)}
                                  className="gap-2 text-destructive hover:text-destructive"
                                  disabled={isViewMode}
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Удалить
                                </Button>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            {Object.entries(groupedByCategory).map(([category, categorySymptoms]) => {
                              const emoji = categoryEmojis[category] || "📋";
                              
                              return (
                                <div key={category} className="border-l-4 border-primary/20 pl-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-2xl">{emoji}</span>
                                    <h4 className="font-semibold">{category}</h4>
                                    <Badge variant="secondary" className="ml-auto">
                                      {categorySymptoms.length}
                                    </Badge>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {categorySymptoms.map((symptom) => {
                                      const config = getSeverityConfig(symptom.severity);
                                      
                                      return (
                                        <div
                                          key={symptom.id}
                                          className="flex items-center justify-between p-2 rounded-lg bg-background/50 border border-border/30"
                                        >
                                          <span className="text-sm flex-1">{symptom.symptom}</span>
                                          <Badge 
                                            variant={config.badgeVariant}
                                            className={`${config.color} text-xs`}
                                          >
                                            {config.label}
                                          </Badge>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Редактирование опроса
                {editingDate && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    от {format(new Date(editingDate), "d MMMM yyyy", { locale: ru })}
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    Шаг {currentStep + 1} из {totalSteps}
                  </span>
                  <span className="text-sm font-medium">
                    {Math.round(progress)}%
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {isAdherenceStep ? (
                <div className="space-y-6">
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-4xl">📋</span>
                      <h2 className="text-2xl font-bold">Соблюдение назначений</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Оцените, как вы следовали рекомендациям
                    </p>
                  </div>

                  <div className="space-y-6">
                    {prescriptions.map((prescription) => (
                      <div key={prescription.id} className="space-y-4 p-4 border border-border rounded-lg bg-background/50">
                        <div>
                          <h3 className="font-semibold mb-1">{prescription.prescription}</h3>
                          {prescription.effect && (
                            <p className="text-sm text-muted-foreground">{prescription.effect}</p>
                          )}
                        </div>

                        <RadioGroup
                          value={adherenceAnswers[prescription.id]?.toString() || ""}
                          onValueChange={(value) => handleAdherenceChange(prescription.id, parseInt(value))}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {adherenceLevels.map((level) => (
                              <div key={level.value}>
                                <RadioGroupItem
                                  value={level.value.toString()}
                                  id={`dialog-${prescription.id}-${level.value}`}
                                  className="peer sr-only"
                                />
                                <Label
                                  htmlFor={`dialog-${prescription.id}-${level.value}`}
                                  className={`flex items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all ${level.bgColor} ${
                                    adherenceAnswers[prescription.id] === level.value
                                      ? `${level.borderColor} ring-2 ring-offset-2`
                                      : 'border-border hover:border-muted-foreground/50'
                                  }`}
                                >
                                  <span className={`text-sm font-medium ${level.color}`}>
                                    {level.label}
                                  </span>
                                </Label>
                              </div>
                            ))}
                          </div>
                        </RadioGroup>
                      </div>
                    ))}
                  </div>
                </div>
              ) : currentCategory ? (
                <div className="space-y-6">
                  <div className="mb-6">
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
                                  htmlFor={`dialog-${key}-${level.value}`}
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
                                    id={`dialog-${key}-${level.value}`}
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
                </div>
              ) : null}

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  className="flex-1"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Назад
                </Button>

                {currentStep < totalSteps - 1 ? (
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
                    {isSubmitting ? "Сохранение..." : "Сохранить"}
                    <Check className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
  );
}
