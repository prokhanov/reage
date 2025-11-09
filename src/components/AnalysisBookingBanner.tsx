import { useState, useEffect } from "react";
import { Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export function AnalysisBookingBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkBookingStatus();
  }, []);

  const checkBookingStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: bookings } = await supabase
        .from('analysis_bookings')
        .select('status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      // Show banner if no bookings or latest booking is not_scheduled
      if (!bookings || bookings.length === 0 || bookings[0].status === 'not_scheduled') {
        setShowBanner(true);
      }
    } catch (error) {
      console.error('Error checking booking status:', error);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setTimeout(() => setShowBanner(false), 300);
  };

  const handleSchedule = () => {
    navigate('/dashboard'); // TODO: navigate to booking page when created
  };

  if (!showBanner || isDismissed) return null;

  return (
    <div className="bg-gradient-primary text-white shadow-neon-primary animate-fade-in">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm sm:text-base">
                Запишитесь на анализы
              </p>
              <p className="text-xs sm:text-sm text-white/90">
                Медсестра приедет к вам домой в удобное время
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSchedule}
              size="sm"
              className="bg-white text-primary hover:bg-white/90 shadow-lg"
            >
              Назначить дату
            </Button>
            <Button
              onClick={handleDismiss}
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
