-- Add visual_analysis column to cases table
ALTER TABLE public.cases 
ADD COLUMN visual_analysis jsonb DEFAULT NULL;