import { MailService } from '@sendgrid/mail';
import type { MailDataRequired } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY environment variable is not set. Email notifications will not be sent.");
}

const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

export async function sendEmail(params: MailDataRequired): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn("Cannot send email: SENDGRID_API_KEY is not set");
    return false;
  }
  
  try {
    await mailService.send(params);
    console.log(`Email sent successfully to ${params.to}`);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

// Function to notify about new bookstore submissions
export async function sendBookstoreSubmissionNotification(
  adminEmail: string, 
  senderEmail: string,
  bookstoreData: any
): Promise<boolean> {
  const subject = `New Bookstore Submission: ${bookstoreData.name}`;
  
  // Create text and HTML versions for the email
  const text = `
New bookstore submission received:

Name: ${bookstoreData.name}
Location: ${bookstoreData.city}, ${bookstoreData.state}
Submitter Email: ${senderEmail}

Full Details:
${JSON.stringify(bookstoreData, null, 2)}
`;

  const html = `
<h2>New Bookstore Submission</h2>
<p><strong>Name:</strong> ${bookstoreData.name}</p>
<p><strong>Location:</strong> ${bookstoreData.city}, ${bookstoreData.state}</p>
<p><strong>Submitter Email:</strong> ${senderEmail}</p>

<h3>Full Details:</h3>
<pre>${JSON.stringify(bookstoreData, null, 2)}</pre>
`;

  return sendEmail({
    to: adminEmail,
    from: 'noreply@indiebookshop.com', // Use your verified sender
    subject,
    content: [
      {
        type: 'text/plain',
        value: text
      },
      {
        type: 'text/html',
        value: html
      }
    ]
  });
}