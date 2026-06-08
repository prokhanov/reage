import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  Plus,
  MoreVertical,
  Mail,
  MessageSquare,
  Send,
  Trash2,
  Calendar as CalendarIcon,
  UserPlus,
  CalendarClock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { EditBookingDialog } from "@/components/admin/EditBookingDialog";
import { EditNextAnalysisDialog } from "@/components/admin/EditNextAnalysisDialog";
import AssignStaffDialog from "@/components/admin/AssignStaffDialog";
import { BookingNotificationBadges } from "@/components/admin/BookingNotificationBadges";

type BookingStatus =
  | "waiting_call"
  | "no_answer"
  | "not_scheduled"
  | "scheduled"
  | "received"
  | "collected"
  | "uploaded";

const statusLabels: Record<BookingStatus, string> = {
  waiting_call: "Ожидает звонка",
  no_answer: "Не дозвонились",
  not_scheduled: "Не назначен",
  scheduled: "Назначен",
  received: "Получен",
  collected: "Обрабатывается",
  uploaded: "Загружен",
};

const statusColors: Record<BookingStatus, string> = {
  waiting_call: "bg-amber-50 text-amber-700 border-amber-200",
  no_answer: "bg-orange-50 text-orange-700 border-orange-200",
  not_scheduled: "bg-slate-50 text-slate-700 border-slate-200",
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  received: "bg-teal-50 text-teal-700 border-teal-200",
  collected: "bg-green-100 text-green-700 border-green-200",
  uploaded: "bg-emerald-600 text-white border-emerald-600",
};

interface Booking {
  id: string;
  user_id: string;
  booking_date: string;
  booking_time: string;
  address: string;
  status: BookingStatus;
  assigned_staff_id: string | null;
  next_analysis_date: string | null;
  created_at: string;
}

interface Props {
  userId: string;
  patient: { name?: string | null; email?: string | null; phone?: string | null };
}

export function PatientBookingsCard({ userId, patient }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [editing, setEditing] = useState<Booking | null>(null);
  const [editingNext, setEditingNext] = useState<Booking | null>(null);
  const [assignFor, setAssignFor] = useState<Booking | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["patient-bookings", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analysis_bookings")
        .select("*")
        .eq("user_id", userId)
        .order("booking_date", { ascending: false })
        .order("booking_time", { ascending: false });
      if (error) throw error;
      return data as Booking[];
    },
    enabled: !!userId,
  });

  const { data: staffMap } = useQuery({
    queryKey: ["staff-names-map"],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .neq("role", "patient");
      const ids = [...new Set((roles ?? []).map((r) => r.user_id))];
      if (ids.length === 0) return {} as Record<string, string>;
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", ids);
      const map: Record<string, string> = {};
      (profiles ?? []).forEach((p) => {
        map[p.id] = p.name || p.id.slice(0, 6);
      });
      return map;
    },
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["patient-bookings", userId] });
    qc.invalidateQueries({ queryKey: ["patient-latest-booking", userId] });
    qc.invalidateQueries({ queryKey: ["analysis-bookings"] });
    qc.invalidateQueries({ queryKey: ["my-assignments"] });
  };

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BookingStatus }) => {
      const { error } = await supabase
        .from("analysis_bookings")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Статус обновлен" });
    },
    onError: (e: any) =>
      toast({ title: "Ошибка", description: e?.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("analysis_bookings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      setDeleteId(null);
      toast({ title: "Запись удалена" });
    },
    onError: (e: any) =>
      toast({ title: "Ошибка", description: e?.message, variant: "destructive" }),
  });

  const sendEmail = useMutation({
    mutationFn: async (b: Booking) => {
      if (!patient.email) throw new Error("У пациента не указан email");
      const dateStr = format(new Date(b.booking_date), "d MMMM yyyy", { locale: ru });
      const { error } = await supabase.functions.invoke("send-analysis-booking-email", {
        body: {
          recipient_email: patient.email,
          booking_id: b.id,
          vars: {
            patient_name: patient.name || "",
            appointment_date: dateStr,
            appointment_time: (b.booking_time || "").slice(0, 5),
            clinic_address: b.address || "",
          },
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Email поставлен в очередь" });
      qc.invalidateQueries({ queryKey: ["booking-notifications"] });
    },
    onError: (e: any) =>
      toast({ title: "Ошибка", description: e?.message, variant: "destructive" }),
  });

  const sendSms = useMutation({
    mutationFn: async (b: Booking) => {
      const { data, error } = await supabase.functions.invoke("send-booking-sms", {
        body: { booking_id: b.id },
      });
      if (error) throw error;
      if (data && (data as any).success === false) {
        throw new Error((data as any).error || "Не удалось отправить SMS");
      }
    },
    onSuccess: () => {
      toast({ title: "SMS отправлено" });
      qc.invalidateQueries({ queryKey: ["booking-notifications"] });
    },
    onError: (e: any) =>
      toast({ title: "Ошибка SMS", description: e?.message, variant: "destructive" }),
  });

  const sendTg = useMutation({
    mutationFn: async (b: Booking) => {
      const { data, error } = await supabase.functions.invoke("send-booking-telegram", {
        body: { booking_id: b.id },
      });
      if (error) throw error;
      if (data && (data as any).success === false) {
        throw new Error((data as any).error || "Не удалось отправить");
      }
    },
    onSuccess: () => toast({ title: "Уведомление в Telegram отправлено" }),
    onError: (e: any) =>
      toast({ title: "Ошибка Telegram", description: e?.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-primary" />
          Записи на анализы
        </CardTitle>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Новая запись
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Загрузка…</p>
        ) : !bookings || bookings.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            У пациента нет записей на анализ
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата и время</TableHead>
                  <TableHead>Адрес</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Сотрудник</TableHead>
                  <TableHead>Следующий</TableHead>
                  <TableHead>Уведомления</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <button
                        onClick={() => setEditing(b)}
                        className="text-left hover:text-primary"
                      >
                        <div className="font-medium border-b border-dotted border-current">
                          {format(new Date(b.booking_date), "d MMM yyyy", { locale: ru })}
                        </div>
                        <div className="text-xs text-muted-foreground border-b border-dotted border-current inline-block">
                          {(b.booking_time || "").slice(0, 5)}
                        </div>
                      </button>
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      <button
                        onClick={() => setEditing(b)}
                        className="truncate border-b border-dotted border-current hover:text-primary block max-w-full text-left"
                      >
                        {b.address || "—"}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={b.status}
                        onValueChange={(v) =>
                          statusMutation.mutate({ id: b.id, status: v as BookingStatus })
                        }
                      >
                        <SelectTrigger className="h-7 w-auto gap-1 border-none p-0 bg-transparent shadow-none">
                          <Badge
                            variant="outline"
                            className={cn("font-normal cursor-pointer", statusColors[b.status])}
                          >
                            {statusLabels[b.status]}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(statusLabels) as BookingStatus[]).map((s) => (
                            <SelectItem key={s} value={s}>
                              {statusLabels[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => setAssignFor(b)}
                        className="border-b border-dotted border-current hover:text-primary"
                      >
                        {b.assigned_staff_id
                          ? staffMap?.[b.assigned_staff_id] ?? "—"
                          : "Назначить"}
                      </button>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => setEditingNext(b)}
                        className="border-b border-dotted border-current hover:text-primary text-sm"
                      >
                        {b.next_analysis_date
                          ? format(new Date(b.next_analysis_date), "d MMM yyyy", { locale: ru })
                          : "—"}
                      </button>
                    </TableCell>
                    <TableCell>
                      <BookingNotificationBadges bookingId={b.id} />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Уведомления</DropdownMenuLabel>
                          <DropdownMenuItem
                            disabled={!patient.email || sendEmail.isPending}
                            onClick={() => sendEmail.mutate(b)}
                          >
                            <Mail className="w-4 h-4 mr-2" />
                            Email подтверждение
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={!patient.phone || sendSms.isPending}
                            onClick={() => sendSms.mutate(b)}
                          >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            SMS-напоминание
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={sendTg.isPending}
                            onClick={() => sendTg.mutate(b)}
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Telegram админам
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteId(b.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Удалить запись
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {editing && (
        <EditBookingDialog
          bookingId={editing.id}
          currentDate={editing.booking_date}
          currentTime={editing.booking_time}
          currentAddress={editing.address}
          onClose={() => setEditing(null)}
          onSuccess={invalidateAll}
        />
      )}

      {editingNext && (
        <EditNextAnalysisDialog
          open={!!editingNext}
          onOpenChange={(o) => !o && setEditingNext(null)}
          bookingId={editingNext.id}
          currentDate={editingNext.next_analysis_date}
          userId={userId}
        />
      )}

      {assignFor && (
        <AssignStaffDialog
          bookingId={assignFor.id}
          currentStaffId={assignFor.assigned_staff_id}
          onClose={() => {
            setAssignFor(null);
            invalidateAll();
          }}
        />
      )}

      {creating && (
        <CreateBookingForPatientDialog
          userId={userId}
          onClose={() => setCreating(false)}
          onCreated={invalidateAll}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить запись на анализ?</AlertDialogTitle>
            <AlertDialogDescription>
              Действие необратимо. Если у записи уже есть забронированный слот, его освобождение нужно обработать отдельно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function CreateBookingForPatientDialog({
  userId,
  onClose,
  onCreated,
}: {
  userId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const [date, setDate] = useState<Date>(new Date());
  const [time, setTime] = useState("10:00");
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState<BookingStatus>("scheduled");

  const createM = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("analysis_bookings").insert({
        user_id: userId,
        booking_date: format(date, "yyyy-MM-dd"),
        booking_time: time,
        address: address.trim(),
        status,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Запись создана" });
      onCreated();
      onClose();
    },
    onError: (e: any) => {
      const isDup =
        e?.code === "23505" ||
        (typeof e?.message === "string" &&
          e.message.includes("analysis_bookings_one_active_per_user"));
      toast({
        title: "Ошибка",
        description: isDup
          ? "У пациента уже есть активная запись. Завершите её или отредактируйте существующую."
          : e?.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Новая запись на анализ</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Дата</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start font-normal", !date && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(date, "d MMM yyyy", { locale: ru })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Время</Label>
              <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Адрес</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Адрес забора биоматериала"
            />
          </div>
          <div className="space-y-2">
            <Label>Статус</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as BookingStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(statusLabels) as BookingStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {statusLabels[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button
            disabled={!address.trim() || createM.isPending}
            onClick={() => createM.mutate()}
          >
            {createM.isPending ? "Создание…" : "Создать"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
