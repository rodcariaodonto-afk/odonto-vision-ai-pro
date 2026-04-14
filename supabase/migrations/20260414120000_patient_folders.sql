-- Adicionar coluna patient_folder na tabela cases
-- Permite agrupar casos por pasta de paciente
ALTER TABLE public.cases 
ADD COLUMN IF NOT EXISTS patient_folder TEXT DEFAULT NULL;

-- Índice para buscas por pasta
CREATE INDEX IF NOT EXISTS cases_patient_folder_idx 
ON public.cases (user_id, patient_folder);

-- Comentário
COMMENT ON COLUMN public.cases.patient_folder IS 'Nome da pasta do paciente para agrupamento em Meus Casos';
