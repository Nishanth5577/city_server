const nodemailer = require('nodemailer');

const createTransporter = () => {
  if (process.env.NODE_ENV === 'production') {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT, 10),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // Development: log emails to console
  return {
    sendMail: async (mailOptions) => {
      console.log('📧 [DEV EMAIL]', {
        to: mailOptions.to,
        subject: mailOptions.subject,
        text: mailOptions.text?.substring(0, 200),
      });
      return { messageId: `dev-${Date.now()}` };
    },
  };
};

const transporter = createTransporter();

module.exports = transporter;
