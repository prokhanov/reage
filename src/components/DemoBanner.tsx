import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

interface DemoBannerProps {
  onDismiss?: () => void;
}

export const DemoBanner = ({ onDismiss }: DemoBannerProps) => {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <Alert className="mb-4 border-primary/50 bg-primary/5 sticky top-0 z-50">
      <Sparkles className="h-4 w-4 text-primary" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <span className="text-sm">
          <strong>🎭 Демо-режим:</strong> вы видите примерные данные. Добавьте свои анализы для персональной аналитики.
        </span>
        <div className="flex gap-2 flex-shrink-0">
          <Button 
            size="sm" 
            onClick={() => navigate('/analyses')}
            variant="default"
          >
            Добавить анализ
          </Button>
          {onDismiss && (
            <Button 
              size="sm" 
              variant="ghost"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};
