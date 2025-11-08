import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

interface EditEmployeeDialogProps {
  employee: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditEmployeeDialog({
  employee,
  open,
  onOpenChange,
  onSuccess,
}: EditEmployeeDialogProps) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const { toast } = useToast();

  const { data: customRoles } = useQuery({
    queryKey: ["custom_roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_roles")
        .select("*")
        .order("display_name");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (employee?.roles) {
      setSelectedRoles(employee.roles.map((r: any) => r.role));
    }
  }, [employee]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      // Delete existing non-user roles
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", employee.id)
        .neq("role", "user");

      if (deleteError) throw deleteError;

      // Add new roles
      for (const roleName of selectedRoles) {
        const role = customRoles?.find(r => r.name === roleName);
        const { error: insertError } = await supabase
          .from("user_roles")
          .insert({
            user_id: employee.id,
            role: roleName as any,
            role_id: role?.id,
          });

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      toast({
        title: "Успешно",
        description: "Роли сотрудника обновлены",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить роли",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  const toggleRole = (roleName: string) => {
    setSelectedRoles(prev =>
      prev.includes(roleName)
        ? prev.filter(r => r !== roleName)
        : [...prev, roleName]
    );
  };

  const handleSubmit = () => {
    if (selectedRoles.length === 0) {
      toast({
        title: "Ошибка",
        description: "Выберите хотя бы одну роль",
        variant: "destructive",
      });
      return;
    }

    updateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Редактировать роли: {employee?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Роли</Label>
            <div className="space-y-2 border rounded-md p-3 max-h-64 overflow-y-auto">
              {customRoles?.map((role) => (
                <div key={role.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`edit-${role.name}`}
                    checked={selectedRoles.includes(role.name)}
                    onCheckedChange={() => toggleRole(role.name)}
                  />
                  <label
                    htmlFor={`edit-${role.name}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {role.display_name}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateMutation.isPending}
          >
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Сохранение..." : "Сохранить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
