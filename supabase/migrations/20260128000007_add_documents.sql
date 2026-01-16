/*
  # Create documents table

  1. New Table
    - `crm_documents` - Document storage metadata

  2. Security
    - Enable RLS
    - Policies for trainers to manage own documents

  3. Storage
    - Create storage bucket for documents
*/

-- Create crm_documents table
CREATE TABLE IF NOT EXISTS crm_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id UUID REFERENCES trainees(id) ON DELETE CASCADE NOT NULL,
  trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE NOT NULL,
  
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  category TEXT CHECK (category IN ('contract', 'photo', 'before_after', 'other')) DEFAULT 'other',
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_documents_trainee ON crm_documents(trainee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_trainer ON crm_documents(trainer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_category ON crm_documents(category);

-- Enable RLS
ALTER TABLE crm_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Trainers can view own documents"
  ON crm_documents FOR SELECT
  TO authenticated
  USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can manage own documents"
  ON crm_documents FOR ALL
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- Note: Storage bucket creation should be done via Supabase Dashboard or CLI
-- The bucket name should be 'crm-documents' with public access disabled
