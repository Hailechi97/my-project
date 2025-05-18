import express from "express";
const router = express.Router();
import { isAuthenticated } from "../middleware/auth.js";

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const [users] = await req.db.query("SELECT * FROM Users WHERE Email = ?", [
      email,
    ]);
    if (!users.length) {
      return res
        .status(401)
        .json({ message: "Email hoặc mật khẩu không đúng" });
    }
    const user = users[0];
    const bcrypt = await import("bcrypt");
    const match = await bcrypt.compare(password, user.PasswordHash);
    if (!match) {
      return res
        .status(401)
        .json({ message: "Email hoặc mật khẩu không đúng" });
    }
    req.session.user = {
      UserID: user.UserID,
      EmpID: user.EmpID,
      Email: user.Email,
      Role: user.Role,
    };
    console.log("Đăng nhập thành công, session.user:", req.session.user);
    res.json({ message: "Đăng nhập thành công", user: req.session.user });
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Lỗi đăng xuất" });
    }
    res.json({ message: "Đăng xuất thành công" });
  });
});

// Áp dụng isAuthenticated cho các route cần xác thực (nếu có)
// router.use(isAuthenticated); // Chỉ áp dụng cho các route bảo vệ, ví dụ: /forum

export default router;
