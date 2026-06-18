import { useState, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

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
import { AdminCenterLoader } from "@/components/admin/AdminCenterLoader";

// Categories will be loaded from DB

// Sortable Row Component
function SortableTableRow({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-[40px] cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </TableCell>
      {children}
    </TableRow>
  );
}

// Sortable Category Item Component
function SortableCategoryItem({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-3 flex-1">
        <div className="cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
        {children}
      </div>
    </div>
  );
}

export default function DataManagement() {
  const queryClient = useQueryClient();
  const [searchBiomarkers, setSearchBiomarkers] = useState("");
  const [searchConditions, setSearchConditions] = useState("");
  const [searchSymptoms, setSearchSymptoms] = useState("");
  const [biomarkerDialog, setBiomarkerDialog] = useState(false);
  const [conditionDialog, setConditionDialog] = useState(false);
  const [symptomDialog, setSymptomDialog] = useState(false);
  const [editingBiomarker, setEditingBiomarker] = useState<any>(null);
  const [editingCondition, setEditingCondition] = useState<any>(null);
  const [editingSymptom, setEditingSymptom] = useState<any>(null);
  const [ageRanges, setAgeRanges] = useState<any>({ male: [], female: [] });
  const [rangeMode, setRangeMode] = useState<'general' | 'age'>('general');
  
  // Categories state
  const [categoryDialog, setCategoryDialog] = useState<{
    open: boolean;
    type: 'biomarker' | 'medical' | 'symptom' | null;
    editing: any | null;
  }>({ open: false, type: null, editing: null });

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Biomarkers queries
  const { data: biomarkers, isLoading: loadingBiomarkers } = useQuery({
    queryKey: ["biomarkers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("biomarkers")
        .select("*")
        .order("category", { ascending: true })
        .order("display_order", { ascending: true })
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
        .order("display_order", { ascending: true })
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

  // Symptom template mutations
  const saveSymptom = useMutation({
    mutationFn: async (symptom: any) => {
      if (symptom.id) {
        const { error } = await supabase
          .from("symptom_templates")
          .update(symptom)
          .eq("id", symptom.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("symptom_templates")
          .insert(symptom);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["symptom-templates"] });
      toast.success(editingSymptom?.id ? "Симптом обновлён" : "Симптом добавлен");
      setSymptomDialog(false);
      setEditingSymptom(null);
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });

  const deleteSymptom = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("symptom_templates")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["symptom-templates"] });
      toast.success("Симптом удалён");
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

  const filteredSymptoms = symptomTemplates?.filter(
    (s) =>
      s.symptom.toLowerCase().includes(searchSymptoms.toLowerCase()) ||
      s.category.toLowerCase().includes(searchSymptoms.toLowerCase())
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

  const groupedSymptoms = filteredSymptoms?.reduce((acc: any, s: any) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  // Create category order maps
  const symptomCategoryOrder = new Map(
    (symptomCategories || []).map((cat) => [cat.name, cat.display_order || 0])
  );

  // Validation: check that range boundaries don't overlap
  const validateBiomarkerRanges = (biomarker: any): string[] => {
    const errors: string[] = [];

    const checkChain = (label: string, values: { name: string; val: number | null }[]) => {
      for (let i = 0; i < values.length - 1; i++) {
        const left = values[i];
        const right = values[i + 1];
        if (left.val != null && right.val != null && left.val > right.val) {
          errors.push(`${label}: ${left.name} (${left.val}) не может быть больше ${right.name} (${right.val})`);
        }
      }
    };

    // General ranges
    checkChain("Общие", [
      { name: "Крит. низ", val: biomarker.critical_min },
      { name: "Норма низ", val: biomarker.normal_min },
      { name: "Оптимум низ", val: biomarker.optimal_min },
      { name: "Оптимум верх", val: biomarker.optimal_max },
      { name: "Норма верх", val: biomarker.normal_max },
      { name: "Крит. верх", val: biomarker.critical_max },
    ]);

    // Male ranges
    checkChain("Мужские", [
      { name: "Крит. низ", val: biomarker.critical_min_male },
      { name: "Норма низ", val: biomarker.normal_min_male },
      { name: "Оптимум низ", val: biomarker.optimal_min_male },
      { name: "Оптимум верх", val: biomarker.optimal_max_male },
      { name: "Норма верх", val: biomarker.normal_max_male },
      { name: "Крит. верх", val: biomarker.critical_max_male },
    ]);

    // Female ranges
    checkChain("Женские", [
      { name: "Крит. низ", val: biomarker.critical_min_female },
      { name: "Норма низ", val: biomarker.normal_min_female },
      { name: "Оптимум низ", val: biomarker.optimal_min_female },
      { name: "Оптимум верх", val: biomarker.optimal_max_female },
      { name: "Норма верх", val: biomarker.normal_max_female },
      { name: "Крит. верх", val: biomarker.critical_max_female },
    ]);

    // Age ranges
    if (biomarker.age_ranges) {
      const genderLabels: Record<string, string> = { male: "Муж", female: "Жен" };
      for (const gender of ["male", "female"] as const) {
        const ranges = biomarker.age_ranges[gender] || [];
        for (const r of ranges) {
          const rangeLabel = `${genderLabels[gender]} ${r.age_from}-${r.age_to}`;
          checkChain(rangeLabel, [
            { name: "Крит. низ", val: r.critical_min != null ? Number(r.critical_min) : null },
            { name: "Норма низ", val: r.min != null ? Number(r.min) : null },
            { name: "Оптимум низ", val: r.optimal_min != null ? Number(r.optimal_min) : null },
            { name: "Оптимум верх", val: r.optimal_max != null ? Number(r.optimal_max) : null },
            { name: "Норма верх", val: r.max != null ? Number(r.max) : null },
            { name: "Крит. верх", val: r.critical_max != null ? Number(r.critical_max) : null },
          ]);
        }
      }
    }

    return errors;
  };

  // Real-time validation errors
  const rangeErrors = useMemo(() => {
    if (!editingBiomarker && !biomarkerDialog) return [];
    const b = editingBiomarker || {};
    return validateBiomarkerRanges(b);
  }, [editingBiomarker, biomarkerDialog]);

  const handleSaveBiomarker = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Filter out empty age ranges
    const filteredAgeRanges = {
      male: ageRanges.male.filter((r: any) => r.age_from !== '' && r.age_to !== '' && r.min !== '' && r.max !== '').map((r: any) => ({
        age_from: r.age_from, age_to: r.age_to, min: r.min, max: r.max,
        ...(r.optimal_min !== '' && r.optimal_min != null ? { optimal_min: Number(r.optimal_min) } : {}),
        ...(r.optimal_max !== '' && r.optimal_max != null ? { optimal_max: Number(r.optimal_max) } : {}),
        ...(r.critical_min !== '' && r.critical_min != null ? { critical_min: Number(r.critical_min) } : {}),
        ...(r.critical_max !== '' && r.critical_max != null ? { critical_max: Number(r.critical_max) } : {}),
      })),
      female: ageRanges.female.filter((r: any) => r.age_from !== '' && r.age_to !== '' && r.min !== '' && r.max !== '').map((r: any) => ({
        age_from: r.age_from, age_to: r.age_to, min: r.min, max: r.max,
        ...(r.optimal_min !== '' && r.optimal_min != null ? { optimal_min: Number(r.optimal_min) } : {}),
        ...(r.optimal_max !== '' && r.optimal_max != null ? { optimal_max: Number(r.optimal_max) } : {}),
        ...(r.critical_min !== '' && r.critical_min != null ? { critical_min: Number(r.critical_min) } : {}),
        ...(r.critical_max !== '' && r.critical_max != null ? { critical_max: Number(r.critical_max) } : {}),
      }))
    };
    
    const biomarker = {
      id: editingBiomarker?.id,
      name: formData.get("name") as string,
      code: formData.get("code") as string,
      unit: formData.get("unit") as string,
      category: formData.get("category") as string,
      description: formData.get("description") as string,
      normal_min: formData.get("normal_min") ? Number(formData.get("normal_min")) : null,
      normal_max: formData.get("normal_max") ? Number(formData.get("normal_max")) : null,
      normal_min_male: formData.get("normal_min_male") ? Number(formData.get("normal_min_male")) : null,
      normal_max_male: formData.get("normal_max_male") ? Number(formData.get("normal_max_male")) : null,
      normal_min_female: formData.get("normal_min_female") ? Number(formData.get("normal_min_female")) : null,
      normal_max_female: formData.get("normal_max_female") ? Number(formData.get("normal_max_female")) : null,
      optimal_min: formData.get("optimal_min") ? Number(formData.get("optimal_min")) : null,
      optimal_max: formData.get("optimal_max") ? Number(formData.get("optimal_max")) : null,
      optimal_min_male: formData.get("optimal_min_male") ? Number(formData.get("optimal_min_male")) : null,
      optimal_max_male: formData.get("optimal_max_male") ? Number(formData.get("optimal_max_male")) : null,
      optimal_min_female: formData.get("optimal_min_female") ? Number(formData.get("optimal_min_female")) : null,
      optimal_max_female: formData.get("optimal_max_female") ? Number(formData.get("optimal_max_female")) : null,
      critical_min: formData.get("critical_min") ? Number(formData.get("critical_min")) : null,
      critical_max: formData.get("critical_max") ? Number(formData.get("critical_max")) : null,
      critical_min_male: formData.get("critical_min_male") ? Number(formData.get("critical_min_male")) : null,
      critical_max_male: formData.get("critical_max_male") ? Number(formData.get("critical_max_male")) : null,
      critical_min_female: formData.get("critical_min_female") ? Number(formData.get("critical_min_female")) : null,
      critical_max_female: formData.get("critical_max_female") ? Number(formData.get("critical_max_female")) : null,
      aging_weight: formData.get("aging_weight") ? Number(formData.get("aging_weight")) : 1.0,
      age_ranges: (filteredAgeRanges.male.length > 0 || filteredAgeRanges.female.length > 0) ? filteredAgeRanges : editingBiomarker?.age_ranges || null,
      range_mode: rangeMode,
    };

    // Validate range boundaries
    const validationErrors = validateBiomarkerRanges(biomarker);
    if (validationErrors.length > 0) {
      toast.error(validationErrors[0]);
      return;
    }

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

  const handleSaveSymptom = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const symptom = {
      id: editingSymptom?.id,
      category: formData.get("category") as string,
      symptom: formData.get("symptom") as string,
      display_order: formData.get("display_order") ? Number(formData.get("display_order")) : 0,
    };
    saveSymptom.mutate(symptom);
  };

  // Drag and Drop handlers
  const handleDragEndBiomarkerCategories = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const categories = biomarkerCategories || [];
    const oldIndex = categories.findIndex((cat) => cat.id === active.id);
    const newIndex = categories.findIndex((cat) => cat.id === over.id);
    
    const reordered = arrayMove(categories, oldIndex, newIndex);
    
    // Update display_order for all affected items
    const updates = reordered.map((cat, index) => 
      supabase.from("biomarker_categories").update({ display_order: index }).eq("id", cat.id)
    );
    
    try {
      await Promise.all(updates);
      queryClient.invalidateQueries({ queryKey: ["biomarker-categories"] });
      toast.success("Порядок обновлён");
    } catch (error: any) {
      toast.error("Ошибка: " + error.message);
    }
  };

  const handleDragEndMedicalCategories = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const categories = medicalCategories || [];
    const oldIndex = categories.findIndex((cat) => cat.id === active.id);
    const newIndex = categories.findIndex((cat) => cat.id === over.id);
    
    const reordered = arrayMove(categories, oldIndex, newIndex);
    
    const updates = reordered.map((cat, index) => 
      supabase.from("medical_condition_categories").update({ display_order: index }).eq("id", cat.id)
    );
    
    try {
      await Promise.all(updates);
      queryClient.invalidateQueries({ queryKey: ["medical-categories"] });
      toast.success("Порядок обновлён");
    } catch (error: any) {
      toast.error("Ошибка: " + error.message);
    }
  };

  const handleDragEndSymptomCategories = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const categories = symptomCategories || [];
    const oldIndex = categories.findIndex((cat) => cat.id === active.id);
    const newIndex = categories.findIndex((cat) => cat.id === over.id);
    
    const reordered = arrayMove(categories, oldIndex, newIndex);
    
    const updates = reordered.map((cat, index) => 
      supabase.from("symptom_categories").update({ display_order: index }).eq("id", cat.id)
    );
    
    try {
      await Promise.all(updates);
      queryClient.invalidateQueries({ queryKey: ["symptom-categories"] });
      toast.success("Порядок обновлён");
    } catch (error: any) {
      toast.error("Ошибка: " + error.message);
    }
  };

  const handleDragEndSymptoms = async (event: DragEndEvent, category: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const categorySymptoms = (symptomTemplates || []).filter(s => s.category === category);
    const oldIndex = categorySymptoms.findIndex((s) => s.id === active.id);
    const newIndex = categorySymptoms.findIndex((s) => s.id === over.id);
    
    const reordered = arrayMove(categorySymptoms, oldIndex, newIndex);
    
    const updates = reordered.map((symptom, index) => 
      supabase.from("symptom_templates").update({ display_order: index }).eq("id", symptom.id)
    );
    
    try {
      await Promise.all(updates);
      queryClient.invalidateQueries({ queryKey: ["symptom-templates"] });
      toast.success("Порядок обновлён");
    } catch (error: any) {
      toast.error("Ошибка: " + error.message);
    }
  };

  const handleDragEndBiomarkers = async (event: DragEndEvent, category: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const categoryBiomarkers = (biomarkers || []).filter(b => b.category === category);
    const oldIndex = categoryBiomarkers.findIndex((b) => b.id === active.id);
    const newIndex = categoryBiomarkers.findIndex((b) => b.id === over.id);
    
    const reordered = arrayMove(categoryBiomarkers, oldIndex, newIndex);
    
    const updates = reordered.map((biomarker, index) => 
      supabase.from("biomarkers").update({ display_order: index }).eq("id", biomarker.id)
    );
    
    try {
      await Promise.all(updates);
      queryClient.invalidateQueries({ queryKey: ["biomarkers"] });
      toast.success("Порядок обновлён");
    } catch (error: any) {
      toast.error("Ошибка: " + error.message);
    }
  };

  const handleDragEndConditions = async (event: DragEndEvent, category: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const categoryConditions = (conditions || []).filter(c => c.category === category);
    const oldIndex = categoryConditions.findIndex((c) => c.id === active.id);
    const newIndex = categoryConditions.findIndex((c) => c.id === over.id);
    
    const reordered = arrayMove(categoryConditions, oldIndex, newIndex);
    
    const updates = reordered.map((condition, index) => 
      supabase.from("medical_conditions_templates").update({ display_order: index }).eq("id", condition.id)
    );
    
    try {
      await Promise.all(updates);
      queryClient.invalidateQueries({ queryKey: ["medical-conditions"] });
      toast.success("Порядок обновлён");
    } catch (error: any) {
      toast.error("Ошибка: " + error.message);
    }
  };

  if (loadingBiomarkers || loadingConditions) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <AdminCenterLoader size="lg" />
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Управление данными</h1>
          <p className="text-muted-foreground mt-1">
            Управление биомаркерами и медицинскими состояниями
          </p>
        </div>

        <Tabs defaultValue="biomarkers" className="space-y-6">
          <TabsList className="w-full justify-start flex-wrap h-auto">
            <TabsTrigger value="biomarkers">
              <Activity className="w-4 h-4 mr-2" />
              Биомаркеры
            </TabsTrigger>
            <TabsTrigger value="conditions">
              <FileText className="w-4 h-4 mr-2" />
              Медицинские состояния
            </TabsTrigger>
            <TabsTrigger value="symptoms">
              <Activity className="w-4 h-4 mr-2" />
              Симптомы
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
                      setAgeRanges({ male: [], female: [] });
                      setRangeMode('general');
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
                    {Object.entries(groupedBiomarkers || {}).map(([category, items]: [string, any]) => {
                      const sortedItems = [...items].sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));
                      
                      return (
                        <div key={category} className="space-y-2">
                          <h3 className="font-semibold text-lg">{category}</h3>
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(event) => handleDragEndBiomarkers(event, category)}
                          >
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[40px]"></TableHead>
                                  <TableHead>Название</TableHead>
                                  <TableHead>Код</TableHead>
                                  <TableHead>Единица</TableHead>
                                  <TableHead>Вес старения</TableHead>
                                  <TableHead className="w-[100px]">Действия</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                <SortableContext items={sortedItems.map((b: any) => b.id)} strategy={verticalListSortingStrategy}>
                                  {sortedItems.map((biomarker: any) => (
                                    <SortableTableRow key={biomarker.id} id={biomarker.id}>
                                      <TableCell className="font-medium">{biomarker.name}</TableCell>
                                      <TableCell>{biomarker.code}</TableCell>
                                      <TableCell>{biomarker.unit || '—'}</TableCell>
                                      <TableCell>
                                        <span className="font-mono text-xs">{biomarker.aging_weight ?? 1.0}</span>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingBiomarker(biomarker);
                              const ar = biomarker.age_ranges || { male: [], female: [] };
                              setAgeRanges(ar);
                              setRangeMode(biomarker.range_mode === 'age' ? 'age' : 'general');
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
                                    </SortableTableRow>
                                  ))}
                                </SortableContext>
                              </TableBody>
                            </Table>
                          </DndContext>
                        </div>
                      );
                    })}
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
                    {Object.entries(groupedConditions || {}).map(([category, items]: [string, any]) => {
                      const sortedItems = [...items].sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));
                      
                      return (
                        <div key={category} className="space-y-2">
                          <h3 className="font-semibold text-lg">{category}</h3>
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(event) => handleDragEndConditions(event, category)}
                          >
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[40px]"></TableHead>
                                  <TableHead>Состояние</TableHead>
                                  <TableHead className="w-[100px]">Действия</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                <SortableContext items={sortedItems.map((c: any) => c.id)} strategy={verticalListSortingStrategy}>
                                  {sortedItems.map((condition: any) => (
                                    <SortableTableRow key={condition.id} id={condition.id}>
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
                                    </SortableTableRow>
                                  ))}
                                </SortableContext>
                              </TableBody>
                            </Table>
                          </DndContext>
                        </div>
                      );
                    })}
                  </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="symptoms" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Шаблоны симптомов ({symptomTemplates?.length || 0})</CardTitle>
                    <CardDescription>
                      Список шаблонов симптомов для раздела "Моё состояние"
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => {
                      setEditingSymptom(null);
                      setSymptomDialog(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить симптом
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Поиск по названию или категории..."
                    value={searchSymptoms}
                    onChange={(e) => setSearchSymptoms(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="space-y-6">
                  {Object.entries(groupedSymptoms || {})
                    .sort(([catA], [catB]) => 
                      (symptomCategoryOrder.get(catA) || 999) - (symptomCategoryOrder.get(catB) || 999)
                    )
                    .map(([category, items]: [string, any]) => {
                      const categoryData = symptomCategories?.find(c => c.name === category);
                      const sortedItems = [...items].sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));
                      
                      return (
                        <div key={category} className="space-y-2">
                          <h3 className="font-semibold text-lg flex items-center gap-2">
                            {categoryData?.emoji && <span className="text-xl">{categoryData.emoji}</span>}
                            {category}
                          </h3>
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(event) => handleDragEndSymptoms(event, category)}
                          >
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[40px]"></TableHead>
                                  <TableHead>Симптом</TableHead>
                                  <TableHead className="w-[150px]">Порядок</TableHead>
                                  <TableHead className="w-[100px]">Действия</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                <SortableContext items={sortedItems.map((s: any) => s.id)} strategy={verticalListSortingStrategy}>
                                  {sortedItems.map((symptom: any) => (
                                    <SortableTableRow key={symptom.id} id={symptom.id}>
                                      <TableCell>{symptom.symptom}</TableCell>
                                      <TableCell>{symptom.display_order || 0}</TableCell>
                                      <TableCell>
                                        <div className="flex gap-2">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                              setEditingSymptom(symptom);
                                              setSymptomDialog(true);
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
                                                  `Удалить симптом "${symptom.symptom}"?`
                                                )
                                              ) {
                                                deleteSymptom.mutate(symptom.id);
                                              }
                                            }}
                                          >
                                            <Trash2 className="w-4 h-4 text-destructive" />
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </SortableTableRow>
                                  ))}
                                </SortableContext>
                              </TableBody>
                            </Table>
                          </DndContext>
                        </div>
                      );
                    })}
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
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEndBiomarkerCategories}
                  >
                    <div className="space-y-2">
                      <SortableContext items={(biomarkerCategories || []).map(c => c.id)} strategy={verticalListSortingStrategy}>
                        {(biomarkerCategories || []).map((cat) => (
                          <SortableCategoryItem key={cat.id} id={cat.id}>
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
                          </SortableCategoryItem>
                        ))}
                      </SortableContext>
                    </div>
                  </DndContext>
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
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEndMedicalCategories}
                  >
                    <div className="space-y-2">
                      <SortableContext items={(medicalCategories || []).map(c => c.id)} strategy={verticalListSortingStrategy}>
                        {(medicalCategories || []).map((cat) => (
                          <SortableCategoryItem key={cat.id} id={cat.id}>
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
                          </SortableCategoryItem>
                        ))}
                      </SortableContext>
                    </div>
                  </DndContext>
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
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEndSymptomCategories}
                  >
                    <div className="space-y-2">
                      <SortableContext items={(symptomCategories || []).map(c => c.id)} strategy={verticalListSortingStrategy}>
                        {(symptomCategories || []).map((cat) => (
                          <SortableCategoryItem key={cat.id} id={cat.id}>
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
                          </SortableCategoryItem>
                        ))}
                      </SortableContext>
                    </div>
                  </DndContext>
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

            {/* Range mode toggle */}
            <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/30">
              <Label className="text-xs font-medium text-muted-foreground mr-2">Режим диапазонов:</Label>
              <Button
                type="button"
                size="sm"
                variant={rangeMode === 'general' ? 'default' : 'outline'}
                onClick={() => setRangeMode('general')}
                className="text-xs h-7"
              >
                Общие диапазоны
              </Button>
              <Button
                type="button"
                size="sm"
                variant={rangeMode === 'age' ? 'default' : 'outline'}
                onClick={() => setRangeMode('age')}
                className="text-xs h-7"
              >
                Возрастные диапазоны
              </Button>
            </div>

            {/* 7-segment visual legend */}
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Шкала 7 сегментов — значения определяют границы между зонами:</p>
              <div className="flex items-center gap-0.5 h-4 rounded-full overflow-hidden">
                <div className="h-full flex-1 bg-status-critical" title="Критично низ" />
                <div className="h-full flex-1 bg-status-risk" title="Риск низ" />
                <div className="h-full flex-1 bg-status-acceptable" title="Допустимо низ" />
                <div className="h-full flex-[1.5] bg-status-optimal" title="Оптимально" />
                <div className="h-full flex-1 bg-status-acceptable" title="Допустимо верх" />
                <div className="h-full flex-1 bg-status-risk" title="Риск верх" />
                <div className="h-full flex-1 bg-status-critical" title="Критично верх" />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground px-1">
                <span>🔴 Крит.</span>
                <span>🟠 Риск</span>
                <span>🟡 Допуст.</span>
                <span>🟢 Оптимально</span>
                <span>🟡 Допуст.</span>
                <span>🟠 Риск</span>
                <span>🔴 Крит.</span>
              </div>
            </div>

            {rangeMode === 'general' && (<>

            {/* Priority hint */}
            <div className="rounded-lg border border-border bg-muted/40 p-2.5 flex items-start gap-2">
              <span className="text-sm">ℹ️</span>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">Приоритет: Гендерные → Общий.</span>{' '}
                Если задано значение для Мужчин/Женщин, оно используется вместо общего. Общий диапазон — fallback, когда гендерный не задан.
              </p>
            </div>

            {/* 7-segment boundary inputs — ordered from low critical to high critical */}
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Укажите границы диапазонов. Каждое значение — граница между двумя зонами на шкале.</p>

              {/* 🔴 critical_min — boundary between Critical Low and Risk Low */}
              <div className="rounded-lg border border-status-critical/30 bg-status-critical/5 p-3 space-y-2">
                <Label className="text-xs font-medium"><span className="text-status-critical">🔴 Критично низ</span> → <span className="text-status-risk">🟠 Риск низ</span></Label>
                <div className="grid grid-cols-3 gap-3">
                  <div className={`space-y-1 ${(editingBiomarker?.critical_min_male != null || editingBiomarker?.critical_min_female != null) ? 'opacity-50' : ''}`}>
                    <Label className="text-[10px] text-muted-foreground">Общий{(editingBiomarker?.critical_min_male != null || editingBiomarker?.critical_min_female != null) ? ' (fallback)' : ''}</Label>
                    <Input name="critical_min" type="number" step="any" defaultValue={editingBiomarker?.critical_min} placeholder="—" onChange={(e) => setEditingBiomarker((prev: any) => prev ? {...prev, critical_min: e.target.value ? Number(e.target.value) : null} : prev)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Мужчины</Label>
                    <Input name="critical_min_male" type="number" step="any" defaultValue={editingBiomarker?.critical_min_male} placeholder="—" onChange={(e) => setEditingBiomarker((prev: any) => prev ? {...prev, critical_min_male: e.target.value ? Number(e.target.value) : null} : prev)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Женщины</Label>
                    <Input name="critical_min_female" type="number" step="any" defaultValue={editingBiomarker?.critical_min_female} placeholder="—" onChange={(e) => setEditingBiomarker((prev: any) => prev ? {...prev, critical_min_female: e.target.value ? Number(e.target.value) : null} : prev)} />
                  </div>
                </div>
              </div>

              {/* 🟠 normal_min — boundary between Risk Low and Acceptable Low */}
              <div className="rounded-lg border border-status-risk/30 bg-status-risk/5 p-3 space-y-2">
                <Label className="text-xs font-medium"><span className="text-status-risk">🟠 Риск низ</span> → <span className="text-status-acceptable">🟡 Допустимо низ</span></Label>
                <div className="grid grid-cols-3 gap-3">
                  <div className={`space-y-1 ${(editingBiomarker?.normal_min_male != null || editingBiomarker?.normal_min_female != null) ? 'opacity-50' : ''}`}>
                    <Label className="text-[10px] text-muted-foreground">Общий{(editingBiomarker?.normal_min_male != null || editingBiomarker?.normal_min_female != null) ? ' (fallback)' : ''}</Label>
                    <Input id="normal_min" name="normal_min" type="number" step="any" defaultValue={editingBiomarker?.normal_min} placeholder="—" onChange={(e) => setEditingBiomarker((prev: any) => prev ? {...prev, normal_min: e.target.value ? Number(e.target.value) : null} : prev)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Мужчины</Label>
                    <Input id="normal_min_male" name="normal_min_male" type="number" step="any" defaultValue={editingBiomarker?.normal_min_male} placeholder="—" onChange={(e) => setEditingBiomarker((prev: any) => prev ? {...prev, normal_min_male: e.target.value ? Number(e.target.value) : null} : prev)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Женщины</Label>
                    <Input id="normal_min_female" name="normal_min_female" type="number" step="any" defaultValue={editingBiomarker?.normal_min_female} placeholder="—" onChange={(e) => setEditingBiomarker((prev: any) => prev ? {...prev, normal_min_female: e.target.value ? Number(e.target.value) : null} : prev)} />
                  </div>
                </div>
              </div>

              {/* 🟡 optimal_min — boundary between Acceptable Low and Optimal */}
              <div className="rounded-lg border border-status-acceptable/30 bg-status-acceptable/5 p-3 space-y-2">
                <Label className="text-xs font-medium"><span className="text-status-acceptable">🟡 Допустимо низ</span> → <span className="text-status-optimal">🟢 Оптимально</span></Label>
                <div className="grid grid-cols-3 gap-3">
                  <div className={`space-y-1 ${(editingBiomarker?.optimal_min_male != null || editingBiomarker?.optimal_min_female != null) ? 'opacity-50' : ''}`}>
                    <Label className="text-[10px] text-muted-foreground">Общий{(editingBiomarker?.optimal_min_male != null || editingBiomarker?.optimal_min_female != null) ? ' (fallback)' : ''}</Label>
                    <Input id="optimal_min" name="optimal_min" type="number" step="any" defaultValue={editingBiomarker?.optimal_min} placeholder="—" onChange={(e) => setEditingBiomarker((prev: any) => prev ? {...prev, optimal_min: e.target.value ? Number(e.target.value) : null} : prev)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Мужчины</Label>
                    <Input name="optimal_min_male" type="number" step="any" defaultValue={editingBiomarker?.optimal_min_male} placeholder="—" onChange={(e) => setEditingBiomarker((prev: any) => prev ? {...prev, optimal_min_male: e.target.value ? Number(e.target.value) : null} : prev)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Женщины</Label>
                    <Input name="optimal_min_female" type="number" step="any" defaultValue={editingBiomarker?.optimal_min_female} placeholder="—" onChange={(e) => setEditingBiomarker((prev: any) => prev ? {...prev, optimal_min_female: e.target.value ? Number(e.target.value) : null} : prev)} />
                  </div>
                </div>
              </div>

              {/* 🟢 Optimal zone display */}
              <div className="rounded-lg border border-status-optimal/30 bg-status-optimal/10 p-3 text-center">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Общий</Label>
                    <p className="text-xs font-semibold text-status-optimal">
                      🟢 {((min: any, max: any) => { if (min == null && max == null) return '—'; if (min == null) return `≤ ${max}`; if (max == null) return `≥ ${min}`; return `${min} — ${max}`; })(editingBiomarker?.optimal_min, editingBiomarker?.optimal_max)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Мужчины</Label>
                    <p className="text-xs font-semibold text-status-optimal">
                      🟢 {((min: any, max: any) => { if (min == null && max == null) return '—'; if (min == null) return `≤ ${max}`; if (max == null) return `≥ ${min}`; return `${min} — ${max}`; })(editingBiomarker?.optimal_min_male, editingBiomarker?.optimal_max_male)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Женщины</Label>
                    <p className="text-xs font-semibold text-status-optimal">
                      🟢 {((min: any, max: any) => { if (min == null && max == null) return '—'; if (min == null) return `≤ ${max}`; if (max == null) return `≥ ${min}`; return `${min} — ${max}`; })(editingBiomarker?.optimal_min_female, editingBiomarker?.optimal_max_female)}
                    </p>
                  </div>
                </div>
              </div>

              {/* 🟡 optimal_max — boundary between Optimal and Acceptable High */}
              <div className="rounded-lg border border-status-acceptable/30 bg-status-acceptable/5 p-3 space-y-2">
                <Label className="text-xs font-medium"><span className="text-status-optimal">🟢 Оптимально</span> → <span className="text-status-acceptable">🟡 Допустимо верх</span></Label>
                <div className="grid grid-cols-3 gap-3">
                  <div className={`space-y-1 ${(editingBiomarker?.optimal_max_male != null || editingBiomarker?.optimal_max_female != null) ? 'opacity-50' : ''}`}>
                    <Label className="text-[10px] text-muted-foreground">Общий{(editingBiomarker?.optimal_max_male != null || editingBiomarker?.optimal_max_female != null) ? ' (fallback)' : ''}</Label>
                    <Input id="optimal_max" name="optimal_max" type="number" step="any" defaultValue={editingBiomarker?.optimal_max} placeholder="—" onChange={(e) => setEditingBiomarker((prev: any) => prev ? {...prev, optimal_max: e.target.value ? Number(e.target.value) : null} : prev)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Мужчины</Label>
                    <Input name="optimal_max_male" type="number" step="any" defaultValue={editingBiomarker?.optimal_max_male} placeholder="—" onChange={(e) => setEditingBiomarker((prev: any) => prev ? {...prev, optimal_max_male: e.target.value ? Number(e.target.value) : null} : prev)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Женщины</Label>
                    <Input name="optimal_max_female" type="number" step="any" defaultValue={editingBiomarker?.optimal_max_female} placeholder="—" onChange={(e) => setEditingBiomarker((prev: any) => prev ? {...prev, optimal_max_female: e.target.value ? Number(e.target.value) : null} : prev)} />
                  </div>
                </div>
              </div>

              {/* 🟠 normal_max — boundary between Acceptable High and Risk High */}
              <div className="rounded-lg border border-status-risk/30 bg-status-risk/5 p-3 space-y-2">
                <Label className="text-xs font-medium"><span className="text-status-acceptable">🟡 Допустимо верх</span> → <span className="text-status-risk">🟠 Риск верх</span></Label>
                <div className="grid grid-cols-3 gap-3">
                  <div className={`space-y-1 ${(editingBiomarker?.normal_max_male != null || editingBiomarker?.normal_max_female != null) ? 'opacity-50' : ''}`}>
                    <Label className="text-[10px] text-muted-foreground">Общий{(editingBiomarker?.normal_max_male != null || editingBiomarker?.normal_max_female != null) ? ' (fallback)' : ''}</Label>
                    <Input id="normal_max" name="normal_max" type="number" step="any" defaultValue={editingBiomarker?.normal_max} placeholder="—" onChange={(e) => setEditingBiomarker((prev: any) => prev ? {...prev, normal_max: e.target.value ? Number(e.target.value) : null} : prev)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Мужчины</Label>
                    <Input id="normal_max_male" name="normal_max_male" type="number" step="any" defaultValue={editingBiomarker?.normal_max_male} placeholder="—" onChange={(e) => setEditingBiomarker((prev: any) => prev ? {...prev, normal_max_male: e.target.value ? Number(e.target.value) : null} : prev)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Женщины</Label>
                    <Input id="normal_max_female" name="normal_max_female" type="number" step="any" defaultValue={editingBiomarker?.normal_max_female} placeholder="—" onChange={(e) => setEditingBiomarker((prev: any) => prev ? {...prev, normal_max_female: e.target.value ? Number(e.target.value) : null} : prev)} />
                  </div>
                </div>
              </div>

              {/* 🔴 critical_max — boundary between Risk High and Critical High */}
              <div className="rounded-lg border border-status-critical/30 bg-status-critical/5 p-3 space-y-2">
                <Label className="text-xs font-medium"><span className="text-status-risk">🟠 Риск верх</span> → <span className="text-status-critical">🔴 Критично верх</span></Label>
                <div className="grid grid-cols-3 gap-3">
                  <div className={`space-y-1 ${(editingBiomarker?.critical_max_male != null || editingBiomarker?.critical_max_female != null) ? 'opacity-50' : ''}`}>
                    <Label className="text-[10px] text-muted-foreground">Общий{(editingBiomarker?.critical_max_male != null || editingBiomarker?.critical_max_female != null) ? ' (fallback)' : ''}</Label>
                    <Input name="critical_max" type="number" step="any" defaultValue={editingBiomarker?.critical_max} placeholder="—" onChange={(e) => setEditingBiomarker((prev: any) => prev ? {...prev, critical_max: e.target.value ? Number(e.target.value) : null} : prev)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Мужчины</Label>
                    <Input name="critical_max_male" type="number" step="any" defaultValue={editingBiomarker?.critical_max_male} placeholder="—" onChange={(e) => setEditingBiomarker((prev: any) => prev ? {...prev, critical_max_male: e.target.value ? Number(e.target.value) : null} : prev)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Женщины</Label>
                    <Input name="critical_max_female" type="number" step="any" defaultValue={editingBiomarker?.critical_max_female} placeholder="—" onChange={(e) => setEditingBiomarker((prev: any) => prev ? {...prev, critical_max_female: e.target.value ? Number(e.target.value) : null} : prev)} />
                  </div>
                </div>
              </div>
            </div>
            </>)}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="aging_weight">Вес старения</Label>
                <Input
                  id="aging_weight"
                  name="aging_weight"
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  defaultValue={editingBiomarker?.aging_weight ?? 1.0}
                  placeholder="1.0"
                />
                <p className="text-xs text-muted-foreground">
                  Влияние на биологический возраст (0.5–3.0). Выше = сильнее влияет.
                </p>
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
            </div>

            {rangeMode === 'age' && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Возрастные диапазоны</Label>
              <p className="text-xs text-muted-foreground">Укажите нормы для разных возрастных групп</p>
              
              {/* Male age ranges */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Мужчины</Label>
                {ageRanges.male.map((range: any, index: number) => {
                  const updateMale = (field: string, val: any) => { const nr = [...ageRanges.male]; nr[index][field] = val; setAgeRanges({ ...ageRanges, male: nr }); };
                  const fmtRange = (min: any, max: any) => {
                    if ((min == null || min === '') && (max == null || max === '')) return '—';
                    if (min == null || min === '') return `≤ ${max}`;
                    if (max == null || max === '') return `≥ ${min}`;
                    return `${min} — ${max}`;
                  };
                  return (
                  <div key={index} className="space-y-1.5 p-3 border rounded-lg">
                    <div className="flex items-end gap-2 mb-2">
                      <div className="space-y-1 flex-1">
                        <Label className="text-xs">От (лет)</Label>
                        <Input type="number" min="0" value={range.age_from} onChange={(e) => updateMale('age_from', Number(e.target.value))} placeholder="0" />
                      </div>
                      <div className="space-y-1 flex-1">
                        <Label className="text-xs">До (лет)</Label>
                        <Input type="number" min="0" value={range.age_to} onChange={(e) => updateMale('age_to', Number(e.target.value))} placeholder="18" />
                      </div>
                      <Button type="button" variant="ghost" size="icon"
                        onClick={() => { const nr = ageRanges.male.filter((_: any, i: number) => i !== index); setAgeRanges({ ...ageRanges, male: nr }); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="rounded border border-status-critical/30 bg-status-critical/5 p-2 flex items-center gap-2">
                      <Label className="text-[10px] whitespace-nowrap">🔴 Крит. низ</Label>
                      <Input className="h-8 text-xs" type="number" step="any" value={range.critical_min ?? ''} onChange={(e) => updateMale('critical_min', e.target.value ? Number(e.target.value) : '')} placeholder="—" />
                    </div>
                    <div className="rounded border border-status-risk/30 bg-status-risk/5 p-2 flex items-center gap-2">
                      <Label className="text-[10px] whitespace-nowrap">🟠 Риск низ</Label>
                      <Input className="h-8 text-xs" type="number" step="any" value={range.min} onChange={(e) => updateMale('min', Number(e.target.value))} placeholder="Min" />
                    </div>
                    <div className="rounded border border-status-acceptable/30 bg-status-acceptable/5 p-2 flex items-center gap-2">
                      <Label className="text-[10px] whitespace-nowrap">🟡 Допуст. низ</Label>
                      <Input className="h-8 text-xs" type="number" step="any" value={range.optimal_min ?? ''} onChange={(e) => updateMale('optimal_min', e.target.value ? Number(e.target.value) : '')} placeholder="—" />
                    </div>
                    <div className="rounded border border-status-optimal/30 bg-status-optimal/10 p-2 text-center">
                      <Label className="text-[10px] font-medium text-status-optimal">🟢 Оптимальная зона: <span className="font-semibold">{fmtRange(range.optimal_min, range.optimal_max)}</span></Label>
                    </div>
                    <div className="rounded border border-status-acceptable/30 bg-status-acceptable/5 p-2 flex items-center gap-2">
                      <Label className="text-[10px] whitespace-nowrap">🟡 Допуст. верх</Label>
                      <Input className="h-8 text-xs" type="number" step="any" value={range.optimal_max ?? ''} onChange={(e) => updateMale('optimal_max', e.target.value ? Number(e.target.value) : '')} placeholder="—" />
                    </div>
                    <div className="rounded border border-status-risk/30 bg-status-risk/5 p-2 flex items-center gap-2">
                      <Label className="text-[10px] whitespace-nowrap">🟠 Риск верх</Label>
                      <Input className="h-8 text-xs" type="number" step="any" value={range.max} onChange={(e) => updateMale('max', Number(e.target.value))} placeholder="Max" />
                    </div>
                    <div className="rounded border border-status-critical/30 bg-status-critical/5 p-2 flex items-center gap-2">
                      <Label className="text-[10px] whitespace-nowrap">🔴 Крит. верх</Label>
                      <Input className="h-8 text-xs" type="number" step="any" value={range.critical_max ?? ''} onChange={(e) => updateMale('critical_max', e.target.value ? Number(e.target.value) : '')} placeholder="—" />
                    </div>
                  </div>
                  );
                })}
                <Button type="button" variant="outline" size="sm"
                  onClick={() => { setAgeRanges({ ...ageRanges, male: [...ageRanges.male, { age_from: '', age_to: '', min: '', max: '', optimal_min: '', optimal_max: '', critical_min: '', critical_max: '' }] }); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить диапазон
                </Button>
              </div>

              {/* Female age ranges */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Женщины</Label>
                {ageRanges.female.map((range: any, index: number) => {
                  const updateFemale = (field: string, val: any) => { const nr = [...ageRanges.female]; nr[index][field] = val; setAgeRanges({ ...ageRanges, female: nr }); };
                  const fmtRange = (min: any, max: any) => {
                    if ((min == null || min === '') && (max == null || max === '')) return '—';
                    if (min == null || min === '') return `≤ ${max}`;
                    if (max == null || max === '') return `≥ ${min}`;
                    return `${min} — ${max}`;
                  };
                  return (
                  <div key={index} className="space-y-1.5 p-3 border rounded-lg">
                    <div className="flex items-end gap-2 mb-2">
                      <div className="space-y-1 flex-1">
                        <Label className="text-xs">От (лет)</Label>
                        <Input type="number" min="0" value={range.age_from} onChange={(e) => updateFemale('age_from', Number(e.target.value))} placeholder="0" />
                      </div>
                      <div className="space-y-1 flex-1">
                        <Label className="text-xs">До (лет)</Label>
                        <Input type="number" min="0" value={range.age_to} onChange={(e) => updateFemale('age_to', Number(e.target.value))} placeholder="18" />
                      </div>
                      <Button type="button" variant="ghost" size="icon"
                        onClick={() => { const nr = ageRanges.female.filter((_: any, i: number) => i !== index); setAgeRanges({ ...ageRanges, female: nr }); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="rounded border border-status-critical/30 bg-status-critical/5 p-2 flex items-center gap-2">
                      <Label className="text-[10px] whitespace-nowrap">🔴 Крит. низ</Label>
                      <Input className="h-8 text-xs" type="number" step="any" value={range.critical_min ?? ''} onChange={(e) => updateFemale('critical_min', e.target.value ? Number(e.target.value) : '')} placeholder="—" />
                    </div>
                    <div className="rounded border border-status-risk/30 bg-status-risk/5 p-2 flex items-center gap-2">
                      <Label className="text-[10px] whitespace-nowrap">🟠 Риск низ</Label>
                      <Input className="h-8 text-xs" type="number" step="any" value={range.min} onChange={(e) => updateFemale('min', Number(e.target.value))} placeholder="Min" />
                    </div>
                    <div className="rounded border border-status-acceptable/30 bg-status-acceptable/5 p-2 flex items-center gap-2">
                      <Label className="text-[10px] whitespace-nowrap">🟡 Допуст. низ</Label>
                      <Input className="h-8 text-xs" type="number" step="any" value={range.optimal_min ?? ''} onChange={(e) => updateFemale('optimal_min', e.target.value ? Number(e.target.value) : '')} placeholder="—" />
                    </div>
                    <div className="rounded border border-status-optimal/30 bg-status-optimal/10 p-2 text-center">
                      <Label className="text-[10px] font-medium text-status-optimal">🟢 Оптимальная зона: <span className="font-semibold">{fmtRange(range.optimal_min, range.optimal_max)}</span></Label>
                    </div>
                    <div className="rounded border border-status-acceptable/30 bg-status-acceptable/5 p-2 flex items-center gap-2">
                      <Label className="text-[10px] whitespace-nowrap">🟡 Допуст. верх</Label>
                      <Input className="h-8 text-xs" type="number" step="any" value={range.optimal_max ?? ''} onChange={(e) => updateFemale('optimal_max', e.target.value ? Number(e.target.value) : '')} placeholder="—" />
                    </div>
                    <div className="rounded border border-status-risk/30 bg-status-risk/5 p-2 flex items-center gap-2">
                      <Label className="text-[10px] whitespace-nowrap">🟠 Риск верх</Label>
                      <Input className="h-8 text-xs" type="number" step="any" value={range.max} onChange={(e) => updateFemale('max', Number(e.target.value))} placeholder="Max" />
                    </div>
                    <div className="rounded border border-status-critical/30 bg-status-critical/5 p-2 flex items-center gap-2">
                      <Label className="text-[10px] whitespace-nowrap">🔴 Крит. верх</Label>
                      <Input className="h-8 text-xs" type="number" step="any" value={range.critical_max ?? ''} onChange={(e) => updateFemale('critical_max', e.target.value ? Number(e.target.value) : '')} placeholder="—" />
                    </div>
                  </div>
                  );
                })}
                <Button type="button" variant="outline" size="sm"
                  onClick={() => { setAgeRanges({ ...ageRanges, female: [...ageRanges.female, { age_from: '', age_to: '', min: '', max: '', optimal_min: '', optimal_max: '', critical_min: '', critical_max: '' }] }); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить диапазон
                </Button>
              </div>
            </div>
            )}

            {rangeErrors.length > 0 && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 space-y-1">
                <p className="text-xs font-medium text-destructive">⚠️ Ошибки в диапазонах:</p>
                {rangeErrors.map((err, i) => (
                  <p key={i} className="text-xs text-destructive/80">• {err}</p>
                ))}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBiomarkerDialog(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={saveBiomarker.isPending || rangeErrors.length > 0}>
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

      {/* Symptom Template Dialog */}
      <Dialog open={symptomDialog} onOpenChange={setSymptomDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSymptom ? "Редактировать симптом" : "Добавить симптом"}
            </DialogTitle>
            <DialogDescription>
              Заполните информацию о шаблоне симптома
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveSymptom} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="symptom-category">Категория *</Label>
              <Select
                name="category"
                defaultValue={editingSymptom?.category}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  {(symptomCategories || []).map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      <span className="flex items-center gap-2">
                        <span>{cat.emoji}</span>
                        <span>{cat.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="symptom">Симптом *</Label>
              <Input
                id="symptom"
                name="symptom"
                required
                defaultValue={editingSymptom?.symptom}
                placeholder="Название симптома"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="symptom-order">Порядок отображения</Label>
              <Input
                id="symptom-order"
                name="display_order"
                type="number"
                defaultValue={editingSymptom?.display_order || 0}
                placeholder="0"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSymptomDialog(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={saveSymptom.isPending}>
                {saveSymptom.isPending ? "Сохранение..." : "Сохранить"}
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
