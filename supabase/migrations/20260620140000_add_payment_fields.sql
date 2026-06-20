-- Add billing/payment fields to client_services for proper revenue tracking
ALTER TABLE public.client_services
  ADD COLUMN IF NOT EXISTS billing_type text NOT NULL DEFAULT 'mensal',
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'unico',
  ADD COLUMN IF NOT EXISTS installments int DEFAULT 1,
  ADD COLUMN IF NOT EXISTS total_value numeric(10,2);

-- Add payment info to opportunity_services (persists choice during opportunity phase)
ALTER TABLE public.opportunity_services
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'unico',
  ADD COLUMN IF NOT EXISTS installments int DEFAULT 1;
