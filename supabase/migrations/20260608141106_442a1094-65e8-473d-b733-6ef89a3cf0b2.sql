CREATE UNIQUE INDEX IF NOT EXISTS analysis_bookings_one_active_per_user
ON public.analysis_bookings (user_id)
WHERE status IN ('scheduled','received','waiting_call','no_answer');