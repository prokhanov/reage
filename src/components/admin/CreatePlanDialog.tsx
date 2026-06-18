import { ButtonSpinner } from "@/components/admin/ButtonSpinner";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, X } from "lucide-react";
import { usePlans } from "@/hooks/usePlans";
import { usePlanBiomarkers } from "@/hooks/usePlanBiomarkers";
import { BiomarkerSelector } from "./BiomarkerSelector";

export function CreatePlanDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [features, setFeatures] = useState<string[]>([""]);
  const [badgeText, setBadgeText] = useState("");
  const [badgeColor, setBadgeColor] = useState("");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [selectedBiomarkers, setSelectedBiomarkers] = useState<string[]>([]);

  const { createPlan } = usePlans();
  const { updateBiomarkers } = usePlanBiomarkers();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newPlan = await createPlan.mutateAsync({
      name,
      display_name: displayName,
      description: description || undefined,
      features: features.filter(f => f.trim() !== ""),
      badge_text: badgeText || undefined,
      badge_color: badgeColor || undefined,
      display_order: displayOrder,
    });

    // Сохранить биомаркеры
    if (selectedBiomarkers.length > 0) {
      await updateBiomarkers.mutateAsync({
        planId: newPlan.id,
        biomarkerIds: selectedBiomarkers,
      });
    }

    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setName("");
    setDisplayName("");
    setDescription("");
    setFeatures([""]);
    setBadgeText("");
    setBadgeColor("");
    setDisplayOrder(0);
    setSelectedBiomarkers([]);
  };

  const addFeature = () => {
    setFeatures([...features, ""]);
  };

  const updateFeature = (index: number, value: string) => {
    const newFeatures = [...features];
    newFeatures[index] = value;
    setFeatures(newFeatures);
  };

  const removeFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Создать тариф
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Создать новый тариф</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="info" className="flex-1">Информация</TabsTrigger>
              <TabsTrigger value="biomarkers" className="flex-1">Биомаркеры</TabsTrigger>
            </TabsList>
            
            <TabsContent value="info" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Название (латиница)</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="basic"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Отображаемое название</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Базовый"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Краткое описание тарифа"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Преимущества</Label>
              <Button type="button" variant="outline" size="sm" onClick={addFeature}>
                <Plus className="h-4 w-4 mr-1" />
                Добавить
              </Button>
            </div>
            {features.map((feature, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={feature}
                  onChange={(e) => updateFeature(index, e.target.value)}
                  placeholder="Например: 4 анализа в год"
                />
                {features.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFeature(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="badgeText">Текст бейджа</Label>
              <Input
                id="badgeText"
                value={badgeText}
                onChange={(e) => setBadgeText(e.target.value)}
                placeholder="Популярный"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="badgeColor">Цвет бейджа</Label>
              <Input
                id="badgeColor"
                value={badgeColor}
                onChange={(e) => setBadgeColor(e.target.value)}
                placeholder="blue"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayOrder">Порядок</Label>
              <Input
                id="displayOrder"
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(Number(e.target.value))}
              />
            </div>
          </div>
            </TabsContent>

            <TabsContent value="biomarkers" className="mt-4">
              <BiomarkerSelector
                selectedBiomarkers={selectedBiomarkers}
                onChange={setSelectedBiomarkers}
              />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={createPlan.isPending}>
              {createPlan.isPending && <ButtonSpinner className="mr-2" />}{createPlan.isPending ? "Создание..." : "Создать"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
