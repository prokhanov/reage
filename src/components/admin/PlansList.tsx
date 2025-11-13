import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, GripVertical } from "lucide-react";
import { usePlans } from "@/hooks/usePlans";
import { EditPlanDialog } from "./EditPlanDialog";
import { SubscriptionPlan } from "@/hooks/useSubscriptionPlans";
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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface PlansListProps {
  plans: SubscriptionPlan[];
}

function SortablePlanItem({ plan, onEdit, onDelete }: { 
  plan: SubscriptionPlan;
  onEdit: (plan: SubscriptionPlan) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: plan.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold">{plan.display_name}</h3>
                {!plan.is_active && (
                  <Badge variant="secondary">Неактивен</Badge>
                )}
                {plan.badge_text && (
                  <Badge variant="outline">{plan.badge_text}</Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  📊 {plan.included_biomarkers?.length || 0} биомаркеров
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{plan.description}</p>
              <div className="flex flex-wrap gap-1">
                {plan.features.map((feature, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => onEdit(plan)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => onDelete(plan.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function PlansList({ plans }: PlansListProps) {
  const [editPlan, setEditPlan] = useState<SubscriptionPlan | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [items, setItems] = useState(plans);

  const { deletePlan, updatePlanOrder } = usePlans();

  // Синхронизация локального состояния с пропсом при обновлении данных
  useEffect(() => {
    setItems(plans);
  }, [plans]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Update display_order in database
        const updates = newItems.map((item, index) => ({
          id: item.id,
          display_order: index,
        }));
        updatePlanOrder.mutate(updates);
        
        return newItems;
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deletePlan.mutateAsync(deleteId);
    setDeleteId(null);
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          {items.map((plan) => (
            <SortablePlanItem
              key={plan.id}
              plan={plan}
              onEdit={setEditPlan}
              onDelete={setDeleteId}
            />
          ))}
        </SortableContext>
      </DndContext>

      <EditPlanDialog
        plan={editPlan}
        open={!!editPlan}
        onOpenChange={(open) => !open && setEditPlan(null)}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить тариф?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Все связанные цены также будут удалены.
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
