/**
 * Send contact form notification email via SendGrid.
 * Used by the contact webhook (and optionally by the contact API route).
 */

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m] ?? m);
}

const REASON_LABELS: Record<string, string> = {
  'listing-update': 'Update a bookshop listing',
  'listing-issue': 'Report incorrect listing information',
  partnership: 'Partnership or collaboration',
  technical: 'Technical issue with the site',
  feedback: 'General feedback or suggestion',
  press: 'Press or media inquiry',
  general: 'General inquiry',
  other: 'Other',
};

export type ContactMessagePayload = {
  name: string;
  email: string;
  reason: string;
  subject: string;
  message: string;
};

export async function sendContactNotification(
  to: string,
  data: ContactMessagePayload
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.warn('SENDGRID_API_KEY not set; skipping contact notification email');
    return { ok: false, error: 'SENDGRID_API_KEY not set' };
  }

  const safeName = escapeHtml(data.name || '');
  const safeEmail = escapeHtml(data.email || '');
  const safeSubject = escapeHtml(data.subject || '');
  const safeMessage = escapeHtml(data.message || '');
  const reasonLabel = REASON_LABELS[data.reason] ?? data.reason;
  const safeReason = escapeHtml(reasonLabel);

  const subject = `Contact Form: ${data.subject || 'New message'}`;
  const text = [
    'New contact form submission:',
    '',
    `Name: ${data.name || 'N/A'}`,
    `Email: ${data.email || 'N/A'}`,
    `Reason: ${reasonLabel}`,
    `Subject: ${data.subject || 'N/A'}`,
    '',
    'Message:',
    data.message || 'N/A',
  ].join('\n');

  const html = [
    '<h2>New Contact Form Submission</h2>',
    `<p><strong>Name:</strong> ${safeName}</p>`,
    `<p><strong>Email:</strong> ${safeEmail}</p>`,
    `<p><strong>Reason:</strong> ${safeReason}</p>`,
    `<p><strong>Subject:</strong> ${safeSubject}</p>`,
    '<h3>Message:</h3>',
    `<p style="white-space: pre-wrap;">${safeMessage}</p>`,
    '<hr>',
    `<p style="color: #666; font-size: 12px;">You can reply directly to this email to respond to ${safeEmail}</p>`,
  ].join('');

  try {
    const sgMail = (await import('@sendgrid/mail')).default;
    sgMail.setApiKey(apiKey);
    await sgMail.send({
      to,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@indiebookshop.com',
      replyTo: data.email,
      subject,
      text,
      html,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('SendGrid contact notification error:', message);
    return { ok: false, error: message };
  }
}
