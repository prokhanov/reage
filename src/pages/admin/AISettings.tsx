import { useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { useAISettings, useCreateAISetting, useUpdateAISetting, useDeleteAISetting } from "@/hooks/useAISettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AISettingsSkeleton } from "@/components/skeletons/AISettingsSkeleton";

interface PromptFormData {
  key: string;
  description: string;
  prompt_text: string;
}

export default function AISettings() {
  const { data: settings, isLoading } = useAISettings();
  const createMutation = useCreateAISetting();
  const updateMutation = useUpdateAISetting();
  const deleteMutation = useDeleteAISetting();

  const [searchQuery, setSearchQuery] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<any>(null);
  const [formData, setFormData] = useState<PromptFormData>({
    key: "",
    description: "",
    prompt_text: "",
  });
  const [formErrors, setFormErrors] = useState<Partial<PromptFormData>>({});

  const filteredSettings = settings?.filter(
    (setting) =>
      setting.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      setting.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const validateForm = (isCreate: boolean = false): boolean => {
    const errors: Partial<PromptFormData> = {};

    if (isCreate && !formData.key.trim()) {
      errors.key = "Key обязателен";
    } else if (isCreate && !/^[a-z0-9_]+$/.test(formData.key)) {
      errors.key = "Key должен содержать только латинские буквы, цифры и подчеркивания";
    }

    if (!formData.description.trim()) {
      errors.description = "Описание обязательно";
    }

    if (!formData.prompt_text.trim()) {
      errors.prompt_text = "Текст промпта обязателен";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEdit = (prompt: any) => {
    setSelectedPrompt(prompt);
    setFormData({
      key: prompt.key,
      description: prompt.description || "",
      prompt_text: prompt.prompt_text,
    });
    setFormErrors({});
    setEditDialogOpen(true);
  };

  const handleCreate = () => {
    setFormData({ key: "", description: "", prompt_text: "" });
    setFormErrors({});
    setCreateDialogOpen(true);
  };

  const handleDeleteConfirm = (prompt: any) => {
    setSelectedPrompt(prompt);
    setDeleteDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!validateForm(false)) return;

    await updateMutation.mutateAsync({
      id: selectedPrompt.id,
      description: formData.description,
      prompt_text: formData.prompt_text,
    });

    setEditDialogOpen(false);
  };

  const handleSaveCreate = async () => {
    if (!validateForm(true)) return;

    await createMutation.mutateAsync({
      key: formData.key,
      description: formData.description,
      prompt_text: formData.prompt_text,
    });

    setCreateDialogOpen(false);
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(selectedPrompt.id);
    setDeleteDialogOpen(false);
  };

  if (isLoading) {
    return <AISettingsSkeleton />;
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Настройки AI промптов</h1>
        <p className="text-muted-foreground">
          Управление промптами для AI анализа биомаркеров
        </p>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по key или описанию..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Добавить промпт
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredSettings?.map((setting) => (
          <Card key={setting.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <Badge variant="outline" className="mb-2">
                  {setting.key}
                </Badge>
              </div>
              <CardTitle className="text-lg">{setting.description}</CardTitle>
              <CardDescription>
                {setting.prompt_text.length} символов
                {setting.updated_at && (
                  <>
                    <br />
                    Обновлено: {format(new Date(setting.updated_at), "d MMMM yyyy, HH:mm", { locale: ru })}
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-end">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(setting)} className="flex-1">
                  <Pencil className="h-3 w-3 mr-1" />
                  Редактировать
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDeleteConfirm(setting)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактировать промпт</DialogTitle>
            <DialogDescription>Изменение существующего AI промпта</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-key">Key</Label>
              <Input
                id="edit-key"
                value={formData.key}
                disabled
                className="bg-muted"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Описание *</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Краткое описание назначения промпта"
              />
              {formErrors.description && (
                <p className="text-sm text-destructive mt-1">{formErrors.description}</p>
              )}
            </div>
            <div>
              <Label htmlFor="edit-prompt">Текст промпта *</Label>
              <Textarea
                id="edit-prompt"
                value={formData.prompt_text}
                onChange={(e) => setFormData({ ...formData, prompt_text: e.target.value })}
                rows={12}
                placeholder="Введите текст промпта для AI..."
              />
              <p className="text-sm text-muted-foreground mt-1">
                {formData.prompt_text.length} символов
              </p>
              {formErrors.prompt_text && (
                <p className="text-sm text-destructive mt-1">{formErrors.prompt_text}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Добавить промпт</DialogTitle>
            <DialogDescription>Создание нового AI промпта</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="create-key">Key *</Label>
              <Input
                id="create-key"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value.toLowerCase() })}
                placeholder="analysis_summary_prompt"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Только латинские буквы, цифры и подчеркивания
              </p>
              {formErrors.key && (
                <p className="text-sm text-destructive mt-1">{formErrors.key}</p>
              )}
            </div>
            <div>
              <Label htmlFor="create-description">Описание *</Label>
              <Input
                id="create-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Краткое описание назначения промпта"
              />
              {formErrors.description && (
                <p className="text-sm text-destructive mt-1">{formErrors.description}</p>
              )}
            </div>
            <div>
              <Label htmlFor="create-prompt">Текст промпта *</Label>
              <Textarea
                id="create-prompt"
                value={formData.prompt_text}
                onChange={(e) => setFormData({ ...formData, prompt_text: e.target.value })}
                rows={12}
                placeholder="Введите текст промпта для AI..."
              />
              <p className="text-sm text-muted-foreground mt-1">
                {formData.prompt_text.length} символов
              </p>
              {formErrors.prompt_text && (
                <p className="text-sm text-destructive mt-1">{formErrors.prompt_text}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Создание..." : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы действительно хотите удалить промпт "{selectedPrompt?.key}"? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMutation.isPending ? "Удаление..." : "Удалить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
