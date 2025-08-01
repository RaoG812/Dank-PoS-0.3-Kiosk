import { NextRequest, NextResponse } from 'next/server';

import { getServerSupabaseClient } from '@/lib/supabase/server'; // <--- UPDATED IMPORT PATH AND FUNCTION NAME


// Define a type for Category to ensure consistency
interface Category {
    id: string;
    name: string;
    icon_name: string;
}

// GET handler to fetch all categories
export async function GET(req: NextRequest) {
    try {
        const supabase = getServerSupabaseClient(); // <--- CRUCIAL CHANGE: Use getServerSupabaseClient
        const { data, error } = await supabase
            .from('categories')
            .select('*');

        if (error) {
            console.error('Supabase error fetching categories:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data as Category[], { status: 200 });
    } catch (error: any) {
        console.error('Unexpected error in GET /api/categories:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}

// POST handler to add new categories
export async function POST(req: NextRequest) {
    try {
        const supabase = getServerSupabaseClient(); // <--- CRUCIAL CHANGE: Use getServerSupabaseClient
        const newCategory: Category = await req.json();

        // Basic validation
        if (!newCategory.name) {
            return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
        }

        // Add a default icon_name if not provided
        if (!newCategory.icon_name) {
            newCategory.icon_name = 'CircleDashed'; // Or any other default
        }

        const { data, error } = await supabase
            .from('categories')
            .insert([newCategory])
            .select(); // Use select() to return the inserted data

        if (error) {
            console.error('Supabase error adding category:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data[0] as Category, { status: 201 });
    } catch (error: any) {
        console.error('Unexpected error in POST /api/categories:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}

// DELETE handler for a specific category by ID (if needed, though page.tsx directly uses supabase for delete)
// This is an example if you were to use a route handler for delete, but page.tsx uses direct supabase call.

export async function DELETE(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }

    try {
        const supabase = getServerSupabaseClient(); // <--- CRUCIAL CHANGE: Use getServerSupabaseClient
        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Supabase error deleting category:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ message: 'Category deleted successfully' }, { status: 200 });
    } catch (error: any) {
        console.error('Unexpected error in DELETE /api/categories:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
