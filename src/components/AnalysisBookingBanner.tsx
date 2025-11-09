import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { AnalysisBookingDialog } from "./AnalysisBookingDialog";
import { SubscriptionRequiredDialog } from "./SubscriptionRequiredDialog";

interface BookingInfo {
  booking_date: string;
  booking_time: string;
  address: string;
  status: string;
}

interface Subscription {
  status: string;
}

export function AnalysisBookingBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [bookingInfo, setBookingInfo] = useState<BookingInfo | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const { data: userRoleData, isLoading } = useUserRole();

  useEffect(() => {
    checkBookingStatus();
    checkSubscriptionStatus();
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setHasActiveSubscription(
        subscription?.status === 'active' || subscription?.status === 'pending'
      );
    } catch (error) {
      console.error('Error checking subscription status:', error);
    }
  };

  const checkBookingStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: bookings } = await supabase
        .from('analysis_bookings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      // Show banner if no bookings, not_scheduled, scheduled, or received
      if (!bookings || bookings.length === 0) {
        setShowBanner(true);
        setBookingInfo(null);
      } else if (bookings[0].status === 'not_scheduled' || bookings[0].status === 'scheduled' || bookings[0].status === 'received') {
        setShowBanner(true);
        setBookingInfo(bookings[0] as BookingInfo);
      }
    } catch (error) {
      console.error('Error checking booking status:', error);
    }
  };

  const handleSchedule = () => {
    if (!hasActiveSubscription) {
      setSubscriptionDialogOpen(true);
    } else {
      setDialogOpen(true);
    }
  };

  const handleSubscriptionSuccess = () => {
    checkSubscriptionStatus();
    // Delay opening booking dialog slightly to let subscription dialog close
    setTimeout(() => {
      setDialogOpen(true);
    }, 300);
  };

  // Don't render while loading or if not a patient
  if (isLoading || !userRoleData?.isPatient || !showBanner) return null;

  const isScheduled = bookingInfo?.status === 'scheduled';
  const isReceived = bookingInfo?.status === 'received';

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
      <div className="bg-gradient-primary text-white shadow-neon-primary animate-fade-in">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="flex-1">
                {isReceived ? (
                  <>
                    <p className="font-medium text-sm sm:text-base">
                      Ваши анализы получены!
                    </p>
                    <p className="text-xs sm:text-sm text-white/90">
                      Скоро результаты появятся. Обычно это занимает 5 дней
                    </p>
                  </>
                ) : isScheduled ? (
                  <>
                    <p className="font-medium text-sm sm:text-base">
                      Ожидайте визита специалиста
                    </p>
                    <p className="text-xs sm:text-sm text-white/90">
                      {new Date(bookingInfo.booking_date).toLocaleDateString('ru-RU', { 
                        day: 'numeric', 
                        month: 'long' 
                      })} в {bookingInfo.booking_time} • {bookingInfo.address}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-sm sm:text-base">
                      Запишитесь на анализы
                    </p>
                    <p className="text-xs sm:text-sm text-white/90">
                      Медсестра приедет к вам домой в удобное время
                    </p>
                  </>
                )}
              </div>
            </div>
            {!isReceived && (
              <Button
                onClick={handleSchedule}
                size="sm"
                className="bg-white text-primary hover:bg-white/90 shadow-lg"
              >
                {isScheduled ? 'Изменить' : 'Назначить дату'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
