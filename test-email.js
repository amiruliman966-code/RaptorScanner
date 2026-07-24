require("dotenv").config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function testEmail() {
  try {
    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM}" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: "RaptorScanner Test Email",
      text: "If you receive this, forgot password email is working.",
    });

    console.log("EMAIL SENT SUCCESSFULLY");
  } catch (err) {
    console.error("EMAIL TEST FAILED:");
    console.error(err);
  }
}

testEmail();
