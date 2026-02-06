import { NextRequest, NextResponse } from 'next/server';
import { getFilteredBookstores } from '@/lib/data/bookstore-data';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse features from comma-separated string to number array
    const featuresParam = searchParams.get('features');
    const features = featuresParam
      ? featuresParam.split(',').map(f => parseInt(f.trim(), 10)).filter(n => !isNaN(n))
      : undefined;

    const filters = {
      state: searchParams.get('state') || undefined,
      city: searchParams.get('city') || undefined,
      county: searchParams.get('county') || undefined,
      features,
    };

    const bookstores = await getFilteredBookstores(filters);

    return NextResponse.json(bookstores);
  } catch (error) {
    console.error('Error in filter API route:', error);
    return NextResponse.json({ message: 'Failed to fetch filtered bookstores' }, { status: 500 });
  }
}
