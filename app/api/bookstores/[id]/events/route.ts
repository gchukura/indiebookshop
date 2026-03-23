import { NextResponse } from 'next/server';
import { getEventsFromSheets } from '@/lib/google-sheets-client';

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

    const events = await getEventsFromSheets(bookshopId);
    return NextResponse.json(events);
  } catch (error) {
    console.error('Error in events API route:', error);
    return NextResponse.json({ message: 'Failed to fetch events' }, { status: 500 });
  }
}
