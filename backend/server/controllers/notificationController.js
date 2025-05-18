export const getNotifications = async (req, res) => {
  if (!req.session.user || !req.session.user.EmpID) {
    console.error("Session error: EmpID is missing in session", req.session);
    return res.status(401).json({
      message: "Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.",
    });
  }

  const empId = req.session.user.EmpID;
  console.log("Fetching notifications for EmpID:", empId);

  const query = `
    SELECT NotificationID AS id, Title AS title, Content AS content, 
           NotificationDate AS date, IsRead AS \`read\`, Type AS type, DetailsLink AS detailsLink
    FROM Notifications
    WHERE EmpID = ?
    ORDER BY NotificationDate DESC
  `;

  try {
    const [results] = await req.db.query(query, [empId]);
    console.log("Notifications fetched:", results);
    res.json(results);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách thông báo:", error.message);
    console.error("Query executed:", query);
    console.error("Parameters:", [empId]);
    return res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

export const markNotificationAsRead = async (req, res) => {
  const notificationId = req.params.id;
  const empId = req.session.user.EmpID;

  const query = `
    UPDATE Notifications
    SET IsRead = TRUE
    WHERE NotificationID = ? AND EmpID = ?
  `;

  try {
    const [result] = await req.db.query(query, [notificationId, empId]);
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy thông báo hoặc bạn không có quyền" });
    }
    res.status(200).json({ message: "Đã đánh dấu thông báo là đã đọc" });
  } catch (error) {
    console.error("Lỗi khi đánh dấu thông báo đã đọc:", error.message);
    return res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};
