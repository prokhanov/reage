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
import { DataManagementSkeleton } from "@/components/skeletons/DataManagementSkeleton";

// Categories will be loaded from DB

export default function DataManagement() {
  const queryClient = useQueryClient();
  const [searchBiomarkers, setSearchBiomarkers] = useState("");
  const [searchConditions, setSearchConditions] = useState("");
  const [biomarkerDialog, setBiomarkerDialog] = useState(false);
  const [conditionDialog, setConditionDialog] = useState(false);
  const [editingBiomarker, setEditingBiomarker] = useState<any>(null);
  const [editingCondition, setEditingCondition] = useState<any>(null);
  
  // Categories state
  const [categoryDialog, setCategoryDialog] = useState<{
    open: boolean;
    type: 'biomarker' | 'medical' | 'symptom' | null;
    editing: any | null;
  }>({ open: false, type: null, editing: null });

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

  // Category queries
  const { data: biomarkerCategories } = useQuery({
    queryKey: ["biomarker-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("biomarker_categories")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: medicalCategories } = useQuery({
    queryKey: ["medical-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medical_condition_categories")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: symptomCategories } = useQuery({
    queryKey: ["symptom-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("symptom_categories")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: symptomTemplates } = useQuery({
    queryKey: ["symptom-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("symptom_templates")
        .select("*")
        .order("category", { ascending: true })
        .order("display_order", { ascending: true });
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

  if (loadingBiomarkers || loadingConditions) {
    return <DataManagementSkeleton />;
  }

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
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="biomarkers">
              <Activity className="w-4 h-4 mr-2" />
              Биомаркеры
            </TabsTrigger>
            <TabsTrigger value="conditions">
              <FileText className="w-4 h-4 mr-2" />
              Медицинские состояния
            </TabsTrigger>
            <TabsTrigger value="categories">
              <Activity className="w-4 h-4 mr-2" />
              Категории
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Управление категориями</CardTitle>
                <CardDescription>
                  Категории для биомаркеров, медицинских состояний и симптомов
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Biomarker Categories */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-lg">Категории биомаркеров</h3>
                    <Button size="sm" onClick={() => setCategoryDialog({ open: true, type: 'biomarker', editing: null })}>
                      <Plus className="w-4 h-4 mr-2" />
                      Добавить
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {(biomarkerCategories || []).map((cat) => (
                      <div key={cat.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{cat.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Эксперт: {cat.expert_role}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCategoryDialog({ open: true, type: 'biomarker', editing: cat })}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={async () => {
                              if (confirm(`Удалить категорию "${cat.name}"?`)) {
                                try {
                                  await supabase.from("biomarker_categories").delete().eq("id", cat.id);
                                  queryClient.invalidateQueries({ queryKey: ["biomarker-categories"] });
                                  toast.success("Категория удалена");
                                } catch (error: any) {
                                  toast.error("Ошибка: " + error.message);
                                }
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Medical Condition Categories */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-lg">Категории медицинских состояний</h3>
                    <Button size="sm" onClick={() => setCategoryDialog({ open: true, type: 'medical', editing: null })}>
                      <Plus className="w-4 h-4 mr-2" />
                      Добавить
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {(medicalCategories || []).map((cat) => (
                      <div key={cat.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <p className="font-medium">{cat.name}</p>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCategoryDialog({ open: true, type: 'medical', editing: cat })}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={async () => {
                              if (confirm(`Удалить категорию "${cat.name}"?`)) {
                                try {
                                  await supabase.from("medical_condition_categories").delete().eq("id", cat.id);
                                  queryClient.invalidateQueries({ queryKey: ["medical-categories"] });
                                  toast.success("Категория удалена");
                                } catch (error: any) {
                                  toast.error("Ошибка: " + error.message);
                                }
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Symptom Categories */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-lg">Категории симптомов</h3>
                    <Button size="sm" onClick={() => setCategoryDialog({ open: true, type: 'symptom', editing: null })}>
                      <Plus className="w-4 h-4 mr-2" />
                      Добавить
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {(symptomCategories || []).map((cat) => (
                      <div key={cat.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{cat.emoji}</span>
                          <p className="font-medium">{cat.name}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCategoryDialog({ open: true, type: 'symptom', editing: cat })}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={async () => {
                              if (confirm(`Удалить категорию "${cat.name}"?`)) {
                                try {
                                  await supabase.from("symptom_categories").delete().eq("id", cat.id);
                                  queryClient.invalidateQueries({ queryKey: ["symptom-categories"] });
                                  toast.success("Категория удалена");
                                } catch (error: any) {
                                  toast.error("Ошибка: " + error.message);
                                }
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
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
                    {(biomarkerCategories || []).map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.name}
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
                  {(medicalCategories || []).map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
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

      {/* Category Management Dialog */}
      <Dialog open={categoryDialog.open} onOpenChange={(open) => setCategoryDialog({ ...categoryDialog, open })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {categoryDialog.editing ? "Редактировать категорию" : "Добавить категорию"}
            </DialogTitle>
            <DialogDescription>
              {categoryDialog.type === 'biomarker' && "Категория для биомаркеров с экспертом AI"}
              {categoryDialog.type === 'medical' && "Категория для медицинских состояний"}
              {categoryDialog.type === 'symptom' && "Категория для симптомов"}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              try {
                if (categoryDialog.type === 'biomarker') {
                  const data = {
                    name: formData.get("name") as string,
                    expert_role: formData.get("expert_role") as string,
                    expert_specialization: formData.get("expert_specialization") as string,
                    display_order: Number(formData.get("display_order")) || 0
                  };
                  if (categoryDialog.editing) {
                    await supabase.from("biomarker_categories").update(data).eq("id", categoryDialog.editing.id);
                  } else {
                    await supabase.from("biomarker_categories").insert(data);
                  }
                  queryClient.invalidateQueries({ queryKey: ["biomarker-categories"] });
                } else if (categoryDialog.type === 'medical') {
                  const data = {
                    name: formData.get("name") as string,
                    display_order: Number(formData.get("display_order")) || 0
                  };
                  if (categoryDialog.editing) {
                    await supabase.from("medical_condition_categories").update(data).eq("id", categoryDialog.editing.id);
                  } else {
                    await supabase.from("medical_condition_categories").insert(data);
                  }
                  queryClient.invalidateQueries({ queryKey: ["medical-categories"] });
                } else if (categoryDialog.type === 'symptom') {
                  const data = {
                    name: formData.get("name") as string,
                    emoji: formData.get("emoji") as string,
                    display_order: Number(formData.get("display_order")) || 0
                  };
                  if (categoryDialog.editing) {
                    await supabase.from("symptom_categories").update(data).eq("id", categoryDialog.editing.id);
                  } else {
                    await supabase.from("symptom_categories").insert(data);
                  }
                  queryClient.invalidateQueries({ queryKey: ["symptom-categories"] });
                }
                toast.success(categoryDialog.editing ? "Категория обновлена" : "Категория добавлена");
                setCategoryDialog({ open: false, type: null, editing: null });
              } catch (error: any) {
                toast.error("Ошибка: " + error.message);
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="cat-name">Название *</Label>
              <Input
                id="cat-name"
                name="name"
                required
                defaultValue={categoryDialog.editing?.name}
                placeholder={
                  categoryDialog.type === 'medical' 
                    ? "🫀 Сердечно-сосудистая система" 
                    : categoryDialog.type === 'symptom'
                    ? "Энергия и фокус"
                    : "Липиды"
                }
              />
            </div>

            {categoryDialog.type === 'symptom' && (
              <div className="space-y-2">
                <Label htmlFor="cat-emoji">Эмодзи *</Label>
                <Input
                  id="cat-emoji"
                  name="emoji"
                  required
                  defaultValue={categoryDialog.editing?.emoji}
                  placeholder="🧠"
                  maxLength={2}
                />
              </div>
            )}

            {categoryDialog.type === 'biomarker' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="expert-role">Роль AI-эксперта *</Label>
                  <Input
                    id="expert-role"
                    name="expert_role"
                    required
                    defaultValue={categoryDialog.editing?.expert_role}
                    placeholder="кардиолог с 20-летним опытом"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expert-spec">Специализация эксперта *</Label>
                  <Textarea
                    id="expert-spec"
                    name="expert_specialization"
                    required
                    defaultValue={categoryDialog.editing?.expert_specialization}
                    placeholder="сердечно-сосудистых заболеваниях и метаболизме липидов"
                    rows={3}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="cat-order">Порядок отображения</Label>
              <Input
                id="cat-order"
                name="display_order"
                type="number"
                defaultValue={categoryDialog.editing?.display_order || 0}
                placeholder="0"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCategoryDialog({ open: false, type: null, editing: null })}>
                Отмена
              </Button>
              <Button type="submit">
                Сохранить
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
