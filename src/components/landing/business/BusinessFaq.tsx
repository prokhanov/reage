import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faq = [
  {
    q: "Чем это отличается от корпоративного чекапа?",
    a: "Чекап фиксирует состояние один раз и отдаёт таблицу с цифрами. ReAge переводит показатели в биологический возраст, объясняет причины отклонений, даёт персональный план и отслеживает динамику в течение года.",
  },
  {
    q: "Компания увидит результаты конкретного сотрудника?",
    a: "Нет. Персональные результаты доступны только самому сотруднику в его личном кабинете. Компания получает исключительно обезличенную статистику по группе.",
  },
  {
    q: "Можно ли начать с небольшой группы?",
    a: "Да, это стандартный сценарий: пилот на группу сотрудников, полный цикл за квартал, затем решение о масштабировании.",
  },
  {
    q: "Как организована сдача анализов?",
    a: "Сотрудник сдаёт анализы в партнёрской лаборатории по направлению; для групп организуем выезд к офису. Сейчас работаем в Москве и Санкт-Петербурге.",
  },
  {
    q: "Кто отвечает за медицинскую часть?",
    a: "Отчёт формируется по протоколу превентивной медицины и проверяется врачом до публикации. Сотруднику доступен персональный ассистент по вопросам отчёта.",
  },
  {
    q: "Какие документы получает юрлицо?",
    a: "Договор, счёт, акт и закрывающие документы. Реквизиты и все правовые документы опубликованы на сайте.",
  },
];

export function BusinessFaq() {
  const [open, setOpen] = useState<string>();
  return (
    <section className="relative py-16 md:py-24">
      <div className="container mx-auto px-6 max-w-4xl">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-10 text-center">
          <span className="text-foreground">Частые </span>
          <span className="bg-gradient-hero bg-clip-text text-transparent">вопросы</span>
        </h2>
        <Accordion type="single" collapsible value={open} onValueChange={setOpen} className="space-y-3">
          {faq.map((f, i) => (
            <AccordionItem
              key={f.q}
              value={`item-${i}`}
              className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm px-6 data-[state=open]:border-primary/30"
            >
              <AccordionTrigger className="text-left text-base md:text-lg font-semibold hover:no-underline py-5">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
