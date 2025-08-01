import { NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase/server';
import { InventoryItem } from '@/types';
import crypto from 'crypto';

const generateBarcodeId = () => Math.random().toString(36).slice(2, 8);

// GET all inventory items
export async function GET(request: Request) {
  try {
    const supabase = getServerSupabaseClient(); // <--- CRUCIAL CHANGE: Get server-side client
    const { data, error } = await supabase.from('inventory').select('*');

    if (error) {
      console.error('Supabase error (GET inventory):', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('API error (GET inventory):', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}

// POST a new inventory item
export async function POST(request: Request) {
  try {
    const supabase = getServerSupabaseClient(); // <--- CRUCIAL CHANGE: Get server-side client
    const item: InventoryItem = await request.json();

    // Validate required fields, especially the new pricing_options
    if (!item.name || !item.pricing_options || item.pricing_options.length === 0) {
      return NextResponse.json({ error: 'Item name and at least one pricing option are required.' }, { status: 400 });
    }
    if (item.pricing_options.some(p => !p.name || typeof p.price === 'undefined' || p.price <= 0 || !p.unit)) {
        return NextResponse.json({ error: 'Each pricing option must have a name, positive price, and unit.' }, { status: 400 });
    }


    // Ensure item ID is present; if not, generate one (though client-side should handle this)
    if (!item.id) {
        item.id = crypto.randomUUID();
    }

    if (!item.barcode_id) {
        item.barcode_id = generateBarcodeId();
    }

    const { data, error } = await supabase
      .from('inventory')
      .insert([item])
      .select();

    if (error) {
      console.error('Supabase error (POST inventory):', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data[0], { status: 201 });
  } catch (error: any) {
    console.error('API error (POST inventory):', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}

// PUT to update or insert multiple inventory items (upsert)
export async function PUT(request: Request) {
  try {
    const supabase = getServerSupabaseClient(); // <--- CRUCIAL CHANGE: Get server-side client
    const items: InventoryItem[] = await request.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'An array of inventory items is required for PUT operation.' }, { status: 400 });
    }

    // Basic validation for each item
    for (const item of items) {
      if (!item.id || !item.name || !item.pricing_options || item.pricing_options.length === 0 || item.pricing_options.some(p => !p.name || typeof p.price === 'undefined' || p.price <= 0 || !p.unit)) {
        return NextResponse.json({ error: `Invalid item data in array. Missing ID, name, or valid pricing options for item: ${JSON.stringify(item)}` }, { status: 400 });
      }
      if (!item.barcode_id) {
        item.barcode_id = generateBarcodeId();
      }
    }

    const { data, error } = await supabase
      .from('inventory')
      .upsert(items, { onConflict: 'id' }) // Conflict on 'id' means update if exists, insert if new
      .select();

    if (error) {
      console.error('Supabase error (PUT inventory):', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('API error (PUT inventory):', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}
