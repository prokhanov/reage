import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";
import { useState } from "react";

interface DemoBannerProps {
  onDismiss?: () => void;
}

export const DemoBanner = ({ onDismiss }: DemoBannerProps) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <Alert className="mb-4 border-primary/50 bg-background/80 backdrop-blur-md sticky top-4 z-50">
      <Sparkles className="h-4 w-4 text-primary" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <span className="text-sm">
          <strong>🎭 Демо-режим:</strong> вы видите примерные данные. Ваш врач добавит реальные анализы после их обработки. Отключить демо-режим можно в настройках профиля.
        </span>
        {onDismiss && (
          <Button 
            size="sm" 
            variant="ghost"
            onClick={handleDismiss}
            className="flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};
