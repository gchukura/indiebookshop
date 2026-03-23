import { NextResponse } from 'next/server';

const NOTIFY_EMAIL = 'info@bluestonebrands.com';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(text: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, (m) => map[m] ?? m);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const submitterEmail = typeof body?.submitterEmail === 'string' ? body.submitterEmail.trim().toLowerCase() : '';
    const submitterName = typeof body?.submitterName === 'string' ? body.submitterName.trim().slice(0, 100) : '';
    const isNewSubmission = body?.isNewSubmission !== false;
    const existingBookshopName = typeof body?.existingBookshopName === 'string' ? body.existingBookshopName.trim() : '';
    const d = body?.bookstoreData ?? {};

    if (!submitterEmail || !EMAIL_REGEX.test(submitterEmail) || submitterEmail.length > 254) {
      return NextResponse.json({ message: 'Valid email is required' }, { status: 400 });
    }

    const name = typeof d.name === 'string' ? d.name.trim() : '';
    if (!name || name.length < 2) {
      return NextResponse.json({ message: 'Bookshop name is required' }, { status: 400 });
    }

    const submissionType = isNewSubmission ? 'New bookshop' : 'Update to existing bookshop';
    const lines = [
      `Type: ${submissionType}`,
      `Submitted by: ${submitterName || 'N/A'} <${submitterEmail}>`,
      '',
      `Bookshop name: ${name}`,
    ];
    if (!isNewSubmission && existingBookshopName) {
      lines.push(`Existing bookshop: ${existingBookshopName}`);
    }
    if (d.street) lines.push(`Street: ${d.street}`);
    if (d.city)   lines.push(`City: ${d.city}`);
    if (d.state)  lines.push(`State: ${d.state}`);
    if (d.zip)    lines.push(`Zip: ${d.zip}`);
    if (d.phone)  lines.push(`Phone: ${d.phone}`);
    if (d.website) lines.push(`Website: ${d.website}`);
    if (d.hours)  lines.push(`Hours: ${d.hours}`);
    if (d.description) {
      lines.push('', 'Description:', d.description);
    }

    const safeLines = lines.map(escapeHtml);
    const html = safeLines.map(l => l ? `<p>${l}</p>` : '<br>').join('');

    const apiKey = process.env.SENDGRID_API_KEY;
    if (apiKey) {
      try {
        const sgMail = (await import('@sendgrid/mail')).default;
        sgMail.setApiKey(apiKey);
        await sgMail.send({
          to: NOTIFY_EMAIL,
          from: process.env.SENDGRID_FROM_EMAIL || 'noreply@indiebookshop.com',
          replyTo: submitterEmail,
          subject: `Bookshop Submission: ${name}`,
          text: lines.join('\n'),
          html: `<h2>Bookshop Submission</h2>${html}`,
        });
      } catch (err) {
        console.error('SendGrid bookshop submission error:', err);
      }
    } else {
      console.warn('SENDGRID_API_KEY not set; bookshop submission email skipped');
      console.info('Bookshop submission received:', { submitterEmail, name, isNewSubmission });
    }

    return NextResponse.json(
      { message: "Bookshop submission received. We'll review it shortly." },
      { status: 201 }
    );
  } catch (e) {
    console.error('Bookshop submission error:', e);
    return NextResponse.json({ message: 'Failed to submit. Please try again.' }, { status: 500 });
  }
}
