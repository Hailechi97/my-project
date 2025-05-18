import scheduleService from "../services/schedule-service.js";
import notificationService from "../services/notification-service.js";

document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.getElementById("sidebar");
  const toggleBtn = document.getElementById("toggleBtn");
  const content = document.getElementById("content");
  const userInfo = document.getElementById("userInfo");
  const dropdownMenu = document.getElementById("dropdownMenu");
  const notificationBell = document.getElementById("notificationBell");
  const notificationCount = document.getElementById("notificationCount");
  const notificationDropdown = document.getElementById("notificationDropdown");
  let currentUser = null;
  let isManager = false;
  let userDepartment = "";
  let currentWeekStart = new Date();
  currentWeekStart.setHours(0, 0, 0, 0);
  currentWeekStart.setDate(
    currentWeekStart.getDate() - currentWeekStart.getDay() + 1
  );
  let selectedSchedule = null;
  let ws = null;

  // Toggle Sidebar
  toggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
    document.body.classList.toggle("sidebar-collapsed");
    content.classList.toggle("sidebar-collapsed");
  });

  // Toggle User Dropdown
  userInfo.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle("show");
  });

  // Toggle Notification Dropdown
  notificationBell.addEventListener("click", (e) => {
    e.stopPropagation();
    notificationDropdown.classList.toggle("show");
    fetchNotifications();
  });

  notificationCount.addEventListener("click", (e) => {
    e.stopPropagation();
    notificationDropdown.classList.toggle("show");
    fetchNotifications();
  });

  // Close Dropdowns on Outside Click
  document.addEventListener("click", (e) => {
    if (!userInfo.contains(e.target)) {
      dropdownMenu.classList.remove("show");
    }
    if (
      !notificationBell.contains(e.target) &&
      !notificationDropdown.contains(e.target) &&
      !notificationCount.contains(e.target)
    ) {
      notificationDropdown.classList.remove("show");
    }
  });

  // Handle Logout
  document.getElementById("logoutBtn").addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
      if (response.ok) {
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Lỗi đăng xuất:", error);
      alert("Lỗi khi đăng xuất: " + error.message);
    }
  });

  // Initialize WebSocket
  function initWebSocket() {
    ws = new WebSocket("ws://localhost:8080");
    ws.onopen = () => {
      console.log("Connected to WebSocket server");
    };
    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      if (data.event === "newNotification" || data.event === "updateSchedule") {
        fetchNotifications();
        loadSchedule();
      }
    };
    ws.onclose = () => {
      console.log("Disconnected from WebSocket server. Reconnecting...");
      setTimeout(initWebSocket, 5000);
    };
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }

  // Fetch Notifications
  async function fetchNotifications() {
    try {
      const notifications = await notificationService.getNotifications();
      renderNotifications(notifications);
    } catch (error) {
      console.error("Lỗi:", error);
      const notificationList = document.getElementById("notificationList");
      notificationList.innerHTML =
        '<div style="padding: 10px; text-align: center;">Lỗi khi tải thông báo</div>';
      notificationDropdown.classList.add("show");
    }
  }

  // Render Notifications
  function renderNotifications(notifications) {
    const notificationList = document.getElementById("notificationList");
    const notificationCount = document.getElementById("notificationCount");
    const unreadCount = notifications.filter((n) => !n.read).length;

    if (unreadCount > 0) {
      notificationCount.textContent = unreadCount;
      notificationCount.style.display = "inline-block";
    } else {
      notificationCount.style.display = "none";
    }

    if (notifications.length === 0) {
      notificationList.innerHTML =
        '<div style="padding: 10px; text-align: center;">Không có thông báo</div>';
      return;
    }

    notificationList.innerHTML = notifications
      .map(
        (notification) => `
          <div class="dropdown-item notification-item ${
            notification.read ? "" : "unread"
          }" data-id="${notification.id}">
            <div style="display: flex; align-items: center; gap: 10px;">
              <i class="fas ${
                notification.type === "request"
                  ? "fa-file-alt"
                  : notification.type === "schedule"
                  ? "fa-calendar-alt"
                  : "fa-bell"
              }"></i>
              <div style="flex: 1;">
                <strong>${notification.title}</strong>
                <div style="font-size: 0.85rem; color: #6c757d;">${
                  notification.content
                }</div>
                <div style="font-size: 0.8rem; color: #6c757d;">${new Date(
                  notification.date
                ).toLocaleString("vi-VN")}</div>
              </div>
            </div>
          </div>
        `
      )
      .join("");

    document.querySelectorAll(".notification-item").forEach((item) => {
      item.addEventListener("click", async (e) => {
        const notificationId = item.dataset.id;
        const notification = notifications.find((n) => n.id == notificationId);

        if (!notification.read) {
          try {
            await notificationService.markAsRead(notificationId);
            fetchNotifications();
          } catch (error) {
            console.error("Lỗi:", error);
          }
        }

        if (notification.detailsLink) {
          window.location.href = notification.detailsLink;
        }
      });
    });
  }

  // Load User Info and Initialize Page
  async function initializePage() {
    try {
      const response = await fetch("/api/user", { credentials: "include" });
      if (!response.ok) {
        throw new Error("Không thể lấy thông tin user");
      }
      currentUser = await response.json();
      isManager = currentUser.Role === "Manager";
      userDepartment = currentUser.Department;

      document.getElementById(
        "userName"
      ).textContent = `${currentUser.FirstName} ${currentUser.LastName}`;
      document.getElementById("userAvatarImg").src = currentUser.Photo
        ? `/Uploads/${currentUser.Photo}`
        : "/Uploads/default-avatar.png";

      if (isManager) {
        document.getElementById("newMeetingForm").style.display = "block";
        document.getElementById("deleteRequestsMenu").style.display = "block";
      }

      initWebSocket();
      fetchNotifications();
      loadSchedule();
    } catch (error) {
      console.error("Lỗi lấy thông tin user:", error);
      window.location.href = "/";
    }
  }

  // Format Date
  function formatDate(date) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // Update Week Title
  function updateWeekTitle() {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    document.getElementById("weekTitle").textContent = `Tuần ${formatDate(
      currentWeekStart
    )} - ${formatDate(weekEnd)}`;
  }

  // Load Schedule
  async function loadSchedule() {
    try {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const startDate = currentWeekStart.toISOString().slice(0, 10);
      const endDate = weekEnd.toISOString().slice(0, 10);
      const schedules = await scheduleService.getSchedules(
        userDepartment,
        startDate,
        endDate
      );
      renderSchedule(schedules);
      updateWeekTitle();
    } catch (error) {
      console.error("Lỗi tải lịch họp:", error);
      alert("Lỗi khi tải lịch họp: " + error.message);
    }
  }

  // Render Schedule
  function renderSchedule(schedules) {
    const tbody = document.querySelector("#scheduleTable tbody");
    tbody.innerHTML = "";

    const row = document.createElement("tr");
    const days = Array(7)
      .fill()
      .map(() => []);

    schedules.forEach((schedule) => {
      const meetingDate = new Date(schedule.MeetingTime);
      const dayOfWeek = meetingDate.getDay();
      const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      days[dayIndex].push(schedule);
    });

    for (let i = 0; i < 7; i++) {
      const cell = document.createElement("td");
      const meetings = days[i];

      if (meetings.length > 0) {
        meetings.forEach((meeting) => {
          const meetingTime = new Date(meeting.MeetingTime).toLocaleString(
            "vi-VN"
          );
          const createdAt = new Date(meeting.CreatedAt).toLocaleString("vi-VN");

          const meetingDiv = document.createElement("div");
          meetingDiv.className = "meeting";
          meetingDiv.dataset.scheduleId = meeting.ScheduleID;
          meetingDiv.innerHTML = `
            <p class="title">${meeting.Title}</p>
            <p>${meeting.Content}</p>
            <p>Room: ${meeting.Room}</p>
            <p>Thời gian: ${meetingTime}</p>
            <div class="meeting-tooltip">
              <p><strong>Tiêu đề:</strong> ${meeting.Title}</p>
              <p><strong>Nội dung:</strong> ${meeting.Content}</p>
              <p><strong>Phòng họp:</strong> ${meeting.Room}</p>
              <p><strong>Thời gian:</strong> ${meetingTime}</p>
              <p><strong>Phòng ban:</strong> ${meeting.Department}</p>
              <p><strong>Người tạo:</strong> ${meeting.CreatedBy}</p>
              <p><strong>Ngày tạo:</strong> ${createdAt}</p>
            </div>
          `;
          if (isManager) {
            meetingDiv.addEventListener("contextmenu", (e) => {
              e.preventDefault();
              showContextMenu(e, meeting);
            });
          }
          cell.appendChild(meetingDiv);
        });
      }
      row.appendChild(cell);
    }
    tbody.appendChild(row);
  }

  // Show Context Menu
  function showContextMenu(e, schedule) {
    selectedSchedule = schedule;
    const contextMenu = document.getElementById("contextMenu");
    contextMenu.style.top = `${e.pageY}px`;
    contextMenu.style.left = `${e.pageX}px`;
    contextMenu.style.display = "block";

    document.addEventListener("click", hideContextMenu);
  }

  function hideContextMenu() {
    document.getElementById("contextMenu").style.display = "none";
    document.removeEventListener("click", hideContextMenu);
  }

  // Create Meeting
  document
    .getElementById("createMeetingForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const title = document.getElementById("meetingTitle").value.trim();
      const day = document.getElementById("meetingDay").value;
      const meetingTime = document.getElementById("meetingTime").value;
      const content = document.getElementById("meetingContent").value.trim();
      const room = document.getElementById("meetingRoom").value.trim();
      const submitBtn = e.target.querySelector('button[type="submit"]');

      if (!title || !meetingTime || !content || !room) {
        alert("Vui lòng nhập đầy đủ thông tin!");
        return;
      }

      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(meetingTime)) {
        alert("Thời gian họp không hợp lệ! Vui lòng chọn ngày và giờ hợp lệ.");
        return;
      }

      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Đang tạo...';
      submitBtn.disabled = true;

      try {
        await scheduleService.createSchedule({
          title,
          day,
          meetingTime,
          content,
          room,
          department: userDepartment,
        });
        document.getElementById("createMeetingForm").reset();
        loadSchedule();
        alert("Tạo lịch họp thành công!");
      } catch (error) {
        console.error("Lỗi:", error);
        alert("Lỗi khi tạo lịch họp: " + error.message);
      } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
    });

  // Edit Meeting
  document.getElementById("editMeeting").addEventListener("click", () => {
    const modal = document.getElementById("editMeetingModal");
    document.getElementById("editMeetingTitle").value = selectedSchedule.Title;
    document.getElementById("editMeetingDay").value = selectedSchedule.Day;
    document.getElementById("editMeetingTime").value = new Date(
      selectedSchedule.MeetingTime
    )
      .toISOString()
      .slice(0, 16);
    document.getElementById("editMeetingContent").value =
      selectedSchedule.Content;
    document.getElementById("editMeetingRoom").value = selectedSchedule.Room;
    modal.style.display = "flex";
  });

  document
    .getElementById("editMeetingForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const title = document.getElementById("editMeetingTitle").value.trim();
      const day = document.getElementById("editMeetingDay").value;
      const meetingTime = document.getElementById("editMeetingTime").value;
      const content = document
        .getElementById("editMeetingContent")
        .value.trim();
      const room = document.getElementById("editMeetingRoom").value.trim();

      if (!title || !meetingTime || !content || !room) {
        alert("Vui lòng nhập đầy đủ thông tin!");
        return;
      }

      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(meetingTime)) {
        alert("Thời gian họp không hợp lệ!");
        return;
      }

      try {
        await scheduleService.updateSchedule(selectedSchedule.ScheduleID, {
          title,
          day,
          meetingTime,
          content,
          room,
          department: selectedSchedule.Department,
        });
        document.getElementById("editMeetingModal").style.display = "none";
        loadSchedule();
        alert("Chỉnh sửa lịch họp thành công!");
      } catch (error) {
        console.error("Lỗi khi chỉnh sửa lịch họp:", error);
        alert("Lỗi khi chỉnh sửa lịch họp: " + error.message);
      }
    });

  // Cancel Edit
  document.getElementById("cancelEdit").addEventListener("click", () => {
    document.getElementById("editMeetingModal").style.display = "none";
  });

  // Delete Meeting
  document
    .getElementById("deleteMeeting")
    .addEventListener("click", async () => {
      if (confirm("Bạn có chắc chắn muốn xóa lịch họp này?")) {
        try {
          await scheduleService.deleteSchedule(selectedSchedule.ScheduleID);
          loadSchedule();
          alert("Xóa lịch họp thành công!");
        } catch (error) {
          console.error("Lỗi khi xóa lịch họp:", error);
          alert("Lỗi khi xóa lịch họp: " + error.message);
        }
      }
    });

  // Week Navigation
  document.getElementById("prevWeekBtn").addEventListener("click", () => {
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    loadSchedule();
  });

  document.getElementById("nextWeekBtn").addEventListener("click", () => {
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    loadSchedule();
  });

  // Initialize Page
  initializePage();
});
