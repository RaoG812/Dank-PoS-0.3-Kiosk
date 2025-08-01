import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
    try {
        const { recipientEmail, subject, message, pdfUrl, invoiceNumber } = await request.json();

        // --- Input Validation ---
        if (!recipientEmail || !subject || !message || !pdfUrl || !invoiceNumber) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // --- Resend.com Configuration Check ---
        if (!process.env.RESEND_API_KEY || !process.env.RESEND_SENDER_EMAIL) {
            throw new Error('Resend API key or sender email is not configured in environment variables.');
        }

        // --- Create Nodemailer Transporter for Resend ---
        const transporter = nodemailer.createTransport({
            host: 'smtp.resend.com',
            port: 465,
            secure: true, // Use SSL for port 465
            auth: {
                user: 'resend', // This is a literal string for Resend SMTP username
                pass: process.env.RESEND_API_KEY, // Your Resend API Key as the password
            },
        });

        // --- Fetch the PDF content from the URL ---
        const pdfResponse = await fetch(pdfUrl);
        if (!pdfResponse.ok) {
            throw new Error(`Failed to fetch PDF from ${pdfUrl}: ${pdfResponse.statusText}`);
        }
        const pdfBuffer = await pdfResponse.arrayBuffer();

        // --- Define Mail Options ---
        const mailOptions = {
            from: process.env.RESEND_SENDER_EMAIL, // This email must be verified in Resend
            to: recipientEmail, // List of recipients
            subject: subject, // Subject line
            html: message.replace(/\n/g, '<br>'), // HTML body content, replace newlines for HTML
            attachments: [
                {
                    filename: `Invoice_${invoiceNumber}.pdf`,
                    content: Buffer.from(pdfBuffer),
                    contentType: 'application/pdf',
                },
            ],
        };

        // --- Send the Email ---
        await transporter.sendMail(mailOptions);

        return NextResponse.json({ message: 'Email sent successfully!' });
    } catch (error: any) {
        console.error('Error sending email:', error);
        // Provide a more detailed error message to the client
        return NextResponse.json({ error: `Failed to send email: ${error.message || 'An unknown error occurred.'}` }, { status: 500 });
    }
}
