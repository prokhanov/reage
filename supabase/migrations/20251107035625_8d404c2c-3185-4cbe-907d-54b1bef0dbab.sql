-- Удалить политику вставки анализов для обычных пользователей
DROP POLICY IF EXISTS "Users can insert their own analyses" ON public.analyses;

-- Создать новую политику только для суперадминов
CREATE POLICY "Only superadmins can insert analyses"
ON public.analyses
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- Удалить политику вставки рекомендаций для обычных пользователей
DROP POLICY IF EXISTS "Users can insert their own recommendations" ON public.recommendations;

-- Создать новую политику только для суперадминов
CREATE POLICY "Only superadmins can insert recommendations"
ON public.recommendations
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));