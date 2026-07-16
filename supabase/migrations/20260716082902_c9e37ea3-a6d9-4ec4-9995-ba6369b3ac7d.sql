CREATE OR REPLACE FUNCTION public.notify_telegram_subscription_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_plan_name text;
BEGIN
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' THEN
    RETURN NEW;
  END IF;

  SELECT first_name, last_name, email, phone INTO v_profile
    FROM public.profiles WHERE id = NEW.user_id;

  SELECT name INTO v_plan_name
    FROM public.subscription_plans WHERE id = NEW.plan_id;

  PERFORM public.invoke_telegram_notify(
    'subscription_paid',
    jsonb_build_object(
      'user_id', NEW.user_id,
      'first_name', v_profile.first_name,
      'last_name', v_profile.last_name,
      'email', v_profile.email,
      'phone', v_profile.phone,
      'plan_name', v_plan_name,
      'plan_type', NEW.plan_type,
      'amount', NEW.amount,
      'payment_method', NEW.payment_method,
      'start_date', now(),
      'end_date', NEW.end_date
    )
  );
  RETURN NEW;
END;
$$;