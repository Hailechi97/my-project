export const createPost = async (req, res) => {
  const { title, content, imageURL } = req.body;
  const empId = req.session.user.EmpID;

  if (!title || !content) {
    return res.status(400).json({
      success: false,
      message: "Tiêu đề và nội dung không được để trống",
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

    const insertPostQuery = `
      INSERT INTO Posts (Title, Content, ImageURL, PostedDate, EmpID, Views, Likes, Status) 
      VALUES (?, ?, ?, NOW(), ?, 0, 0, 'Công khai')
    `;
    const [result] = await req.db.query(insertPostQuery, [
      title,
      content,
      imageURL,
      empId,
    ]);

    const notificationQuery = `
      INSERT INTO Notifications (EmpID, Title, Content, NotificationDate, IsRead, Type, DetailsLink)
      VALUES (?, ?, ?, NOW(), FALSE, 'post', '/forum')
    `;
    const notificationTitle = "Bài viết mới từ nhân viên";
    const notificationContent = `Nhân viên ${employee.FirstName} ${
      employee.LastName
    } đã đăng bài viết "${title}" vào lúc ${new Date().toLocaleString(
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
            postId: result.insertId,
          })
        );
      }
    });

    const getQuery = `
      SELECT p.*, e.FirstName, e.LastName, e.Photo, e.Department, e.ChucVu, 0 as commentCount
      FROM Posts p
      JOIN Employees e ON p.EmpID = e.EmpID
      WHERE p.PostID = ?
    `;
    const [newPost] = await req.db.query(getQuery, [result.insertId]);
    res.json({
      success: true,
      post: newPost[0],
      message: "Đã thêm bài viết",
    });
  } catch (error) {
    console.error("Lỗi khi tạo bài viết:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi server: " + error.message });
  }
};

export const getPosts = async (req, res) => {
  const { page = 1, limit = 5, search = "" } = req.query;
  const offset = (page - 1) * limit;

  try {
    const countQuery = `
      SELECT COUNT(*) as total
      FROM Posts
      WHERE Title LIKE ? OR Content LIKE ?
    `;
    const [countResults] = await req.db.query(countQuery, [
      `%${search}%`,
      `%${search}%`,
    ]);
    const totalPosts = countResults[0].total;

    const query = `
      SELECT p.*, e.FirstName, e.LastName, e.Photo, e.Department, e.ChucVu,
             (SELECT COUNT(*) FROM Comments c WHERE c.PostID = p.PostID) as commentCount,
             EXISTS (
               SELECT 1 FROM Likes l 
               WHERE l.PostID = p.PostID AND l.EmpID = ?
             ) as userLikeStatus
      FROM Posts p
      JOIN Employees e ON p.EmpID = e.EmpID
      WHERE p.Title LIKE ? OR p.Content LIKE ?
      ORDER BY p.PostedDate DESC
      LIMIT ? OFFSET ?
    `;
    const params = [
      req.session.user.EmpID,
      `%${search}%`,
      `%${search}%`,
      parseInt(limit),
      parseInt(offset),
    ];
    const [results] = await req.db.query(query, params);

    res.json({
      success: true,
      total: totalPosts,
      posts: results,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách bài viết:", error.message);
    return res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};
