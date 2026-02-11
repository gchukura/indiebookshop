import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LENGTH = { name: 200, email: 254, reason: 100, subject: 500, message: 10000 };

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
    const subject = typeof body?.subject === 'string' ? body.subject.trim() : '';
    const message = typeof body?.message === 'string' ? body.message.trim() : '';

    if (!name || name.length < 2) {
      return NextResponse.json(
        { message: 'Name is required and must be at least 2 characters' },
        { status: 400 }
      );
    }
    if (name.length > MAX_LENGTH.name) {
      return NextResponse.json(
        { message: `Name must be less than ${MAX_LENGTH.name} characters` },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { message: 'Please enter a valid email address' },
        { status: 400 }
      );
    }
    if (email.length > MAX_LENGTH.email) {
      return NextResponse.json(
        { message: 'Email is too long' },
        { status: 400 }
      );
    }

    if (!reason) {
      return NextResponse.json(
        { message: 'Please select a reason for contacting us' },
        { status: 400 }
      );
    }
    if (reason.length > MAX_LENGTH.reason) {
      return NextResponse.json(
        { message: 'Reason is too long' },
        { status: 400 }
      );
    }

    if (!subject || subject.length < 3) {
      return NextResponse.json(
        { message: 'Subject is required and must be at least 3 characters' },
        { status: 400 }
      );
    }
    if (subject.length > MAX_LENGTH.subject) {
      return NextResponse.json(
        { message: `Subject must be less than ${MAX_LENGTH.subject} characters` },
        { status: 400 }
      );
    }

    if (!message || message.length < 10) {
      return NextResponse.json(
        { message: 'Message is required and must be at least 10 characters' },
        { status: 400 }
      );
    }
    if (message.length > MAX_LENGTH.message) {
      return NextResponse.json(
        { message: `Message must be less than ${MAX_LENGTH.message} characters` },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const { error } = await supabase.from('contact_messages').insert({
      name,
      email,
      reason,
      subject,
      message,
    });

    if (error) {
      console.error('Contact form insert error:', error);
      return NextResponse.json(
        { message: 'Failed to send message. Please try again later.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Thank you! Your message has been sent. We\'ll get back to you soon.' },
      { status: 200 }
    );
  } catch (e) {
    console.error('Contact form error:', e);
    return NextResponse.json(
      { message: 'Failed to send message. Please try again later.' },
      { status: 500 }
    );
  }
}
