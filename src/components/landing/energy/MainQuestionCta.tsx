import { useState } from "react";
import { MessageSquare, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeedbackDialog } from "@/components/landing/FeedbackDialog";

export function MainQuestionCta({ id }: { id?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <section id={id} className="relative overflow-hidden border-t border-border/40 bg-background py-14 md:py-20">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.03] to-transparent" />
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <MessageSquare className="h-3.5 w-3.5" />
              Обратная связь
            </div>
            <h2 className="mt-5 font-display text-3xl leading-tight text-foreground sm:text-4xl md:text-5xl">
              Остались вопросы?
            </h2>
            <p className="mt-4 text-base text-muted-foreground md:text-lg">
              Задайте вопрос — команда ReAge ответит в рабочее время и поможет разобраться.
            </p>
            <Button
              size="lg"
              onClick={() => setOpen(true)}
              className="mt-8 h-12 gap-2 px-8 text-base"
            >
              Задать вопрос
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <FeedbackDialog
        open={open}
        onOpenChange={setOpen}
        title="Задать вопрос"
        description="Напишите, что вас интересует — мы ответим в ближайшее время"
        defaultMessage="Здравствуйте, у меня вопрос: "
      />
    </>
  );
}
