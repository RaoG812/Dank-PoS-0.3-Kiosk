-- Storage table for strain pictures per user
create table if not exists strain_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  strain_name text not null,
  image_url text not null,
  created_at timestamp with time zone default now()
);

create index if not exists idx_strain_images_user on strain_images(user_id);
