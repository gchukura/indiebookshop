import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

const EMAIL_MAX_LENGTH = 254;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * GET: Return count and recent rows so you can verify the app is using the same Supabase project as the dashboard.
 * Remove or restrict this in production if you don't want it exposed.
 */
export async function GET() {
  try {
    const supabase = createServerClient();
    const { data: rows, error } = await supabase
      .from('newsletter_subscriptions')
      .select('id, email, source, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Newsletter list error:', error);
      return NextResponse.json(
        { error: error.message, hint: 'Check that the newsletter_subscriptions table exists and RLS allows read.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      count: Array.isArray(rows) ? rows.length : 0,
      hint: 'If count is 0 but you see rows in Supabase Dashboard, SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY may point to a different project.',
      recent: rows ?? [],
    });
  } catch (e) {
    console.error('Newsletter GET error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawEmail = typeof body?.email === 'string' ? body.email.trim() : '';

    if (!rawEmail) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (rawEmail.length > EMAIL_MAX_LENGTH) {
      return NextResponse.json(
        { error: 'Email is too long' },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(rawEmail)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const { data: inserted, error } = await supabase
      .from('newsletter_subscriptions')
      .insert({
        email: rawEmail.toLowerCase(),
        source: 'footer',
      })
      .select('id, email, created_at')
      .single();

    if (error) {
      // Duplicate email (unique constraint) or other DB error
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'This email is already subscribed.' },
          { status: 409 }
        );
      }
      console.error('Newsletter signup error:', error);
      return NextResponse.json(
        { error: 'Subscription failed. Please try again later.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Thank you for subscribing!', subscription: inserted },
      { status: 201 }
    );
  } catch (e) {
    console.error('Newsletter signup error:', e);
    return NextResponse.json(
      { error: 'Subscription failed. Please try again later.' },
      { status: 500 }
    );
  }
}
