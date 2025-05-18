document.addEventListener("DOMContentLoaded", async () => {
  const sidebar = document.getElementById("sidebar");
  const toggleBtn = document.getElementById("toggleBtn");
  const userInfo = document.getElementById("userInfo");
  const dropdownMenu = document.getElementById("dropdownMenu");
  const notificationList = document.getElementById("notificationList");
  let currentUser = null;

  // Toggle Sidebar
  toggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
    document.body.classList.toggle("sidebar-collapsed");
  });

  // Toggle User Dropdown
  userInfo.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle("show");
  });

  // Close Dropdown on Outside Click
  document.addEventListener("click", () => {
    dropdownMenu.classList.remove("show");
  });

  // Handle Logout
  document.getElementById("logoutBtn").addEventListener("click", async () => {
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
      if (response.ok) {
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Lỗi:", error);
      alert("Lỗi khi đăng xuất: " + error.message);
    }
  });

  // Load User Info
  try {
    const response = await fetch("/api/user", { credentials: "include" });
    if (!response.ok) {
      window.location.href = "/";
      return;
    }
    currentUser = await response.json();
    updateUserInfo(currentUser);

    // Check if user is Manager
    if (currentUser.Role === "Manager") {
      document.getElementById("deleteRequestsMenu").style.display = "block";
    }

    // Load Notifications
    loadNotifications();
  } catch (error) {
    console.error("Lỗi:", error);
    window.location.href = "/";
  }

  // Update User Info on Navbar
  function updateUserInfo(user) {
    const avatarImg = document.getElementById("userAvatarImg");
    const userName = document.getElementById("userName");
    userName.textContent = `${user.FirstName} ${user.LastName}`;

    if (user.Photo) {
      avatarImg.src = `/uploads/${user.Photo}`;
    } else {
      const avatarDiv = document.getElementById("userAvatar");
      avatarDiv.innerHTML = user.FirstName.charAt(0) + user.LastName.charAt(0);
      avatarDiv.style.display = "flex";
      avatarDiv.style.alignItems = "center";
      avatarDiv.style.justifyContent = "center";
      avatarDiv.style.backgroundColor = "#4e73df";
      avatarDiv.style.color = "white";
      avatarDiv.style.fontWeight = "bold";
    }
  }

  // Load Notifications
  async function loadNotifications() {
    try {
      if (!notificationList) {
        throw new Error("Không tìm thấy phần tử #notificationList trong HTML");
      }

      notificationList.innerHTML = `
        <div class="loading">
          <i class="fas fa-spinner fa-spin"></i> Đang tải danh sách thông báo...
        </div>
      `;

      const response = await fetch("/api/notifications", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(
          `Lỗi từ server: ${response.status} ${response.statusText}`
        );
      }

      const notifications = await response.json();
      if (!Array.isArray(notifications)) {
        throw new Error("Dữ liệu thông báo không hợp lệ");
      }

      if (notifications.length === 0) {
        notificationList.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-inbox"></i>
            <p>Không có thông báo nào.</p>
          </div>
        `;
        return;
      }

      renderNotifications(notifications, notificationList);
    } catch (error) {
      console.error("Lỗi khi tải danh sách thông báo:", error);
      if (notificationList) {
        notificationList.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Có lỗi xảy ra khi tải danh sách thông báo.</p>
          </div>
        `;
      } else {
        alert("Lỗi: Không tìm thấy phần tử #notificationList trong HTML");
      }
    }
  }

  // Render Notifications
  function renderNotifications(notifications, container) {
    const fragment = document.createDocumentFragment();
    notifications.forEach((notification) => {
      const notificationElement = createNotificationElement(notification);
      fragment.appendChild(notificationElement);
    });
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(fragment);
  }

  // Create Notification Element
  function createNotificationElement(notification) {
    const notificationElement = document.createElement("div");
    notificationElement.className = `notification-item ${
      notification.read ? "" : "unread"
    }`;
    notificationElement.dataset.notificationId = notification.id;

    const notificationDate = new Date(notification.date).toLocaleString(
      "vi-VN"
    );

    notificationElement.innerHTML = `
      <div class="notification-header">
        <h3 class="notification-title">${notification.title}</h3>
        <div class="notification-meta">
          <span><i class="far fa-calendar-alt"></i> ${notificationDate}</span>
          <span><i class="fas fa-bell"></i> ${
            notification.read ? "Đã đọc" : "Chưa đọc"
          }</span>
        </div>
      </div>
      <div class="notification-content">
        <p>${notification.content}</p>
      </div>
      <div class="notification-actions">
        ${
          notification.read
            ? ""
            : `<button class="mark-read-btn" data-id="${notification.id}">
                <i class="fas fa-check"></i> Đánh dấu đã đọc
              </button>`
        }
        ${
          notification.detailsLink
            ? `<button class="view-details-btn" data-link="${notification.detailsLink}">
                <i class="fas fa-eye"></i> Xem chi tiết
              </button>`
            : ""
        }
      </div>
    `;

    // Add event listeners for buttons
    const markReadBtn = notificationElement.querySelector(".mark-read-btn");
    if (markReadBtn) {
      markReadBtn.addEventListener("click", () => markAsRead(notification.id));
    }

    const viewDetailsBtn =
      notificationElement.querySelector(".view-details-btn");
    if (viewDetailsBtn) {
      viewDetailsBtn.addEventListener("click", () =>
        viewDetails(notification.detailsLink)
      );
    }

    return notificationElement;
  }

  // Mark Notification as Read
  async function markAsRead(notificationId) {
    try {
      const response = await fetch(
        `/api/notifications/${notificationId}/read`,
        {
          method: "PUT",
          credentials: "include",
        }
      );
      if (!response.ok) {
        throw new Error(
          `Lỗi từ server: ${response.status} ${response.statusText}`
        );
      }

      const notificationElement = document.querySelector(
        `.notification-item[data-notification-id="${notificationId}"]`
      );
      if (notificationElement) {
        notificationElement.classList.remove("unread");
        const meta = notificationElement.querySelector(
          ".notification-meta span:last-child"
        );
        meta.innerHTML = `<i class="fas fa-bell"></i> Đã đọc`;
        const actions = notificationElement.querySelector(
          ".notification-actions"
        );
        actions.innerHTML =
          actions.querySelector(".view-details-btn")?.outerHTML || "";
      }
    } catch (error) {
      console.error("Lỗi khi đánh dấu đã đọc:", error);
      alert("Lỗi khi đánh dấu đã đọc: " + error.message);
    }
  }

  // View Notification Details
  function viewDetails(link) {
    window.location.href = link;
  }
});
