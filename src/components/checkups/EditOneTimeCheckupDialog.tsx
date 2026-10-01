import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CHECKUP_STATUSES, normalizeCheckupStatus, type CheckupStatus } from "@/lib/checkupStatuses";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";

export type OneTimeCheckupRecord = {
  id: string;
  user_id: string;
  order_id: string;
  checkup_slug: string;
  paid_amount: number;
  status: string;
  labquest_request_number: string | null;
  location_type: "clinic" | "home";
  lab_location_id: string | null;
  location_title: string | null;
  address: string | null;
  appointment_date: string | null;
  appointment_time: string | null;
  internal_comment: string | null;
  analysis_id: string | null;
  consultation_purchased: boolean;
  created_at: string;
};

export function EditOneTimeCheckupDialog({ record, checkupName, onClose }: { record: OneTimeCheckupRecord | null; checkupName?: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<CheckupStatus>("paid");
  const [requestNumber, setRequestNumber] = useState("");
  const [locationType, setLocationType] = useState<"clinic" | "home">("clinic");
  const [labId, setLabId] = useState("");
  const [address, setAddress] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!record) return;
    setStatus(normalizeCheckupStatus(record.status));
    setRequestNumber(record.labquest_request_number ?? "");
    setLocationType(record.location_type);
    setLabId(record.lab_location_id ?? "");
    setAddress(record.address ?? "");
    setDate(record.appointment_date ?? "");
    setTime(record.appointment_time ?? "");
    setComment(record.internal_comment ?? "");
  }, [record]);

  const { data: labs = [] } = useQuery({
    queryKey: ["active-labs-for-checkup-edit"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lab_locations").select("id, title, full_address, address_short, city").eq("is_active", true).order("city");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!record,
  });

  const { data: patient } = useQuery({
    queryKey: ["checkup-patient-name", record?.user_id],
    queryFn: async () => {
      if (!record) return null;
      const { data } = await supabase.from("profiles").select("first_name, last_name").eq("id", record.user_id).maybeSingle();
      return data;
    },
    enabled: !!record,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!record) return;
      const lab = labs.find((item) => item.id === labId);
      const nextAddress = locationType === "clinic"
        ? (lab?.full_address || lab?.address_short || address || null)
        : (address.trim() || null);
      const { error } = await supabase.from("one_time_checkups").update({
        status,
        labquest_request_number: requestNumber.trim() || null,
        location_type: locationType,
        lab_location_id: locationType === "clinic" ? (labId || null) : null,
        location_title: locationType === "clinic" ? (lab?.title || null) : "Дома",
        address: nextAddress,
        appointment_date: date || null,
        appointment_time: time || null,
        internal_comment: comment.trim() || null,
        updated_at: new Date().toISOString(),
      }).eq("id", record.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["one-time-checkups"] });
      notify.success("Запись обновлена");
      onClose();
    },
    onError: (error: Error) => notify.error("Не удалось сохранить", error.message),
  });

  return (
    <Dialog open={!!record} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[92dvh] max-w-2xl flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:rounded-3xl [&>button]:hidden">
        <DialogHeader className="relative border-b px-6 py-6 pr-16 text-left sm:px-7">
          <DialogTitle className="text-2xl font-semibold">Редактировать запись</DialogTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {checkupName || "Чекап"} · {[patient?.first_name, patient?.last_name].filter(Boolean).join(" ") || "Пациент"}
          </p>
          <Button type="button" variant="ghost" size="icon" className="absolute right-5 top-5" onClick={onClose} aria-label="Закрыть"><X className="h-5 w-5" /></Button>
        </DialogHeader>
        <div className="grid gap-5 overflow-y-auto px-6 py-5 sm:px-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Статус</Label><Select value={status} onValueChange={(value) => setStatus(value as CheckupStatus)}><SelectTrigger className="h-12"><SelectValue /></SelectTrigger><SelectContent>{CHECKUP_STATUSES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="request-number">Номер заявки</Label><Input className="h-12" id="request-number" value={requestNumber} onChange={(event) => setRequestNumber(event.target.value)} placeholder="№ заявки" /></div>
          </div>
          <div className="space-y-2">
            <Label>Где сдавать</Label>
            <div className="grid grid-cols-2 rounded-xl bg-muted p-1">
              <Button type="button" variant={locationType === "clinic" ? "secondary" : "ghost"} className={cn("h-10", locationType === "clinic" && "bg-background shadow-sm")} onClick={() => setLocationType("clinic")}>В лаборатории</Button>
              <Button type="button" variant={locationType === "home" ? "secondary" : "ghost"} className={cn("h-10", locationType === "home" && "bg-background shadow-sm")} onClick={() => setLocationType("home")}>Дома</Button>
            </div>
          </div>
          {locationType === "clinic" ? (
            <div className="space-y-2"><Label>Отделение</Label><Select value={labId} onValueChange={setLabId}><SelectTrigger className="h-12"><SelectValue placeholder="Выберите отделение" /></SelectTrigger><SelectContent>{labs.map((lab) => <SelectItem key={lab.id} value={lab.id}>{lab.title} · {lab.address_short || lab.full_address}</SelectItem>)}</SelectContent></Select></div>
          ) : (
            <div className="space-y-2"><Label htmlFor="home-address">Адрес выезда</Label><Input className="h-12" id="home-address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Город, улица, дом, квартира" /></div>
          )}
          <div className="rounded-xl bg-muted px-4 py-3 text-sm leading-relaxed text-muted-foreground">При выборе «Дома» вместо отделения появятся: адрес, квартира, подъезд, этаж, домофон, дата и интервал приезда.</div>
          {<div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Дата</Label><Popover><PopoverTrigger asChild><Button variant="outline" className={cn("h-12 w-full justify-start text-left font-normal", !date && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{date ? format(new Date(`${date}T00:00:00`), "d MMMM yyyy", { locale: ru }) : "Выберите дату"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={date ? new Date(`${date}T00:00:00`) : undefined} onSelect={(value) => setDate(value ? format(value, "yyyy-MM-dd") : "")} initialFocus className="pointer-events-auto p-3" /></PopoverContent></Popover></div><div className="space-y-2"><Label htmlFor="appointment-time">Время</Label><Input className="h-12" id="appointment-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} /></div></div>}
          <div className="space-y-2"><Label htmlFor="internal-comment">Внутренний комментарий</Label><Textarea className="min-h-20 resize-y" id="internal-comment" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Видят только сотрудники" /></div>
        </div>
        <DialogFooter className="flex-row items-center border-t px-6 py-4 sm:justify-between sm:px-7"><p className="mr-auto hidden text-sm text-muted-foreground sm:block">Пациент сразу увидит изменения</p><Button variant="outline" onClick={onClose}>Отмена</Button><Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>{mutation.isPending ? "Сохранение…" : "Сохранить"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}