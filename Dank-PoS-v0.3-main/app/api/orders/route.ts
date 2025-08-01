import { NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase/server';
import { Order } from '@/types';

// GET all orders
export async function GET(request: Request) {
  try {
    const supabase = getServerSupabaseClient();
    const { data, error } = await supabase.from('orders').select('*');

    if (error) {
      console.error('Supabase error (GET orders):', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('API error (GET orders):', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}

// POST a new order
export async function POST(request: Request) {
  try {
    const supabase = getServerSupabaseClient();
    const orderData = await request.json();

    // Ensure items_json is parsed correctly if sent as a string
    const itemsJsonParsed = typeof orderData.items_json === 'string'
      ? JSON.parse(orderData.items_json)
      : orderData.items_json;

    const orderToInsert: Order = {
      id: orderData.id || crypto.randomUUID(),
      member_uid: orderData.member_uid,
      dealer_id: orderData.dealer_id || null,
      items_json: itemsJsonParsed,
      total_price: parseFloat(orderData.total_price),
      comment: orderData.comment,
      status: orderData.status || 'pending',
      created_at: orderData.created_at || new Date().toISOString(),
    };

    if (!orderToInsert.member_uid || !orderToInsert.items_json || orderToInsert.items_json.length === 0 || isNaN(orderToInsert.total_price) || !orderToInsert.dealer_id) {
      return NextResponse.json({ error: 'Member UID, dealer ID, items, and total price are required for an order.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('orders')
      .insert([orderToInsert])
      .select();

    if (error) {
      console.error('Supabase error (POST order):', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data[0], { status: 201 });
  } catch (error: any) {
    console.error('API error (POST order):', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}

// PUT to update an order (e.g., status, items)
export async function PUT(request: Request) {
  try {
    const supabase = getServerSupabaseClient();
    const ordersToUpdate: Order[] = await request.json();

    if (!Array.isArray(ordersToUpdate) || ordersToUpdate.length === 0) {
      return NextResponse.json({ error: 'An array of orders is required for PUT operation.' }, { status: 400 });
    }

    const updateResults = [] as Order[];

    for (const order of ordersToUpdate) {
      const { id, ...fields } = order as Partial<Order> & { id: string };
      if (!id) continue;

      // Ensure items_json is parsed correctly if present
      if (typeof (fields as any).items_json === 'string') {
        (fields as any).items_json = JSON.parse((fields as any).items_json);
      }

      const { data, error } = await supabase
        .from('orders')
        .update(fields)
        .eq('id', id)
        .select();

      if (error) {
        console.error('Supabase error (PUT orders):', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (data && data[0]) updateResults.push(data[0] as Order);
    }

    return NextResponse.json(updateResults, { status: 200 });
  } catch (error: any) {
    console.error('API error (PUT orders):', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}
