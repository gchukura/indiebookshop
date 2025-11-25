import { MailService } from '@sendgrid/mail';
import type { MailDataRequired } from '@sendgrid/mail';

// Escape HTML entities to prevent XSS attacks
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY environment variable is not set. Email notifications will not be sent.");
}

const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

export async function sendEmail(params: MailDataRequired): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.error("❌ Cannot send email: SENDGRID_API_KEY is not set");
    console.error("Check environment variables for SENDGRID_API_KEY");
    return false;
  }
  
  if (!process.env.SENDGRID_FROM_EMAIL) {
    console.error("❌ Cannot send email: SENDGRID_FROM_EMAIL is not set");
    console.error("Check environment variables for SENDGRID_FROM_EMAIL");
    return false;
  }
  
  try {
    console.log("Attempting to send email...");
    console.log("From:", params.from || process.env.SENDGRID_FROM_EMAIL);
    console.log("To:", params.to);
    console.log("Subject:", params.subject);
    
    const result = await mailService.send(params);
    console.log(`✅ Email sent successfully to ${params.to}`);
    console.log("SendGrid response status:", result[0]?.statusCode);
    return true;
  } catch (error: any) {
    console.error('❌ SendGrid email error:', error.message);
    console.error('Error code:', error.code);
    console.error('Error response:', error.response?.body);
    
    // Log more details if available
    if (error.response) {
      console.error('SendGrid response status:', error.response.statusCode);
      console.error('SendGrid response headers:', error.response.headers);
      if (error.response.body) {
        console.error('SendGrid error details:', JSON.stringify(error.response.body, null, 2));
      }
    }
    
    return false;
  }
}

// Function to notify about new bookstore submissions
export async function sendBookstoreSubmissionNotification(
  adminEmail: string, 
  senderEmail: string,
  bookstoreData: any
): Promise<boolean> {
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
    from: process.env.SENDGRID_FROM_EMAIL || 'noreply@indiebookshop.com', // Use your verified sender
    subject,
    text,
    html
  });
}