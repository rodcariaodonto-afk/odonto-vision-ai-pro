CREATE TABLE IF NOT EXISTS public.cephalometric_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id TEXT NOT NULL,
  patient_name TEXT,
  image_url TEXT NOT NULL,
  image_storage_path TEXT NOT NULL,
  landmarks JSONB NOT NULL DEFAULT '[]'::jsonb,
  measurements JSONB NOT NULL DEFAULT '{}'::jsonb,
  interpretation TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  error_message TEXT,
  laudo_pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.cephalometric_analysis_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES public.cephalometric_analyses(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cephalo_user_id ON public.cephalometric_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_cephalo_status ON public.cephalometric_analyses(status);
CREATE INDEX IF NOT EXISTS idx_cephalo_created ON public.cephalometric_analyses(created_at DESC);
CREATE OR REPLACE FUNCTION public.update_cephalo_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_cephalo_updated_at ON public.cephalometric_analyses;
CREATE TRIGGER trg_cephalo_updated_at BEFORE UPDATE ON public.cephalometric_analyses
  FOR EACH ROW EXECUTE FUNCTION public.update_cephalo_updated_at();
ALTER TABLE public.cephalometric_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cephalometric_analysis_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cephalo_select_own" ON public.cephalometric_analyses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "cephalo_insert_own" ON public.cephalometric_analyses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cephalo_update_own" ON public.cephalometric_analyses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "cephalo_admin_all" ON public.cephalometric_analyses FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "cephalo_hist_select" ON public.cephalometric_analysis_history FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.cephalometric_analyses ca WHERE ca.id = analysis_id AND ca.user_id = auth.uid()));
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('cephalometric-images','cephalometric-images',true,10485760,ARRAY['image/jpeg','image/jpg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;
CREATE POLICY "cephalo_storage_upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'cephalometric-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "cephalo_storage_read" ON storage.objects FOR SELECT USING (bucket_id = 'cephalometric-images');
