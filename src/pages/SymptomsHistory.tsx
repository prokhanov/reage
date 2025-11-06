import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Calendar, TrendingUp, AlertCircle } from "lucide-react";

interface SymptomRecord {
  id: string;
  category: string;
  symptom: string;
  severity: number;
  tracked_at: string;
}

const severityConfig = [
  { value: 0, label: "Нет", color: "bg-muted text-muted-foreground", badgeVariant: "secondary" as const },
  { value: 1, label: "Легко", color: "bg-yellow-500/10 text-yellow-500", badgeVariant: "outline" as const },
  { value: 2, label: "Средне", color: "bg-orange-500/10 text-orange-500", badgeVariant: "outline" as const },
  { value: 3, label: "Сильно", color: "bg-red-500/10 text-red-500", badgeVariant: "destructive" as const }
];

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

export default function SymptomsHistory() {
  const [symptoms, setSymptoms] = useState<SymptomRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastTrackedDate, setLastTrackedDate] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchSymptoms();
  }, []);

  const fetchSymptoms = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Ошибка",
          description: "Необходимо войти в систему",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase
        .from('user_symptoms')
        .select('*')
        .eq('user_id', user.id)
        .order('tracked_at', { ascending: false });

      if (error) throw error;

      setSymptoms(data || []);
      
      if (data && data.length > 0) {
        setLastTrackedDate(data[0].tracked_at);
      }
    } catch (error) {
      console.error('Error fetching symptoms:', error);
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить историю симптомов",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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
    return severityConfig[severity] || severityConfig[0];
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container max-w-6xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (symptoms.length === 0) {
    return (
      <DashboardLayout>
        <div className="container max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8">История симптомов</h1>
          
          <Card className="p-12 text-center">
            <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Нет записей</h2>
            <p className="text-muted-foreground">
              Вы еще не проходили опросник "Мое состояние"
            </p>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">История симптомов</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Последнее обновление: {lastTrackedDate && format(new Date(lastTrackedDate), "d MMMM yyyy, HH:mm", { locale: ru })}
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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

        {/* Symptoms by Category */}
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
      </div>
    </DashboardLayout>
  );
}
