import { Fragment, useState } from "react";
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
import { BookingNotificationsCell } from "@/components/admin/BookingNotificationsCell";
import { BookingNotificationsHistory } from "@/components/admin/BookingNotificationsHistory";

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

type TemplateKey = "scheduled" | "received" | "collected" | "uploaded";

const TEMPLATE_LABELS: Record<TemplateKey, string> = {
  scheduled: "Запись назначена",
  received: "Биоматериал получен",
  collected: "Анализ в работе",
  uploaded: "Отчёт готов",
};

const SMS_TEMPLATE_BY_KEY: Record<TemplateKey, string> = {
  scheduled: "booking_scheduled",
  received: "booking_received",
  collected: "booking_collected",
  uploaded: "booking_uploaded",
};

const EMAIL_TEMPLATE_BY_KEY: Record<TemplateKey, string> = {
  scheduled: "booking_scheduled",
  received: "booking_received",
  collected: "booking_collected",
  uploaded: "booking_uploaded",
};

const TG_TEMPLATE_BY_KEY: Record<TemplateKey, string> = {
  scheduled: "booking_scheduled",
  received: "booking_received",
  collected: "booking_collected",
  uploaded: "booking_uploaded",
};

const STATUS_TO_TEMPLATE_KEY: Partial<Record<BookingStatus, TemplateKey>> = {
  scheduled: "scheduled",
  received: "received",
  collected: "collected",
  uploaded: "uploaded",
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
  const [sendDialog, setSendDialog] = useState<Booking | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
    mutationFn: async ({ b, email, templateKey }: { b: Booking; email: string; templateKey: TemplateKey }) => {
      if (!email) throw new Error("Не указан email");
      const dateStr = format(new Date(b.booking_date), "d MMMM yyyy", { locale: ru });
      const { error } = await supabase.functions.invoke("send-analysis-booking-email", {
        body: {
          recipient_email: email,
          booking_id: b.id,
          template_type: EMAIL_TEMPLATE_BY_KEY[templateKey],
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
    mutationFn: async ({ b, phone, templateKey }: { b: Booking; phone: string; templateKey: TemplateKey }) => {
      if (!phone) throw new Error("Не указан телефон");
      const { data, error } = await supabase.functions.invoke("send-booking-sms", {
        body: { booking_id: b.id, phone_override: phone, template_name: SMS_TEMPLATE_BY_KEY[templateKey] },
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
    mutationFn: async ({ b, templateKey }: { b: Booking; templateKey: TemplateKey }) => {
      const { data, error } = await supabase.functions.invoke("send-booking-telegram", {
        body: { booking_id: b.id, template_key: TG_TEMPLATE_BY_KEY[templateKey] },
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
          <AdminCenterLoader size="sm" />
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
                {bookings.map((b) => {
                  const isExpanded = expandedId === b.id;
                  return (
                    <Fragment key={b.id}>
                      <TableRow>
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
                          <BookingNotificationsCell
                            bookingId={b.id}
                            expanded={isExpanded}
                            onToggle={() =>
                              setExpandedId((cur) => (cur === b.id ? null : b.id))
                            }
                          />
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
                                disabled={sendEmail.isPending || sendSms.isPending || sendTg.isPending}
                                onClick={() => setSendDialog(b)}
                              >
                                <Send className="w-4 h-4 mr-2" />
                                Отправить напоминания
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
                      {isExpanded && (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={7} className="p-0">
                            <BookingNotificationsHistory bookingId={b.id} />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
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

      {sendDialog && (
        <SendRemindersDialog
          booking={sendDialog}
          userId={userId}
          initialEmail={patient.email || ""}
          initialPhone={patient.phone || ""}
          onClose={() => setSendDialog(null)}
          onSend={async ({ sendEmailOn, email, sendSmsOn, phone, sendTgOn, templateKey }) => {
            const b = sendDialog;
            const tasks: Promise<unknown>[] = [];
            if (sendEmailOn) tasks.push(sendEmail.mutateAsync({ b, email, templateKey }));
            if (sendSmsOn) tasks.push(sendSms.mutateAsync({ b, phone, templateKey }));
            if (sendTgOn) tasks.push(sendTg.mutateAsync({ b, templateKey }));
            await Promise.allSettled(tasks);
            setSendDialog(null);
          }}
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

function SendRemindersDialog({
  booking,
  userId,
  initialEmail,
  initialPhone,
  onClose,
  onSend,
}: {
  booking: Booking;
  userId: string;
  initialEmail: string;
  initialPhone: string;
  onClose: () => void;
  onSend: (args: {
    sendEmailOn: boolean;
    email: string;
    sendSmsOn: boolean;
    phone: string;
    sendTgOn: boolean;
    templateKey: TemplateKey;
  }) => Promise<void>;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [emailOn, setEmailOn] = useState(true);
  const [smsOn, setSmsOn] = useState(true);
  const [tgOn, setTgOn] = useState(true);
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [templateKey, setTemplateKey] = useState<TemplateKey>(
    STATUS_TO_TEMPLATE_KEY[booking.status] ?? "scheduled"
  );
  const [submitting, setSubmitting] = useState(false);

  const validateEmail = (v: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  const validatePhone = (v: string) => {
    const d = v.replace(/\D/g, "");
    return d.length >= 10 && d.length <= 15;
  };

  const handleSubmit = async () => {
    if (!emailOn && !smsOn && !tgOn) {
      toast({ title: "Выберите хотя бы один канал", variant: "destructive" });
      return;
    }
    const emailNorm = email.trim().toLowerCase();
    const phoneNorm = phone.replace(/\D/g, "");
    if (emailOn && !validateEmail(emailNorm)) {
      toast({ title: "Некорректный email", variant: "destructive" });
      return;
    }
    if (smsOn && !validatePhone(phoneNorm)) {
      toast({ title: "Некорректный телефон", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const patch: Record<string, string> = {};
      if (emailOn && emailNorm && emailNorm !== initialEmail.trim().toLowerCase()) {
        patch.email = emailNorm;
      }
      if (smsOn && phoneNorm && phoneNorm !== initialPhone.replace(/\D/g, "")) {
        patch.phone = phoneNorm;
      }
      if (Object.keys(patch).length > 0) {
        const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ["patient-profile", userId] });
        qc.invalidateQueries({ queryKey: ["patient-info", userId] });
      }
      await onSend({
        sendEmailOn: emailOn,
        email: emailNorm,
        sendSmsOn: smsOn,
        phone: phoneNorm,
        sendTgOn: tgOn,
        templateKey,
      });
    } catch (e: any) {
      toast({
        title: "Ошибка",
        description: e?.message || "Не удалось отправить",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Отправить напоминания</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Шаблон уведомления</Label>
            <Select value={templateKey} onValueChange={(v) => setTemplateKey(v as TemplateKey)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TEMPLATE_LABELS) as TemplateKey[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {TEMPLATE_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              По умолчанию выбран шаблон, соответствующий текущему статусу записи.
            </p>
          </div>
          <div className="space-y-2 rounded-md border p-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={emailOn}
                onChange={(e) => setEmailOn(e.target.checked)}
                className="h-4 w-4"
              />
              <Mail className="w-4 h-4" />
              <span className="font-medium text-sm">Email пациенту</span>
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              disabled={!emailOn}
            />
          </div>

          <div className="space-y-2 rounded-md border p-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={smsOn}
                onChange={(e) => setSmsOn(e.target.checked)}
                className="h-4 w-4"
              />
              <MessageSquare className="w-4 h-4" />
              <span className="font-medium text-sm">SMS пациенту</span>
            </label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="79991234567"
              disabled={!smsOn}
            />
          </div>

          <div className="rounded-md border p-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={tgOn}
                onChange={(e) => setTgOn(e.target.checked)}
                className="h-4 w-4"
              />
              <Send className="w-4 h-4" />
              <span className="font-medium text-sm">Telegram администраторам</span>
            </label>
          </div>

          <p className="text-xs text-muted-foreground">
            Изменённые email/телефон будут сохранены в профиль пациента.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Отправка…" : "Отправить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

