import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Search, UserPlus, AlertCircle, CheckCircle2 } from "lucide-react";
import { ButtonSpinner } from "@/components/admin/ButtonSpinner";
import { AdminCenterLoader } from "@/components/admin/AdminCenterLoader";
import { invokeDripAdmin } from "@/lib/dripAdmin";

interface Patient {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  enrolled: boolean;
  unsubscribed: boolean;
  has_active_subscription: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  seriesId: string;
  seriesName: string;
  onEnrolled?: () => void;
}

type FilterStatus = "all" | "not_enrolled" | "enrolled" | "unsubscribed";
type FilterSub = "any" | "with" | "without";

export default function EnrollPatientsDialog({ open, onOpenChange, seriesId, seriesName, onEnrolled }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("not_enrolled");
  const [subFilter, setSubFilter] = useState<FilterSub>("any");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true);
    try {
      const data = await invokeDripAdmin<{ items?: Patient[] }>({ action: "list_patients", series_id: seriesId, limit: 2000 });
      setPatients(data?.items ?? []);
    } catch (error: any) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
      setPatients([]);
    }
    setSelected(new Set());
    setLoading(false);
  }

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, seriesId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return patients.filter((p) => {
      if (q) {
        const hay = `${p.first_name ?? ""} ${p.last_name ?? ""} ${p.email ?? ""} ${p.phone ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (statusFilter === "not_enrolled" && (p.enrolled || p.unsubscribed)) return false;
      if (statusFilter === "enrolled" && !p.enrolled) return false;
      if (statusFilter === "unsubscribed" && !p.unsubscribed) return false;
      if (subFilter === "with" && !p.has_active_subscription) return false;
      if (subFilter === "without" && p.has_active_subscription) return false;
      return true;
    });
  }, [patients, search, statusFilter, subFilter]);

  const selectableIds = useMemo(() => filtered.filter((p) => !p.enrolled).map((p) => p.user_id), [filtered]);
  const allChecked = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));
  const someChecked = selectableIds.some((id) => selected.has(id));

  function toggleAll() {
    const next = new Set(selected);
    if (allChecked) selectableIds.forEach((id) => next.delete(id));
    else selectableIds.forEach((id) => next.add(id));
    setSelected(next);
  }
  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }

  async function enroll() {
    if (selected.size === 0) return;
    setEnrolling(true);
    let data: { enrolled?: number; skipped?: number } | null = null;
    let error: Error | null = null;
    try {
      data = await invokeDripAdmin<{ enrolled?: number; skipped?: number }>({ action: "enroll_users", series_id: seriesId, user_ids: Array.from(selected) });
    } catch (e: any) {
      error = e;
    }
    setEnrolling(false);
    if (error) {
      return toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    }
    const enrolled = data?.enrolled ?? 0;
    const skipped = data?.skipped ?? 0;
    toast({ title: "Готово", description: `Добавлено: ${enrolled}, пропущено: ${skipped}` });
    onEnrolled?.();
    onOpenChange(false);
  }

  function displayName(p: Patient) {
    const n = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
    return n || p.email || "—";
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Добавить пациентов в серию</DialogTitle>
          <p className="text-sm text-muted-foreground">{seriesName}</p>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по имени, email, телефону" className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FilterStatus)}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="not_enrolled">Не в серии</SelectItem>
              <SelectItem value="enrolled">Уже в серии</SelectItem>
              <SelectItem value="unsubscribed">Отписались</SelectItem>
              <SelectItem value="all">Все пациенты</SelectItem>
            </SelectContent>
          </Select>
          <Select value={subFilter} onValueChange={(v) => setSubFilter(v as FilterSub)}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Любая подписка</SelectItem>
              <SelectItem value="with">С активной подпиской</SelectItem>
              <SelectItem value="without">Без подписки</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between px-1 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Checkbox checked={allChecked} onCheckedChange={toggleAll} aria-label="Выбрать всех в фильтре" />
            <span>Выбрать всех в фильтре ({selectableIds.length} доступно)</span>
          </div>
          <div>Найдено: {filtered.length}</div>
        </div>

        <ScrollArea className="flex-1 min-h-[300px] border rounded-md">
          {loading ? (
            <AdminCenterLoader size="sm" label="Загрузка пациентов..." />
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Пациенты не найдены</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 sticky top-0">
                <tr>
                  <th className="w-10 p-2"></th>
                  <th className="text-left p-2">Пациент</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Статус</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const disabled = p.enrolled;
                  return (
                    <tr key={p.user_id} className={`border-t hover:bg-muted/30 ${disabled ? "opacity-60" : ""}`}>
                      <td className="p-2">
                        <Checkbox
                          disabled={disabled}
                          checked={selected.has(p.user_id)}
                          onCheckedChange={() => toggleOne(p.user_id)}
                        />
                      </td>
                      <td className="p-2">
                        <div className="font-medium">{displayName(p)}</div>
                        {p.phone && <div className="text-xs text-muted-foreground">{p.phone}</div>}
                      </td>
                      <td className="p-2 text-muted-foreground">{p.email}</td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1">
                          {p.enrolled && <Badge variant="secondary" className="text-[10px]"><CheckCircle2 className="w-3 h-3 mr-1" />в серии</Badge>}
                          {p.unsubscribed && <Badge variant="destructive" className="text-[10px]"><AlertCircle className="w-3 h-3 mr-1" />отписался</Badge>}
                          {p.has_active_subscription && <Badge variant="default" className="text-[10px]">подписка</Badge>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </ScrollArea>

        <DialogFooter className="flex items-center sm:justify-between gap-2">
          <div className="text-sm">
            Выбрано: <span className="font-semibold">{selected.size}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enrolling}>Отмена</Button>
            <Button onClick={enroll} disabled={selected.size === 0 || enrolling}>
              {enrolling ? <ButtonSpinner className="mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
              Добавить в серию
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
