import bcrypt from "bcrypt";
import path from "path";
import fs from "fs";
import { generateRandomPassword, setupEmail } from "../config/email.js";
import { convertToCSV } from "../utils/csvUtils.js";

const transporter = setupEmail();

export const exportEmployees = (req, res) => {
  const user = req.session.user;
  let query;
  if (user.Role === "Manager") {
    query = "SELECT * FROM Employees WHERE Department = ?";
    req.db.query(query, [user.Department], (err, results) => {
      if (err) {
        console.error("Lỗi truy vấn danh sách nhân viên:", err.message);
        return res.status(500).json({ message: "Lỗi server: " + err.message });
      }
      const csv = convertToCSV(results);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=employees_data.csv"
      );
      res.status(200).send(csv);
    });
  } else {
    res.status(403).json({ message: "Chỉ quản lý mới có quyền xuất dữ liệu" });
  }
};

export const getUser = (req, res) => {
  const query = `
    SELECT u.UserID, u.EmpID, u.Email, e.FirstName, e.LastName, e.Department, e.ChucVu, u.Role, e.Photo
    FROM Users u
    JOIN Employees e ON u.EmpID = e.EmpID
    WHERE u.UserID = ?
  `;

  req.db.query(query, [req.session.user.UserID], (err, results) => {
    if (err) {
      console.error("Lỗi truy vấn user:", err.message);
      return res.status(500).json({ message: "Lỗi server: " + err.message });
    }
    res.json(results[0] || {});
  });
};

export const uploadFile = (req, res) => {
  if (!req.files || !req.files.file) {
    return res.status(400).json({ message: "Không có file upload" });
  }

  const file = req.files.file;
  const fileName = `file_${req.session.user.EmpID}_${Date.now()}${path.extname(
    file.name
  )}`;
  const uploadPath = path.join(__dirname, "../../uploads", fileName);

  file.mv(uploadPath, (err) => {
    if (err) {
      console.error("Lỗi upload file:", err.message);
      return res.status(500).json({ message: "Lỗi upload file" });
    }

    res.json({
      success: true,
      fileName: fileName,
      message: "Upload file thành công",
    });
  });
};

export const addEmployee = async (req, res) => {
  if (req.session.user.Role !== "Manager") {
    return res
      .status(403)
      .json({ message: "Chỉ trưởng phòng được thêm nhân viên" });
  }

  const {
    lastName,
    firstName,
    email,
    birthdate,
    telephone,
    gender,
    department,
    chucVu,
    luongCoBan,
    address_loc,
  } = req.body;
  const empId = `EMP${Date.now()}`;
  const status = "Hoạt động";
  const chuKiLuong = "Hàng tháng";
  const ngayThamGia = new Date().toISOString().slice(0, 19).replace("T", " ");
  const password = generateRandomPassword();

  // Kiểm tra các trường bắt buộc
  if (!lastName || !firstName || !department || !chucVu) {
    return res.status(400).json({
      message:
        "Thiếu thông tin bắt buộc: lastName, firstName, department, chucVu",
    });
  }

  const capBac = chucVu === "Trưởng phòng" ? "A1" : "B1";
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const checkEmailQuery =
    "SELECT COUNT(*) as count FROM Employees WHERE Email = ?";
  const [emailResult] = await req.db.query(checkEmailQuery, [email]);
  if (emailResult[0].count > 0) {
    return res
      .status(400)
      .json({ message: "Email đã được sử dụng, vui lòng chọn email khác" });
  }

  const insertQuery = `
    INSERT INTO Employees (EmpID, LastName, FirstName, Email, Birthdate, Telephone, Gender, Department, ChucVu, CapBac, Photo, ChuKiLuong, LuongCoBan, NgayThamGia, Status, Address_loc)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const userQuery = `
    INSERT INTO Users (EmpID, Email, PasswordHash, Role, Salt)
    VALUES (?, ?, ?, ?, ?)
  `;

  await req.db.query(insertQuery, [
    empId,
    lastName,
    firstName,
    email || null,
    birthdate || null,
    telephone || null,
    gender || null,
    department,
    chucVu,
    capBac,
    null,
    chuKiLuong,
    luongCoBan || null,
    ngayThamGia,
    status,
    address_loc || null,
  ]);

  await req.db.query(userQuery, [
    empId,
    email,
    hashedPassword,
    "Employee",
    salt,
  ]);

  const mailOptions = {
    from: '"Hỗ trợ Hệ thống Công ty" <hotro22dthe9@gmail.com>',
    to: email,
    subject: "Tài khoản của bạn đã được tạo thành công",
    text: `Kính gửi ${firstName} ${lastName},\n\nTài khoản của bạn đã được tạo thành công với thông tin sau:\nEmail: ${email}\nMật khẩu: ${password}\n\nVui lòng đăng nhập và thay đổi mật khẩu ngay lần đầu tiên để đảm bảo an toàn tài khoản.\n\nTrân trọng,\nHệ thống`,
  };
  try {
    await transporter.sendMail(mailOptions);
    console.log("Email thông báo đã được gửi đến:", email);
  } catch (emailErr) {
    console.error("Lỗi gửi email:", emailErr.message);
  }

  res.json({ success: true, message: "Thêm nhân viên thành công" });
};

export const getEmployees = (req, res) => {
  const empId = req.query.empId;
  const user = req.session.user;

  if (empId) {
    const query = "SELECT * FROM Employees WHERE EmpID = ?";
    req.db.query(query, [empId], (err, results) => {
      if (err) {
        console.error("Lỗi truy vấn nhân viên:", err.message);
        return res.status(500).json({ message: "Lỗi server: " + err.message });
      }
      if (results.length === 0) {
        return res.status(404).json({ message: "Không tìm thấy nhân viên" });
      }
      res.json(results);
    });
    return;
  }

  if (user.Role === "Employee") {
    const query = "SELECT * FROM Employees WHERE EmpID = ?";
    req.db.query(query, [user.EmpID], (err, results) => {
      if (err) {
        console.error("Lỗi truy vấn nhân viên:", err.message);
        return res.status(500).json({ message: "Lỗi server: " + err.message });
      }
      res.json(results);
    });
  } else if (user.Role === "Manager") {
    const query = "SELECT * FROM Employees WHERE Department = ?";
    req.db.query(query, [user.Department], (err, results) => {
      if (err) {
        console.error("Lỗi truy vấn nhân viên:", err.message);
        return res.status(500).json({ message: "Lỗi server: " + err.message });
      }
      res.json(results);
    });
  } else {
    res.status(403).json({ message: "Không có quyền truy cập" });
  }
};

export const getEmployeeById = (req, res) => {
  const empId = req.params.id;
  const user = req.session.user;

  const query = "SELECT * FROM Employees WHERE EmpID = ?";
  req.db.query(query, [empId], async (err, results) => {
    if (err) {
      console.error("Lỗi truy vấn nhân viên:", err.message);
      return res.status(500).json({ message: "Lỗi server: " + err.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy nhân viên" });
    }

    // Kiểm tra quyền truy cập
    const employee = results[0];
    if (user.Role === "Employee" && user.EmpID !== empId) {
      return res.status(403).json({ message: "Không có quyền truy cập" });
    }
    if (user.Role === "Manager" && employee.Department !== user.Department) {
      return res.status(403).json({ message: "Không có quyền truy cập" });
    }

    res.json(employee);
  });
};

export const updateEmployee = (req, res) => {
  if (req.session.user.Role !== "Manager") {
    return res.status(403).json({ message: "Chỉ trưởng phòng được cập nhật" });
  }

  const { FirstName, LastName, Telephone, Address_loc } = req.body;
  const empId = req.params.empId;
  const query = `
    UPDATE Employees 
    SET FirstName = ?, LastName = ?, Telephone = ?, Address_loc = ?
    WHERE EmpID = ? AND Department = ?
  `;

  req.db.query(
    query,
    [
      FirstName,
      LastName,
      Telephone,
      Address_loc,
      empId,
      req.session.user.Department,
    ],
    (err, result) => {
      if (err) {
        console.error("Lỗi cập nhật nhân viên:", err.message);
        return res.status(500).json({ message: "Lỗi server: " + err.message });
      }

      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ message: "Không tìm thấy nhân viên hoặc không có quyền" });
      }

      res.json({ success: true, message: "Cập nhật thành công" });
    }
  );
};

export const deleteEmployee = (req, res) => {
  if (req.session.user.Role !== "Manager") {
    return res
      .status(403)
      .json({ message: "Chỉ trưởng phòng được xóa nhân viên" });
  }

  const empId = req.params.id;
  const user = req.session.user;

  // Kiểm tra xem nhân viên có thuộc phòng ban của người quản lý không
  const checkQuery = "SELECT Department FROM Employees WHERE EmpID = ?";
  req.db.query(checkQuery, [empId], async (err, results) => {
    if (err) {
      console.error("Lỗi kiểm tra nhân viên:", err.message);
      return res.status(500).json({ message: "Lỗi server: " + err.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy nhân viên" });
    }
    if (results[0].Department !== user.Department) {
      return res
        .status(403)
        .json({ message: "Không có quyền xóa nhân viên này" });
    }

    // Xóa nhân viên
    const deleteQuery = "DELETE FROM Employees WHERE EmpID = ?";
    req.db.query(deleteQuery, [empId], (err, result) => {
      if (err) {
        console.error("Lỗi xóa nhân viên:", err.message);
        return res.status(500).json({ message: "Lỗi server: " + err.message });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Không tìm thấy nhân viên" });
      }

      // Xóa tài khoản người dùng liên quan (nếu có)
      const deleteUserQuery = "DELETE FROM Users WHERE EmpID = ?";
      req.db.query(deleteUserQuery, [empId], (err) => {
        if (err) {
          console.error("Lỗi xóa tài khoản người dùng:", err.message);
        }
        res.json({ success: true, message: "Xóa nhân viên thành công" });
      });
    });
  });
};
