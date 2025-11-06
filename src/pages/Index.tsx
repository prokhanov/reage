import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Activity, BarChart3, Brain, TrendingUp, Shield, Zap } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 relative">
        <div className="absolute inset-0 bg-gradient-hero opacity-20 blur-3xl" />
        <div className="text-center max-w-4xl mx-auto relative">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-hero bg-clip-text text-transparent animate-pulse">
            Узнай свой биологический возраст и замедли старение
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8">
            Анализы, AI-анализ и понятные рекомендации по здоровью и долголетию
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => navigate("/auth")} 
              className="text-lg px-8 shadow-neon-primary hover:shadow-neon-primary hover:scale-105 transition-all"
            >
              Войти
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/register")}
              className="text-lg px-8 border-primary/50 hover:border-primary hover:shadow-neon-primary transition-all"
            >
              Зарегистрироваться
            </Button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 bg-gradient-primary bg-clip-text text-transparent">
          Как это работает
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center group">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center border border-primary/30 group-hover:shadow-neon-primary transition-all">
              <Activity className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">1. Загрузите анализы</h3>
            <p className="text-muted-foreground">
              Внесите результаты до 50 биомаркеров крови в удобный интерфейс
            </p>
          </div>

          <div className="text-center group">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary/10 flex items-center justify-center border border-secondary/30 group-hover:shadow-neon-secondary transition-all">
              <Brain className="h-8 w-8 text-secondary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">2. AI-анализ</h3>
            <p className="text-muted-foreground">
              Искусственный интеллект анализирует ваши показатели и выявляет паттерны
            </p>
          </div>

          <div className="text-center group">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center border border-accent/30 group-hover:shadow-neon-accent transition-all">
              <TrendingUp className="h-8 w-8 text-accent" />
            </div>
            <h3 className="text-xl font-semibold mb-2">3. Получите рекомендации</h3>
            <p className="text-muted-foreground">
              Персональные советы по питанию, сну, активности и добавкам
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <div className="p-6 rounded-2xl bg-card border border-primary/20 shadow-lg hover:shadow-neon-primary hover:border-primary/50 transition-all">
            <BarChart3 className="h-10 w-10 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Визуализация трендов</h3>
            <p className="text-muted-foreground">
              Отслеживайте изменение показателей во времени с помощью наглядных графиков
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-secondary/20 shadow-lg hover:shadow-neon-secondary hover:border-secondary/50 transition-all">
            <Zap className="h-10 w-10 text-secondary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Индекс здоровья</h3>
            <p className="text-muted-foreground">
              Единая метрика, показывающая общее состояние вашего организма
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-accent/20 shadow-lg hover:shadow-neon-accent hover:border-accent/50 transition-all">
            <Shield className="h-10 w-10 text-accent mb-4" />
            <h3 className="text-xl font-semibold mb-2">Безопасность данных</h3>
            <p className="text-muted-foreground">
              Ваши данные надежно защищены и доступны только вам
            </p>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="p-6 rounded-2xl bg-card/50 border border-border backdrop-blur">
          <p className="text-sm text-muted-foreground text-center">
            <strong>Важно:</strong> ReAge не предоставляет медицинскую диагностику и не заменяет
            консультацию врача. Сервис создан для информационных целей и помощи в отслеживании
            показателей здоровья. Всегда консультируйтесь с квалифицированным специалистом по
            вопросам здоровья.
          </p>
        </div>
      </section>
    </div>
  );
};

export default Index;
