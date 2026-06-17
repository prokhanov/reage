import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Settings2 } from "lucide-react";
import LabLocationsMap, { LabMapItem, TileStyleKey, TileFilters, DEFAULT_FILTERS } from "./LabLocationsMap";

type City = "moscow" | "spb";

type LabMapContext = {
  id: string;
  key: string;
  name: string;
  location: string;
  default_city: City;
  default_zoom: number;
  only_active: boolean;
  height_px: number;
  is_enabled: boolean;
  tile_style: TileStyleKey;
  tile_filters: TileFilters;
  show_partner_button: boolean;
  show_select_button: boolean;
  partner_button_label: string;
  select_button_label: string;
};

const CITY_LABEL: Record<City, string> = {
  moscow: "Москва",
  spb: "Санкт-Петербург",
};

const CITY_CENTER: Record<City, [number, number]> = {
  moscow: [55.7558, 37.6173],
  spb: [59.9343, 30.3351],
};

const CITY_DEFAULT_ZOOM: Record<City, number> = {
  moscow: 10,
  spb: 11,
};

export default function LabMapContextsTable({ items }: { items: LabMapItem[] }) {
  const { toast } = useToast();
  const [rows, setRows] = useState<LabMapContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<LabMapContext | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("lab_map_contexts" as any)
      .select("*")
      .order("created_at", { ascending: true });
    if (error) {
      toast({ title: "Ошибка загрузки", description: error.message, variant: "destructive" });
    } else {
      setRows((data ?? []) as unknown as LabMapContext[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (patch: Partial<LabMapContext>) => {
    if (!editing) return;
    const { error } = await supabase
      .from("lab_map_contexts" as any)
      .update(patch)
      .eq("id", editing.id);
    if (error) {
      toast({ title: "Не удалось сохранить", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Сохранено" });
    setEditing(null);
    load();
  };

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">
        Карта может использоваться в нескольких местах продукта. Здесь задаются настройки для каждого места.
        На главную и в личный кабинет карта пока не выводится — только подготовка настроек.
      </div>

      <div className="rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Название</TableHead>
              <TableHead>Расположение</TableHead>
              <TableHead>Город</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Нет настроенных мест использования карты.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-muted-foreground">{r.location || "—"}</TableCell>
                  <TableCell>{CITY_LABEL[r.default_city] ?? r.default_city}</TableCell>
                  <TableCell>
                    {r.is_enabled ? (
                      <Badge variant="default">Включено</Badge>
                    ) : (
                      <Badge variant="secondary">Выключено</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditing(r)}>
                      <Settings2 className="h-3.5 w-3.5" />
                      Настроить
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <SettingsDialog
        ctx={editing}
        items={items}
        onClose={() => setEditing(null)}
        onSave={handleSave}
      />
    </div>
  );
}

function SettingsDialog({
  ctx,
  items,
  onClose,
  onSave,
}: {
  ctx: LabMapContext | null;
  items: LabMapItem[];
  onClose: () => void;
  onSave: (patch: Partial<LabMapContext>) => Promise<void>;
}) {
  const [draft, setDraft] = useState<LabMapContext | null>(ctx);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(ctx);
  }, [ctx]);

  if (!draft) return null;

  const setField = <K extends keyof LabMapContext>(k: K, v: LabMapContext[K]) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d));

  const handleCityChange = (city: City) => {
    setDraft((d) =>
      d
        ? {
            ...d,
            default_city: city,
            default_zoom: CITY_DEFAULT_ZOOM[city],
          }
        : d,
    );
  };

  const previewItems = items.filter((i) => i.lat != null && i.lng != null);

  return (
    <Dialog open={!!ctx} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Настройки карты — {draft.name}</DialogTitle>
          <DialogDescription>{draft.location || "Место использования карты"}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Город по умолчанию</Label>
                <Select value={draft.default_city} onValueChange={(v) => handleCityChange(v as City)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="moscow">Москва</SelectItem>
                    <SelectItem value="spb">Санкт-Петербург</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Зум по умолчанию</Label>
                <Input
                  type="number"
                  min={3}
                  max={19}
                  value={draft.default_zoom}
                  onChange={(e) => setField("default_zoom", Number(e.target.value) || 10)}
                />
                <p className="text-xs text-muted-foreground">
                  Рекомендуется: Москва ~10, Санкт-Петербург ~11.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Высота карты (px)</Label>
                <Input
                  type="number"
                  min={200}
                  max={1200}
                  value={draft.height_px}
                  onChange={(e) => setField("height_px", Number(e.target.value) || 420)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <div className="text-sm font-medium">Только активные лаборатории</div>
                  <div className="text-xs text-muted-foreground">
                    Показывать на карте только лаборатории со статусом «Активна».
                  </div>
                </div>
                <Switch
                  checked={draft.only_active}
                  onCheckedChange={(c) => setField("only_active", c)}
                />
              </div>

              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <div className="text-sm font-medium">Включить отображение</div>
                  <div className="text-xs text-muted-foreground">
                    Когда настройки будут подключены к интерфейсу, карта будет показываться в этом месте.
                  </div>
                </div>
                <Switch
                  checked={draft.is_enabled}
                  onCheckedChange={(c) => setField("is_enabled", c)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Кнопки во всплывающих окнах меток</Label>
            <div className="space-y-3">
              <div className="rounded-md border border-border p-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">«Перейти на сайт партнёра»</div>
                    <div className="text-xs text-muted-foreground">
                      Кнопка с ссылкой на страницу лаборатории у провайдера.
                    </div>
                  </div>
                  <Switch
                    checked={draft.show_partner_button}
                    onCheckedChange={(c) => setField("show_partner_button", c)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Текст кнопки</Label>
                  <Input
                    value={draft.partner_button_label}
                    onChange={(e) => setField("partner_button_label", e.target.value)}
                    placeholder="Открыть на сайте провайдера ↗"
                    disabled={!draft.show_partner_button}
                  />
                </div>
              </div>
              <div className="rounded-md border border-border p-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">«Выбрать эту лабораторию»</div>
                    <div className="text-xs text-muted-foreground">
                      Для личного кабинета пациента — выбор точки сдачи анализов.
                    </div>
                  </div>
                  <Switch
                    checked={draft.show_select_button}
                    onCheckedChange={(c) => setField("show_select_button", c)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Текст кнопки</Label>
                  <Input
                    value={draft.select_button_label}
                    onChange={(e) => setField("select_button_label", e.target.value)}
                    placeholder="Выбрать эту лабораторию"
                    disabled={!draft.show_select_button}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Превью (изменения стиля и вида сохраняются вместе с настройками)</Label>
            <div className="rounded-md border border-border overflow-hidden">
              <LabLocationsMap
                key={`${draft.id}-${draft.default_city}-${draft.default_zoom}-${draft.height_px}`}
                items={previewItems}
                center={CITY_CENTER[draft.default_city]}
                zoom={draft.default_zoom}
                fitToItems={false}
                height={`${draft.height_px}px`}
                styleKey={draft.tile_style}
                onStyleKeyChange={(k) => setField("tile_style", k)}
                filters={draft.tile_filters ?? DEFAULT_FILTERS}
                onFiltersChange={(f) => setField("tile_filters", f)}
                showPartnerButton={draft.show_partner_button}
                showSelectButton={draft.show_select_button}
                partnerButtonLabel={draft.partner_button_label}
                selectButtonLabel={draft.select_button_label}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              await onSave({
                default_city: draft.default_city,
                default_zoom: draft.default_zoom,
                only_active: draft.only_active,
                height_px: draft.height_px,
                is_enabled: draft.is_enabled,
                tile_style: draft.tile_style,
                tile_filters: draft.tile_filters,
                show_partner_button: draft.show_partner_button,
                show_select_button: draft.show_select_button,
                partner_button_label: draft.partner_button_label,
                select_button_label: draft.select_button_label,
              });
              setSaving(false);
            }}
          >
            {saving ? "Сохранение..." : "Сохранить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
