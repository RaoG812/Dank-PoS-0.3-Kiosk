// app/api/transactions/route.ts
// This is your API route for managing transactions.
// Make sure this file is present at `your-project-root/app/api/transactions/route.ts`

import { NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase/server'; // <--- UPDATED IMPORT to use server client
import { Transaction } from '@/types'; // Import Transaction interface

// GET all transactions
export async function GET(request: Request) {
  try {
    const supabase = getServerSupabaseClient(); // <--- CRUCIAL CHANGE: Use getServerSupabaseClient()
    const { data, error } = await supabase
      .from('transactions')
      .select('*');

    if (error) {
      console.error('Supabase error (GET transactions):', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Parse items_json back to array of objects for each transaction
    const transactions = data.map(t => ({
      ...t,
      items_json: JSON.parse(t.items_json)
    }));

    return NextResponse.json(transactions, { status: 200 });
  } catch (error: any) {
    console.error('API error (GET transactions):', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}

// POST a new transaction
export async function POST(request: Request) {
  try {
    const supabase = getServerSupabaseClient(); // <--- CRUCIAL CHANGE: Use getServerSupabaseClient()
    const transactionData: Transaction = await request.json();

    // Ensure items_json is stringified before inserting
    const itemsJsonString = typeof transactionData.items_json === 'string'
      ? transactionData.items_json
      : JSON.stringify(transactionData.items_json);

    const transactionToInsert: Transaction = {
      id: transactionData.id || crypto.randomUUID(),
      member_uid: transactionData.member_uid,
      transaction_date: transactionData.transaction_date || new Date().toISOString(),
      dealer_id: transactionData.dealer_id, // Add this new field
      items_json: itemsJsonString as any, // Cast to any because it's stringified for DB
      subtotal: transactionData.subtotal,
      discount_rate: transactionData.discount_rate,
      discount_amount: transactionData.discount_amount,
      tax_amount: transactionData.tax_amount,
      final_total: transactionData.final_total,
      payment_method: transactionData.payment_method, // Include payment_method
      created_at: transactionData.created_at || new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('transactions')
      .insert([transactionToInsert])
      .select();

    if (error) {
      console.error('Supabase error (POST transaction):', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data[0], { status: 201 });
  } catch (error: any) {
    console.error('API error (POST transaction):', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}

// PUT (update) multiple transactions - used for import and potentially other bulk updates
export async function PUT(request: Request) {
  try {
    const supabase = getServerSupabaseClient(); // <--- CRUCIAL CHANGE: Use getServerSupabaseClient()
    const transactionsToUpdate: Transaction[] = await request.json();

    // Perform bulk updates
    const updates = transactionsToUpdate.map(async (transactionData) => {
      // Ensure items_json is stringified for DB storage
      const itemsJsonString = typeof transactionData.items_json === 'string'
        ? transactionData.items_json
        : JSON.stringify(transactionData.items_json);

      const { data, error } = await supabase
        .from('transactions')
        .upsert({
          id: transactionData.id,
          member_uid: transactionData.member_uid,
          transaction_date: transactionData.transaction_date,
          items_json: itemsJsonString,
          subtotal: transactionData.subtotal,
          discount_rate: transactionData.discount_rate,
          discount_amount: transactionData.discount_amount,
          tax_amount: transactionData.tax_amount,
          final_total: transactionData.final_total,
          payment_method: transactionData.payment_method, // Include payment_method
          created_at: transactionData.created_at || new Date().toISOString(),
        }, { onConflict: 'id' }) // Use upsert to insert if not exists, update if exists
        .select();

      if (error) {
        console.error(`Supabase error (PUT transaction ID: ${transactionData.id}):`, error);
        throw new Error(`Failed to update/insert transaction ${transactionData.id}: ${error.message}`);
      }
      return data[0];
    });

    const results = await Promise.all(updates);
    return NextResponse.json(results, { status: 200 });

  } catch (error: any) {
    console.error('API error (PUT transactions):', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}

// DELETE a transaction by ID
export async function DELETE(request: Request) {
  try {
    const supabase = getServerSupabaseClient(); // <--- CRUCIAL CHANGE: Use getServerSupabaseClient()
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase error (DELETE transaction):', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Transaction deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('API error (DELETE transaction):', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}
