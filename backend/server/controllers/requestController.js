import bcrypt from "bcrypt";
import { generateRandomPassword } from "../config/email.js";

export const createRequest = async (req, res) => {
  const { requestType, content, fileURL } = req.body;
  const empId = req.session.user?.EmpID;

  if (!empId) {
    console.error("Invalid session: EmpID is missing");
    return res.status(401).json({
      success: false,
      message: "Không xác thực được người dùng. Vui lòng đăng nhập lại.",
    });
  }

  if (!requestType || !content) {
    return res.status(400).json({
      success: false,
      message: "Loại yêu cầu và nội dung không được để trống",
    });
  }

  const validRequestTypes = [
    "Nghỉ phép",
    "Công tác",
    "Hỗ trợ",
    "Tăng lương",
    "Reset Password",
  ];
  if (!validRequestTypes.includes(requestType)) {
    return res.status(400).json({
      success: false,
      message: `Loại yêu cầu không hợp lệ. Phải là một trong: ${validRequestTypes.join(
        ", "
      )}`,
    });
  }

  if (fileURL && typeof fileURL !== "string") {
    return res.status(400).json({
      success: false,
      message: "FileURL phải là một chuỗi hợp lệ",
    });
  }

  const getDepartmentQuery = `
    SELECT Department FROM Employees WHERE EmpID = ?
  `;
  try {
    const [results] = await req.db.query(getDepartmentQuery, [empId]);
    if (results.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy nhân viên." });
    }

    const department = results[0].Department;

    const findManagerQuery = `
      SELECT ManagerID FROM Departments WHERE DeptName = ?
    `;
    const [managerResults] = await req.db.query(findManagerQuery, [department]);
    if (managerResults.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy quản lý cho phòng ban này.",
      });
    }

    const managerId = managerResults[0].ManagerID;

    const getEmployeeInfoQuery = `
      SELECT FirstName, LastName FROM Employees WHERE EmpID = ?
    `;
    const [empInfoResults] = await req.db.query(getEmployeeInfoQuery, [empId]);
    const employee = empInfoResults[0];

    const insertRequestQuery = `
      INSERT INTO Requests (EmpID, RequestType, Content, AttachedFile, RequestDate, Status)
      VALUES (?, ?, ?, ?, NOW(), 'Chờ duyệt')
    `;
    const [result] = await req.db.query(insertRequestQuery, [
      empId,
      requestType,
      content,
      fileURL || null,
    ]);

    const notificationQuery = `
      INSERT INTO Notifications (EmpID, Title, Content, NotificationDate, IsRead, Type, DetailsLink)
      VALUES (?, ?, ?, NOW(), FALSE, 'request', '/submitted-requests')
    `;
    const notificationTitle = "Yêu cầu mới từ nhân viên";
    const notificationContent = `Nhân viên ${employee.FirstName} ${
      employee.LastName
    } đã gửi yêu cầu ${requestType.toLowerCase()} vào lúc ${new Date().toLocaleString(
      "vi-VN"
    )}.`;

    await req.db.query(notificationQuery, [
      managerId,
      notificationTitle,
      notificationContent,
    ]);

    req.wss.clients.forEach((client) => {
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
      message: "Đã gửi yêu cầu thành công",
      requestId: result.insertId,
    });
  } catch (error) {
    console.error("Lỗi khi gửi yêu cầu:", error.message);
    return res.status(500).json({
      success: false,
      message: "Lỗi server: " + error.message,
    });
  }
};

export const getRequests = async (req, res) => {
  const user = req.session.user;
  let query, params;

  if (user.Role === "Manager") {
    query = `
      SELECT r.*, e.FirstName, e.LastName, e.Department, e.ChucVu, e.Photo, e.EmpID, e.Email
      FROM Requests r
      JOIN Employees e ON r.EmpID = e.EmpID
      ORDER BY r.RequestDate DESC
    `;
    params = [];
  } else {
    query = `
      SELECT r.*, e.FirstName, e.LastName, e.Department, e.ChucVu, e.Photo, e.EmpID, e.Email
      FROM Requests r
      JOIN Employees e ON r.EmpID = e.EmpID
      WHERE r.EmpID = ?
      ORDER BY r.RequestDate DESC
    `;
    params = [user.EmpID];
  }

  try {
    const [results] = await req.db.query(query, params);
    res.json(results);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách yêu cầu:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi server: " + error.message });
  }
};

export const getPendingRequests = async (req, res) => {
  const user = req.session.user;
  let query, params;

  if (user.Role === "Manager") {
    query = `
      SELECT r.*, e.FirstName, e.LastName, e.Department, e.ChucVu, e.Photo, e.EmpID, e.Email
      FROM Requests r
      JOIN Employees e ON r.EmpID = e.EmpID
      WHERE r.Status = 'Chờ duyệt'
      ORDER BY r.RequestDate DESC
    `;
    params = [];
  } else {
    query = `
      SELECT r.*, e.FirstName, e.LastName, e.Department, e.ChucVu, e.Photo, e.EmpID, e.Email
      FROM Requests r
      JOIN Employees e ON r.EmpID = e.EmpID
      WHERE r.EmpID = ? AND r.Status = 'Chờ duyệt'
      ORDER BY r.RequestDate DESC
    `;
    params = [user.EmpID];
  }

  try {
    const [results] = await req.db.query(query, params);
    res.json({ requests: results });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách yêu cầu đang chờ:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi server: " + error.message });
  }
};

export const getRequestDetails = async (req, res) => {
  const requestId = req.params.id;
  const user = req.session.user;
  let query, params;

  if (user.Role === "Manager") {
    query = `
      SELECT r.*, e.FirstName, e.LastName, e.Department, e.ChucVu, e.Photo, e.EmpID, e.Email
      FROM Requests r
      JOIN Employees e ON r.EmpID = e.EmpID
      WHERE r.RequestID = ?
    `;
    params = [requestId];
  } else {
    query = `
      SELECT r.*, e.FirstName, e.LastName, e.Department, e.ChucVu, e.Photo, e.EmpID, e.Email
      FROM Requests r
      JOIN Employees e ON r.EmpID = e.EmpID
      WHERE r.RequestID = ? AND r.EmpID = ?
    `;
    params = [requestId, user.EmpID];
  }

  try {
    const [results] = await req.db.query(query, params);
    if (results.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy yêu cầu" });
    }
    res.json(results[0]);
  } catch (error) {
    console.error("Lỗi khi lấy chi tiết yêu cầu:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi server: " + error.message });
  }
};

export const updateRequestStatus = async (req, res) => {
  if (req.session.user.Role !== "Manager") {
    return res.status(403).json({
      success: false,
      message: "Chỉ quản lý mới có quyền duyệt yêu cầu",
    });
  }

  const requestId = req.params.id;
  const { status, rejectionReason } = req.body;
  const managerId = req.session.user.EmpID;

  if (!["Đã duyệt", "Từ chối"].includes(status)) {
    return res
      .status(400)
      .json({ success: false, message: "Trạng thái không hợp lệ" });
  }

  const checkRequestQuery = `
    SELECT r.*, e.Email, e.EmpID, e.FirstName, e.LastName
    FROM Requests r
    JOIN Employees e ON r.EmpID = e.EmpID
    WHERE r.RequestID = ?
  `;

  try {
    const [results] = await req.db.query(checkRequestQuery, [requestId]);
    if (results.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy yêu cầu" });
    }

    const request = results[0];
    const updateQuery = `
      UPDATE Requests
      SET Status = ?, ApprovedBy = ?, ApprovedDate = NOW(), RejectionReason = ?
      WHERE RequestID = ?
    `;

    await req.db.query(updateQuery, [
      status,
      managerId,
      status === "Từ chối" ? rejectionReason : null,
      requestId,
    ]);

    if (status === "Đã duyệt" && request.RequestType === "Reset Password") {
      const newPassword = generateRandomPassword();
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const updatePasswordQuery = `UPDATE Users SET PasswordHash = ? WHERE EmpID = ?`;

      await req.db.query(updatePasswordQuery, [hashedPassword, request.EmpID]);

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(request.Email)) {
        return res.status(400).json({
          success: false,
          message: "Email của nhân viên không hợp lệ",
        });
      }

      const mailOptions = {
        from: `"Hỗ trợ Hệ thống Công ty" <hotro22dthe9@gmail.com>`,
        to: request.Email,
        subject: "Mật khẩu mới cho tài khoản của bạn",
        text: `Kính gửi ${request.FirstName} ${request.LastName},\n\nYêu cầu reset mật khẩu của bạn đã được duyệt. Mật khẩu mới của bạn là: ${newPassword}\nVui lòng đăng nhập và đổi mật khẩu ngay sau khi nhận được email này.\n\nTrân trọng,\nHệ thống`,
      };

      await req.transporter.sendMail(mailOptions);
      console.log("Email chứa mật khẩu mới đã được gửi tới:", request.Email);
    }

    const notificationQuery = `
      INSERT INTO Notifications (EmpID, Title, Content, NotificationDate, IsRead, Type, DetailsLink)
      VALUES (?, ?, ?, NOW(), FALSE, 'request', '/submitted-requests')
    `;
    const notificationTitle = `Trạng thái đơn ${request.RequestType.toLowerCase()}`;
    const notificationContent = `Đơn ${request.RequestType.toLowerCase()} của bạn từ ngày ${new Date(
      request.RequestDate
    ).toLocaleDateString("vi-VN")} đã được ${
      status === "Đã duyệt" ? "duyệt" : "từ chối"
    } bởi trưởng phòng${
      status === "Từ chối" && rejectionReason
        ? `. Lý do từ chối: ${rejectionReason}`
        : ""
    }.`;

    await req.db.query(notificationQuery, [
      request.EmpID,
      notificationTitle,
      notificationContent,
    ]);

    req.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ event: "newNotification", requestId }));
      }
    });

    res.json({
      success: true,
      message: `Yêu cầu đã được ${status.toLowerCase()}`,
    });
  } catch (error) {
    console.error("Lỗi duyệt/từ chối yêu cầu:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server: " + error.message });
  }
};
