-- Storage for orders placed from kiosks
create table if not exists kiosk_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  item_id integer not null,
  quantity integer not null default 1,
  machine_id text not null,
  created_at timestamp with time zone default now()
);

create index if not exists idx_kiosk_orders_user on kiosk_orders(user_id);
