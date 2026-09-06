import tls from 'tls';

function sendSmtpEmail({ host, port, user, pass, senderName, senderEmail, to, cc, subject, html }) {
    return new Promise((resolve, reject) => {
        let targetHost = (host || 'smtp.gmail.com').trim();
        let targetPort = Number(port) || 465;

        // Direct TLS connection: Gmail SSL is on port 465
        if (targetHost.includes('gmail') && targetPort === 587) {
            targetPort = 465;
        }

        const toList = (Array.isArray(to) ? to : [to]).map(e => e?.trim()).filter(Boolean);
        const ccList = (Array.isArray(cc) ? cc : (cc ? [cc] : [])).map(e => e?.trim()).filter(Boolean);
        const allRecipients = [...toList, ...ccList];

        if (allRecipients.length === 0) {
            return reject(new Error('No valid recipients provided.'));
        }

        const fromEmail = senderEmail || user;
        const fromHeader = senderName ? `"${senderName.replace(/"/g, '')}" <${fromEmail}>` : fromEmail;
        const cleanPass = (pass || '').replace(/\s+/g, '');

        let step = 0; // 0: init, 1: ehlo, 2: auth, 3: user, 4: pass, 5: mail from, 6: rcpt to, 7: data, 8: body, 9: quit
        let rcptIndex = 0;
        let logs = [];

        const socket = tls.connect({
            host: targetHost,
            port: targetPort,
            rejectUnauthorized: false
        }, () => {
            // Connected successfully over TLS
        });

        socket.setTimeout(15000);
        socket.on('timeout', () => {
            socket.destroy();
            reject(new Error(`SMTP connection timed out after 15s connecting to ${targetHost}:${targetPort}`));
        });

        socket.setEncoding('utf8');

        socket.on('data', (data) => {
            const raw = data.toString();
            const lines = raw.trim();
            logs.push(lines);

            const code = parseInt(lines.substring(0, 3), 10);

            // Check for SMTP error codes
            if (code >= 400 && code <= 599) {
                try { socket.write('QUIT\r\n'); } catch (e) {}
                socket.end();
                return reject(new Error(`SMTP Error (${code}): ${lines}`));
            }

            if (step === 0 && code === 220) {
                step = 1;
                socket.write('EHLO localhost\r\n');
            } else if (step === 1 && code === 250) {
                step = 2;
                socket.write('AUTH LOGIN\r\n');
            } else if (step === 2 && code === 334) {
                step = 3;
                socket.write(Buffer.from(user).toString('base64') + '\r\n');
            } else if (step === 3 && code === 334) {
                step = 4;
                socket.write(Buffer.from(cleanPass).toString('base64') + '\r\n');
            } else if (step === 4 && code === 235) {
                step = 5;
                socket.write(`MAIL FROM:<${fromEmail}>\r\n`);
            } else if (step === 5 && code === 250) {
                step = 6;
                rcptIndex = 0;
                socket.write(`RCPT TO:<${allRecipients[rcptIndex]}>\r\n`);
            } else if (step === 6 && code === 250) {
                rcptIndex++;
                if (rcptIndex < allRecipients.length) {
                    socket.write(`RCPT TO:<${allRecipients[rcptIndex]}>\r\n`);
                } else {
                    step = 7;
                    socket.write('DATA\r\n');
                }
            } else if (step === 7 && code === 354) {
                step = 8;
                const headers = [
                    `From: ${fromHeader}`,
                    `To: ${toList.join(', ')}`,
                    ...(ccList.length > 0 ? [`Cc: ${ccList.join(', ')}`] : []),
                    `Subject: ${subject}`,
                    'MIME-Version: 1.0',
                    'Content-Type: text/html; charset=UTF-8',
                    '',
                    html,
                    '.\r\n'
                ];
                socket.write(headers.join('\r\n'));
            } else if (step === 8 && code === 250) {
                step = 9;
                socket.write('QUIT\r\n');
                resolve({
                    success: true,
                    message: `Email successfully delivered to ${toList.join(', ')}${ccList.length ? ' (CC: ' + ccList.join(', ') + ')' : ''}`
                });
            }
        });

        socket.on('error', (err) => {
            reject(new Error(`SMTP Socket Error: ${err.message}`));
        });

        socket.on('end', () => {
            if (step < 8) {
                reject(new Error(`SMTP connection closed prematurely. Last logs: ${logs.slice(-3).join(' | ')}`));
            }
        });
    });
}

async function getJsonBody(req) {
    if (req.body) {
        if (typeof req.body === 'object') return req.body;
        if (typeof req.body === 'string') {
            try { return JSON.parse(req.body); } catch (e) { return {}; }
        }
    }
    return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try { resolve(JSON.parse(body || '{}')); } catch (e) { resolve({}); }
        });
    });
}

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    try {
        const body = await getJsonBody(req);
        const { settings, to, cc, subject, html } = body;

        if (!settings) {
            return res.status(400).json({ success: false, error: 'Email configuration settings are missing.' });
        }

        if (!to || (Array.isArray(to) && to.length === 0)) {
            return res.status(400).json({ success: false, error: 'Recipient "to" is required.' });
        }

        if (!settings.smtp_user || !settings.smtp_password) {
            return res.status(400).json({ success: false, error: 'SMTP Username and Password are required.' });
        }

        const result = await sendSmtpEmail({
            host: settings.smtp_host || 'smtp.gmail.com',
            port: settings.smtp_port || 465,
            user: settings.smtp_user,
            pass: settings.smtp_password,
            senderName: settings.sender_name || 'Clock+ Notification',
            senderEmail: settings.sender_email || settings.smtp_user,
            to,
            cc,
            subject: subject || 'Clock+ Notification',
            html: html || '<p>Clock+ Notification Alert</p>'
        });

        return res.status(200).json(result);
    } catch (err) {
        console.error('Serverless send-email error:', err);
        return res.status(500).json({ success: false, error: err.message || 'Failed to dispatch email.' });
    }
}
