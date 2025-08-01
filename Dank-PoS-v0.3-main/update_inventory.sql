ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS barcode_id text;
ALTER TABLE public.inventory ALTER COLUMN barcode_id SET DEFAULT substr(md5(random()::text), 1, 8);
UPDATE public.inventory
SET barcode_id = substr(md5(random()::text), 1, 8)
WHERE barcode_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_barcode_id ON public.inventory (barcode_id);
