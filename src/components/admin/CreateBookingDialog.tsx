import { ButtonSpinner } from "@/components/admin/ButtonSpinner";
import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Calendar as CalendarIcon, Check, ChevronsUpDown, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type BookingStatus =
  | "waiting_call"
  | "no_answer"
  | "scheduled"
  | "collected"
  | "uploaded"
  | "received"
  | "not_scheduled";

const statusOptions: { value: BookingStatus; label: string }[] = [
  { value: "scheduled", label: "Назначен" },
  { value: "waiting_call", label: "Ожидает звонка" },
  { value: "no_answer", label: "Не дозвонились" },
  { value: "received", label: "Получен" },
  { value: "collected", label: "Обрабатывается" },
  { value: "uploaded", label: "Загружен" },
];

const ACTIVE_STATUSES: BookingStatus[] = [
  "scheduled",
  "received",
  "waiting_call",
  "no_answer",
];

interface CreateBookingDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateBookingDialog({ open, onClose }: CreateBookingDialogProps) {
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientPopoverOpen, setPatientPopoverOpen] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [time, setTime] = useState("10:00");
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState<BookingStatus>("scheduled");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) {
      setPatientId(null);
      setPatientSearch("");
      setDate(new Date());
      setTime("10:00");
      setAddress("");
      setStatus("scheduled");
    }
  }, [open]);

  // Список пациентов (роль patient)
  const { data: patients } = useQuery({
    queryKey: ["patients-for-booking"],
    queryFn: async () => {
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "patient");
      if (rolesError) throw rolesError;

      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [];

      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, name, email, phone")
        .in("id", ids);
      if (error) throw error;
      return profiles ?? [];
    },
    enabled: open,
  });

  const filteredPatients = useMemo(() => {
    if (!patients) return [];
    const q = patientSearch.trim().toLowerCase();
    if (!q) return patients.slice(0, 50);
    return patients
      .filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.email?.toLowerCase().includes(q) ||
          p.phone?.toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [patients, patientSearch]);

  const selectedPatient = patients?.find((p) => p.id === patientId) ?? null;


  // Проверка активной записи у выбранного пациента
  const { data: activeBooking } = useQuery({
    queryKey: ["active-booking-check", patientId],
    queryFn: async () => {
      if (!patientId) return null;
      const { data, error } = await supabase
        .from("analysis_bookings")
        .select("id, booking_date, status")
        .eq("user_id", patientId)
        .in("status", ACTIVE_STATUSES)
        .order("booking_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!patientId,
  });

  const willConflict =
    !!activeBooking && ACTIVE_STATUSES.includes(status);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!patientId) throw new Error("Не выбран пациент");
      const { error } = await supabase.from("analysis_bookings").insert({
        user_id: patientId,
        booking_date: format(date, "yyyy-MM-dd"),
        booking_time: time,
        address: address.trim(),
        status,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analysis-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["scheduledBookingsCount"] });
      toast({
        title: "Запись создана",
        description: "Запись на анализ успешно добавлена",
      });
      onClose();
    },
    onError: (err: any) => {
      const isDuplicate =
        err?.code === "23505" ||
        (typeof err?.message === "string" &&
          err.message.includes("analysis_bookings_one_active_per_user"));
      toast({
        title: "Ошибка",
        description: isDuplicate
          ? "У пациента уже есть активная запись. Завершите её или отредактируйте существующую."
          : err?.message ?? "Не удалось создать запись",
        variant: "destructive",
      });
    },
  });

  const canSubmit =
    !!patientId &&
    !!date &&
    !!time &&
    address.trim().length > 0 &&
    !willConflict &&
    !createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Новая запись на анализ</DialogTitle>
          <DialogDescription>
            Выберите пациента и заполните данные записи
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Пациент</Label>
            <Popover open={patientPopoverOpen} onOpenChange={setPatientPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between font-normal"
                >
                  {selectedPatient ? (
                    <span className="truncate">
                      {selectedPatient.name}
                      <span className="text-muted-foreground"> · {selectedPatient.email}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Выберите пациента</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="p-0 w-[--radix-popover-trigger-width] pointer-events-auto"
                align="start"
              >
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Поиск: имя, почта, телефон..."
                    value={patientSearch}
                    onValueChange={setPatientSearch}
                    autoComplete="off"
                    name="patient-search-no-autofill"
                  />
                  <CommandList>
                    <CommandEmpty>Не найдено</CommandEmpty>
                    <CommandGroup>
                      {filteredPatients.map((p) => (
                        <CommandItem
                          key={p.id}
                          value={p.id}
                          onSelect={() => {
                            setPatientId(p.id);
                            setPatientPopoverOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              patientId === p.id ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <div className="flex flex-col">
                            <span className="font-medium">{p.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {p.email}
                              {p.phone ? ` · ${p.phone}` : ""}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {willConflict && activeBooking && (
            <div className="flex gap-2 items-start rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
              <div>
                У пациента уже есть активная запись от{" "}
                <span className="font-medium">
                  {format(new Date(activeBooking.booking_date), "d MMMM yyyy", {
                    locale: ru,
                  })}
                </span>
                . Завершите её или отредактируйте существующую.
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Дата</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "d MMM yyyy", { locale: ru }) : "Дата"}
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
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
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
                {statusOptions.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
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
          <Button onClick={() => createMutation.mutate()} disabled={!canSubmit}>
            {createMutation.isPending && <ButtonSpinner className="mr-2" />}{createMutation.isPending ? "Создание..." : "Создать"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
