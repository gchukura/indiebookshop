// Serverless email service using SendGrid
import sgMail from '@sendgrid/mail';
import { escapeHtml } from './utils-serverless.js';

if (!process.env.SENDGRID_API_KEY) {
  console.warn('Serverless: SENDGRID_API_KEY environment variable is not set. Email notifications will not be sent.');
} else {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export async function sendEmail(params) {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('Serverless: Cannot send email: SENDGRID_API_KEY is not set');
    return false;
  }
  
  try {
    await sgMail.send(params);
    console.log(`Serverless: Email sent successfully to ${params.to}`);
    return true;
  } catch (error) {
    console.error('Serverless: SendGrid email error:', error);
    return false;
  }
}

// Function to notify about new bookstore submissions
export async function sendBookstoreSubmissionNotification(
  adminEmail,
  senderEmail,
  bookstoreData
) {
  // Escape user input to prevent XSS in email
  const safeName = escapeHtml(bookstoreData.name || '');
  const safeCity = escapeHtml(bookstoreData.city || '');
  const safeState = escapeHtml(bookstoreData.state || '');
  const safeSenderEmail = escapeHtml(senderEmail);
  
  const subject = `New Bookstore Submission: ${safeName}`;
  
  // Create text and HTML versions for the email
  const text = `
New bookstore submission received:

Name: ${bookstoreData.name || 'N/A'}
Location: ${bookstoreData.city || 'N/A'}, ${bookstoreData.state || 'N/A'}
Submitter Email: ${senderEmail}

Full Details:
${JSON.stringify(bookstoreData, null, 2)}
`;

  const html = `
<h2>New Bookstore Submission</h2>
<p><strong>Name:</strong> ${safeName}</p>
<p><strong>Location:</strong> ${safeCity}, ${safeState}</p>
<p><strong>Submitter Email:</strong> ${safeSenderEmail}</p>

<h3>Full Details:</h3>
<pre>${escapeHtml(JSON.stringify(bookstoreData, null, 2))}</pre>
`;

  return sendEmail({
    to: adminEmail,
    from: process.env.SENDGRID_FROM_EMAIL || 'noreply@indiebookshop.com',
    subject,
    text,
    html
  });
}

