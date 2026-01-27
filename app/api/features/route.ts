import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { Feature } from '@/shared/schema';

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('features')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching features:', error);
      return NextResponse.json({ message: 'Failed to fetch features' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json([]);
    }

    // Map features to include id field for client compatibility
    // Supabase features table may use slug as primary key, but client expects numeric id
    const features: Feature[] = data.map((feature: any, index: number) => {
      // If feature already has id field, use it
      if (feature.id !== undefined && feature.id !== null) {
        return feature as Feature;
      }

      // Generate stable numeric ID from slug using hash function
      let numericId = index + 1; // Fallback to index-based ID
      if (feature.slug) {
        let hash = 0;
        for (let i = 0; i < feature.slug.length; i++) {
          const char = feature.slug.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32-bit integer
        }
        numericId = Math.abs(hash) % 100000; // Keep IDs reasonable (0-99999)
      }

      return {
        id: numericId,
        name: feature.name,
        slug: feature.slug,
        description: feature.description,
        keywords: feature.keywords,
        icon: feature.icon,
        created_at: feature.created_at,
        ...feature
      } as Feature;
    });

    return NextResponse.json(features);
  } catch (error) {
    console.error('Error in features API route:', error);
    return NextResponse.json({ message: 'Failed to fetch features' }, { status: 500 });
  }
}
