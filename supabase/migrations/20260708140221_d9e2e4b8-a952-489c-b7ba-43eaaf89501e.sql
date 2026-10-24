-- Enum listing every renderable block type
CREATE TYPE public.session_block_type AS ENUM (
  'heading','paragraph','callout','quote','table','warning',
  'reflection','exercise','video','image','divider','key_terms','stat_grid'
);

CREATE TABLE public.session_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.unit_sessions(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  block_type public.session_block_type NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, order_index)
);

CREATE INDEX session_blocks_session_id_idx ON public.session_blocks(session_id, order_index);

GRANT SELECT ON public.session_blocks TO authenticated;
GRANT ALL ON public.session_blocks TO service_role;

ALTER TABLE public.session_blocks ENABLE ROW LEVEL SECURITY;

-- Readable by admins, or by students enrolled in the pillar that owns the session
CREATE POLICY "Session blocks readable by admin or enrolled"
ON public.session_blocks
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.unit_sessions us
    JOIN public.units u ON u.id = us.unit_id
    JOIN public.enrollments e ON e.course_id = u.pillar_id AND e.user_id = auth.uid()
    WHERE us.id = session_blocks.session_id
  )
);

-- Admin-only writes
CREATE POLICY "Admins manage session blocks"
ON public.session_blocks
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));