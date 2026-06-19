import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AdminCenterLoader } from "@/components/admin/AdminCenterLoader";
import { PromoCodeFormDialog } from "@/components/admin/promo/PromoCodeFormDialog";
import { GeneratePromoBatchDialog } from "@/components/admin/promo/GeneratePromoBatchDialog";
import {
  PromoCode,
  PromoCodeFilters,
  formatDiscount,
  getPromoStatus,
  usePromoBatches,
  usePromoCodes,
  usePromoMutations,
  usePromoRedemptions,
} from "@/hooks/usePromoCodes";
import { useToast } from "@/hooks/use-toast";
import {
  Copy,
  Download,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PromoCodes() {
  const [activeTab, setActiveTab] = useState("codes");
  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<PromoCodeFilters["status"]>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [editing, setEditing] = useState<PromoCode | null>(null);
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null);
  const [deleteBatchId, setDeleteBatchId] = useState<string | null>(null);

  const { toast } = useToast();

  const filters: PromoCodeFilters = {
    search: search || undefined,
    batchId: batchFilter === "all" ? null : batchFilter,
    status: statusFilter,
  };

  const { data: codes, isLoading: codesLoading } = usePromoCodes(filters);
  const { data: batches, isLoading: batchesLoading } = usePromoBatches();
  const { data: redemptions, isLoading: redemptionsLoading } = usePromoRedemptions();
  const { deletePromoCodes, togglePromoCodes, deleteBatch } = usePromoMutations();

  const allSelected = useMemo(
    () => (codes?.length ?? 0) > 0 && selected.length === codes!.length,
    [codes, selected],
  );

  const toggleAll = () => {
    if (allSelected) setSelected([]);
    else setSelected((codes ?? []).map((c) => c.id));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Скопировано", description: code });
  };

  const exportBatchCsv = (batchId: string, batchName: string) => {
    const rows = (codes ?? [])
      .filter((c) => c.batch_id === batchId)
      .map((c) => c.code);
    if (rows.length === 0) {
      toast({ title: "Нет кодов в партии", variant: "destructive" });
      return;
    }
    const csv = ["code", ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${batchName}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Промокоды</h1>
          <p className="text-muted-foreground mt-1">
            Генерация, управление и аналитика промокодов
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Создать
          </Button>
          <Button onClick={() => setGenerateOpen(true)}>
            <Sparkles className="h-4 w-4 mr-2" />
            Массовая генерация
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start flex-wrap h-auto">
          <TabsTrigger value="codes">Промокоды</TabsTrigger>
          <TabsTrigger value="batches">Партии</TabsTrigger>
          <TabsTrigger value="redemptions">Активации</TabsTrigger>
        </TabsList>

        {/* Промокоды */}
        <TabsContent value="codes">
          <Card>
            <CardHeader>
              <CardTitle>Все промокоды</CardTitle>
              <CardDescription>
                Фильтрация, массовое управление, экспорт
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Поиск по коду…"
                    className="pl-9"
                  />
                </div>
                <Select value={batchFilter} onValueChange={setBatchFilter}>
                  <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="Партия" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все партии</SelectItem>
                    {(batches ?? []).map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as PromoCodeFilters["status"])}>
                  <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все статусы</SelectItem>
                    <SelectItem value="active">Активные</SelectItem>
                    <SelectItem value="inactive">Выключенные</SelectItem>
                    <SelectItem value="expired">Истёкшие</SelectItem>
                    <SelectItem value="exhausted">Исчерпанные</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selected.length > 0 && (
                <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-2">
                  <span className="text-sm">Выбрано: {selected.length}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => togglePromoCodes.mutate({ ids: selected, is_active: true })}
                  >
                    Включить
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => togglePromoCodes.mutate({ ids: selected, is_active: false })}
                  >
                    Выключить
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setDeleteIds(selected)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Удалить
                  </Button>
                </div>
              )}

              {codesLoading ? (
                <AdminCenterLoader />
              ) : (codes?.length ?? 0) === 0 ? (
                <p className="text-muted-foreground text-center py-8">Промокоды не найдены</p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                        </TableHead>
                        <TableHead>Код</TableHead>
                        <TableHead>Скидка</TableHead>
                        <TableHead>Область</TableHead>
                        <TableHead>Использовано</TableHead>
                        <TableHead>Срок</TableHead>
                        <TableHead>Партия</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(codes ?? []).map((c) => {
                        const status = getPromoStatus(c);
                        return (
                          <TableRow key={c.id}>
                            <TableCell>
                              <Checkbox
                                checked={selected.includes(c.id)}
                                onCheckedChange={() => toggleOne(c.id)}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-sm">{c.code}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => copyCode(c.code)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>{formatDiscount(c)}</TableCell>
                            <TableCell>
                              {c.applies_to === "all_plans" ? "Все тарифы" : "Выбранные"}
                            </TableCell>
                            <TableCell>
                              {c.used_count}
                              {c.max_uses != null ? ` / ${c.max_uses}` : ""}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {c.expires_at ? `до ${formatDate(c.expires_at)}` : "бессрочно"}
                            </TableCell>
                            <TableCell className="text-xs">{c.batch?.name ?? "—"}</TableCell>
                            <TableCell>
                              <Badge variant={status.variant}>{status.label}</Badge>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setEditing(c)}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Редактировать
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      togglePromoCodes.mutate({ ids: [c.id], is_active: !c.is_active })
                                    }
                                  >
                                    <Power className="h-4 w-4 mr-2" />
                                    {c.is_active ? "Выключить" : "Включить"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => copyCode(c.code)}>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Копировать
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setDeleteIds([c.id])}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Удалить
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Партии */}
        <TabsContent value="batches">
          <Card>
            <CardHeader>
              <CardTitle>Партии промокодов</CardTitle>
              <CardDescription>Группы кодов, созданные массовой генерацией</CardDescription>
            </CardHeader>
            <CardContent>
              {batchesLoading ? (
                <AdminCenterLoader />
              ) : (batches?.length ?? 0) === 0 ? (
                <p className="text-muted-foreground text-center py-8">Партий нет</p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Название</TableHead>
                        <TableHead>Описание</TableHead>
                        <TableHead>Кодов</TableHead>
                        <TableHead>Активаций</TableHead>
                        <TableHead>Создана</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(batches ?? []).map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-medium">{b.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {b.description ?? "—"}
                          </TableCell>
                          <TableCell>{b.codes_count ?? 0}</TableCell>
                          <TableCell>{b.used_count ?? 0}</TableCell>
                          <TableCell className="text-xs">{formatDate(b.created_at)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setBatchFilter(b.id);
                                    setActiveTab("codes");
                                  }}
                                >
                                  Показать коды
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => exportBatchCsv(b.id, b.name)}>
                                  <Download className="h-4 w-4 mr-2" />
                                  Экспорт CSV
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setDeleteBatchId(b.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Удалить партию
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
          </Card>
        </TabsContent>

        {/* Активации */}
        <TabsContent value="redemptions">
          <Card>
            <CardHeader>
              <CardTitle>Журнал активаций</CardTitle>
              <CardDescription>История применения промокодов пользователями</CardDescription>
            </CardHeader>
            <CardContent>
              {redemptionsLoading ? (
                <AdminCenterLoader />
              ) : (redemptions?.length ?? 0) === 0 ? (
                <p className="text-muted-foreground text-center py-8">Активаций ещё не было</p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Дата</TableHead>
                        <TableHead>Код</TableHead>
                        <TableHead>Пользователь</TableHead>
                        <TableHead>Сумма</TableHead>
                        <TableHead>Скидка</TableHead>
                        <TableHead>Итого</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(redemptions ?? []).map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-xs whitespace-nowrap">
                            {formatDate(r.redeemed_at)}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {r.promo_code?.code ?? "—"}
                          </TableCell>
                          <TableCell className="text-xs">{r.user_id.slice(0, 8)}…</TableCell>
                          <TableCell>{Number(r.original_amount).toFixed(2)} ₽</TableCell>
                          <TableCell className="text-destructive">
                            −{Number(r.discount_applied).toFixed(2)} ₽
                          </TableCell>
                          <TableCell className="font-medium">
                            {Number(r.final_amount).toFixed(2)} ₽
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PromoCodeFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <PromoCodeFormDialog
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        promoCode={editing}
      />
      <GeneratePromoBatchDialog open={generateOpen} onOpenChange={setGenerateOpen} />

      <AlertDialog open={!!deleteIds} onOpenChange={(v) => !v && setDeleteIds(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить промокоды?</AlertDialogTitle>
            <AlertDialogDescription>
              Будет удалено: {deleteIds?.length ?? 0}. Действие необратимо. Активации сохранятся, но потеряют связь с кодом.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleteIds) {
                  await deletePromoCodes.mutateAsync(deleteIds);
                  setSelected([]);
                  setDeleteIds(null);
                }
              }}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteBatchId} onOpenChange={(v) => !v && setDeleteBatchId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить партию?</AlertDialogTitle>
            <AlertDialogDescription>
              Все промокоды этой партии будут удалены. Действие необратимо.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleteBatchId) {
                  await deleteBatch.mutateAsync(deleteBatchId);
                  setDeleteBatchId(null);
                }
              }}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
