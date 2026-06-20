import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Sparkles, X, Power } from "lucide-react";
import { useState } from "react";
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

interface DemoBannerProps {
  onDismiss?: () => void;
  onToggleDemoMode?: () => void;
}

export const DemoBanner = ({ onDismiss, onToggleDemoMode }: DemoBannerProps) => {
  const [dismissed, setDismissed] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const handleToggleDemoMode = () => {
    onToggleDemoMode?.();
    setShowConfirmDialog(false);
  };

  return (
    <>
      <Alert className="mb-4 border-primary/50 bg-background/80 backdrop-blur-md sticky top-4 z-50">
        <Sparkles className="h-4 w-4 text-primary" />
        <AlertDescription className="flex items-center justify-between gap-4">
          <span className="text-sm">
            <strong>Демо-режим:</strong> вы видите примерные данные. Ваш врач добавит реальные анализы после их обработки.
          </span>
          <div className="flex items-center gap-2 flex-shrink-0">
            {onToggleDemoMode && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setShowConfirmDialog(true)}
                className="flex items-center gap-2"
              >
                <Power className="h-4 w-4" />
                Отключить
              </Button>
            )}
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
          </div>
        </AlertDescription>
      </Alert>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Отключить демо-режим?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите отключить демо-режим? Примерные данные исчезнут, и вы увидите только свои реальные анализы. Вы сможете включить демо-режим обратно в настройках профиля.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleDemoMode}>
              Отключить демо-режим
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
