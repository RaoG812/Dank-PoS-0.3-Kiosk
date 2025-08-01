ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dealer_id text;
CREATE INDEX IF NOT EXISTS idx_orders_dealer_id ON public.orders (dealer_id);
