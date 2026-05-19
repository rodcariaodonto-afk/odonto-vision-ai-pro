
-- Bucket público para imagens originais dos casos (persistência entre sessões)
INSERT INTO storage.buckets (id, name, public)
VALUES ('case-images', 'case-images', true)
ON CONFLICT (id) DO NOTHING;

-- Leitura pública (URL pública das imagens)
CREATE POLICY "Public read case images"
ON storage.objects FOR SELECT
USING (bucket_id = 'case-images');

-- Cada usuário só pode enviar dentro da própria pasta {auth.uid}/...
CREATE POLICY "Users upload own case images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'case-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users update own case images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'case-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users delete own case images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'case-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
