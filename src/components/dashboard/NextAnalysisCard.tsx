import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import { ru } from "date-fns/locale";

interface NextAnalysisCardProps {
  userId?: string;
  compact?: boolean;
}

export function NextAnalysisCard({ userId, compact = false }: NextAnalysisCardProps) {
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId) return;

    const loadNextBooking = async () => {
      try {
        const { data } = await supabase
          .from('analysis_bookings')
          .select('*')
          .eq('user_id', userId)
          .gte('booking_date', new Date().toISOString().split('T')[0])
          .order('booking_date', { ascending: true })
          .limit(1)
          .single();

        setBooking(data);
      } catch (error) {
        console.error('Error loading booking:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNextBooking();
  }, [userId]);

  if (loading) return null;

  if (compact) {
    if (!booking) {
      return (
        <div 
          className="flex items-center gap-3 p-4 rounded-lg border border-border bg-background/50 cursor-pointer hover:bg-background/70 transition-colors"
          onClick={() => navigate('/analyses')}
        >
          <Calendar className="h-5 w-5 text-primary flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm text-muted-foreground">Следующий анализ</div>
            <div className="text-lg font-bold text-foreground">Не запланирован</div>
          </div>
        </div>
      );
    }

    const bookingDate = new Date(booking.booking_date);
    const daysUntil = differenceInDays(bookingDate, new Date());

    return (
      <div 
        className="flex items-center gap-3 p-4 rounded-lg border border-border bg-background/50 cursor-pointer hover:bg-background/70 transition-colors"
        onClick={() => navigate('/analyses')}
      >
        <Calendar className="h-5 w-5 text-primary flex-shrink-0" />
        <div className="flex-1">
          <div className="text-sm text-muted-foreground">Следующий анализ</div>
          <div className="text-lg font-bold text-foreground">
            {format(bookingDate, 'd MMMM', { locale: ru })}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            через {daysUntil} {daysUntil === 1 ? 'день' : daysUntil < 5 ? 'дня' : 'дней'}
          </div>
        </div>
      </div>
    );
  }

  // Original full card version
  if (!booking) {
    return (
      <Card className="border-border bg-card backdrop-blur-sm">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Следующий анализ</p>
                <p className="text-xs text-muted-foreground">Запланируйте визит для анализа</p>
              </div>
            </div>
            <Button 
              variant="default"
              onClick={() => navigate('/analyses')}
            >
              Запланировать
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const bookingDate = new Date(booking.booking_date);
  const daysUntil = differenceInDays(bookingDate, new Date());
  const progress = Math.max(0, Math.min(100, 100 - (daysUntil / 90) * 100));

  return (
    <Card className="border-border bg-card backdrop-blur-sm">
      <CardContent className="py-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Следующий анализ</p>
                <p className="text-xs text-muted-foreground">
                  через {daysUntil} {daysUntil === 1 ? 'день' : daysUntil < 5 ? 'дня' : 'дней'}
                </p>
              </div>
            </div>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => navigate('/analyses')}
            >
              Изменить
            </Button>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Date and time */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{format(bookingDate, 'd MMMM yyyy', { locale: ru })}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{booking.booking_time}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
