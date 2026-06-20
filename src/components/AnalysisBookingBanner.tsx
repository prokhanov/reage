import { useState, useEffect } from "react";
import { Calendar, X, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useViewAsUser } from "@/hooks/useViewAsUser";
import { AnalysisBookingDialog } from "./AnalysisBookingDialog";
import { CallbackRequestDialog } from "./CallbackRequestDialog";
import { SubscriptionRequiredDialog } from "./SubscriptionRequiredDialog";
import {
  useBookingModeSettings,
  getStatusText,
} from "@/hooks/useBookingModeSettings";

interface BookingInfo {
  id: string;
  booking_date: string;
  booking_time: string;
  address: string;
  status: string;
  next_analysis_date?: string;
}

export function AnalysisBookingBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [bookingInfo, setBookingInfo] = useState<BookingInfo | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [callbackDialogOpen, setCallbackDialogOpen] = useState(false);
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const { data: userRoleData, isLoading } = useUserRole();
  const { getUserId, isViewMode } = useViewAsUser();
  const { data: modeSettings } = useBookingModeSettings();
  const mode = modeSettings?.mode ?? "phone";

  useEffect(() => {
    checkBookingStatus();
    checkSubscriptionStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      const userId = await getUserId();
      if (!userId) return;
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setHasActiveSubscription(subscription?.status === "active");
    } catch (error) {
      console.error("Error checking subscription status:", error);
    }
  };

  const isBookingExpired = (b: any) => {
    if (!b?.booking_date) return false;
    try {
      const dateStr = b.booking_date;
      const timeStr = b.booking_time || "23:59";
      const dt = new Date(
        `${dateStr}T${timeStr.length === 5 ? timeStr + ":00" : timeStr}`
      );
      return dt.getTime() < Date.now();
    } catch {
      return false;
    }
  };

  const checkBookingStatus = async () => {
    try {
      const userId = await getUserId();
      if (!userId) return;

      const { data: bookings } = await supabase
        .from("analysis_bookings")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!bookings || bookings.length === 0) {
        setShowBanner(true);
        setBookingInfo(null);
        return;
      }

      // Priority order
      const find = (status: string, requireFuture = false) =>
        bookings.find(
          (b) =>
            b.status === status && (!requireFuture || !isBookingExpired(b))
        );

      const active =
        find("collected") ||
        find("received") ||
        find("scheduled", true) ||
        find("no_answer") ||
        find("waiting_call") ||
        find("not_scheduled");

      if (active) {
        setShowBanner(true);
        setBookingInfo(active as BookingInfo);
      } else {
        setShowBanner(true);
        setBookingInfo(null);
      }
    } catch (error) {
      console.error("Error checking booking status:", error);
    }
  };

  const handleSchedule = () => {
    if (!hasActiveSubscription) {
      setSubscriptionDialogOpen(true);
      return;
    }
    if (mode === "phone") {
      setCallbackDialogOpen(true);
    } else {
      setDialogOpen(true);
    }
  };

  const handleSubscriptionSuccess = () => {
    checkSubscriptionStatus();
    setTimeout(() => {
      if (mode === "phone") setCallbackDialogOpen(true);
      else setDialogOpen(true);
    }, 300);
  };

  if (isLoading || !showBanner) return null;
  if (!userRoleData?.isPatient && !isViewMode) return null;

  // Determine displayed status key
  const statusKey = bookingInfo?.status ?? "empty";

  const dismissKey = `bookingBannerDismissed:${mode}:${statusKey}:${
    bookingInfo?.booking_date || ""
  }:${bookingInfo?.booking_time || ""}`;
  if (
    typeof window !== "undefined" &&
    sessionStorage.getItem(dismissKey) === "1"
  ) {
    return null;
  }

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(dismissKey, "1");
    } catch {}
    setShowBanner(false);
  };

  // Build dynamic texts
  const fallbackMap: Record<string, { title: string; subtitle: string }> = {
    empty: {
      title: "Запишитесь на анализы",
      subtitle:
        mode === "phone"
          ? "Оставьте заявку — менеджер перезвонит"
          : "Медсестра приедет к вам домой в удобное время",
    },
    waiting_call: {
      title: "Ожидайте звонка менеджера",
      subtitle: "Мы свяжемся с вами для согласования даты визита",
    },
    no_answer: {
      title: "Не дозвонились",
      subtitle: "Запросите повторный звонок",
    },
    not_scheduled: {
      title: "Запишитесь на анализы",
      subtitle: "Медсестра приедет к вам домой в удобное время",
    },
    scheduled: {
      title: "Ожидайте визита специалиста",
      subtitle: "{date} в {time} • {address}",
    },
    received: {
      title: "Ваши анализы получены!",
      subtitle: "Скоро результаты появятся. Обычно это занимает 5 дней",
    },
    collected: {
      title: "Анализы обрабатываются",
      subtitle: "Результаты скоро появятся в вашем профиле",
    },
  };

  const text = getStatusText(modeSettings, statusKey, fallbackMap[statusKey] ?? fallbackMap.empty);

  // Interpolate placeholders for scheduled
  let subtitle = text.subtitle;
  if (bookingInfo && statusKey === "scheduled") {
    const dateStr = new Date(bookingInfo.booking_date).toLocaleDateString(
      "ru-RU",
      { day: "numeric", month: "long" }
    );
    subtitle = subtitle
      .replace(/\{date\}/g, dateStr)
      .replace(/\{time\}/g, bookingInfo.booking_time || "")
      .replace(/\{address\}/g, bookingInfo.address || "");
  }

  // Decide whether to show action button
  const terminalStatuses = ["received", "collected", "scheduled"];
  const showButton = !terminalStatuses.includes(statusKey);
  let buttonLabel = "Назначить дату";
  if (mode === "phone") {
    if (statusKey === "waiting_call") buttonLabel = "Изменить телефон";
    else if (statusKey === "no_answer") buttonLabel = "Запросить звонок";
    else buttonLabel = "Оставить заявку";
  } else if (statusKey === "scheduled") {
    buttonLabel = "Изменить";
  }

  const Icon = mode === "phone" ? Phone : Calendar;

  return (
    <>
      <SubscriptionRequiredDialog
        open={subscriptionDialogOpen}
        onOpenChange={setSubscriptionDialogOpen}
        onSuccess={handleSubscriptionSuccess}
      />
      <AnalysisBookingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={checkBookingStatus}
      />
      <CallbackRequestDialog
        open={callbackDialogOpen}
        onOpenChange={setCallbackDialogOpen}
        existingBookingId={bookingInfo?.id ?? null}
        onSuccess={checkBookingStatus}
      />
      <div className="relative rounded-lg border border-primary/30 bg-primary/5 p-4 animate-fade-in">
        <Button
          onClick={handleDismiss}
          size="icon"
          variant="ghost"
          className="absolute top-1 right-1 text-muted-foreground hover:bg-primary/10 h-7 w-7"
          aria-label="Закрыть напоминание"
        >
          <X className="h-4 w-4" />
        </Button>
        <div className="flex items-start gap-3 flex-col sm:flex-row sm:items-center sm:justify-between pr-6">
          <div className="flex items-start gap-3 flex-1">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 shrink-0">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-sm sm:text-base text-foreground">{text.title}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          {showButton && (
            <Button
              onClick={handleSchedule}
              size="sm"
              className="bg-gradient-primary shadow-neon-primary text-white"
            >
              {buttonLabel}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
