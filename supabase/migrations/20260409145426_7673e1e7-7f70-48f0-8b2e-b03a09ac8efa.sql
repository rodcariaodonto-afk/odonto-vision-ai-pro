
-- Fix user_roles: drop the permissive ALL policy and replace with explicit per-command policies
DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;

-- Admins can select all roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT TO public
USING (has_role(auth.uid(), 'admin'::app_role));

-- Restrictive insert policy for public (covers both anon and authenticated)
CREATE POLICY "Only admins can insert roles"
ON public.user_roles FOR INSERT TO public
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update roles
CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE TO public
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE TO public
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix chat_conversations: add missing UPDATE policy
CREATE POLICY "Users can update their own conversations"
ON public.chat_conversations FOR UPDATE
USING (auth.uid() = user_id);
