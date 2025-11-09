-- Enable realtime for profiles table
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- Enable realtime for analysis_bookings table
ALTER PUBLICATION supabase_realtime ADD TABLE public.analysis_bookings;

-- Enable realtime for analyses table
ALTER PUBLICATION supabase_realtime ADD TABLE public.analyses;

-- Enable realtime for subscriptions table
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;

-- Enable realtime for medical_history table
ALTER PUBLICATION supabase_realtime ADD TABLE public.medical_history;

-- Enable realtime for complaints table
ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;

-- Enable realtime for user_roles table
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;