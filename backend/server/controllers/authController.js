const bcrypt = require("bcrypt");
const { db } = require("../config/db");
const { generateRandomPassword } = require("../config/email");

const login = async (req, res) => {
  const { email, password } = req.body;
  console.log("Đăng nhập với:", { email });

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email và mật khẩu không được để trống",
    });
  }

  const query = `
    SELECT u.*, e.*
    FROM Users u
    JOIN Employees e ON u.EmpID = e.EmpID
    WHERE u.Email = ?
  `;

  try {
    db.query(query, [email], async (err, results) => {
      if (err) {
        console.error("Lỗi truy vấn đăng nhập:", err.message);
        return res
          .status(500)
          .json({ success: false, message: "Lỗi server: " + err.message });
      }

      if (results.length === 0) {
        console.log("Không tìm thấy email:", email);
        return res
          .status(401)
          .json({ success: false, message: "Email hoặc mật khẩu không đúng" });
      }

      const user = results[0];
      const isMatch = await bcrypt.compare(password, user.PasswordHash);
      if (!isMatch) {
        return res
          .status(401)
          .json({ success: false, message: "Email hoặc mật khẩu không đúng" });
      }

      req.session.user = {
        UserID: user.UserID,
        EmpID: user.EmpID,
        Email: user.Email,
        FirstName: user.FirstName,
        LastName: user.LastName,
        Role: user.Role,
        Photo: user.Photo,
        Department: user.Department,
        ChucVu: user.ChucVu,
      };

      res.json({
        success: true,
        message: "Đăng nhập thành công",
        user: req.session.user,
      });
    });
  } catch (error) {
    console.error("Lỗi đăng nhập:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server: " + error.message });
  }
};

const resetPasswordRequest = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res
      .status(400)
      .json({ success: false, message: "Email không được để trống" });
  }

  const checkEmailQuery = `
    SELECT u.UserID, u.EmpID, e.FirstName, e.LastName, e.Department
    FROM Users u
    JOIN Employees e ON u.EmpID = e.EmpID
    WHERE u.Email = ?
  `;

  try {
    db.query(checkEmailQuery, [email], (err, results) => {
      if (err) {
        console.error("Lỗi khi kiểm tra email:", err.message);
        return res
          .status(500)
          .json({ success: false, message: "Lỗi server: " + err.message });
      }

      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Email không tồn tại trong hệ thống",
        });
      }

      const user = results[0];
      const empId = user.EmpID;
      const department = user.Department;

      const insertRequestQuery = `
        INSERT INTO Requests (EmpID, RequestType, Content, RequestDate, Status)
        VALUES (?, 'Reset Password', ?, NOW(), 'Chờ duyệt')
      `;
      const content = `Yêu cầu reset mật khẩu cho email: ${email}`;

      db.query(insertRequestQuery, [empId, content], (err, result) => {
        if (err) {
          console.error("Lỗi khi tạo yêu cầu reset:", err.message);
          return res.status(500).json({
            success: false,
            message: "Lỗi server khi tạo yêu cầu: " + err.message,
          });
        }

        const findManagerQuery = `
          SELECT e.EmpID
          FROM Employees e
          JOIN Users u ON e.EmpID = u.EmpID
          WHERE u.Role = 'Manager' AND e.Department = ?
        `;

        db.query(findManagerQuery, [department], (err, managerResults) => {
          if (err) {
            console.error("Lỗi khi tìm quản lý:", err.message);
            return res
              .status(500)
              .json({ success: false, message: "Lỗi server: " + err.message });
          }

          if (managerResults.length === 0) {
            return res.status(404).json({
              success: false,
              message: "Không tìm thấy quản lý cho phòng ban này",
            });
          }

          const managerId = managerResults[0].EmpID;
          const notificationQuery = `
            INSERT INTO Notifications (EmpID, Title, Content, NotificationDate, IsRead, Type, DetailsLink)
            VALUES (?, ?, ?, NOW(), FALSE, 'request', '/submitted-requests')
          `;
          const notificationTitle = "Yêu cầu reset mật khẩu mới";
          const notificationContent = `Nhân viên ${user.FirstName} ${user.LastName} đã gửi yêu cầu reset mật khẩu cho email ${email}.`;

          db.query(
            notificationQuery,
            [managerId, notificationTitle, notificationContent],
            (err) => {
              if (err) {
                console.error("Lỗi khi tạo thông báo:", err.message);
              }

              wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(
                    JSON.stringify({
                      event: "newNotification",
                      requestId: result.insertId,
                    })
                  );
                }
              });

              res.json({
                success: true,
                message: "Yêu cầu reset mật khẩu đã được gửi đến quản lý",
              });
            }
          );
        });
      });
    });
  } catch (error) {
    console.error("Lỗi quên mật khẩu:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server: " + error.message });
  }
};

const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.session.user.UserID;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "Mật khẩu cũ và mật khẩu mới không được để trống",
    });
  }

  const query = "SELECT PasswordHash FROM Users WHERE UserID = ?";

  try {
    db.query(query, [userId], async (err, results) => {
      if (err) {
        console.error("Lỗi truy vấn mật khẩu:", err.message);
        return res
          .status(500)
          .json({ success: false, message: "Lỗi server: " + err.message });
      }

      if (results.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Người dùng không tồn tại" });
      }

      const hashedPassword = results[0].PasswordHash;
      const isMatch = await bcrypt.compare(oldPassword, hashedPassword);

      if (!isMatch) {
        return res
          .status(400)
          .json({ success: false, message: "Mật khẩu cũ không đúng" });
      }

      const newHashedPassword = await bcrypt.hash(newPassword, 10);
      const updateQuery = "UPDATE Users SET PasswordHash = ? WHERE UserID = ?";

      db.query(updateQuery, [newHashedPassword, userId], (err, result) => {
        if (err) {
          console.error("Lỗi cập nhật mật khẩu:", err.message);
          return res
            .status(500)
            .json({ success: false, message: "Lỗi server: " + err.message });
        }

        if (result.affectedRows === 0) {
          return res
            .status(404)
            .json({ success: false, message: "Không thể cập nhật mật khẩu" });
        }

        res.json({ success: true, message: "Đổi mật khẩu thành công" });
      });
    });
  } catch (error) {
    console.error("Lỗi đổi mật khẩu:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server: " + error.message });
  }
};

const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Lỗi đăng xuất:", err.message);
      return res.status(500).json({ message: "Lỗi server" });
    }
    res.clearCookie("connect.sid");
    res.json({ success: true, message: "Đã đăng xuất" });
  });
};

module.exports = { login, resetPasswordRequest, changePassword, logout };
