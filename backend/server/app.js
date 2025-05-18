import express from "express";
import path from "path";
import session from "express-session";
import fileUpload from "express-fileupload";
import { WebSocketServer } from "ws";
import { connectDB } from "./config/db.js";
import { setupEmail } from "./config/email.js";
import cors from "cors";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

const db = await connectDB();
app.use((req, res, next) => {
  req.db = db;
  next();
});

const transporter = setupEmail();

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());
app.use(
  session({
    secret: "forum_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 },
  })
);

app.use(express.static(path.join(__dirname, "../../frontend/public")));
app.use("/src", express.static(path.join(__dirname, "../../frontend/src")));

import authRoutes from "./routes/auth.js";
import employeeRoutes from "./routes/employee.js";
import requestRoutes from "./routes/request.js";
import postRoutes from "./routes/post.js";
import scheduleRoutes from "./routes/schedule.js";
import notificationRoutes from "./routes/notification.js";

app.use((req, res, next) => {
  req.wss = wss;
  req.transporter = transporter;
  next();
});
app.use("/api", authRoutes);
app.use("/api", employeeRoutes);
app.use("/api", requestRoutes);
app.use("/api", postRoutes);
app.use("/api", scheduleRoutes);
app.use("/api", notificationRoutes);

const routes = [
  { path: "/", file: "login.html" },
  { path: "/login.html", file: "login.html" },
  { path: "/forum", file: "forum.html", auth: true },
  { path: "/submitted-requests", file: "submitted-requests.html", auth: true },
  { path: "/employee-info", file: "employee-info.html", auth: true },
  { path: "/schedule", file: "schedule.html", auth: true },
  { path: "/exam-schedule", file: "exam-schedule.html", auth: true },
];

import fs from "fs";
routes.forEach(({ path: routePath, file, auth }) => {
  app.get(routePath, (req, res) => {
    if (auth && !req.session.user) {
      console.log(`Chưa đăng nhập, chuyển hướng về / từ ${routePath}`);
      return res.redirect("/");
    }
    const filePath = path.join(__dirname, "../../frontend/public", file);
    if (!fs.existsSync(filePath)) {
      console.log(`File ${file} không tồn tại tại: ${filePath}`);
      return res.status(404).send(`File ${file} không tồn tại`);
    }
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error(`Lỗi gửi file ${file}:`, err.message);
        res.status(500).send(`Lỗi khi gửi file ${file}`);
      } else {
        console.log(`File ${file} đã được gửi thành công`);
      }
    });
  });
});

const server = app.listen(port, () => {
  console.log(`Server đang chạy tại http://localhost:${port}/login.html`);
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("Client kết nối đến WebSocket");
  ws.on("close", () => console.log("Client ngắt kết nối WebSocket"));
});

export default app;
