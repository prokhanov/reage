import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Edit, XCircle, Clock, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface SubscriptionHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  patientName: string;
}

interface HistoryEntry {
  id: string;
  action: string;
  changed_by: string | null;
  old_data: any;
  new_data: any;
  note: string | null;
  created_at: string;
  changed_by_profile?: {
    first_name: string;
    name: string;
  };
  subscription?: {
    subscription_plans?: {
      display_name: string;
    };
    subscription_pricing?: {
      period_display: string;
    };
  };
}

const actionConfig = {
  created: { label: "Создание подписки", color: "bg-green-500", icon: Plus },
  updated: { label: "Изменение подписки", color: "bg-blue-500", icon: Edit },
  cancelled: { label: "Отмена подписки", color: "bg-red-500", icon: XCircle },
  expired: { label: "Истекла подписка", color: "bg-gray-500", icon: Clock },
  renewed: { label: "Продление подписки", color: "bg-green-500", icon: RefreshCw },
};

export function SubscriptionHistoryDialog({
  open,
  onClose,
  userId,
  patientName,
}: SubscriptionHistoryDialogProps) {
  const { data: history, isLoading } = useQuery({
    queryKey: ["subscription-history", userId],
    queryFn: async () => {
      const { data: historyData, error } = await supabase
        .from("subscription_history")
        .select(`
          *,
          subscription:subscriptions(
            subscription_plans(display_name),
            subscription_pricing(period_display)
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles for changed_by users
      const changedByIds = historyData
        ?.map((h) => h.changed_by)
        .filter((id): id is string => id !== null) || [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, name")
        .in("id", changedByIds);

      // Merge profiles into history data
      const enrichedData = historyData?.map((entry) => ({
        ...entry,
        changed_by_profile: entry.changed_by
          ? profiles?.find((p) => p.id === entry.changed_by)
          : null,
      }));

      return enrichedData as HistoryEntry[];
    },
    enabled: open && !!userId,
  });

  const getChangedFields = (oldData: any, newData: any) => {
    if (!oldData || !newData) return [];

    const changes = [];
    const fieldLabels: Record<string, string> = {
      plan_id: "Тариф",
      pricing_id: "Период оплаты",
      status: "Статус",
      start_date: "Дата начала",
      end_date: "Дата окончания",
      amount: "Сумма",
    };

    Object.keys(newData).forEach((key) => {
      if (oldData[key] !== newData[key] && fieldLabels[key]) {
        let oldValue = oldData[key];
        let newValue = newData[key];

        // Format dates
        if (key.includes("date") && oldValue && newValue) {
          oldValue = format(new Date(oldValue), "dd.MM.yyyy", { locale: ru });
          newValue = format(new Date(newValue), "dd.MM.yyyy", { locale: ru });
        }

        // Format amounts
        if (key === "amount") {
          oldValue = `${Number(oldValue).toLocaleString("ru-RU")} ₽`;
          newValue = `${Number(newValue).toLocaleString("ru-RU")} ₽`;
        }

        changes.push({
          field: fieldLabels[key],
          old: oldValue,
          new: newValue,
        });
      }
    });

    return changes;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>История подписок: {patientName}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !history || history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            История подписок пуста
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              {history.map((entry) => {
                const config = actionConfig[entry.action as keyof typeof actionConfig];
                const Icon = config?.icon || Edit;
                const changedBy = entry.changed_by_profile
                  ? `${entry.changed_by_profile.first_name} ${entry.changed_by_profile.name}`
                  : entry.changed_by
                  ? "Администратор"
                  : "Пользователь";

                return (
                  <Card key={entry.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-full ${config?.color || "bg-gray-500"}`}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline">
                              {config?.label || entry.action}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(entry.created_at), "dd MMMM yyyy, HH:mm", {
                                locale: ru,
                              })}
                            </span>
                          </div>

                          <div className="text-sm">
                            <span className="text-muted-foreground">Выполнил: </span>
                            <span className="font-medium">{changedBy}</span>
                          </div>

                          {entry.action === "created" && entry.new_data && (
                            <div className="space-y-1 text-sm">
                              {entry.subscription?.subscription_plans && (
                                <div>
                                  <span className="text-muted-foreground">Тариф: </span>
                                  <span className="font-medium">
                                    {entry.subscription.subscription_plans.display_name}
                                  </span>
                                </div>
                              )}
                              {entry.subscription?.subscription_pricing && (
                                <div>
                                  <span className="text-muted-foreground">Период: </span>
                                  <span className="font-medium">
                                    {entry.subscription.subscription_pricing.period_display}
                                  </span>
                                </div>
                              )}
                              {entry.new_data.amount && (
                                <div>
                                  <span className="text-muted-foreground">Сумма: </span>
                                  <span className="font-medium">
                                    {Number(entry.new_data.amount).toLocaleString("ru-RU")} ₽
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {entry.action === "updated" && (
                            <div className="space-y-2">
                              {getChangedFields(entry.old_data, entry.new_data).map((change, idx) => (
                                <div key={idx} className="text-sm">
                                  <span className="text-muted-foreground">{change.field}: </span>
                                  <span className="line-through text-muted-foreground">
                                    {change.old}
                                  </span>
                                  {" → "}
                                  <span className="font-medium text-primary">{change.new}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {entry.note && (
                            <div className="text-sm text-muted-foreground italic">
                              {entry.note}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
