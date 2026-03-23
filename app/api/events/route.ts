import { NextResponse } from 'next/server';

const NOTIFY_EMAIL = 'info@bluestonebrands.com';
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    const description = typeof body?.description === 'string' ? body.description.trim() : '';
    const date = typeof body?.date === 'string' ? body.date.trim() : '';
    const time = typeof body?.time === 'string' ? body.time.trim() : '';
    const bookstoreId = body?.bookstoreId ?? body?.bookshopId;

    if (!title || title.length > 200) {
      return NextResponse.json({ message: 'Title is required (max 200 characters)' }, { status: 400 });
    }
    if (!description || description.length > 5000) {
      return NextResponse.json({ message: 'Description is required (max 5000 characters)' }, { status: 400 });
    }
    if (!date || !DATE_REGEX.test(date)) {
      return NextResponse.json({ message: 'Date is required in YYYY-MM-DD format' }, { status: 400 });
    }
    if (!time || !TIME_REGEX.test(time)) {
      return NextResponse.json({ message: 'Time is required in HH:MM format' }, { status: 400 });
    }
    if (!bookstoreId) {
      return NextResponse.json({ message: 'Bookshop is required' }, { status: 400 });
    }

    const apiKey = process.env.SENDGRID_API_KEY;
    if (apiKey) {
      try {
        const sgMail = (await import('@sendgrid/mail')).default;
        sgMail.setApiKey(apiKey);
        await sgMail.send({
          to: NOTIFY_EMAIL,
          from: process.env.SENDGRID_FROM_EMAIL || 'noreply@indiebookshop.com',
          subject: `New Event Submission: ${title}`,
          text: [
            'New event submission from indiebookshop.com:',
            '',
            `Bookshop ID: ${bookstoreId}`,
            `Title: ${title}`,
            `Date: ${date}`,
            `Time: ${time}`,
            '',
            'Description:',
            description,
          ].join('\n'),
        });
      } catch (err) {
        console.error('SendGrid event notification error:', err);
        // Don't fail the request if email fails — submission is still logged server-side
      }
    } else {
      console.warn('SENDGRID_API_KEY not set; event submission email skipped');
      console.info('Event submission received:', { bookstoreId, title, date, time });
    }

    return NextResponse.json(
      { message: 'Event submitted successfully.' },
      { status: 201 }
    );
  } catch (e) {
    console.error('Event submission error:', e);
    return NextResponse.json({ message: 'Failed to submit event. Please try again.' }, { status: 500 });
  }
}
