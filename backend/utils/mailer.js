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

async function sendReminderEmail(user, card) {
    return sendEmail({
        to: user.email,
        subject: `Reminder: Follow up with ${card.firstName} ${card.lastName}`,
        html: `
            <h2>Follow-up Reminder</h2>
            <p>You have a reminder to follow up with <strong>${card.firstName} ${card.lastName}</strong>
            ${card.company ? ` from ${card.company}` : ''}.</p>
            <p><strong>Email:</strong> ${card.email || 'N/A'}</p>
            <p><strong>Phone:</strong> ${card.phone || 'N/A'}</p>
            ${card.notes ? `<p><strong>Notes:</strong> ${card.notes}</p>` : ''}
            <hr>
            <p style="color: #666; font-size: 12px;">This is an automated reminder from Bizcarder CRM.</p>
        `,
        text: `Reminder: Follow up with ${card.firstName} ${card.lastName}${card.company ? ` from ${card.company}` : ''}. Email: ${card.email || 'N/A'}, Phone: ${card.phone || 'N/A'}`,
    });
}

async function sendWelcomeEmail(user) {
    return sendEmail({
        to: user.email,
        subject: 'Welcome to Bizcarder CRM',
        html: `
            <h2>Welcome, ${user.displayName || user.username}!</h2>
            <p>Your account has been created. ${user.isApproved ? 'You can now log in.' : 'Your account is pending admin approval.'}</p>
            <hr>
            <p style="color: #666; font-size: 12px;">Bizcarder CRM</p>
        `,
        text: `Welcome ${user.displayName || user.username}! Your Bizcarder CRM account has been created.`,
    });
}

async function sendApprovalEmail(user) {
    return sendEmail({
        to: user.email,
        subject: 'Your Bizcarder account has been approved',
        html: `
            <h2>Account Approved</h2>
            <p>Hi ${user.displayName || user.username}, your account has been approved. You can now log in.</p>
            <hr>
            <p style="color: #666; font-size: 12px;">Bizcarder CRM</p>
        `,
        text: `Hi ${user.displayName || user.username}, your Bizcarder CRM account has been approved. You can now log in.`,
    });
}

module.exports = { sendEmail, sendReminderEmail, sendWelcomeEmail, sendApprovalEmail };
