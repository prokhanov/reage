import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, Search, FileText, Activity } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";

const BIOMARKER_CATEGORIES = [
  "Липиды",
  "Гормоны",
  "Метаболизм",
  "Старение",
  "Воспаление",
  "Иммунитет",
  "Витамины",
  "Микроэлементы",
  "Антиоксиданты",
];

const MEDICAL_CATEGORIES = [
  "🫀 Сердечно-сосудистая система",
  "🧠 Нервная система",
  "🍽 Пищеварительная система",
  "🩸 Метаболические нарушения",
  "🧘‍♀️ Гормональные нарушения",
  "💪 Опорно-двигательная система",
  "🦠 Иммунная система",
  "🩸 Кроветворная система",
  "💊 Инфекционные заболевания",
  "🧬 Онкология",
];

export default function DataManagement() {
  const queryClient = useQueryClient();
  const [searchBiomarkers, setSearchBiomarkers] = useState("");
  const [searchConditions, setSearchConditions] = useState("");
  const [biomarkerDialog, setBiomarkerDialog] = useState(false);
  const [conditionDialog, setConditionDialog] = useState(false);
  const [editingBiomarker, setEditingBiomarker] = useState<any>(null);
  const [editingCondition, setEditingCondition] = useState<any>(null);

  // Biomarkers queries
  const { data: biomarkers, isLoading: loadingBiomarkers } = useQuery({
    queryKey: ["biomarkers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("biomarkers")
        .select("*")
        .order("category", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Medical conditions queries
  const { data: conditions, isLoading: loadingConditions } = useQuery({
    queryKey: ["medical-conditions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medical_conditions_templates")
        .select("*")
        .order("category", { ascending: true })
        .order("condition", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Biomarker mutations
  const saveBiomarker = useMutation({
    mutationFn: async (biomarker: any) => {
      if (biomarker.id) {
        const { error } = await supabase
          .from("biomarkers")
          .update(biomarker)
          .eq("id", biomarker.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("biomarkers").insert(biomarker);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["biomarkers"] });
      toast.success(editingBiomarker?.id ? "Биомаркер обновлен" : "Биомаркер добавлен");
      setBiomarkerDialog(false);
      setEditingBiomarker(null);
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });

  const deleteBiomarker = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("biomarkers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["biomarkers"] });
      toast.success("Биомаркер удален");
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });

  // Condition mutations
  const saveCondition = useMutation({
    mutationFn: async (condition: any) => {
      if (condition.id) {
        const { error } = await supabase
          .from("medical_conditions_templates")
          .update(condition)
          .eq("id", condition.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("medical_conditions_templates")
          .insert(condition);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medical-conditions"] });
      toast.success(editingCondition?.id ? "Состояние обновлено" : "Состояние добавлено");
      setConditionDialog(false);
      setEditingCondition(null);
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });

  const deleteCondition = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("medical_conditions_templates")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medical-conditions"] });
      toast.success("Состояние удалено");
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });

  const filteredBiomarkers = biomarkers?.filter(
    (b) =>
      b.name.toLowerCase().includes(searchBiomarkers.toLowerCase()) ||
      b.code.toLowerCase().includes(searchBiomarkers.toLowerCase()) ||
      b.category.toLowerCase().includes(searchBiomarkers.toLowerCase())
  );

  const filteredConditions = conditions?.filter(
    (c) =>
      c.condition.toLowerCase().includes(searchConditions.toLowerCase()) ||
      c.category.toLowerCase().includes(searchConditions.toLowerCase())
  );

  const groupedBiomarkers = filteredBiomarkers?.reduce((acc: any, b: any) => {
    if (!acc[b.category]) acc[b.category] = [];
    acc[b.category].push(b);
    return acc;
  }, {});

  const groupedConditions = filteredConditions?.reduce((acc: any, c: any) => {
    if (!acc[c.category]) acc[c.category] = [];
    acc[c.category].push(c);
    return acc;
  }, {});

  const handleSaveBiomarker = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const biomarker = {
      id: editingBiomarker?.id,
      name: formData.get("name") as string,
      code: formData.get("code") as string,
      unit: formData.get("unit") as string,
      category: formData.get("category") as string,
      description: formData.get("description") as string,
      normal_min: formData.get("normal_min") ? Number(formData.get("normal_min")) : null,
      normal_max: formData.get("normal_max") ? Number(formData.get("normal_max")) : null,
    };
    saveBiomarker.mutate(biomarker);
  };

  const handleSaveCondition = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const condition = {
      id: editingCondition?.id,
      category: formData.get("category") as string,
      condition: formData.get("condition") as string,
    };
    saveCondition.mutate(condition);
  };

  return (
    <>
      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Управление данными</h1>
          <p className="text-muted-foreground mt-1">
            Управление биомаркерами и медицинскими состояниями
          </p>
        </div>

        <Tabs defaultValue="biomarkers" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="biomarkers">
              <Activity className="w-4 h-4 mr-2" />
              Биомаркеры
            </TabsTrigger>
            <TabsTrigger value="conditions">
              <FileText className="w-4 h-4 mr-2" />
              Медицинские состояния
            </TabsTrigger>
          </TabsList>

          <TabsContent value="biomarkers" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Биомаркеры ({biomarkers?.length || 0})</CardTitle>
                    <CardDescription>
                      Список всех биомаркеров по категориям
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => {
                      setEditingBiomarker(null);
                      setBiomarkerDialog(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить биомаркер
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Поиск по названию, коду или категории..."
                    value={searchBiomarkers}
                    onChange={(e) => setSearchBiomarkers(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {loadingBiomarkers ? (
                  <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(groupedBiomarkers || {}).map(([category, items]: [string, any]) => (
                      <div key={category} className="space-y-2">
                        <h3 className="font-semibold text-lg">{category}</h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Название</TableHead>
                              <TableHead>Код</TableHead>
                              <TableHead>Единица</TableHead>
                              <TableHead>Норма</TableHead>
                              <TableHead className="w-[100px]">Действия</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map((biomarker: any) => (
                              <TableRow key={biomarker.id}>
                                <TableCell className="font-medium">{biomarker.name}</TableCell>
                                <TableCell>{biomarker.code}</TableCell>
                                <TableCell>{biomarker.unit}</TableCell>
                                <TableCell>
                                  {biomarker.normal_min || "?"} - {biomarker.normal_max || "?"}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setEditingBiomarker(biomarker);
                                        setBiomarkerDialog(true);
                                      }}
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        if (
                                          confirm(
                                            `Удалить биомаркер "${biomarker.name}"?`
                                          )
                                        ) {
                                          deleteBiomarker.mutate(biomarker.id);
                                        }
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="conditions" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Медицинские состояния ({conditions?.length || 0})</CardTitle>
                    <CardDescription>
                      Список медицинских состояний для анамнеза
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => {
                      setEditingCondition(null);
                      setConditionDialog(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить состояние
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Поиск по названию или категории..."
                    value={searchConditions}
                    onChange={(e) => setSearchConditions(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {loadingConditions ? (
                  <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(groupedConditions || {}).map(([category, items]: [string, any]) => (
                      <div key={category} className="space-y-2">
                        <h3 className="font-semibold text-lg">{category}</h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Состояние</TableHead>
                              <TableHead className="w-[100px]">Действия</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map((condition: any) => (
                              <TableRow key={condition.id}>
                                <TableCell>{condition.condition}</TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setEditingCondition(condition);
                                        setConditionDialog(true);
                                      }}
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        if (
                                          confirm(
                                            `Удалить состояние "${condition.condition}"?`
                                          )
                                        ) {
                                          deleteCondition.mutate(condition.id);
                                        }
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Biomarker Dialog */}
      <Dialog open={biomarkerDialog} onOpenChange={setBiomarkerDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingBiomarker ? "Редактировать биомаркер" : "Добавить биомаркер"}
            </DialogTitle>
            <DialogDescription>
              Заполните информацию о биомаркере
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveBiomarker} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Название *</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  defaultValue={editingBiomarker?.name}
                  placeholder="Холестерин общий"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Код *</Label>
                <Input
                  id="code"
                  name="code"
                  required
                  defaultValue={editingBiomarker?.code}
                  placeholder="CHOL"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit">Единица измерения *</Label>
                <Input
                  id="unit"
                  name="unit"
                  required
                  defaultValue={editingBiomarker?.unit}
                  placeholder="ммоль/л"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Категория *</Label>
                <Select name="category" defaultValue={editingBiomarker?.category} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите категорию" />
                  </SelectTrigger>
                  <SelectContent>
                    {BIOMARKER_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="normal_min">Норма минимум</Label>
                <Input
                  id="normal_min"
                  name="normal_min"
                  type="number"
                  step="any"
                  defaultValue={editingBiomarker?.normal_min}
                  placeholder="3.0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="normal_max">Норма максимум</Label>
                <Input
                  id="normal_max"
                  name="normal_max"
                  type="number"
                  step="any"
                  defaultValue={editingBiomarker?.normal_max}
                  placeholder="5.2"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={editingBiomarker?.description}
                placeholder="Описание биомаркера..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBiomarkerDialog(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={saveBiomarker.isPending}>
                {saveBiomarker.isPending ? "Сохранение..." : "Сохранить"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Condition Dialog */}
      <Dialog open={conditionDialog} onOpenChange={setConditionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCondition ? "Редактировать состояние" : "Добавить состояние"}
            </DialogTitle>
            <DialogDescription>
              Заполните информацию о медицинском состоянии
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveCondition} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="condition-category">Категория *</Label>
              <Select
                name="category"
                defaultValue={editingCondition?.category}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  {MEDICAL_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="condition">Состояние *</Label>
              <Input
                id="condition"
                name="condition"
                required
                defaultValue={editingCondition?.condition}
                placeholder="Название медицинского состояния"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConditionDialog(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={saveCondition.isPending}>
                {saveCondition.isPending ? "Сохранение..." : "Сохранить"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
