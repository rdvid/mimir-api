import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type MessageType = 'RESET_PASSWORD' | 'VERIFY_ACCOUNT' | 'DELETE_ACCOUNT' | 'NEWSLETTER';

const sendMessageToUser = async (
    userName: string | null,
    type: MessageType,
    userEmail: string | string[],
    subject: string,
    token: string | null,
    html: string | null = null,
): Promise<boolean> => {
    const serverURL = process.env.SERVER_URL;

    let customizedHTML: string | null = null;
    if (type === 'RESET_PASSWORD') {
        const resetPasswordTemplatePath = path.join(
            __dirname,
            '../../public/email-template/reset-password-template.html',
        );
        const htmlContent = fs.readFileSync(resetPasswordTemplatePath, 'utf-8');
        const resetLink = `${serverURL}/api/user/reset-password/validate/?token=${token ?? ''}`;
        customizedHTML = htmlContent
            .replace('{link}', resetLink)
            .replace('{userName}', userName ?? '');
    } else if (type === 'VERIFY_ACCOUNT') {
        const accountVerificationTemplatePath = path.join(
            __dirname,
            '../../public/email-template/account-verification.html',
        );
        const htmlContent = fs.readFileSync(accountVerificationTemplatePath, 'utf-8');
        const resetLink = `${serverURL}/api/user/account-verification/?token=${token ?? ''}`;
        customizedHTML = htmlContent
            .replace('{link}', resetLink)
            .replace('{userName}', userName ?? '');
    } else if (type === 'DELETE_ACCOUNT') {
        const deleteAccountTemplatePath = path.join(
            __dirname,
            '../../public/email-template/account-delete.html',
        );
        const htmlContent = fs.readFileSync(deleteAccountTemplatePath, 'utf-8');
        customizedHTML = htmlContent.replace('{userName}', userName ?? '');
    } else if (type === 'NEWSLETTER') {
        customizedHTML = html;
    } else {
        return false;
    }

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'message.reponse.web@gmail.com',
                pass: process.env.GMAIL_PASSKEY,
            },
        });

        const mailOptions = {
            from: 'message.reponse.web@gmail.com',
            to: Array.isArray(userEmail) ? userEmail.join(',') : userEmail,
            subject: `${subject} 🚀`,
            bcc: process.env.ADMIN_GMAIL,
            html: customizedHTML ?? '',
        };

        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully! to - ', userEmail);
        return true;
    } catch (error: unknown) {
        console.error(`Error during sending email to - ${userEmail}`, error);
        throw error;
    }
};

export { sendMessageToUser };
