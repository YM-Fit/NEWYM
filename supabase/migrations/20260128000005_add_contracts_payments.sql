/*
  # Create contracts and payments tables

  1. New Tables
    - `crm_contracts` - Client contracts
    - `crm_payments` - Payment records

  2. Security
    - Enable RLS
    - Policies for trainers to manage own contracts and payments
*/

-- Create crm_contracts table
CREATE TABLE IF NOT EXISTS crm_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id UUID REFERENCES trainees(id) ON DELETE CASCADE NOT NULL,
  trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE NOT NULL,
  
  contract_type TEXT CHECK (contract_type IN ('monthly', 'package', 'session', 'trial')) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  value DECIMAL(10,2) NOT NULL,
  terms TEXT,
  status TEXT CHECK (status IN ('active', 'expired', 'cancelled')) DEFAULT 'active',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create crm_payments table
CREATE TABLE IF NOT EXISTS crm_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES crm_contracts(id) ON DELETE SET NULL,
  trainee_id UUID REFERENCES trainees(id) ON DELETE CASCADE NOT NULL,
  trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE NOT NULL,
  
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  payment_method TEXT CHECK (payment_method IN ('cash', 'credit_card', 'bank_transfer', 'other')),
  status TEXT CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')) DEFAULT 'pending',
  notes TEXT,
  invoice_number TEXT UNIQUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contracts_trainee ON crm_contracts(trainee_id, status);
CREATE INDEX IF NOT EXISTS idx_contracts_trainer ON crm_contracts(trainer_id, status);
CREATE INDEX IF NOT EXISTS idx_contracts_dates ON crm_contracts(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_payments_trainee ON crm_payments(trainee_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_trainer ON crm_payments(trainer_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON crm_payments(due_date, status);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON crm_payments(invoice_number);

-- Enable RLS
ALTER TABLE crm_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for crm_contracts
CREATE POLICY "Trainers can manage own contracts"
  ON crm_contracts FOR ALL
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- RLS Policies for crm_payments
CREATE POLICY "Trainers can view own payments"
  ON crm_payments FOR SELECT
  TO authenticated
  USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can manage own payments"
  ON crm_payments FOR ALL
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_contract_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE TRIGGER trigger_update_contract_updated_at
  BEFORE UPDATE ON crm_contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_contract_updated_at();

-- Function to automatically mark payments as overdue
CREATE OR REPLACE FUNCTION check_overdue_payments()
RETURNS void AS $$
BEGIN
  UPDATE crm_payments
  SET status = 'overdue'
  WHERE status = 'pending'
    AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Function to update trainee payment status based on payments
CREATE OR REPLACE FUNCTION update_trainee_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if trainee has overdue payments
  IF EXISTS (
    SELECT 1 FROM crm_payments
    WHERE trainee_id = NEW.trainee_id
      AND status = 'overdue'
  ) THEN
    UPDATE trainees
    SET payment_status = 'overdue'
    WHERE id = NEW.trainee_id;
  -- Check if all payments are paid
  ELSIF NOT EXISTS (
    SELECT 1 FROM crm_payments
    WHERE trainee_id = NEW.trainee_id
      AND status IN ('pending', 'overdue')
  ) THEN
    UPDATE trainees
    SET payment_status = 'paid'
    WHERE id = NEW.trainee_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update trainee payment status
CREATE TRIGGER trigger_update_trainee_payment_status
  AFTER INSERT OR UPDATE ON crm_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_trainee_payment_status();
