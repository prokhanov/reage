import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Search, UserX, X } from "lucide-react";

interface ClientRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function ReminderStopListDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [initialIds, setInitialIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open]);

  const load = async () => {
    setLoading(true);
    const [profilesRes, stopRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, first_name, last_name, email, phone")
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase.from("reminder_stop_list").select("user_id"),
    ]);

    setClients((profilesRes.data ?? []) as ClientRow[]);
    const ids = new Set<string>((stopRes.data ?? []).map((r: any) => r.user_id));
    setBlockedIds(new Set(ids));
    setInitialIds(new Set(ids));
    setLoading(false);
  };

  const toggle = (id: string) => {
    setBlockedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => {
      const name = `${c.first_name ?? ""} ${c.last_name ?? ""}`.toLowerCase();
      return (
        name.includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q)
      );
    });
  }, [clients, search]);

  const handleSave = async () => {
    setSaving(true);
    const toAdd = [...blockedIds].filter((id) => !initialIds.has(id));
    const toRemove = [...initialIds].filter((id) => !blockedIds.has(id));

    const ops: Promise<any>[] = [];
    if (toAdd.length > 0) {
      ops.push(
        Promise.resolve(supabase.from("reminder_stop_list").insert(toAdd.map((user_id) => ({ user_id }))))
      );
    }
    if (toRemove.length > 0) {
      ops.push(Promise.resolve(supabase.from("reminder_stop_list").delete().in("user_id", toRemove)));
    }

    try {
      const results = await Promise.all(ops);
      const err = results.find((r) => r.error)?.error;
      if (err) throw err;
      toast({ title: "Сохранено", description: `Добавлено: ${toAdd.length}, удалено: ${toRemove.length}` });
      setInitialIds(new Set(blockedIds));
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const blockedCount = blockedIds.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserX className="w-5 h-5 text-destructive" />
            Стоп-лист напоминаний
          </DialogTitle>
          <DialogDescription>
            Отмеченные клиенты не будут получать напоминания о подтверждении email и телефона.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по имени, email или телефону"
              className="pl-9"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Показано: {filtered.length} из {clients.length}</span>
            <Badge variant="secondary" className="gap-1">
              В стоп-листе: {blockedCount}
            </Badge>
          </div>

          <ScrollArea className="h-[360px] rounded-md border border-border">
            {loading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Никого не найдено</div>
            ) : (
              <ul className="divide-y divide-border">
                {filtered.map((c) => {
                  const checked = blockedIds.has(c.id);
                  const name = [c.first_name, c.last_name].filter(Boolean).join(" ") || "Без имени";
                  return (
                    <li
                      key={c.id}
                      className="flex items-center gap-3 p-3 hover:bg-muted/40 cursor-pointer"
                      onClick={() => toggle(c.id)}
                    >
                      <Checkbox checked={checked} onCheckedChange={() => toggle(c.id)} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {c.email ?? "—"} {c.phone ? `· ${c.phone}` : ""}
                        </p>
                      </div>
                      {checked && (
                        <Badge variant="destructive" className="text-xs">Заблокирован</Badge>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            <X className="w-4 h-4 mr-2" />
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
