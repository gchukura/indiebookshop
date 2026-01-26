// Serverless email service - email sending disabled, logs only
// Resend has been removed from the project

export async function sendEmail(params) {
  console.log('Serverless: [EMAIL LOGGED] Email sending is disabled');
  console.log('Serverless: [EMAIL LOGGED] To:', params.to);
  console.log('Serverless: [EMAIL LOGGED] Subject:', params.subject);
  console.log('Serverless: [EMAIL LOGGED] From:', params.from || 'noreply@indiebookshop.com');
  if (params.text) {
    console.log('Serverless: [EMAIL LOGGED] Text preview:', params.text.substring(0, 200));
  }
  // Return true to indicate "success" so calling code doesn't break
  return true;
}

// Function to notify about new bookstore submissions
export async function sendBookstoreSubmissionNotification(
  adminEmail,
  senderEmail,
  bookstoreData
) {
  console.log('Serverless: [EMAIL LOGGED] Bookstore submission notification (email sending disabled)');
  console.log('Serverless: [EMAIL LOGGED] Admin email:', adminEmail);
  console.log('Serverless: [EMAIL LOGGED] Sender email:', senderEmail);
  console.log('Serverless: [EMAIL LOGGED] Bookstore name:', bookstoreData.name);
  console.log('Serverless: [EMAIL LOGGED] Location:', `${bookstoreData.city || 'N/A'}, ${bookstoreData.state || 'N/A'}`);
  
  return sendEmail({
    to: adminEmail,
    from: 'noreply@indiebookshop.com',
    subject: `New Bookstore Submission: ${bookstoreData.name || 'Unknown'}`,
    text: `New bookstore submission received:\n\nName: ${bookstoreData.name || 'N/A'}\nLocation: ${bookstoreData.city || 'N/A'}, ${bookstoreData.state || 'N/A'}\nSubmitter Email: ${senderEmail}\n\nFull Details:\n${JSON.stringify(bookstoreData, null, 2)}`,
    html: `<h2>New Bookstore Submission</h2><p><strong>Name:</strong> ${bookstoreData.name || 'N/A'}</p><p><strong>Location:</strong> ${bookstoreData.city || 'N/A'}, ${bookstoreData.state || 'N/A'}</p><p><strong>Submitter Email:</strong> ${senderEmail}</p><h3>Full Details:</h3><pre>${JSON.stringify(bookstoreData, null, 2)}</pre>`
  });
}
