import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { Event } from '@/shared/schema';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const bookshopId = parseInt(resolvedParams.id);

    if (isNaN(bookshopId)) {
      return NextResponse.json({ message: 'Invalid bookshop ID' }, { status: 400 });
    }

    const supabase = createServerClient();
    
    // Note: The events table uses 'bookshop_id' (snake_case) in Supabase
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('bookshop_id', bookshopId)
      .order('date');

    if (error) {
      console.error('Error fetching events:', error);
      return NextResponse.json({ message: 'Failed to fetch events' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json([]);
    }

    // Map events to match Event schema (convert snake_case to camelCase)
    const events: Event[] = data.map((event: any) => ({
      id: event.id,
      bookshopId: event.bookshop_id,
      title: event.title,
      description: event.description,
      date: event.date,
      time: event.time,
      createdAt: event.created_at,
      updatedAt: event.updated_at,
    }));

    return NextResponse.json(events);
  } catch (error) {
    console.error('Error in events API route:', error);
    return NextResponse.json({ message: 'Failed to fetch events' }, { status: 500 });
  }
}
