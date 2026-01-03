// Email service - email sending disabled, logs only
// Resend has been removed from the project

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

interface EmailParams {
  to: string | string[];
  from?: string;
  replyTo?: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  console.log("📧 [EMAIL LOGGED] Email sending is disabled");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("From:", params.from || 'noreply@indiebookshop.com');
  console.log("To:", params.to);
  console.log("Subject:", params.subject);
  console.log("Reply-To:", params.replyTo || 'N/A');
  if (params.text) {
    console.log("\nText Content:");
    console.log(params.text);
  }
  if (params.html) {
    console.log("\nHTML Content:");
    console.log(params.html);
  }
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ [EMAIL LOGGED] Email logged successfully (not actually sent)");
  return true; // Return true so calling code doesn't break
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
    from: 'noreply@indiebookshop.com',
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
    from: 'noreply@indiebookshop.com',
    replyTo: contactData.email, // Allow replying directly to the sender
    subject,
    text,
    html
  });
}
