-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Only admins can manage roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create support_chats table for admin support
CREATE TABLE public.support_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.support_chats ENABLE ROW LEVEL SECURITY;

-- Users can see their own chats, admins can see all
CREATE POLICY "Users can view their own support chats"
ON public.support_chats
FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create support chats"
ON public.support_chats
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update support chats"
ON public.support_chats
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Create support_messages table
CREATE TABLE public.support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES public.support_chats(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their chats"
ON public.support_messages
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.support_chats 
        WHERE id = chat_id 
        AND (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
);

CREATE POLICY "Users can send messages to their chats"
ON public.support_messages
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.support_chats 
        WHERE id = chat_id 
        AND (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
);

-- Trigger for updated_at on support_chats
CREATE TRIGGER update_support_chats_updated_at
BEFORE UPDATE ON public.support_chats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get admin stats (security definer to bypass RLS)
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;
    
    SELECT json_build_object(
        'total_users', (SELECT COUNT(*) FROM public.profiles),
        'total_cases', (SELECT COUNT(*) FROM public.cases),
        'open_chats', (SELECT COUNT(*) FROM public.support_chats WHERE status = 'open'),
        'closed_chats', (SELECT COUNT(*) FROM public.support_chats WHERE status = 'closed')
    ) INTO result;
    
    RETURN result;
END;
$$;

-- Function to get all users for admin (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
    id UUID,
    user_id UUID,
    name TEXT,
    email TEXT,
    cro TEXT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;
    
    RETURN QUERY SELECT p.id, p.user_id, p.name, p.email, p.cro, p.created_at 
    FROM public.profiles p 
    ORDER BY p.created_at DESC;
END;
$$;

-- Function to get all cases for admin
CREATE OR REPLACE FUNCTION public.get_all_cases()
RETURNS TABLE (
    id UUID,
    user_id UUID,
    name TEXT,
    exam_type TEXT,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    user_name TEXT,
    user_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;
    
    RETURN QUERY 
    SELECT c.id, c.user_id, c.name, c.exam_type, c.status, c.created_at, p.name as user_name, p.email as user_email
    FROM public.cases c
    LEFT JOIN public.profiles p ON c.user_id = p.user_id
    ORDER BY c.created_at DESC;
END;
$$;