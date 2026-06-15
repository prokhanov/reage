import { Link } from "react-router-dom";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * /subscription/fail — страница возврата с Робокассы при отказе/отмене.
 * Никакой логики активации, только информация и ссылка вернуться к тарифам.
 */
export default function SubscriptionFail() {
  return (
    <div className="container max-w-2xl mx-auto px-4 py-16 text-center">
      <XCircle className="h-14 w-14 text-destructive mx-auto mb-6" />
      <h1 className="text-2xl md:text-3xl font-bold mb-3">Платёж не прошёл</h1>
      <p className="text-muted-foreground mb-8">
        Оплата была отменена или отклонена банком. Подписка не активирована,
        деньги не списаны. Вы можете попробовать ещё раз — выбрать другой тариф или способ оплаты.
      </p>
      <div className="flex gap-3 justify-center">
        <Button asChild>
          <Link to="/subscription">Вернуться к выбору тарифа</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/dashboard">В Контрольную панель</Link>
        </Button>
      </div>
    </div>
  );
}
