-- Add RLS policy for users to delete their own recommendations
CREATE POLICY "Users can delete their own recommendations"
ON public.recommendations
FOR DELETE
USING (auth.uid() = user_id);