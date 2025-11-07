import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { BirthDatePicker } from "@/components/BirthDatePicker";

interface Profile {
  name: string;
  birth_date: string;
  gender: string;
  height: number | null;
}

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile | null;
  userId: string | null;
  onSuccess: () => void;
}

export function EditProfileDialog({ open, onOpenChange, profile, userId, onSuccess }: EditProfileDialogProps) {
  const [formData, setFormData] = useState({
    name: profile?.name || "",
    gender: profile?.gender || "male",
    birth_date: profile?.birth_date ? new Date(profile.birth_date) : undefined,
    height: profile?.height?.toString() || "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Update form data when profile changes
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        gender: profile.gender || "male",
        birth_date: profile.birth_date ? new Date(profile.birth_date) : undefined,
        height: profile.height?.toString() || "",
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!formData.name || !formData.birth_date) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      if (!userId) throw new Error("Не авторизован");

      const { error, data } = await supabase
        .from("profiles")
        .update({
          name: formData.name,
          gender: formData.gender,
          birth_date: formData.birth_date.toISOString().split('T')[0],
          height: formData.height ? parseFloat(formData.height) : null,
        })
        .eq("id", userId)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Успешно сохранено! ✅",
        description: "Профиль обновлен"
      });

      // Small delay to ensure database is updated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      onSuccess();
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast({
        title: "Ошибка сохранения",
        description: error.message || "Попробуйте еще раз",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Редактировать профиль</DialogTitle>
          <DialogDescription>
            Обновите вашу личную информацию
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-name">Имя *</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ваше имя"
            />
          </div>

          {/* Gender */}
          <div className="space-y-3">
            <Label>Пол *</Label>
            <RadioGroup 
              value={formData.gender} 
              onValueChange={(value) => setFormData({ ...formData, gender: value })}
              className="grid grid-cols-2 gap-4"
            >
              <div>
                <RadioGroupItem value="male" id="edit-male" className="peer sr-only" />
                <Label
                  htmlFor="edit-male"
                  className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <span className="text-2xl mb-2">👨</span>
                  <span className="font-medium">Мужчина</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="female" id="edit-female" className="peer sr-only" />
                <Label
                  htmlFor="edit-female"
                  className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <span className="text-2xl mb-2">👩</span>
                  <span className="font-medium">Женщина</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Birth Date */}
          <div className="space-y-2">
            <Label>Дата рождения *</Label>
            <BirthDatePicker
              value={formData.birth_date}
              onChange={(date) => setFormData({ ...formData, birth_date: date })}
            />
          </div>

          {/* Height */}
          <div className="space-y-2">
            <Label htmlFor="edit-height">Рост (см)</Label>
            <Input
              id="edit-height"
              type="number"
              value={formData.height}
              onChange={(e) => setFormData({ ...formData, height: e.target.value })}
              placeholder="175"
              step="0.1"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
            disabled={isSaving}
          >
            Отмена
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1"
            disabled={isSaving}
          >
            {isSaving ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
