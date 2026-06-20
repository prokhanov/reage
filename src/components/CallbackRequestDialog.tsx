import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Phone, Home, Building2, MapPin, Check, X } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useViewAsUser } from "@/hooks/useViewAsUser";
import { PassportFields, isPassportValid } from "./PassportFields";
import LabLocationsMap, { type LabMapItem } from "@/components/admin/LabLocationsMap";

interface CallbackRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  existingBookingId?: string | null;
}

type LocationType = "home" | "clinic";
type CityKey = "moscow" | "spb";

const CITIES: { key: CityKey; label: string; center: [number, number]; zoom: number }[] = [
  { key: "moscow", label: "Москва и область", center: [55.7558, 37.6173], zoom: 10 },
  { key: "spb", label: "Санкт-Петербург", center: [59.9343, 30.3351], zoom: 11 },
];

const isSpb = (city: string | null) =>
  !!city && /санкт|петербург|спб/i.test(city);

const formatPhone = (raw: string) => {
  const digits = raw.replace(/\D/g, "").replace(/^8/, "7").slice(0, 11);
  if (!digits) return "";
  const d = digits.padEnd(11, "_").split("");
  return `+7 (${d.slice(1, 4).join("")}) ${d.slice(4, 7).join("")}-${d
    .slice(7, 9)
    .join("")}-${d.slice(9, 11).join("")}`.replace(/_/g, "_");
};

const normalizePhone = (raw: string) => {
  const digits = raw.replace(/\D/g, "").replace(/^8/, "7");
  return digits.length === 11 ? `+${digits}` : "";
};

export function CallbackRequestDialog({
  open,
  onOpenChange,
  onSuccess,
  existingBookingId,
}: CallbackRequestDialogProps) {
  const [phone, setPhone] = useState("");
  const [passportSeries, setPassportSeries] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [locationType, setLocationType] = useState<LocationType>("home");
  const [city, setCity] = useState<CityKey>("moscow");
  const [labs, setLabs] = useState<LabMapItem[]>([]);
  const [labsLoading, setLabsLoading] = useState(false);
  const [selectedLab, setSelectedLab] = useState<LabMapItem | null>(null);
  const { toast } = useToast();
  const { getUserId } = useViewAsUser();

  useEffect(() => {
    if (!open) return;
    (async () => {
      const userId = await getUserId();
      if (!userId) return;
      const { data } = await supabase
        .from("profiles")
        .select("phone, passport_series, passport_number")
        .eq("id", userId)
        .maybeSingle();
      if (data?.phone) setPhone(formatPhone(data.phone));
      setPassportSeries((data as any)?.passport_series || "");
      setPassportNumber((data as any)?.passport_number || "");
    })();
  }, [open, getUserId]);

  // Load labs lazily when клиника выбрана
  useEffect(() => {
    if (!open || locationType !== "clinic" || labs.length > 0) return;
    setLabsLoading(true);
    (async () => {
      const { data } = await supabase
        .from("lab_locations")
        .select("id,title,metro,city,address_short,full_address,phones,hours,page_url,lat,lng")
        .eq("is_active", true)
        .not("lat", "is", null)
        .not("lng", "is", null);
      setLabs((data ?? []) as LabMapItem[]);
      setLabsLoading(false);
    })();
  }, [open, locationType, labs.length]);

  const filteredLabs = useMemo(() => {
    if (city === "spb") return labs.filter((i) => isSpb(i.city ?? null));
    return labs.filter((i) => !isSpb(i.city ?? null));
  }, [labs, city]);

  const currentCity = CITIES.find((c) => c.key === city)!;

  const resetState = () => {
    setLocationType("home");
    setSelectedLab(null);
    setCity("moscow");
  };

  const handleSubmit = async () => {
    const normalized = normalizePhone(phone);
    if (!normalized) {
      toast({
        title: "Введите телефон",
        description: "Укажите корректный номер для связи",
        variant: "destructive",
      });
      return;
    }
    if (!isPassportValid(passportSeries, passportNumber)) {
      toast({
        title: "Заполните паспортные данные",
        description: "Серия — 4 цифры, номер — 6 цифр",
        variant: "destructive",
      });
      return;
    }
    if (locationType === "clinic" && !selectedLab) {
      toast({
        title: "Выберите клинику",
        description: "Кликните по маркеру на карте и нажмите «Выбрать эту лабораторию»",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const userId = await getUserId();
      if (!userId) throw new Error("Не удалось определить пользователя");

      await supabase
        .from("profiles")
        .update({
          phone: normalized,
          passport_series: passportSeries,
          passport_number: passportNumber,
        } as any)
        .eq("id", userId);

      const addressValue =
        locationType === "clinic" && selectedLab
          ? [selectedLab.title, selectedLab.full_address ?? selectedLab.address_short ?? ""]
              .filter(Boolean)
              .join(" — ")
          : "";

      const patch: Record<string, any> = {
        status: "waiting_call",
        location_type: locationType,
        lab_location_id: locationType === "clinic" ? selectedLab?.id ?? null : null,
        address: addressValue,
        updated_at: new Date().toISOString(),
      };

      if (existingBookingId) {
        const { error } = await supabase
          .from("analysis_bookings")
          .update(patch)
          .eq("id", existingBookingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("analysis_bookings").insert({
          user_id: userId,
          status: "waiting_call",
          booking_date: new Date().toISOString().slice(0, 10),
          booking_time: "00:00",
          address: addressValue,
          location_type: locationType,
          lab_location_id: locationType === "clinic" ? selectedLab?.id ?? null : null,
        } as any);
        if (error) throw error;
      }

      toast({
        title: "Заявка принята",
        description:
          locationType === "clinic"
            ? "Менеджер свяжется с вами для согласования времени визита в клинику"
            : "Менеджер свяжется с вами для согласования времени визита медсестры",
      });
      onSuccess?.();
      resetState();
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: "Ошибка",
        description: e?.message ?? "Не удалось отправить заявку",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetState();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Мы вам перезвоним
          </DialogTitle>
          <DialogDescription>
            {locationType === "home"
              ? "Менеджер свяжется с вами для согласования удобной даты, времени и адреса визита медсестры."
              : "Менеджер свяжется с вами для согласования удобного времени визита в выбранную клинику."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Где сдать анализы</Label>
            <ToggleGroup
              type="single"
              value={locationType}
              onValueChange={(v) => v && setLocationType(v as LocationType)}
              className="grid grid-cols-2 gap-2"
            >
              <ToggleGroupItem value="home" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground border h-12 justify-start gap-2 px-3">
                <Home className="h-4 w-4" />
                На дому
              </ToggleGroupItem>
              <ToggleGroupItem value="clinic" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground border h-12 justify-start gap-2 px-3">
                <Building2 className="h-4 w-4" />
                В клинике
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="callback-phone-input">Ваш телефон</Label>
            <Input
              id="callback-phone-input"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="+7 (___) ___-__-__"
            />
          </div>
          <PassportFields
            series={passportSeries}
            number={passportNumber}
            onSeriesChange={setPassportSeries}
            onNumberChange={setPassportNumber}
            showIcon={false}
          />

          {locationType === "clinic" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Label>Выберите клинику на карте</Label>
                <ToggleGroup
                  type="single"
                  value={city}
                  onValueChange={(v) => v && setCity(v as CityKey)}
                  className="gap-1"
                >
                  {CITIES.map((c) => (
                    <ToggleGroupItem key={c.key} value={c.key} className="h-7 px-2 text-xs border data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                      {c.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              {selectedLab ? (
                <div className="rounded-md border border-primary/50 bg-primary/5 p-3 flex items-start gap-3">
                  <Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{selectedLab.title}</div>
                    {selectedLab.metro && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" />
                        {selectedLab.metro}
                      </div>
                    )}
                    {selectedLab.full_address && (
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">
                        {selectedLab.full_address}
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedLab(null)}
                    className="shrink-0 h-7 px-2 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Сменить
                  </Button>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  Кликните по маркеру и нажмите «Выбрать эту лабораторию».
                </div>
              )}

              <div className="rounded-md overflow-hidden border">
                {labsLoading ? (
                  <div className="h-[320px] flex items-center justify-center text-sm text-muted-foreground">
                    Загрузка карты…
                  </div>
                ) : (
                  <LabLocationsMap
                    items={filteredLabs}
                    center={currentCity.center}
                    zoom={currentCity.zoom}
                    fitToItems={filteredLabs.length > 0}
                    height={320}
                    hideControls
                    hideAttribution
                    showPartnerButton={false}
                    showSelectButton
                    selectButtonLabel="Выбрать эту лабораторию"
                    onSelect={(item) => setSelectedLab(item)}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              loading ||
              !isPassportValid(passportSeries, passportNumber) ||
              (locationType === "clinic" && !selectedLab)
            }
          >
            {loading ? "Отправка..." : "Подтвердить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
