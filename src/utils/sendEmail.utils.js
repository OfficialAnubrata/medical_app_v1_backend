import { createTransport } from "nodemailer";
import variable from "../config/env.config.js";
export async function sendEmail(email, subject, html) {
  const transporter = createTransport({
    host: "smtp.gmail.com",
    port: 587,
    tls: {
        rejectUnauthorized: false,
        minVersion: "TLSv1.2"
    },
    auth: {
      user: variable.gmail,
      pass: variable.gmail_password
    },
  });

  const mailOptions = {
    from: process.env.NODEMAILER_GMAIL,
    to: email,
    subject: subject,
    html: html,
  };

  await transporter.sendMail(mailOptions);
}