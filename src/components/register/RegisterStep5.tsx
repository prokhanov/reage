import { CreditCard, Check, ChevronRight, SkipForward, Sparkles, Shield, TrendingUp, Brain, Activity, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useState } from "react";

interface RegisterStep5Props {
  onSubmit: (paymentData: { cardNumber: string; cardName: string; expiryDate: string; cvv: string; skipPayment: boolean }) => void;
  onBack: () => void;
  isSubmitting: boolean;
}

const features = [
  { icon: Activity, text: "Персональный AI-ассистент здоровья" },
  { icon: TrendingUp, text: "Анализ биомаркеров и трендов" },
  { icon: Brain, text: "Рекомендации на основе ИИ" },
  { icon: MessageSquare, text: "Безлимитные консультации" },
  { icon: Shield, text: "Защита данных на уровне медицины" },
  { icon: Sparkles, text: "Регулярные обновления функций" },
];

export function RegisterStep5({ onSubmit, onBack, isSubmitting }: RegisterStep5Props) {
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, "");
    const formatted = cleaned.match(/.{1,4}/g)?.join(" ") || cleaned;
    return formatted.substring(0, 19);
  };

  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + "/" + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  const isValid = 
    cardNumber.replace(/\s/g, "").length === 16 &&
    cardName.trim().length > 0 &&
    expiryDate.length === 5 &&
    cvv.length === 3;

  const handleSubmit = () => {
    onSubmit({ cardNumber, cardName, expiryDate, cvv, skipPayment: false });
  };

  const handleSkip = () => {
    onSubmit({ cardNumber: "", cardName: "", expiryDate: "", cvv: "", skipPayment: true });
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-primary mb-4">
          <CreditCard className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Оформление подписки
        </h2>
        <p className="text-muted-foreground text-lg">
          Получите полный доступ ко всем возможностям ReAge
        </p>
      </div>

      {/* Price Card */}
      <Card className="p-6 bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 border-primary/20">
        <div className="text-center space-y-4">
          <div className="space-y-2">
            <div className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              120 000 ₽
            </div>
            <div className="text-muted-foreground text-lg">
              за год подписки
            </div>
            <div className="text-sm text-muted-foreground">
              Всего 10 000 ₽ в месяц
            </div>
          </div>
        </div>
      </Card>

      {/* Features */}
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Что входит в подписку:</h3>
        <div className="grid gap-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm font-medium">{feature.text}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment Form */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          Данные карты
        </h3>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Номер карты</Label>
            <Input
              placeholder="0000 0000 0000 0000"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              maxLength={19}
              className="h-12 text-base font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label>Имя на карте</Label>
            <Input
              placeholder="IVAN IVANOV"
              value={cardName}
              onChange={(e) => setCardName(e.target.value.toUpperCase())}
              className="h-12 text-base"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Срок действия</Label>
              <Input
                placeholder="MM/YY"
                value={expiryDate}
                onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                maxLength={5}
                className="h-12 text-base font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>CVV</Label>
              <Input
                type="password"
                placeholder="000"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").substring(0, 3))}
                maxLength={3}
                className="h-12 text-base font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex-1 h-12"
          disabled={isSubmitting}
        >
          Назад
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={handleSkip}
          className="flex-1 h-12 text-muted-foreground hover:text-foreground"
          disabled={isSubmitting}
        >
          <SkipForward className="h-4 w-4 mr-2" />
          Оплатить позже
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!isValid || isSubmitting}
          className="flex-1 h-12 bg-gradient-primary shadow-neon-primary"
        >
          {isSubmitting ? "Обработка..." : "Оплатить"}
          <Check className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
