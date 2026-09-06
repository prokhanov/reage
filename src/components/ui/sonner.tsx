import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Единый вид всех уведомлений продукта: та же поверхность, hairline-рамка,
 * радиус и тень, что и у карточек/оверлеев дизайн-системы.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      closeButton
      richColors={false}
      duration={4500}
      gap={10}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast overlay-panel group-[.toaster]:gap-3 group-[.toaster]:px-4 group-[.toaster]:py-3 group-[.toaster]:items-start",
          title: "group-[.toast]:text-sm group-[.toast]:font-medium group-[.toast]:leading-snug",
          description:
            "group-[.toast]:text-sm group-[.toast]:leading-relaxed group-[.toast]:text-muted-foreground",
          icon: "group-[.toast]:mt-0.5",
          actionButton:
            "group-[.toast]:h-8 group-[.toast]:rounded-md group-[.toast]:bg-primary group-[.toast]:px-3 group-[.toast]:text-xs group-[.toast]:font-medium group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:h-8 group-[.toast]:rounded-md group-[.toast]:bg-muted group-[.toast]:px-3 group-[.toast]:text-xs group-[.toast]:text-muted-foreground",
          closeButton:
            "group-[.toast]:bg-popover group-[.toast]:text-muted-foreground group-[.toast]:border-border group-[.toast]:rounded-md hover:group-[.toast]:text-foreground",
          success: "group-[.toaster]:!border-success/45",
          error: "group-[.toaster]:!border-destructive/50",
          warning: "group-[.toaster]:!border-warning/50",
          info: "group-[.toaster]:!border-info/45",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
