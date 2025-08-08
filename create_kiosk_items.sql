-- Create public bucket for strain images
select storage.create_bucket('strain-images', public => true);

-- Table for kiosk-visible items referencing inventory
create table if not exists kiosk_items (
  id uuid primary key references inventory(id) on delete cascade,
  name text not null,
  display_name text,
  price numeric,
  image_url text,
  enabled boolean default true
);
