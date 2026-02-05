import { useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Edit, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAISettings, useUpdateAISetting } from "@/hooks/useAISettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AISettingsSkeleton } from "@/components/skeletons/AISettingsSkeleton";
import { getCategoryKey } from "@/lib/categoryKeyMap";
import type { Tables } from "@/integrations/supabase/types";

interface PromptFormData {
  description: string;
  prompt_text: string;
}

type BiomarkerCategory = Tables<"biomarker_categories">;

// Конфигурация разделов отчёта
const reportSections = [
  { 
    id: 'prescriptions', 
    name: 'Назначения', 
    emoji: '💊',
    description: 'Промпты для генерации персонализированных назначений',
    systemKey: 'prescriptions_system',
    userKey: 'prescriptions_user'
  },
  { 
    id: 'summary', 
    name: 'Общее резюме', 
    emoji: '📋',
    description: 'Промпты для формирования итогового резюме отчёта',
    systemKey: 'summary_system',
    userKey: 'summary_user'
  }
];

export default function AISettings() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useAISettings();
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["biomarker-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("biomarker_categories")
        .select("*")
        .order("display_order");
      
      if (error) throw error;
      return data as BiomarkerCategory[];
    },
  });
  
  const updateMutation = useUpdateAISetting();

  const [searchQuery, setSearchQuery] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<any>(null);
  const [formData, setFormData] = useState<PromptFormData>({
    description: "",
    prompt_text: "",
  });
  const [formErrors, setFormErrors] = useState<Partial<PromptFormData>>({});

  // Группируем промпты по категориям
  const categoryPrompts = categories?.map(category => {
    const key = getCategoryKey(category.name);
    const systemPrompt = settings?.find(s => s.key === `category_${key}_system`);
    const userPrompt = settings?.find(s => s.key === `category_${key}_user`);
    
    return {
      category,
      systemPrompt,
      userPrompt
    };
  });

  // Маппинг промптов для разделов отчёта
  const reportPrompts = reportSections.map(section => ({
    section,
    systemPrompt: settings?.find(s => s.key === section.systemKey),
    userPrompt: settings?.find(s => s.key === section.userKey)
  }));

  // Фильтруем разделы отчёта по поисковому запросу
  const filteredReportPrompts = searchQuery 
    ? reportPrompts.filter(rp => 
        rp.section.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rp.systemPrompt?.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rp.userPrompt?.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : reportPrompts;

  // Фильтруем только если есть поисковый запрос
  const filteredCategoryPrompts = searchQuery 
    ? categoryPrompts?.filter(cp => 
        cp.category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cp.systemPrompt?.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cp.userPrompt?.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : categoryPrompts;

  const validateForm = (): boolean => {
    const errors: Partial<PromptFormData> = {};

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
      description: prompt.description || "",
      prompt_text: prompt.prompt_text,
    });
    setFormErrors({});
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!validateForm()) return;

    await updateMutation.mutateAsync({
      id: selectedPrompt.id,
      description: formData.description,
      prompt_text: formData.prompt_text,
    });

    setEditDialogOpen(false);
  };

  if (isLoading || categoriesLoading) {
    return <AISettingsSkeleton />;
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Настройки AI промптов</h1>
        <p className="text-muted-foreground">
          Управление промптами для AI анализа биомаркеров по категориям
        </p>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию категории или описанию..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-8">
        {/* Раздел: Промпты разделов отчёта */}
        {filteredReportPrompts.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Промпты разделов отчёта</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Промпты для генерации ключевых разделов финального отчёта: назначения и общее резюме
            </p>
            <Accordion type="multiple" className="space-y-4">
              {filteredReportPrompts.map((rp) => (
                <AccordionItem 
                  key={rp.section.id} 
                  value={rp.section.id}
                  className="border rounded-lg"
                >
                  <AccordionTrigger className="px-6 hover:no-underline">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{rp.section.emoji}</span>
                      <div className="text-left">
                        <div className="font-semibold">{rp.section.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {rp.section.description}
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6">
                    <div className="space-y-4 mt-4">
                      {/* System Prompt */}
                      {rp.systemPrompt && (
                        <Card>
                          <CardHeader>
                            <div className="flex items-start justify-between gap-2">
                              <Badge variant="secondary" className="text-xs">
                                System Prompt
                              </Badge>
                              <Badge variant="outline" className="text-xs font-mono">
                                {rp.systemPrompt.key}
                              </Badge>
                            </div>
                            <CardTitle className="text-base">
                              {rp.systemPrompt.description || "System промпт"}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              Определяет роль AI для этого раздела
                              {rp.systemPrompt.updated_at && (
                                <>
                                  <br />
                                  Обновлено: {format(new Date(rp.systemPrompt.updated_at), "d MMMM yyyy, HH:mm", { locale: ru })}
                                </>
                              )}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="bg-muted p-3 rounded-md mb-3 max-h-32 overflow-y-auto">
                              <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                                {rp.systemPrompt.prompt_text}
                              </p>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="w-full"
                              onClick={() => handleEdit(rp.systemPrompt)}
                            >
                              <Edit className="w-3 h-3 mr-2" />
                              Редактировать
                            </Button>
                          </CardContent>
                        </Card>
                      )}

                      {/* User Prompt */}
                      {rp.userPrompt && (
                        <Card>
                          <CardHeader>
                            <div className="flex items-start justify-between gap-2">
                              <Badge variant="secondary" className="text-xs">
                                User Prompt
                              </Badge>
                              <Badge variant="outline" className="text-xs font-mono">
                                {rp.userPrompt.key}
                              </Badge>
                            </div>
                            <CardTitle className="text-base">
                              {rp.userPrompt.description || "User промпт"}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              Шаблон запроса для генерации раздела
                              {rp.userPrompt.updated_at && (
                                <>
                                  <br />
                                  Обновлено: {format(new Date(rp.userPrompt.updated_at), "d MMMM yyyy, HH:mm", { locale: ru })}
                                </>
                              )}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="bg-muted p-3 rounded-md mb-3 max-h-32 overflow-y-auto">
                              <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                                {rp.userPrompt.prompt_text}
                              </p>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="w-full"
                              onClick={() => handleEdit(rp.userPrompt)}
                            >
                              <Edit className="w-3 h-3 mr-2" />
                              Редактировать
                            </Button>
                          </CardContent>
                        </Card>
                      )}

                      {/* Предупреждение если промпты не найдены */}
                      {!rp.systemPrompt && !rp.userPrompt && (
                        <div className="text-sm text-muted-foreground p-4 bg-muted rounded-lg">
                          Промпты для этого раздела не настроены в базе данных
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}

        {/* Раздел: Промпты категорий биомаркеров */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Промпты категорий биомаркеров</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Каждая категория биомаркеров имеет два промпта: System (роль эксперта) и User (шаблон анализа)
          </p>
          <Accordion type="multiple" className="space-y-4">
            {filteredCategoryPrompts?.map((cp) => (
              <AccordionItem 
                key={cp.category.id} 
                value={cp.category.id}
                className="border rounded-lg"
              >
                <AccordionTrigger className="px-6 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{(cp.category as any).emoji || '📊'}</span>
                    <div className="text-left">
                      <div className="font-semibold">{cp.category.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Категория #{cp.category.display_order} • {cp.systemPrompt && cp.userPrompt ? '2 промпта' : 'промпты не настроены'}
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="space-y-4 mt-4">
                    {/* System Prompt */}
                    {cp.systemPrompt && (
                      <Card>
                        <CardHeader>
                          <div className="flex items-start justify-between gap-2">
                            <Badge variant="secondary" className="text-xs">
                              System Prompt
                            </Badge>
                            <Badge variant="outline" className="text-xs font-mono">
                              {cp.systemPrompt.key}
                            </Badge>
                          </div>
                          <CardTitle className="text-base">
                            {cp.systemPrompt.description || "System промпт"}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Определяет роль и специализацию AI эксперта для этой категории
                            {cp.systemPrompt.updated_at && (
                              <>
                                <br />
                                Обновлено: {format(new Date(cp.systemPrompt.updated_at), "d MMMM yyyy, HH:mm", { locale: ru })}
                              </>
                            )}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="bg-muted p-3 rounded-md mb-3 max-h-32 overflow-y-auto">
                            <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                              {cp.systemPrompt.prompt_text}
                            </p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="w-full"
                            onClick={() => handleEdit(cp.systemPrompt)}
                          >
                            <Edit className="w-3 h-3 mr-2" />
                            Редактировать
                          </Button>
                        </CardContent>
                      </Card>
                    )}

                    {/* User Prompt */}
                    {cp.userPrompt && (
                      <Card>
                        <CardHeader>
                          <div className="flex items-start justify-between gap-2">
                            <Badge variant="secondary" className="text-xs">
                              User Prompt
                            </Badge>
                            <Badge variant="outline" className="text-xs font-mono">
                              {cp.userPrompt.key}
                            </Badge>
                          </div>
                          <CardTitle className="text-base">
                            {cp.userPrompt.description || "User промпт"}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Шаблон запроса для анализа биомаркеров категории
                            {cp.userPrompt.updated_at && (
                              <>
                                <br />
                                Обновлено: {format(new Date(cp.userPrompt.updated_at), "d MMMM yyyy, HH:mm", { locale: ru })}
                              </>
                            )}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="bg-muted p-3 rounded-md mb-3 max-h-32 overflow-y-auto">
                            <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                              {cp.userPrompt.prompt_text}
                            </p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="w-full"
                            onClick={() => handleEdit(cp.userPrompt)}
                          >
                            <Edit className="w-3 h-3 mr-2" />
                            Редактировать
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактировать промпт</DialogTitle>
            <DialogDescription>
              Изменение AI промпта для категории биомаркеров
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-key">Key</Label>
              <Input
                id="edit-key"
                value={selectedPrompt?.key || ""}
                disabled
                className="bg-muted font-mono text-sm"
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
                rows={16}
                placeholder="Введите текст промпта для AI..."
                className="font-mono text-sm"
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
    </div>
  );
}
