const transporter = require('../config/email');

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Construction ERP <noreply@cityconstructions.in>',
      to,
      subject,
      html,
      text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Email sending failed:', error.message);
    // Don't throw - email failure shouldn't break the app
    return null;
  }
};

const sendResetPasswordEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
  return sendEmail({
    to: email,
    subject: 'Password Reset - Construction ERP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">Password Reset Request</h2>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #1e40af; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">Reset Password</a>
        <p style="color: #666; font-size: 14px;">This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
      </div>
    `,
    text: `Reset your password: ${resetUrl}`,
  });
};

const sendProjectCreatedEmail = async (email, projectName, managerName) => {
  return sendEmail({
    to: email,
    subject: `New Project Created: ${projectName} - Construction ERP`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">New Project Created</h2>
        <p>A new project <strong>${projectName}</strong> has been created and assigned to <strong>${managerName}</strong>.</p>
        <a href="${process.env.CLIENT_URL}/projects" style="display: inline-block; padding: 12px 24px; background: #1e40af; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">View Projects</a>
      </div>
    `,
    text: `New project created: ${projectName}`,
  });
};

const sendTaskAssignedEmail = async (email, taskName, projectName) => {
  return sendEmail({
    to: email,
    subject: `Task Assigned: ${taskName} - Construction ERP`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">New Task Assigned</h2>
        <p>You have been assigned a new task: <strong>${taskName}</strong> in project <strong>${projectName}</strong>.</p>
        <a href="${process.env.CLIENT_URL}/tasks" style="display: inline-block; padding: 12px 24px; background: #1e40af; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">View Tasks</a>
      </div>
    `,
    text: `New task assigned: ${taskName} in ${projectName}`,
  });
};

const sendExpenseApprovalEmail = async (email, status, amount, projectName) => {
  const statusColor = status === 'approved' ? '#059669' : '#dc2626';
  return sendEmail({
    to: email,
    subject: `Expense ${status}: ₹${amount} - Construction ERP`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${statusColor};">Expense ${status.charAt(0).toUpperCase() + status.slice(1)}</h2>
        <p>Your expense of <strong>₹${amount}</strong> for project <strong>${projectName}</strong> has been <strong>${status}</strong>.</p>
      </div>
    `,
    text: `Expense ${status}: ₹${amount} for ${projectName}`,
  });
};

module.exports = {
  sendEmail,
  sendResetPasswordEmail,
  sendProjectCreatedEmail,
  sendTaskAssignedEmail,
  sendExpenseApprovalEmail,
};
