import { NextRequest, NextResponse } from 'next/server';
import { getFilteredBookstores } from '@/lib/queries/bookstores';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const filters = {
      state: searchParams.get('state') || undefined,
      city: searchParams.get('city') || undefined,
      county: searchParams.get('county') || undefined,
      features: searchParams.get('features') || undefined,
    };

    const bookstores = await getFilteredBookstores(filters);
    
    return NextResponse.json(bookstores);
  } catch (error) {
    console.error('Error in filter API route:', error);
    return NextResponse.json({ message: 'Failed to fetch filtered bookstores' }, { status: 500 });
  }
}
