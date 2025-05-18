export const getSchedule = async (req, res) => {
  const { department, startDate, endDate } = req.query;

  if (!department) {
    return res.status(400).json({ message: "Phòng ban là bắt buộc" });
  }

  let query = `
    SELECT ScheduleID, Title, Day, MeetingTime, Content, Room, Department, CreatedBy, CreatedAt
    FROM Schedules
    WHERE Department = ?
  `;
  let queryParams = [department];

  if (startDate && endDate) {
    query += ` AND MeetingTime BETWEEN ? AND ?`;
    queryParams.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
  }

  query += ` ORDER BY MeetingTime`;

  try {
    const [results] = await req.db.query(query, queryParams);
    res.json(results);
  } catch (error) {
    console.error("Lỗi khi lấy lịch họp:", error.message);
    return res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

export const createSchedule = async (req, res) => {
  const user = req.session.user;

  if (user.Role !== "Manager") {
    return res
      .status(403)
      .json({ message: "Chỉ trưởng phòng được tạo lịch họp" });
  }

  const { title, day, meetingTime, content, room, department } = req.body;

  if (!title || !day || !meetingTime || !content || !room || !department) {
    return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin" });
  }

  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(meetingTime)) {
    return res
      .status(400)
      .json({ message: "Định dạng thời gian không hợp lệ" });
  }

  if (user.Department !== department) {
    return res
      .status(403)
      .json({ message: "Không có quyền tạo lịch họp cho phòng ban này" });
  }

  const formattedMeetingTime = meetingTime.replace("T", " ") + ":00";
  const query = `
    INSERT INTO Schedules (Title, Day, MeetingTime, Content, Room, Department, CreatedBy, CreatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
  `;

  try {
    const [result] = await req.db.query(query, [
      title,
      day,
      formattedMeetingTime,
      content,
      room,
      department,
      user.EmpID,
    ]);
    res.json({
      success: true,
      message: "Tạo lịch họp thành công",
      scheduleId: result.insertId,
    });
  } catch (error) {
    console.error("Lỗi khi tạo lịch họp:", error.message);
    return res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

export const deleteSchedule = async (req, res) => {
  const user = req.session.user;
  const scheduleId = req.params.id;

  if (user.Role !== "Manager") {
    return res
      .status(403)
      .json({ message: "Chỉ trưởng phòng được xóa lịch họp" });
  }

  const query = `
    DELETE FROM Schedules
    WHERE ScheduleID = ? AND Department = ?
  `;

  try {
    const [result] = await req.db.query(query, [scheduleId, user.Department]);
    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Lịch họp không tồn tại hoặc bạn không có quyền xóa",
      });
    }
    res.json({ success: true, message: "Xóa lịch họp thành công" });
  } catch (error) {
    console.error("Lỗi khi xóa lịch họp:", error.message);
    return res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

export const updateSchedule = async (req, res) => {
  const user = req.session.user;
  const scheduleId = req.params.id;
  const { title, day, meetingTime, content, room, department } = req.body;

  if (user.Role !== "Manager") {
    return res
      .status(403)
      .json({ message: "Chỉ trưởng phòng được chỉnh sửa lịch họp" });
  }

  if (!title || !day || !meetingTime || !content || !room || !department) {
    return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin" });
  }

  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(meetingTime)) {
    return res
      .status(400)
      .json({ message: "Định dạng thời gian không hợp lệ" });
  }

  if (user.Department !== department) {
    return res
      .status(403)
      .json({ message: "Không có quyền chỉnh sửa lịch họp cho phòng ban này" });
  }

  const formattedMeetingTime = meetingTime.replace("T", " ") + ":00";
  const query = `
    UPDATE Schedules
    SET Title = ?, Day = ?, MeetingTime = ?, Content = ?, Room = ?, Department = ?
    WHERE ScheduleID = ? AND Department = ?
  `;

  try {
    const [result] = await req.db.query(query, [
      title,
      day,
      formattedMeetingTime,
      content,
      room,
      department,
      scheduleId,
      user.Department,
    ]);
    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Lịch họp không tồn tại hoặc bạn không có quyền chỉnh sửa",
      });
    }
    res.json({ success: true, message: "Chỉnh sửa lịch họp thành công" });
  } catch (error) {
    console.error("Lỗi khi chỉnh sửa lịch họp:", error.message);
    return res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};
