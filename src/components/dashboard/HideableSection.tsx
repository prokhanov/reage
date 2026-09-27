import { ReactNode } from "react";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EyeOff } from "lucide-react";

interface Props {
  title: string;
  hidden: boolean;
  canEdit: boolean;
  onToggle: (hidden: boolean) => void;
  children: ReactNode;
}

/**
 * Раздел «Моего здоровья», который сотрудник может скрыть от пациента
 * с пометкой «Недостаточно данных».
 */
export function HideableSection({ title, hidden, canEdit, onToggle, children }: Props) {
  if (!canEdit) {
    if (!hidden) return <>{children}</>;
    return (
      <Card>
        <CardHeader className="px-4 pt-4 pb-2 md:px-6 md:pt-6 md:pb-3">
          <CardTitle className="text-xl md:text-2xl">{title}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-6 md:px-6">
          <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-4">
            <EyeOff className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="space-y-1">
              <div className="font-medium text-foreground">Недостаточно данных</div>
              <p className="text-sm text-muted-foreground">
                Раздел появится, когда накопится больше показателей в анализах.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <label className="flex items-center justify-end gap-2 text-sm text-muted-foreground cursor-pointer">
        <span>«{title}»: не показывать — недостаточно данных</span>
        <Switch checked={hidden} onCheckedChange={onToggle} />
      </label>
      <div className={hidden ? "opacity-40" : undefined}>{children}</div>
    </div>
  );
}
