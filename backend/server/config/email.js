import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

export const generateRandomPassword = (length = 8) => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += characters.charAt(
      Math.floor(Math.random() * characters.length)
    );
  }
  return password;
};

export const setupEmail = () => {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER || "hotro22dthe9@gmail.com",
      pass: process.env.EMAIL_PASS || "pezy xppt qvlu ztok",
    },
  });
  return transporter;
};
