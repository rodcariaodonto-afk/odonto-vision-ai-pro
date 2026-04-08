-- Fix 1: Prevent non-admin users from spoofing is_admin in support_messages
DROP POLICY IF EXISTS "Users can send messages to their chats" ON public.support_messages;

CREATE POLICY "Users can send messages to their chats"
ON public.support_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM support_chats
    WHERE support_chats.id = support_messages.chat_id
    AND (support_chats.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
  AND (
    is_admin = false OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Fix 2: Add RESTRICTIVE INSERT policy on user_roles to prevent privilege escalation
CREATE POLICY "Only admins can insert roles"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));