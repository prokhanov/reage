import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Edit2, Pill, Stethoscope, FileText } from "lucide-react";
import { OPERATIONS } from "@/lib/medicalAnketa";

interface MedicalCondition {
  category: string;
  condition: string;
}

interface Props {
  medicalHistory: MedicalCondition[];
  operations: Record<string, unknown> | null;
  medications: string[] | null;
  healthNote: string | null;
  onEdit: () => void;
}

export function MedicalAnketaCard({
  medicalHistory,
  operations,
  medications,
  healthNote,
  onEdit,
}: Props) {
  const chronic = medicalHistory.map((m) => m.condition);
  const meds = medications ?? [];
  const ops = (operations ?? {}) as Record<string, unknown>;
  const note = (healthNote ?? "").trim();

  const positiveOps = OPERATIONS.filter((o) => ops[o.key] === true);
  const negativeOps = OPERATIONS.filter((o) => ops[o.key] === false);

  const isEmpty =
    chronic.length === 0 &&
    meds.length === 0 &&
    positiveOps.length === 0 &&
    negativeOps.length === 0 &&
    !note;

  return (
    <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
            <Heart className="h-6 w-6 text-red-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold">История болезней</h2>
            <p className="text-sm text-muted-foreground">
              Те же данные, что и в анкете при регистрации
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Edit2 className="h-4 w-4 mr-2" />
          Редактировать
        </Button>
      </div>

      {isEmpty ? (
        <div className="text-center py-8 text-muted-foreground">
          <Heart className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Анкета не заполнена</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Хронические */}
          <Section
            icon={<Heart className="h-4 w-4 text-red-500" />}
            title="Хронические заболевания"
          >
            {chronic.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {chronic.map((c) => (
                  <Badge key={c} variant="secondary" className="text-xs">
                    {c}
                  </Badge>
                ))}
              </div>
            ) : (
              <EmptyLine text="Не указаны" />
            )}
          </Section>

          {/* Операции */}
          <Section
            icon={<Stethoscope className="h-4 w-4 text-primary" />}
            title="Операции и процедуры"
          >
            {positiveOps.length === 0 && negativeOps.length === 0 ? (
              <EmptyLine text="Не указаны" />
            ) : (
              <div className="space-y-2 text-sm">
                {positiveOps.map((op) => (
                  <div key={op.key} className="flex items-start justify-between gap-3">
                    <span>{op.label}</span>
                    <Badge className="bg-rose-500/15 text-rose-500 border-rose-500/30 hover:bg-rose-500/15">
                      Да
                    </Badge>
                  </div>
                ))}
                {ops.surgery_year === true && ops.surgery_year_details ? (
                  <p className="text-xs text-muted-foreground pl-1">
                    {String(ops.surgery_year_details)}
                  </p>
                ) : null}
                {negativeOps.length > 0 && (
                  <p className="text-xs text-muted-foreground pt-1">
                    Нет:{" "}
                    {negativeOps.map((o) => o.label.toLowerCase()).join(", ")}
                  </p>
                )}
              </div>
            )}
          </Section>

          {/* Препараты */}
          <Section
            icon={<Pill className="h-4 w-4 text-primary" />}
            title="Препараты и добавки"
          >
            {meds.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {meds.map((m) => (
                  <Badge key={m} variant="secondary" className="text-xs">
                    {m}
                  </Badge>
                ))}
              </div>
            ) : (
              <EmptyLine text="Не указаны" />
            )}
          </Section>

          {/* Заметка */}
          {note && (
            <Section
              icon={<FileText className="h-4 w-4 text-primary" />}
              title="Дополнительно"
            >
              <p className="text-sm whitespace-pre-wrap">{note}</p>
            </Section>
          )}
        </div>
      )}
    </Card>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-4 rounded-lg bg-background/50 border border-border/50">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground italic">{text}</p>;
}
