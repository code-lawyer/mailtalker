const nodemailer = require('nodemailer');

const MAIL_SUBJECT = '[*MT-SecMSG*]';

let cachedTransport = null;
let cachedConfigKey = null;

/**
 * Get or create a cached SMTP transport.
 * Reuses the same transport if config hasn't changed.
 */
function getOrCreateTransport(smtpConfig) {
    const configKey = `${smtpConfig.host}:${smtpConfig.port}:${smtpConfig.user}`;

    if (cachedTransport && cachedConfigKey === configKey) {
        return cachedTransport;
    }

    // Close old transport if exists
    closeTransport();

    cachedTransport = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        requireTLS: smtpConfig.requireTLS,
        auth: {
            user: smtpConfig.user,
            pass: smtpConfig.pass,
        },
        tls: { rejectUnauthorized: true },
        pool: true,         // Use connection pooling
        maxConnections: 3,
        maxMessages: 50
    });

    cachedConfigKey = configKey;
    return cachedTransport;
}

function closeTransport() {
    if (cachedTransport) {
        cachedTransport.close();
        cachedTransport = null;
        cachedConfigKey = null;
    }
}

/**
 * Sends an encrypted payload image to a recipient via SMTP.
 */
async function sendPayloadMessage(smtpConfig, toEmail, imageBuffer, subject) {
    const transporter = getOrCreateTransport(smtpConfig);

    const mailOptions = {
        from: smtpConfig.user,
        to: toEmail,
        subject: subject || MAIL_SUBJECT,
        text: '这是一条 MailTalker 加密消息载荷。如果您看到此内容，请使用 MailTalker 客户端解码附件图片。',
        attachments: [
            {
                filename: 'payload.png',
                content: imageBuffer,
                contentType: 'image/png',
            }
        ]
    };

    return await transporter.sendMail(mailOptions);
}

module.exports = {
    sendPayloadMessage,
    closeTransport,
    MAIL_SUBJECT
};
