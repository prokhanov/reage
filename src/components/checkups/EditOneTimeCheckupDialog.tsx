import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { bookingStatusLabels, bookingStatusOrder, type BookingStatus } from "@/lib/bookingStatusLabels";
import { notify } from "@/lib/toast";

export type OneTimeCheckupRecord = {
  id: string;
  user_id: string;
  order_id: string;
  checkup_slug: string;
  paid_amount: number;
  status: BookingStatus;
  labquest_request_number: string | null;
  location_type: "clinic" | "home";
  lab_location_id: string | null;
  location_title: string | null;
  address: string | null;
  appointment_date: string | null;
  appointment_time: string | null;
  internal_comment: string | null;
  analysis_id: string | null;
  created_at: string;
};

export function EditOneTimeCheckupDialog({ record, onClose }: { record: OneTimeCheckupRecord | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<BookingStatus>("waiting_call");
  const [requestNumber, setRequestNumber] = useState("");
  const [locationType, setLocationType] = useState<"clinic" | "home">("clinic");
  const [labId, setLabId] = useState("");
  const [address, setAddress] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!record) return;
    setStatus(record.status);
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
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader><DialogTitle>Изменить запись</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-2"><Label>Статус</Label><Select value={status} onValueChange={(value) => setStatus(value as BookingStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{bookingStatusOrder.map((value) => <SelectItem key={value} value={value}>{bookingStatusLabels[value]}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label htmlFor="request-number">Номер заявки в лаборатории</Label><Input id="request-number" value={requestNumber} onChange={(event) => setRequestNumber(event.target.value)} /></div>
          <div className="space-y-2"><Label>Где сдавать</Label><Select value={locationType} onValueChange={(value) => setLocationType(value as "clinic" | "home")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="clinic">В лаборатории</SelectItem><SelectItem value="home">Дома</SelectItem></SelectContent></Select></div>
          {locationType === "clinic" ? (
            <div className="space-y-2"><Label>Отделение</Label><Select value={labId} onValueChange={setLabId}><SelectTrigger><SelectValue placeholder="Выберите отделение" /></SelectTrigger><SelectContent>{labs.map((lab) => <SelectItem key={lab.id} value={lab.id}>{lab.title} · {lab.address_short || lab.full_address}</SelectItem>)}</SelectContent></Select></div>
          ) : (
            <div className="space-y-2"><Label htmlFor="home-address">Адрес выезда</Label><Input id="home-address" value={address} onChange={(event) => setAddress(event.target.value)} /></div>
          )}
          <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="appointment-date">Дата</Label><Input id="appointment-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="appointment-time">Время</Label><Input id="appointment-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} /></div></div>
          <div className="space-y-2"><Label htmlFor="internal-comment">Внутренний комментарий</Label><Textarea id="internal-comment" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Пациент этот комментарий не увидит" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Отмена</Button><Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>{mutation.isPending ? "Сохранение…" : "Сохранить"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}