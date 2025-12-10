-- Create test_users table for managing trial users
CREATE TABLE public.test_users (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    analyses_limit INTEGER NOT NULL DEFAULT 20,
    analyses_used INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.test_users ENABLE ROW LEVEL SECURITY;

-- Only admins can manage test users
CREATE POLICY "Admins can view test users"
ON public.test_users
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert test users"
ON public.test_users
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update test users"
ON public.test_users
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete test users"
ON public.test_users
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_test_users_updated_at
BEFORE UPDATE ON public.test_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to increment test user analyses
CREATE OR REPLACE FUNCTION public.increment_test_user_analyses(user_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.test_users
    SET analyses_used = analyses_used + 1
    WHERE email = user_email AND is_active = true AND expires_at > now();
END;
$$;