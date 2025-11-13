import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Edit, Trash2, Plus } from "lucide-react";
import { usePricing } from "@/hooks/usePricing";
import { EditPricingDialog } from "./EditPricingDialog";
import { PlanWithPricing, SubscriptionPricing } from "@/hooks/useSubscriptionPlans";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PricingTableProps {
  plan: PlanWithPricing;
}

export function PricingTable({ plan }: PricingTableProps) {
  const [editPricing, setEditPricing] = useState<SubscriptionPricing | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [createMode, setCreateMode] = useState(false);

  const { deletePricing, updatePricing } = usePricing();

  const handleToggleEnabled = async (pricing: SubscriptionPricing) => {
    await updatePricing.mutateAsync({
      ...pricing,
      is_enabled: !pricing.is_enabled,
    });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deletePricing.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const monthlyPrice = plan.pricing.find((p) => p.period === "monthly")?.amount || 0;

  const calculateDiscount = (amount: number, months: number) => {
    if (!monthlyPrice) return 0;
    const totalMonthly = monthlyPrice * months;
    return Math.round(((totalMonthly - amount) / totalMonthly) * 100);
  };

  return (
    <>
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Цены для тарифа "{plan.display_name}"</h3>
            <Button size="sm" onClick={() => setCreateMode(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Добавить период
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Период</TableHead>
                <TableHead>Длительность</TableHead>
                <TableHead className="text-right">Цена</TableHead>
                <TableHead className="text-right">Скидка</TableHead>
                <TableHead className="text-center">Активно</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plan.pricing.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Нет цен для этого тарифа
                  </TableCell>
                </TableRow>
              ) : (
                plan.pricing.map((pricing) => {
                  const discount = calculateDiscount(pricing.amount, pricing.duration_months);
                  return (
                    <TableRow key={pricing.id}>
                      <TableCell className="font-medium">{pricing.period_display}</TableCell>
                      <TableCell>{pricing.duration_months} мес.</TableCell>
                      <TableCell className="text-right">{pricing.amount.toLocaleString()} ₽</TableCell>
                      <TableCell className="text-right">
                        {discount > 0 ? `${discount}%` : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={pricing.is_enabled}
                          onCheckedChange={() => handleToggleEnabled(pricing)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setEditPricing(pricing)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setDeleteId(pricing.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <EditPricingDialog
        pricing={editPricing}
        planId={plan.id}
        open={!!editPricing || createMode}
        onOpenChange={(open) => {
          if (!open) {
            setEditPricing(null);
            setCreateMode(false);
          }
        }}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить цену?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
