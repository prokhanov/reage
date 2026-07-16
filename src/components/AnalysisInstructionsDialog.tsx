import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Building2, Home, MessageCircle } from "lucide-react";

const COMPANY_PHONE = "+7 (995) 998-46-38";
const TELEGRAM_CHAT_URL = "https://t.me/reage_life";
const TELEGRAM_CHAT_LABEL = "@reage_life";

interface AnalysisInstructionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestNumber?: string | null;
  callbackPhone?: string | null;
}

export function AnalysisInstructionsDialog({
  open,
  onOpenChange,
  requestNumber,
  callbackPhone,
}: AnalysisInstructionsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Инструкция по сдаче анализов</DialogTitle>
          <DialogDescription>
            Пожалуйста, ознакомьтесь с рекомендациями заранее — это влияет на
            точность результатов.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          {requestNumber && (
            <div className="rounded-xl border border-primary/25 bg-primary/5 p-3">
              <p className="text-xs text-muted-foreground mb-1">
                Номер заявки для администратора ЛабКвест
              </p>
              <p className="font-mono text-base font-semibold text-foreground">
                {requestNumber}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Скажите на ресепшене: «Номер заявки {requestNumber}, от партнёра
                ООО «Реэйдж»».
              </p>
            </div>
          )}

          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">В клинике</h3>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>
                Приходите строго натощак — последний приём пищи за 8–12 часов
                до визита. Пить негазированную воду можно.
              </li>
              <li>
                За сутки исключите алкоголь, жирную и острую еду, интенсивные
                тренировки и баню.
              </li>
              <li>
                За 1 час до забора крови не курите, избегайте стресса и
                физической нагрузки; посидите 10–15 минут в спокойной
                обстановке.
              </li>
              <li>
                Если принимаете лекарства — согласуйте отмену/приём с лечащим
                врачом. Витамины, БАДы и биотин отмените за 3 дня.
              </li>
              <li>
                Возьмите с собой паспорт. На ресепшене назовите номер заявки и
                скажите, что вы от партнёра ООО «Реэйдж».
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                <Home className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Дома</h3>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>
                Подготовьте место с хорошим освещением: стол, стул со спинкой,
                чтобы удобно было сидеть 10–15 минут.
              </li>
              <li>
                Утром накануне визита — то же правило: натощак, вода без газа
                разрешена, кофе/чай/сок исключены.
              </li>
              <li>
                За 30 минут до визита — отдохните, не поднимайтесь по лестнице,
                не курите.
              </li>
              <li>
                Приготовьте паспорт и список принимаемых препаратов — медсестра
                уточнит перед забором.
              </li>
              <li>
                Обеспечьте доступ в квартиру и возможность связаться с вами:
                держите телефон рядом.
              </li>
            </ul>
          </section>

          <div className="rounded-xl border border-border/60 bg-muted/40 p-3 text-muted-foreground space-y-1.5">
            <p className="text-xs">
              Нужно изменить или перенести запись — свяжитесь с нами по
              телефону{" "}
              <a
                href={`tel:${(callbackPhone ?? COMPANY_PHONE).replace(/[^+\d]/g, "")}`}
                className="font-semibold text-foreground underline"
              >
                {callbackPhone ?? COMPANY_PHONE}
              </a>{" "}
              или в Telegram-чате{" "}
              <a
                href={TELEGRAM_CHAT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-foreground underline inline-flex items-center gap-1"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                {TELEGRAM_CHAT_LABEL}
              </a>
              .
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
