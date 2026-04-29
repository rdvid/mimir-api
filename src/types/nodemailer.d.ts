declare module 'nodemailer' {
    interface TransportOptions {
        service?: string;
        auth?: {
            user?: string;
            pass?: string;
        };
    }

    interface MailOptions {
        from?: string;
        to?: string;
        subject?: string;
        bcc?: string;
        html?: string;
    }

    interface Transporter {
        sendMail(mailOptions: MailOptions): Promise<unknown>;
    }

    const nodemailer: {
        createTransport(options: TransportOptions): Transporter;
    };

    export default nodemailer;
}
