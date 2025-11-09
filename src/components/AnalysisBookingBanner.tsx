import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { AnalysisBookingDialog } from "./AnalysisBookingDialog";

interface BookingInfo {
  booking_date: string;
  booking_time: string;
  address: string;
  status: string;
}

export function AnalysisBookingBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [bookingInfo, setBookingInfo] = useState<BookingInfo | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: userRoleData, isLoading } = useUserRole();

  useEffect(() => {
    checkBookingStatus();
  }, []);

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

      // Show banner if no bookings, not_scheduled, or scheduled
      if (!bookings || bookings.length === 0) {
        setShowBanner(true);
        setBookingInfo(null);
      } else if (bookings[0].status === 'not_scheduled' || bookings[0].status === 'scheduled') {
        setShowBanner(true);
        setBookingInfo(bookings[0] as BookingInfo);
      }
    } catch (error) {
      console.error('Error checking booking status:', error);
    }
  };

  const handleSchedule = () => {
    setDialogOpen(true);
  };

  // Don't render while loading or if not a patient
  if (isLoading || !userRoleData?.isPatient || !showBanner) return null;

  const isScheduled = bookingInfo?.status === 'scheduled';

  return (
    <>
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
                {isScheduled ? (
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
            <Button
              onClick={handleSchedule}
              size="sm"
              className="bg-white text-primary hover:bg-white/90 shadow-lg"
            >
              {isScheduled ? 'Изменить' : 'Назначить дату'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
