import { NextResponse } from 'next/server';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { isHoneypotTripped } from '@/lib/honeypot';
import { appendSubmission, type SubmissionRow } from '@/lib/google-sheets-client';
import { getBookstoreById, getFeatures } from '@/lib/data/bookstore-data';
import { currentFields, diffFields, type EditableFields, type FieldChange } from '@/lib/data/edit-diff';
import { getBookstoreSlug } from '@/lib/data/slug';

const NOTIFY_EMAIL = 'info@bluestonebrands.com';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUCCESS_MESSAGE = "Bookshop submission received. We'll review it shortly.";
const SITE = 'https://www.indiebookshop.com';

function escapeHtml(text: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, (m) => map[m] ?? m);
}

const str = (v: unknown, max = 5000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Feature ids arrive as "1,3" from the form (or as an array). */
function parseFeatureIds(v: unknown): number[] {
  const parts = Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : [];
  return [...new Set(parts.map(p => parseInt(String(p), 10)).filter(n => Number.isInteger(n) && n > 0))].sort((a, b) => a - b);
}

type Email = { subject: string; text: string; html: string };

async function sendEmail(email: Email, replyTo: string): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.warn('SENDGRID_API_KEY not set; bookshop submission email skipped');
    return;
  }
  try {
    const sgMail = (await import('@sendgrid/mail')).default;
    sgMail.setApiKey(apiKey);
    await sgMail.send({
      to: NOTIFY_EMAIL,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@indiebookshop.com',
      replyTo,
      ...email,
    });
  } catch (err) {
    console.error('SendGrid bookshop submission error:', err);
  }
}

/** New listing, or a free-form "change" from the radio option: every field the submitter filled in. */
function submissionEmail(type: string, submitter: string, name: string, fields: EditableFields, hours: string, existing: string): Email {
  const lines = [`Type: ${type}`, `Submitted by: ${submitter}`, '', `Bookshop name: ${name}`];
  if (existing) lines.push(`Existing bookshop: ${existing}`);
  if (fields.street) lines.push(`Street: ${fields.street}`);
  if (fields.city) lines.push(`City: ${fields.city}`);
  if (fields.state) lines.push(`State: ${fields.state}`);
  if (fields.zip) lines.push(`Zip: ${fields.zip}`);
  if (fields.phone) lines.push(`Phone: ${fields.phone}`);
  if (fields.website) lines.push(`Website: ${fields.website}`);
  if (hours) lines.push(`Hours: ${hours}`);
  if (fields.featureIds.length) lines.push(`Feature ids: ${fields.featureIds.join(', ')}`);
  if (fields.description) lines.push('', 'Description:', fields.description);
  const html = lines.map(l => (l ? `<p>${escapeHtml(l)}</p>` : '<br>')).join('');
  return { subject: `Bookshop Submission: ${name}`, text: lines.join('\n'), html: `<h2>Bookshop Submission</h2>${html}` };
}

/** "Suggest an edit": only the fields that differ, as a before/after table. */
function editEmail(shopName: string, id: number, slug: string, submitter: string, changes: FieldChange[], hours: string): Email {
  const url = `${SITE}/bookshop/${slug}`;
  const textRows = changes.map(c => `${c.field}:\n  before: ${c.before}\n  after:  ${c.after}`);
  const text = [
    `Edit suggestion for ${shopName} (#${id})`,
    url,
    `Submitted by: ${submitter}`,
    '',
    ...(changes.length ? textRows : ['No field changes.']),
    ...(hours ? ['', `Hours (as submitted): ${hours}`] : []),
  ].join('\n');
  const cell = 'style="border:1px solid #ddd;padding:6px 10px;text-align:left;vertical-align:top"';
  const table = changes.length
    ? `<table style="border-collapse:collapse"><thead><tr><th ${cell}>Field</th><th ${cell}>Before</th><th ${cell}>After</th></tr></thead><tbody>${changes
        .map(c => `<tr><td ${cell}><strong>${escapeHtml(c.field)}</strong></td><td ${cell}>${escapeHtml(c.before)}</td><td ${cell}>${escapeHtml(c.after)}</td></tr>`)
        .join('')}</tbody></table>`
    : '<p>No field changes.</p>';
  const html = `<h2>Edit suggestion: ${escapeHtml(shopName)} (#${id})</h2>
<p><a href="${escapeHtml(url)}">${escapeHtml(url)}</a><br>Submitted by: ${escapeHtml(submitter)}</p>
${table}${hours ? `<p><strong>Hours (as submitted):</strong> ${escapeHtml(hours)}</p>` : ''}`;
  return { subject: `Edit suggestion: ${shopName} (#${id})`, text, html };
}

export async function POST(request: Request) {
  const limited = await checkRateLimit(request, RATE_LIMITS.submit);
  if (limited) return limited;

  try {
    const body = await request.json();

    // Bot filled the hidden field: report success without sending anything
    if (isHoneypotTripped(body)) {
      return NextResponse.json({ message: SUCCESS_MESSAGE }, { status: 200 });
    }

    const submitterEmail = str(body?.submitterEmail, 254).toLowerCase();
    const submitterName = str(body?.submitterName, 100);
    const d = body?.bookstoreData ?? {};

    if (!submitterEmail || !EMAIL_REGEX.test(submitterEmail)) {
      return NextResponse.json({ message: 'Valid email is required' }, { status: 400 });
    }

    const name = str(d.name, 200);
    if (!name || name.length < 2) {
      return NextResponse.json({ message: 'Bookshop name is required' }, { status: 400 });
    }

    const suggested: EditableFields = {
      name,
      street: str(d.street, 300),
      city: str(d.city, 100),
      state: str(d.state, 50),
      zip: str(d.zip, 10),
      phone: str(d.phone, 30),
      website: str(d.website, 500),
      description: str(d.description),
      featureIds: parseFeatureIds(d.featureIds),
    };
    const hours = str(d.hours, 1000);
    const submitter = `${submitterName || 'N/A'} <${submitterEmail}>`;

    const bookshopId = Number.isInteger(body?.bookshopId) ? (body.bookshopId as number) : null;
    const shop = body?.mode === 'edit' && bookshopId !== null ? await getBookstoreById(bookshopId) : null;

    let email: Email;
    let row: SubmissionRow;
    if (shop) {
      const features = await getFeatures().catch(() => []);
      const featureName = (id: number) => features.find(f => f.id === id)?.name ?? `#${id}`;
      const changes = diffFields(currentFields(shop), suggested, featureName);
      email = editEmail(shop.name, shop.id, getBookstoreSlug(shop), submitter, changes, hours);
      row = { mode: 'edit', bookshopId: shop.id, name: shop.name, payload: { submitterName, submitterEmail, changes, hours } };
    } else {
      const isNew = body?.isNewSubmission !== false;
      const existing = isNew ? '' : str(body?.existingBookshopName, 300);
      email = submissionEmail(isNew ? 'New bookshop' : 'Update to existing bookshop', submitter, name, suggested, hours, existing);
      row = { mode: isNew ? 'new' : 'change', bookshopId, name, payload: { submitterName, submitterEmail, existing, ...suggested, hours } };
    }

    // Both fail soft: the Sheet row is the backup if email fails, and vice versa
    await Promise.all([sendEmail(email, submitterEmail), appendSubmission(row)]);

    return NextResponse.json({ message: SUCCESS_MESSAGE }, { status: 201 });
  } catch (e) {
    console.error('Bookshop submission error:', e);
    return NextResponse.json({ message: 'Failed to submit. Please try again.' }, { status: 500 });
  }
}
