import { NextResponse } from 'next/server';
import { getFeaturesFromSheets } from '@/lib/google-sheets-client';

export async function GET() {
  try {
    const features = await getFeaturesFromSheets();
    return NextResponse.json(features);
  } catch (error) {
    console.error('Error fetching features from Google Sheets:', error);
    return NextResponse.json({ message: 'Failed to fetch features' }, { status: 500 });
  }
}
