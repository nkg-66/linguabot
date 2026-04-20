
-- 1. Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users view own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Seed admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users
WHERE email = 'nidishkumar.nkg@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Lock down chatbot_configs
ALTER TABLE public.chatbot_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own configs"
  ON public.chatbot_configs FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own configs"
  ON public.chatbot_configs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own configs"
  ON public.chatbot_configs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users delete own configs"
  ON public.chatbot_configs FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 4. Safe public RPCs for the widget + edge functions
CREATE OR REPLACE FUNCTION public.get_widget_config(_embed_key text)
RETURNS TABLE (
  bot_name text,
  brand_name text,
  primary_color text,
  greeting_message text,
  languages text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bot_name, brand_name, primary_color, greeting_message, languages
  FROM public.chatbot_configs
  WHERE embed_key = _embed_key
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_widget_config(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.embed_key_exists(_embed_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.chatbot_configs WHERE embed_key = _embed_key)
$$;

GRANT EXECUTE ON FUNCTION public.embed_key_exists(text) TO anon, authenticated;
