import { useState, useEffect } from "react";
import { Calendar, Phone } from "lucide-react";
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

      // If the cycle was completed (any booking has terminal status "report_ready"),
      // ignore the auto-created "not_scheduled" placeholder for the next cycle —
      // it should not nag the user immediately after their report is ready.
      const hasCompleted = bookings.some((b) => b.status === "report_ready");
      const lastCompletedAt = hasCompleted
        ? Math.max(
            ...bookings
              .filter((b) => b.status === "report_ready")
              .map((b) => new Date(b.created_at).getTime())
          )
        : 0;

      // Priority order: active statuses that need user attention
      const find = (status: string, requireFuture = false) =>
        bookings.find(
          (b) =>
            b.status === status &&
            (!requireFuture || !isBookingExpired(b)) &&
            // skip the next-cycle "not_scheduled" placeholder created right after the report was ready
            !(status === "not_scheduled" && hasCompleted && new Date(b.created_at).getTime() >= lastCompletedAt)
        );

      const active =
        find("report_pending") ||
        find("collected") ||
        find("scheduled", true) ||
        find("no_answer") ||
        find("waiting_call") ||
        find("not_scheduled");


      if (active) {
        setShowBanner(true);
        setBookingInfo(active as BookingInfo);
        return;
      }

      // Terminal status: report uploaded / cycle completed — no reminder needed
      if (hasUploaded) {
        setShowBanner(false);
        setBookingInfo(null);
        return;
      }

      setShowBanner(true);
      setBookingInfo(null);
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
      <div className="relative rounded-2xl border border-primary/25 bg-primary/5 p-4 sm:p-5 animate-fade-in">
        <div className="flex items-start gap-3 sm:items-center sm:justify-between sm:flex-row flex-col">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 shrink-0">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-0.5 min-w-0 flex-1">
              <p className="font-semibold text-sm text-foreground leading-snug">{text.title}</p>
              <p className="text-xs sm:text-sm text-muted-foreground leading-snug">{subtitle}</p>
            </div>
          </div>
          {showButton && (
            <Button
              onClick={handleSchedule}
              size="sm"
              className="bg-gradient-primary shadow-neon-primary text-white w-full sm:w-auto h-10 rounded-xl"
            >
              {buttonLabel}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
