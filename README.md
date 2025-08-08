# Dank Machine Kiosk Interface

This folder contains a simplified interface of the Dank PoS system intended for a
32" self‑service kiosk.

The interface reuses the color palette and style from the main app but focuses on
a product showcase that works well on a large touch screen.

Main Features:

- Idle mode with a full‑screen attract loop.
- Scrollable product display with large photos.
- AI generated strain images via **StrainPicAi** using Gemini.
- AI consultant chat that suggests products available on the kiosk.
- Persistent login so the menu remains accessible when navigating.
- Floating AI assistant button with smooth animations.
- Ability to link orders to the main Dank PoS session when a shop PoS is logged in.

The kiosk uses the same Supabase back end as the main app and can be started with
`npm run dev` inside this folder.


## StrainPicAi workflow
Use `generateStrainImage(strain)` from `lib/gemini.ts` when creating a new item.
The returned URL should be stored in `strain_images` table. See
`create_strain_images.sql` for the table schema.

## Order integration
The kiosk checks that a PoS session is active by verifying a valid Supabase
session token before sending orders to the main Dank PoS API.
