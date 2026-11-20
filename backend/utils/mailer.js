const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
    if (transporter) return transporter;

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
        console.warn('[MAILER] SMTP not configured. Email notifications disabled.');
        return null;
    }

    transporter = nodemailer.createTransport({
        host,
        port: parseInt(port),
        secure: parseInt(port) === 465,
        auth: { user, pass },
    });

    return transporter;
}

async function sendEmail({ to, subject, html, text }) {
    const t = getTransporter();
    if (!t) return null;

    try {
        const from = process.env.SMTP_FROM || process.env.SMTP_USER;
        const result = await t.sendMail({ from, to, subject, html, text });
        console.log(`[MAILER] Email sent to ${to}: ${subject}`);
        return result;
    } catch (error) {
        console.error('[MAILER] Send failed:', error.message);
        return null;
    }
}

function escapeHtml(value) {
    if (value == null) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function sendReminderEmail(user, card) {
    const fullName = [card.firstName, card.lastName].filter(Boolean).join(' ');
    const safeName = escapeHtml(fullName);
    const safeCompany = escapeHtml(card.company);
    const safeEmail = escapeHtml(card.email) || 'N/A';
    const safePhone = escapeHtml(card.phone) || 'N/A';
    const safeNotes = escapeHtml(card.notes);

    return sendEmail({
        to: user.email,
        subject: `Reminder: Follow up with ${fullName}`,
        html: `
            <h2>Follow-up Reminder</h2>
            <p>You have a reminder to follow up with <strong>${safeName}</strong>
            ${safeCompany ? ` from ${safeCompany}` : ''}.</p>
            <p><strong>Email:</strong> ${safeEmail}</p>
            <p><strong>Phone:</strong> ${safePhone}</p>
            ${safeNotes ? `<p><strong>Notes:</strong> ${safeNotes}</p>` : ''}
            <hr>
            <p style="color: #666; font-size: 12px;">This is an automated reminder from Bizcarder CRM.</p>
        `,
        text: `Reminder: Follow up with ${fullName}${card.company ? ` from ${card.company}` : ''}. Email: ${card.email || 'N/A'}, Phone: ${card.phone || 'N/A'}`,
    });
}

async function sendWelcomeEmail(user) {
    const name = user.displayName || user.username || '';
    const safeName = escapeHtml(name);
    return sendEmail({
        to: user.email,
        subject: 'Welcome to Bizcarder CRM',
        html: `
            <h2>Welcome, ${safeName}!</h2>
            <p>Your account has been created. ${user.isApproved ? 'You can now log in.' : 'Your account is pending admin approval.'}</p>
            <hr>
            <p style="color: #666; font-size: 12px;">Bizcarder CRM</p>
        `,
        text: `Welcome ${name}! Your Bizcarder CRM account has been created.`,
    });
}

async function sendApprovalEmail(user) {
    const name = user.displayName || user.username || '';
    const safeName = escapeHtml(name);
    return sendEmail({
        to: user.email,
        subject: 'Your Bizcarder account has been approved',
        html: `
            <h2>Account Approved</h2>
            <p>Hi ${safeName}, your account has been approved. You can now log in.</p>
            <hr>
            <p style="color: #666; font-size: 12px;">Bizcarder CRM</p>
        `,
        text: `Hi ${name}, your Bizcarder CRM account has been approved. You can now log in.`,
    });
}

module.exports = { escapeHtml, sendEmail, sendReminderEmail, sendWelcomeEmail, sendApprovalEmail };
