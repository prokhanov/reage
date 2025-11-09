import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface AssignStaffDialogProps {
  bookingId: string;
  currentStaffId: string | null;
  onClose: () => void;
}

export default function AssignStaffDialog({
  bookingId,
  currentStaffId,
  onClose,
}: AssignStaffDialogProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    currentStaffId || "unassigned"
  );
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: staffMembers, isLoading: isLoadingStaff } = useQuery({
    queryKey: ["staff-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .neq("role", "patient");
      
      if (error) throw error;
      
      const userIds = data.map(item => item.user_id);
      
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", userIds);
      
      if (profilesError) throw profilesError;
      return profiles || [];
    },
  });

  const assignStaffMutation = useMutation({
    mutationFn: async (staffId: string) => {
      const actualStaffId = staffId === "unassigned" ? null : staffId;
      
      const { error } = await supabase
        .from("analysis_bookings")
        .update({
          assigned_staff_id: actualStaffId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analysis-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["my-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["myAssignmentsCount"] });
      queryClient.invalidateQueries({ queryKey: ["scheduledBookingsCount"] });
      toast({
        title: "Сотрудник назначен",
        description: "Сотрудник успешно назначен на запись",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось назначить сотрудника",
        variant: "destructive",
      });
    },
  });

  const handleAssign = () => {
    assignStaffMutation.mutate(selectedStaffId);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Назначить сотрудника</DialogTitle>
          <DialogDescription>
            Выберите сотрудника для выполнения забора анализов
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoadingStaff ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Select
              value={selectedStaffId}
              onValueChange={setSelectedStaffId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите сотрудника" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Не назначен</SelectItem>
                {staffMembers?.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    {staff.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отменить
          </Button>
          <Button
            onClick={handleAssign}
            disabled={assignStaffMutation.isPending || isLoadingStaff}
          >
            {assignStaffMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Назначить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
