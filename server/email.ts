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
  // In development mode, always log the email instead of sending (even if SendGrid is configured)
  const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  const hasSendGrid = !!process.env.SENDGRID_API_KEY && !!process.env.SENDGRID_FROM_EMAIL;
  
  // In development mode, log the email and return success
  if (isDevelopment) {
    console.log("📧 [DEV MODE] Email would be sent:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("From:", params.from || process.env.SENDGRID_FROM_EMAIL || 'noreply@indiebookshop.com');
    console.log("To:", params.to);
    console.log("Subject:", params.subject);
    console.log("Reply-To:", params.replyTo || 'N/A');
    console.log("\nText Content:");
    console.log(params.text);
    console.log("\nHTML Content:");
    console.log(params.html);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ [DEV MODE] Email logged successfully (not actually sent)");
    return true; // Return true in dev mode so the form works
  }
  
  // In production, require SendGrid configuration
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

// Function to send contact form submission
export async function sendContactFormEmail(
  adminEmail: string,
  contactData: {
    name: string;
    email: string;
    reason: string;
    subject: string;
    message: string;
  }
): Promise<boolean> {
  // Escape user input to prevent XSS in email
  const safeName = escapeHtml(contactData.name || '');
  const safeEmail = escapeHtml(contactData.email || '');
  const safeReason = escapeHtml(contactData.reason || '');
  const safeSubject = escapeHtml(contactData.subject || '');
  const safeMessage = escapeHtml(contactData.message || '');
  
  // Map reason codes to readable labels
  const reasonLabels: { [key: string]: string } = {
    'listing-update': 'Update a bookshop listing',
    'listing-issue': 'Report incorrect listing information',
    'partnership': 'Partnership or collaboration',
    'technical': 'Technical issue with the site',
    'feedback': 'General feedback or suggestion',
    'press': 'Press or media inquiry',
    'other': 'Other'
  };
  
  const reasonLabel = reasonLabels[contactData.reason] || contactData.reason;
  
  const subject = `Contact Form: ${safeSubject}`;
  
  // Create text and HTML versions for the email
  const text = `
New contact form submission:

Name: ${contactData.name || 'N/A'}
Email: ${contactData.email || 'N/A'}
Reason: ${reasonLabel}
Subject: ${contactData.subject || 'N/A'}

Message:
${contactData.message || 'N/A'}
`;

  const html = `
<h2>New Contact Form Submission</h2>
<p><strong>Name:</strong> ${safeName}</p>
<p><strong>Email:</strong> ${safeEmail}</p>
<p><strong>Reason:</strong> ${escapeHtml(reasonLabel)}</p>
<p><strong>Subject:</strong> ${safeSubject}</p>

<h3>Message:</h3>
<p style="white-space: pre-wrap;">${safeMessage}</p>

<hr>
<p style="color: #666; font-size: 12px;">You can reply directly to this email to respond to ${safeEmail}</p>
`;

  return sendEmail({
    to: adminEmail,
    from: process.env.SENDGRID_FROM_EMAIL || 'noreply@indiebookshop.com',
    replyTo: contactData.email, // Allow replying directly to the sender
    subject,
    text,
    html
  });
}