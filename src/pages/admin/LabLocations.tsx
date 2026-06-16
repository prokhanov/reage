import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin,
  Upload,
  Plus,
  Pencil,
  Trash2,
  Search,
  ExternalLink,
  RefreshCw,
  Map as MapIcon,
  List as ListIcon,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import LabLocationsMap from "@/components/admin/LabLocationsMap";

type LabLocation = {
  id: string;
  provider: string;
  external_id: string | null;
  title: string;
  metro: string | null;
  city: string | null;
  address_short: string | null;
  full_address: string | null;
  lat: number | null;
  lng: number | null;
  phones: string[];
  hours: string[];
  email: string | null;
  page_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type EditState = Partial<LabLocation> & { phonesText?: string; hoursText?: string };

const emptyEdit: EditState = {
  provider: "labquest",
  title: "",
  is_active: true,
  phones: [],
  hours: [],
};

export default function LabLocations() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<LabLocation[]>([]);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [editing, setEditing] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleSyncLabquest = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-labquest-clinics");
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Не удалось обновить");
      const byRegion = data.by_region
        ? " (" + Object.entries(data.by_region).map(([r, n]) => `${r}: ${n}`).join(", ") + ")"
        : "";
      toast({
        title: "Синхронизация завершена",
        description: `Обновлено клиник: ${data.count}${byRegion}`,
      });
      load();
    } catch (e: any) {
      toast({
        title: "Ошибка синхронизации",
        description: e?.message || String(e),
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("lab_locations" as any)
      .select("*")
      .order("city", { ascending: true })
      .order("metro", { ascending: true });
    if (error) {
      toast({ title: "Ошибка загрузки", description: error.message, variant: "destructive" });
    } else {
      setItems((data as any[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const cities = Array.from(new Set(items.map((i) => i.city).filter(Boolean))) as string[];
  const providers = Array.from(new Set(items.map((i) => i.provider)));

  const filtered = items.filter((i) => {
    if (cityFilter !== "all" && i.city !== cityFilter) return false;
    if (providerFilter !== "all" && i.provider !== providerFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      i.title.toLowerCase().includes(q) ||
      (i.metro ?? "").toLowerCase().includes(q) ||
      (i.address_short ?? "").toLowerCase().includes(q) ||
      (i.full_address ?? "").toLowerCase().includes(q)
    );
  });

  const openCreate = () => setEditing({ ...emptyEdit, phonesText: "", hoursText: "" });
  const openEdit = (row: LabLocation) =>
    setEditing({
      ...row,
      phonesText: row.phones.join("\n"),
      hoursText: row.hours.join("\n"),
    });

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.title?.trim()) {
      toast({ title: "Укажите название", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      provider: editing.provider || "labquest",
      external_id: editing.external_id || null,
      title: editing.title.trim(),
      metro: editing.metro || null,
      city: editing.city || null,
      address_short: editing.address_short || null,
      full_address: editing.full_address || null,
      lat: editing.lat != null && editing.lat !== ("" as any) ? Number(editing.lat) : null,
      lng: editing.lng != null && editing.lng !== ("" as any) ? Number(editing.lng) : null,
      phones: (editing.phonesText ?? "").split("\n").map((s) => s.trim()).filter(Boolean),
      hours: (editing.hoursText ?? "").split("\n").map((s) => s.trim()).filter(Boolean),
      email: editing.email || null,
      page_url: editing.page_url || null,
      is_active: editing.is_active ?? true,
    };
    const query = editing.id
      ? supabase.from("lab_locations" as any).update(payload).eq("id", editing.id)
      : supabase.from("lab_locations" as any).insert(payload);
    const { error } = await query;
    setSaving(false);
    if (error) {
      toast({ title: "Не удалось сохранить", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing.id ? "Сохранено" : "Адрес добавлен" });
    setEditing(null);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить этот адрес?")) return;
    const { error } = await supabase.from("lab_locations" as any).delete().eq("id", id);
    if (error) {
      toast({ title: "Ошибка удаления", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Удалено" });
    load();
  };

  const toggleActive = async (row: LabLocation) => {
    const { error } = await supabase
      .from("lab_locations" as any)
      .update({ is_active: !row.is_active })
      .eq("id", row.id);
    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };

  const handleFile = async (file: File) => {
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error("Файл должен содержать массив объектов");

      let inserted = 0;
      let errors = 0;
      const provider = "labquest";

      const rows = parsed
        .map((raw: any) => {
          try {
            if (!raw || typeof raw !== "object") throw new Error("invalid");
            const externalId = String(raw.labquest_id ?? raw.external_id ?? "").trim() || null;
            const title = String(raw.title ?? raw.full_address ?? raw.address_short ?? "").trim();
            if (!title) throw new Error("no title");
            const phones = Array.isArray(raw.phones) ? raw.phones.filter(Boolean).map(String) : [];
            const hours = Array.isArray(raw.hours) ? raw.hours.filter(Boolean).map(String) : [];
            const toNum = (v: any) =>
              v === null || v === undefined || v === "" ? null : Number(v);
            return {
              provider,
              external_id: externalId,
              title,
              metro: raw.metro ? String(raw.metro) : null,
              city: raw.city ? String(raw.city) : null,
              address_short: raw.address_short ? String(raw.address_short) : null,
              full_address: raw.full_address ? String(raw.full_address) : null,
              lat: toNum(raw.lat),
              lng: toNum(raw.lng),
              phones,
              hours,
              email: raw.email ? String(raw.email) : null,
              page_url: raw.page_url ? String(raw.page_url) : null,
              is_active: true,
            };
          } catch {
            errors++;
            return null;
          }
        })
        .filter(Boolean) as any[];

      const chunkSize = 200;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const withIds = chunk.filter((r) => r.external_id);
        const withoutIds = chunk.filter((r) => !r.external_id);

        if (withIds.length) {
          const { error } = await supabase
            .from("lab_locations" as any)
            .upsert(withIds, { onConflict: "provider,external_id" });
          if (error) {
            errors += withIds.length;
            console.error(error);
          } else {
            inserted += withIds.length;
          }
        }
        if (withoutIds.length) {
          const { error } = await supabase.from("lab_locations" as any).insert(withoutIds);
          if (error) {
            errors += withoutIds.length;
            console.error(error);
          } else {
            inserted += withoutIds.length;
          }
        }
      }

      toast({
        title: "Импорт завершён",
        description: `Загружено: ${inserted}. Ошибок: ${errors}.`,
      });
      load();
    } catch (e: any) {
      toast({ title: "Ошибка импорта", description: e.message, variant: "destructive" });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="container max-w-7xl py-6 space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" />
            Лаборатории
          </h1>
          <p className="text-sm text-muted-foreground">
            Справочник адресов пунктов забора (LabQuest и другие провайдеры).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <Button
            variant="outline"
            onClick={handleSyncLabquest}
            disabled={syncing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Обновление..." : "Обновить клиники LabQuest"}
          </Button>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            <Upload className="h-4 w-4 mr-2" />
            {importing ? "Импорт..." : "Загрузить JSON"}
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить
          </Button>
        </div>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list" className="gap-2">
            <ListIcon className="h-4 w-4" /> Список
          </TabsTrigger>
          <TabsTrigger value="map" className="gap-2">
            <MapIcon className="h-4 w-4" /> Карта
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4 mt-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по метро, адресу, названию..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Город" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все города</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Провайдер" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все провайдеры</SelectItem>
                {providers.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground">
            Всего: {items.length}. Показано: {filtered.length}.
          </div>

          <div className="rounded-md border bg-card">
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Провайдер</TableHead>
                    <TableHead>Метро</TableHead>
                    <TableHead className="min-w-[260px]">Адрес</TableHead>
                    <TableHead>Город</TableHead>
                    <TableHead>Телефоны</TableHead>
                    <TableHead>Часы</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading
                    ? [...Array(6)].map((_, i) => (
                        <TableRow key={i}>
                          {[...Array(8)].map((__, j) => (
                            <TableCell key={j}>
                              <Skeleton className="h-4 w-full" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    : filtered.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>
                            <Badge variant="secondary">{row.provider}</Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{row.metro ?? "—"}</TableCell>
                          <TableCell>
                            <div className="font-medium">{row.title}</div>
                            {row.full_address && (
                              <div className="text-xs text-muted-foreground">
                                {row.full_address}
                              </div>
                            )}
                            {row.page_url && (
                              <a
                                href={row.page_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-primary inline-flex items-center gap-1 mt-1"
                              >
                                страница <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{row.city ?? "—"}</TableCell>
                          <TableCell className="text-xs whitespace-pre-line">
                            {row.phones.join("\n") || "—"}
                          </TableCell>
                          <TableCell className="text-xs whitespace-pre-line">
                            {row.hours.join("\n") || "—"}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={row.is_active}
                              onCheckedChange={() => toggleActive(row)}
                            />
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(row)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDelete(row.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  {!loading && filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                        Нет адресов. Загрузите JSON или добавьте вручную.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="map" className="space-y-3 mt-4">
          {(() => {
            const activeAll = items.filter((i) => i.is_active);
            const withCoords = activeAll.filter(
              (i) => i.lat != null && i.lng != null,
            );
            const withoutCoords = activeAll.filter(
              (i) => i.lat == null || i.lng == null,
            );
            return (
              <>
                <div className="text-sm text-muted-foreground">
                  Показано на карте: <span className="font-medium text-foreground">{withCoords.length}</span> из{" "}
                  <span className="font-medium text-foreground">{activeAll.length}</span> активных лабораторий.
                  {withoutCoords.length > 0 && (
                    <> Без координат: <span className="text-foreground">{withoutCoords.length}</span>.</>
                  )}
                </div>
                {loading ? (
                  <Skeleton className="h-[70vh] w-full rounded-lg" />
                ) : withCoords.length === 0 ? (
                  <div className="rounded-lg border border-border bg-card p-10 text-center text-muted-foreground">
                    Нет активных лабораторий с координатами для отображения на карте.
                  </div>
                ) : (
                  <LabLocationsMap
                    items={withCoords.map((i) => ({
                      id: i.id,
                      title: i.title,
                      metro: i.metro,
                      city: i.city,
                      address_short: i.address_short,
                      full_address: i.full_address,
                      phones: i.phones,
                      hours: i.hours,
                      page_url: i.page_url,
                      lat: i.lat as number,
                      lng: i.lng as number,
                    }))}
                  />
                )}
                {withoutCoords.length > 0 && (
                  <details className="rounded-lg border border-border bg-card p-4 text-sm">
                    <summary className="cursor-pointer font-medium">
                      Активные лаборатории без координат ({withoutCoords.length})
                    </summary>
                    <ul className="mt-3 space-y-2 text-muted-foreground">
                      {withoutCoords.map((i) => (
                        <li key={i.id} className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                          <div>
                            <div className="text-foreground">{i.title}</div>
                            {i.full_address && (
                              <div className="text-xs">{i.full_address}</div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </>
            );
          })()}
        </TabsContent>
      </Tabs>
            <DialogTitle>{editing?.id ? "Редактировать адрес" : "Новый адрес"}</DialogTitle>
            <DialogDescription>
              Заполните поля. Телефоны и часы — по одной строке на значение.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Провайдер</Label>
                <Input
                  value={editing.provider ?? ""}
                  onChange={(e) => setEditing({ ...editing, provider: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>External ID</Label>
                <Input
                  value={editing.external_id ?? ""}
                  onChange={(e) => setEditing({ ...editing, external_id: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Название *</Label>
                <Input
                  value={editing.title ?? ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Метро</Label>
                <Input
                  value={editing.metro ?? ""}
                  onChange={(e) => setEditing({ ...editing, metro: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Город</Label>
                <Input
                  value={editing.city ?? ""}
                  onChange={(e) => setEditing({ ...editing, city: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Краткий адрес</Label>
                <Input
                  value={editing.address_short ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, address_short: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Полный адрес</Label>
                <Textarea
                  rows={2}
                  value={editing.full_address ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, full_address: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Широта</Label>
                <Input
                  value={editing.lat ?? ""}
                  onChange={(e) => setEditing({ ...editing, lat: e.target.value as any })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Долгота</Label>
                <Input
                  value={editing.lng ?? ""}
                  onChange={(e) => setEditing({ ...editing, lng: e.target.value as any })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Телефоны (по одному в строке)</Label>
                <Textarea
                  rows={3}
                  value={editing.phonesText ?? ""}
                  onChange={(e) => setEditing({ ...editing, phonesText: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Часы (по одной строке)</Label>
                <Textarea
                  rows={3}
                  value={editing.hoursText ?? ""}
                  onChange={(e) => setEditing({ ...editing, hoursText: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  value={editing.email ?? ""}
                  onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>URL страницы</Label>
                <Input
                  value={editing.page_url ?? ""}
                  onChange={(e) => setEditing({ ...editing, page_url: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Switch
                  checked={editing.is_active ?? true}
                  onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
                />
                <Label>Активен</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
