import * as requestService from "../services/request-service.js";

let currentUser = null;
let isManager = false;
let currentTab = "pending";
let currentRequestId = null;
let allRequests = { pending: [], approved: [] };
let ws = null;
let isMaximized = false;

// Function to initialize WebSocket connection
function initWebSocket() {
  ws = new WebSocket("ws://localhost:8080");
  ws.onopen = () => {
    console.log("Connected to WebSocket server");
  };
  ws.onmessage = async (event) => {
    const data = JSON.parse(event.data);
    if (data.event === "newNotification" || data.event === "updateRequest") {
      fetchNotifications(); // Refresh notifications when a new one arrives
      await loadRequests();
      await loadApprovedRequests();
      if (isManager) {
        updateStats();
      }
      filterRequests();
    }
  };
  ws.onclose = () => {
    console.log("Disconnected from WebSocket server. Reconnecting...");
    setTimeout(initWebSocket, 5000); // Reconnect after 5 seconds
  };
  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
  };
}

// Function to fetch notifications
async function fetchNotifications() {
  try {
    const response = await requestService.getNotifications();
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Lỗi lấy thông báo");
    }
    const notifications = await response.json();
    renderNotifications(notifications);
  } catch (error) {
    console.error("Lỗi:", error);
    const notificationList = document.getElementById("notificationList");
    notificationList.innerHTML =
      '<div style="padding: 10px; text-align: center;">Lỗi khi tải thông báo</div>';
    document.getElementById("notificationDropdown").classList.add("show");
  }
}

// Function to render notifications in the dropdown
function renderNotifications(notifications) {
  const notificationList = document.getElementById("notificationList");
  const notificationCount = document.getElementById("notificationCount");
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Update notification count
  if (unreadCount > 0) {
    notificationCount.textContent = unreadCount;
    notificationCount.style.display = "inline-block";
  } else {
    notificationCount.style.display = "none";
  }

  // Render notifications
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
              : notification.type === "post"
              ? "fa-newspaper"
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

  // Add click event to mark as read and redirect
  document.querySelectorAll(".notification-item").forEach((item) => {
    item.addEventListener("click", async (e) => {
      const notificationId = item.dataset.id;
      const notification = notifications.find((n) => n.id == notificationId);

      // Mark as read
      if (!notification.read) {
        try {
          const response = await requestService.markNotificationAsRead(
            notificationId
          );
          if (!response.ok) {
            throw new Error("Lỗi đánh dấu đã đọc");
          }
          fetchNotifications(); // Refresh notifications
        } catch (error) {
          console.error("Lỗi:", error);
        }
      }

      // Redirect to details link if exists
      if (notification.detailsLink) {
        window.location.href = notification.detailsLink;
      }
    });
  });
}

// Khởi tạo khi trang load
document.addEventListener("DOMContentLoaded", async () => {
  // Xử lý toggle sidebar
  document.getElementById("toggleBtn").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("collapsed");
    document.body.classList.toggle("sidebar-collapsed");
  });

  // Thêm class active cho mục sidebar tương ứng với trang hiện tại
  const currentPath = window.location.pathname;
  const sidebarItems = document.querySelectorAll(".sidebar-item a");
  sidebarItems.forEach((item) => {
    if (item.getAttribute("href") === currentPath) {
      item.parentElement.classList.add("active");
    }
  });

  // Initialize WebSocket
  initWebSocket();

  // Handle notification dropdown
  const notificationBell = document.getElementById("notificationBell");
  const notificationCount = document.getElementById("notificationCount");
  const notificationDropdown = document.getElementById("notificationDropdown");

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

  document.addEventListener("click", (e) => {
    if (
      !notificationBell.contains(e.target) &&
      !notificationDropdown.contains(e.target) &&
      !notificationCount.contains(e.target)
    ) {
      notificationDropdown.classList.remove("show");
    }
  });

  // Fetch notifications on page load
  fetchNotifications();

  // Xử lý dropdown user menu
  document.getElementById("userInfo").addEventListener("click", (e) => {
    e.stopPropagation();
    document.getElementById("dropdownMenu").classList.toggle("show");
  });

  // Đóng dropdown khi click ra ngoài
  document.addEventListener("click", () => {
    document.getElementById("dropdownMenu").classList.remove("show");
  });

  // Đóng popup chi tiết khi click ra ngoài
  document
    .getElementById("detailPopup")
    .addEventListener("click", function (e) {
      if (e.target === this) {
        closeDetailPopup();
      }
    });

  // Đóng popup từ chối khi click ra ngoài
  document
    .getElementById("rejectionPopup")
    .addEventListener("click", function (e) {
      if (e.target === this) {
        closeRejectionPopup();
      }
    });

  // Xử lý file upload display
  document
    .getElementById("requestAttachment")
    .addEventListener("change", function (e) {
      const fileName =
        e.target.files.length > 0
          ? e.target.files[0].name
          : "Chưa có file nào được chọn";
      document.getElementById("fileName").textContent = fileName;
    });

  // Xử lý submit form
  document
    .getElementById("newRequestForm")
    .addEventListener("submit", submitNewRequest);

  // Xử lý bộ lọc
  document
    .getElementById("searchInput")
    .addEventListener("input", filterRequests);
  document
    .getElementById("typeFilter")
    .addEventListener("change", filterRequests);
  document
    .getElementById("statusFilter")
    .addEventListener("change", filterRequests);
  document
    .getElementById("sortFilter")
    .addEventListener("change", filterRequests);

  // Xử lý đăng xuất
  document.getElementById("logoutBtn").addEventListener("click", logout);

  // Lấy thông tin user
  try {
    const response = await requestService.getCurrentUser();
    if (!response.ok) {
      window.location.href = "/";
      return;
    }
    currentUser = await response.json();
    updateUserInfo(currentUser);

    // Kiểm tra có phải là trưởng phòng không
    isManager = currentUser.Role === "Manager";
    if (isManager) {
      document.getElementById("deleteRequestsMenu").style.display = "block";
      document.getElementById("requestForm").style.display = "none";
      document.getElementById("statsContainer").style.display = "flex";
    }

    // Tải danh sách đơn ban đầu
    await loadRequests();
    await loadApprovedRequests();
    if (isManager) {
      updateStats();
    }
  } catch (error) {
    console.error("Lỗi:", error);
    window.location.href = "/";
  }
});

// Chuyển đổi giữa các tab
function switchTab(tab) {
  currentTab = tab;
  document
    .getElementById("pendingTab")
    .classList.toggle("active", tab === "pending");
  document
    .getElementById("approvedTab")
    .classList.toggle("active", tab === "approved");
  document.getElementById("pendingRequests").style.display =
    tab === "pending" ? "block" : "none";
  document.getElementById("approvedRequests").style.display =
    tab === "approved" ? "block" : "none";
  filterRequests();
}

// Cập nhật thông tin user trên navbar
function updateUserInfo(user) {
  const avatarImg = document.getElementById("userAvatarImg");
  const userName = document.getElementById("userName");

  userName.textContent = `${user.FirstName} ${user.LastName}`;

  if (user.Photo) {
    avatarImg.src = `/Uploads/${user.Photo}`;
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

// Tải danh sách đơn cần duyệt
async function loadRequests() {
  try {
    const container = document.getElementById("pendingRequestsList");
    if (!container) {
      throw new Error("Không tìm thấy phần tử #pendingRequestsList trong HTML");
    }

    container.innerHTML = `
      <div class="loading">
        <i class="fas fa-spinner fa-spin"></i> Đang tải danh sách đơn...
      </div>
    `;

    const response = await requestService.getPendingRequests();
    if (!response.ok) {
      throw new Error("Lỗi tải danh sách đơn cần duyệt");
    }

    let requests = await response.json();

    if (requests && requests.requests) {
      requests = requests.requests;
    }

    if (!Array.isArray(requests)) {
      throw new Error("Dữ liệu trả về không hợp lệ");
    }

    allRequests.pending = requests;
    renderRequests(requests, container, "pending");
    updateTabCounts();
  } catch (error) {
    console.error("Lỗi khi tải danh sách đơn:", error);
    const container = document.getElementById("pendingRequestsList");
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Có lỗi xảy ra khi tải danh sách đơn.</p>
        </div>
      `;
    } else {
      alert("Lỗi: Không tìm thấy phần tử #pendingRequestsList trong HTML");
    }
  }
}

// Tải danh sách đơn đã duyệt
async function loadApprovedRequests() {
  try {
    const container = document.getElementById("approvedRequestsList");
    if (!container) {
      throw new Error(
        "Không tìm thấy phần tử #approvedRequestsList trong HTML"
      );
    }

    container.innerHTML = `
      <div class="loading">
        <i class="fas fa-spinner fa-spin"></i> Đang tải danh sách đơn...
      </div>
    `;

    const response = await requestService.getRequests();
    if (!response.ok) {
      throw new Error("Lỗi tải danh sách đơn đã duyệt");
    }

    let requests = await response.json();

    if (!Array.isArray(requests)) {
      throw new Error("Dữ liệu trả về không hợp lệ");
    }

    requests = requests.filter(
      (request) => request.Status === "Đã duyệt" || request.Status === "Từ chối"
    );

    allRequests.approved = requests;
    renderRequests(requests, container, "approved");
    updateTabCounts();
  } catch (error) {
    console.error("Lỗi khi tải danh sách đơn đã duyệt:", error);
    const container = document.getElementById("approvedRequestsList");
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Có lỗi xảy ra khi tải danh sách đơn đã duyệt.</p>
        </div>
      `;
    } else {
      alert("Lỗi: Không tìm thấy phần tử #approvedRequestsList trong HTML");
    }
  }
}

// Cập nhật số lượng trên các tab
function updateTabCounts() {
  document.getElementById("pendingTabCount").textContent =
    allRequests.pending.length;
  document.getElementById("approvedTabCount").textContent =
    allRequests.approved.length;
}

// Cập nhật thống kê (chỉ cho manager)
function updateStats() {
  if (!isManager) return;

  const pendingCount = allRequests.pending.length;
  const approvedCount = allRequests.approved.filter(
    (r) => r.Status === "Đã duyệt"
  ).length;
  const rejectedCount = allRequests.approved.filter(
    (r) => r.Status === "Từ chối"
  ).length;

  document.getElementById("pendingCount").textContent = pendingCount;
  document.getElementById("approvedCount").textContent = approvedCount;
  document.getElementById("rejectedCount").textContent = rejectedCount;
}

// Lọc và sắp xếp danh sách đơn
function filterRequests() {
  const searchText = document.getElementById("searchInput").value.toLowerCase();
  const typeFilter = document.getElementById("typeFilter").value;
  const statusFilter = document.getElementById("statusFilter").value;
  const sortFilter = document.getElementById("sortFilter").value;

  const requests =
    currentTab === "pending" ? allRequests.pending : allRequests.approved;
  const container = document.getElementById(
    currentTab === "pending" ? "pendingRequestsList" : "approvedRequestsList"
  );

  let filteredRequests = requests.filter((request) => {
    const matchesSearch =
      (request.FirstName &&
        request.FirstName.toLowerCase().includes(searchText)) ||
      (request.LastName &&
        request.LastName.toLowerCase().includes(searchText)) ||
      (request.Content && request.Content.toLowerCase().includes(searchText)) ||
      (request.Email && request.Email.toLowerCase().includes(searchText));
    const matchesType = !typeFilter || request.RequestType === typeFilter;
    const matchesStatus = !statusFilter || request.Status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  // Sắp xếp theo ngày
  filteredRequests.sort((a, b) => {
    if (currentTab === "pending") {
      // Sắp xếp đơn cần duyệt theo RequestDate
      const dateA = new Date(a.RequestDate || "1970-01-01");
      const dateB = new Date(b.RequestDate || "1970-01-01");
      return sortFilter === "newest" ? dateB - dateA : dateA - dateB;
    } else {
      // Sắp xếp đơn đã duyệt theo ApprovedDate
      const dateA = new Date(a.ApprovedDate || a.RequestDate || "1970-01-01");
      const dateB = new Date(b.ApprovedDate || b.RequestDate || "1970-01-01");
      return sortFilter === "newest" ? dateB - dateA : dateA - dateB;
    }
  });

  if (filteredRequests.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-inbox"></i>
        <p>Không có đơn nào phù hợp với bộ lọc</p>
      </div>
    `;
  } else {
    renderRequests(filteredRequests, container, currentTab);
  }
}

// Render danh sách đơn
function renderRequests(requests, container, type) {
  if (!container) {
    console.error("Không tìm thấy phần tử container trong HTML");
    alert("Lỗi hiển thị danh sách đơn: Không tìm thấy container");
    return;
  }

  const fragment = document.createDocumentFragment();

  requests.forEach((request) => {
    const requestElement = createRequestElement(request, type);
    fragment.appendChild(requestElement);
  });

  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  container.appendChild(fragment);
}

// Tạo HTML cho 1 đơn
function createRequestElement(request, type) {
  const requestElement = document.createElement("div");
  requestElement.className = "request-card";

  const requestType = request.RequestType || "Không có tiêu đề";
  const status = request.Status || "Không xác định";
  const requestDate = request.RequestDate
    ? new Date(request.RequestDate).toLocaleString("vi-VN")
    : "Không xác định";
  const approvedDate = request.ApprovedDate
    ? new Date(request.ApprovedDate).toLocaleString("vi-VN")
    : "Không xác định";
  const statusClass = getStatusClass(status);

  let html = `
    <div class="avatar">
      ${
        request.Photo
          ? `<img src="/Uploads/${request.Photo}" alt="${request.FirstName} ${request.LastName}">`
          : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#4e73df;color:white;font-weight:bold">${request.FirstName.charAt(
              0
            )}${request.LastName.charAt(0)}</div>`
      }
    </div>
    <div class="info">
      <div class="title">${requestType}</div>
      <div class="meta">
        <span>${request.FirstName} ${request.LastName}</span>
        <span>${request.Department || "Không xác định"}</span>
        ${
          type === "pending"
            ? `<span><i class="far fa-calendar-alt"></i> ${requestDate}</span>`
            : `<span><i class="far fa-calendar-check"></i> ${approvedDate}</span>`
        }
        <span class="status ${statusClass}">${status}</span>
      </div>
    </div>
  `;

  if (isManager && type === "pending" && status === "Chờ duyệt") {
    html += `
      <div class="actions">
        <button class="action-btn" onclick="viewRequestDetail('${request.RequestID}')">
          <i class="fas fa-eye"></i> Xem
        </button>
        <button class="action-btn approve" onclick="handleApproveRequest('${request.RequestID}', 'Đã duyệt', this)">
          <i class="fas fa-check"></i> Duyệt
        </button>
        <button class="action-btn reject" onclick="showRejectionPopup('${request.RequestID}')">
          <i class="fas fa-times"></i> Từ chối
        </button>
      </div>
    `;
  } else {
    html += `
      <div class="actions">
        <button class="action-btn" onclick="viewRequestDetail('${request.RequestID}')">
          <i class="fas fa-eye"></i> Xem
        </button>
      </div>
    `;
  }

  requestElement.innerHTML = html;
  return requestElement;
}

// Xem chi tiết đơn
async function viewRequestDetail(requestId) {
  try {
    const response = await requestService.getRequestDetail(requestId);
    if (!response.ok) {
      if (response.status === 404) {
        const container = document.getElementById("detailPopupContent");
        container.innerHTML = `
          <div class="detail-popup-header" id="popupHeader">
            <h2 class="detail-popup-title">Thông tin chi tiết</h2>
            <div class="detail-popup-controls">
              <button class="popup-control-btn" onclick="toggleMaximizePopup()">
                <i class="fas fa-expand"></i>
              </button>
              <button class="close-btn" onclick="closeDetailPopup()">
                <i class="fas fa-times"></i> Đóng
              </button>
            </div>
          </div>
          <div class="empty-state">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Không tìm thấy yêu cầu với ID: ${requestId}</p>
          </div>
        `;
        document.getElementById("detailPopup").style.display = "flex";
        setTimeout(centerPopup, 0);
        makePopupDraggable();
        return;
      }
      throw new Error("Lỗi tải chi tiết đơn");
    }

    const request = await response.json();
    renderRequestDetail(request);
    document.getElementById("detailPopup").style.display = "flex";
    setTimeout(centerPopup, 0);
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Lỗi khi tải chi tiết đơn: " + error.message);
  }
}

// Đóng popup chi tiết
function closeDetailPopup() {
  document.getElementById("detailPopup").style.display = "none";
  isMaximized = false;
}

// Render chi tiết đơn
function renderRequestDetail(request) {
  const container = document.getElementById("detailPopupContent");
  if (!container) {
    console.error("Không tìm thấy phần tử #detailPopupContent trong HTML");
    alert("Lỗi hiển thị chi tiết đơn: Không tìm thấy container");
    return;
  }

  const requestDate = request.RequestDate
    ? new Date(request.RequestDate).toLocaleString("vi-VN")
    : "Không xác định";
  const statusClass = getStatusClass(request.Status);

  let html = `
    <div class="detail-popup-header" id="popupHeader">
      <h2 class="detail-popup-title">${request.RequestType}</h2>
      <div class="detail-popup-controls">
        <button class="popup-control-btn" onclick="toggleMaximizePopup()">
          <i class="fas fa-expand"></i>
        </button>
        <button class="close-btn" onclick="closeDetailPopup()">
          <i class="fas fa-times"></i> Đóng
        </button>
      </div>
    </div>
    <div class="detail-section">
      <h3><i class="fas fa-user-circle"></i> Thông tin nhân viên</h3>
      <div class="employee-info">
        <p><i class="fas fa-user"></i> <strong>Tên:</strong> ${
          request.FirstName
        } ${request.LastName}</p>
        <p><i class="fas fa-id-card"></i> <strong>Mã số nhân viên:</strong> ${
          request.EmpID
        }</p>
        <p><i class="fas fa-building"></i> <strong>Phòng ban:</strong> ${
          request.Department
        }</p>
        <p><i class="fas fa-briefcase"></i> <strong>Vị trí:</strong> ${
          request.ChucVu || "Nhân viên"
        }</p>
        ${
          request.Email
            ? `<p><i class="fas fa-envelope"></i> <strong>Email:</strong> ${request.Email}</p>`
            : ""
        }
        <p><i class="far fa-calendar-alt"></i> <strong>Ngày gửi:</strong> ${requestDate}</p>
        <p><i class="fas fa-info-circle"></i> <strong>Trạng thái:</strong> <span class="status ${statusClass}">${
    request.Status
  }</span></p>
      </div>
    </div>
    <div class="detail-section request-detail-content">
      <h3><i class="fas fa-file-alt"></i> Nội dung đơn</h3>
      <p>${request.Content}</p>
    </div>
  `;

  if (request.RequestType === "Reset Password") {
    html += `
      <div class="reset-password-note">
        <i class="fas fa-exclamation-triangle"></i> Đây là yêu cầu reset mật khẩu, vui lòng kiểm tra kỹ email người gửi: ${
          request.Content.match(/email: (.+)/)?.[1] || "Không xác định"
        }
      </div>
    `;
  }

  if (request.AttachedFile) {
    const isImage = /\.(jpg|jpeg|png|gif)$/i.test(request.AttachedFile);
    if (isImage) {
      html += `
        <div class="detail-section request-detail-attachment">
          <h3><i class="fas fa-image"></i> File đính kèm</h3>
          <img src="/Uploads/${request.AttachedFile}" alt="Attachment" />
        </div>
      `;
    } else {
      html += `
        <div class="detail-section request-detail-attachment">
          <h3><i class="fas fa-paperclip"></i> File đính kèm</h3>
          <a href="/Uploads/${request.AttachedFile}" class="attachment-link" target="_blank" download>
            <i class="fas fa-download"></i> Tải file
          </a>
        </div>
      `;
    }
  }

  if (request.ApprovedBy) {
    const approvedDate = request.ApprovedDate
      ? new Date(request.ApprovedDate).toLocaleString("vi-VN")
      : "Không xác định";
    html += `
      <div class="detail-section request-approved">
        <h3><i class="fas fa-check-circle"></i> Thông tin xử lý</h3>
        <p><i class="fas fa-user-check"></i> Đã ${request.Status.toLowerCase()} bởi ${
      request.ApprovedBy
    }</p>
    <p><i class="far fa-calendar-alt"></i> ${approvedDate}</p>
    ${
      request.RejectionReason
        ? `<p><i class="fas fa-comment-alt"></i> Lý do từ chối: ${request.RejectionReason}</p>`
        : ""
    }
      </div>
    `;
  }

  if (isManager && request.Status === "Chờ duyệt") {
    html += `
      <div class="request-actions">
        <button class="action-btn approve" onclick="handleApproveRequest('${request.RequestID}', 'Đã duyệt', this)">
          <i class="fas fa-check"></i> Duyệt
        </button>
        <button class="action-btn reject" onclick="showRejectionPopup('${request.RequestID}')">
          <i class="fas fa-times"></i> Từ chối
        </button>
      </div>
    `;
  }

  container.innerHTML = html;

  // Thêm sự kiện kéo thả
  makePopupDraggable();
}

// Hàm xử lý duyệt với trạng thái loading
async function handleApproveRequest(requestId, status, button) {
  const originalText = button.innerHTML;
  button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
  button.disabled = true;
  try {
    await approveRequest(requestId, status);
  } finally {
    button.innerHTML = originalText;
    button.disabled = false;
  }
}

// Lớp CSS cho trạng thái
function getStatusClass(status) {
  switch (status) {
    case "Đã duyệt":
      return "status-approved";
    case "Từ chối":
      return "status-rejected";
    default:
      return "status-pending";
  }
}

// Gửi đơn mới
async function submitNewRequest(e) {
  e.preventDefault();

  // Get form elements
  const requestTypeInput = document.querySelector(
    'input[name="requestType"]:checked'
  );
  const contentInput = document.getElementById("requestContent");
  const fileInput = document.getElementById("requestAttachment");
  const submitBtn = e.target.querySelector('button[type="submit"]');

  // Validate inputs
  if (!requestTypeInput) {
    alert("Vui lòng chọn loại đơn.");
    return;
  }
  const requestType = requestTypeInput.value.trim();
  const content = contentInput.value.trim();

  if (!content) {
    alert("Vui lòng nhập nội dung đơn.");
    return;
  }

  // Validate requestType against allowed values
  const validRequestTypes = ["Nghỉ phép", "Công tác", "Hỗ trợ", "Tăng lương"];
  if (!validRequestTypes.includes(requestType)) {
    alert("Loại đơn không hợp lệ.");
    return;
  }

  // Validate file size (max 5MB)
  if (fileInput.files.length > 0 && fileInput.files[0].size > 5 * 1024 * 1024) {
    alert("File đính kèm không được lớn hơn 5MB.");
    return;
  }

  // Disable button and show loading state
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang gửi...';
  submitBtn.disabled = true;

  try {
    let fileURL = null;

    // Handle file upload if present
    if (fileInput.files.length > 0) {
      const formData = new FormData();
      formData.append("file", fileInput.files[0]);

      const uploadResponse = await requestService.uploadFile(formData);
      if (!uploadResponse.ok) {
        const uploadError = await uploadResponse.json();
        throw new Error(uploadError.message || "Lỗi khi upload file đính kèm.");
      }

      const uploadResult = await uploadResponse.json();
      if (!uploadResult.success || !uploadResult.fileName) {
        throw new Error("Phản hồi upload file không hợp lệ.");
      }
      fileURL = uploadResult.fileName;
    }

    // Create and log payload for debugging
    const payload = { requestType, content, fileURL };
    console.log("Sending request payload:", JSON.stringify(payload, null, 2));

    // Send request to server
    const response = await requestService.createRequest(payload);
    const result = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        alert("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        window.location.href = "/";
        return;
      }
      if (response.status === 500) {
        console.error("Server error details:", result);
        throw new Error(
          result.message ||
            "Lỗi server không xác định. Vui lòng kiểm tra logs server."
        );
      }
      throw new Error(result.message || "Lỗi khi gửi yêu cầu.");
    }

    if (!result.success) {
      throw new Error(result.message || "Gửi yêu cầu không thành công.");
    }

    // Reset form
    document.getElementById("newRequestForm").reset();
    document.getElementById("fileName").textContent =
      "Chưa có file nào được chọn";

    // Reload requests list
    await loadRequests();

    // Show success message
    alert("Gửi đơn thành công! Mã đơn: " + result.requestId);
  } catch (error) {
    console.error("Error submitting request:", error);
    alert("Lỗi khi gửi đơn: " + error.message);
  } finally {
    // Restore button state
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
}

// Hiển thị popup nhập lý do từ chối
function showRejectionPopup(requestId) {
  currentRequestId = requestId;
  document.getElementById("rejectionReason").value = "";
  document.getElementById("rejectionPopup").style.display = "flex";
  closeDetailPopup();
}

// Đóng popup từ chối
function closeRejectionPopup() {
  document.getElementById("rejectionPopup").style.display = "none";
  currentRequestId = null;
}

// Xác nhận từ chối với lý do
async function confirmRejection() {
  const reason = document.getElementById("rejectionReason").value.trim();
  if (!reason) {
    alert("Vui lòng nhập lý do từ chối");
    return;
  }

  try {
    const response = await requestService.updateRequestStatus(
      currentRequestId,
      {
        status: "Từ chối",
        rejectionReason: reason,
      }
    );
    if (!response.ok) {
      throw new Error(await response.text());
    }

    closeRejectionPopup();
    alert("Đã từ chối đơn thành công");

    await loadRequests();
    await loadApprovedRequests();
    if (isManager) {
      updateStats();
    }
    filterRequests();
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Lỗi khi từ chối đơn: " + error.message);
  }
}

// Duyệt đơn (cho trưởng phòng)
async function approveRequest(requestId, status) {
  console.log("Duyệt đơn với RequestID:", requestId, "Status:", status);
  if (!["Đã duyệt", "Từ chối"].includes(status)) {
    console.error("Giá trị status không hợp lệ:", status);
    alert("Lỗi: Trạng thái không hợp lệ");
    return;
  }
  try {
    const response = await requestService.updateRequestStatus(requestId, {
      status,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Lỗi khi duyệt đơn");
    }

    alert(`Đã ${status.toLowerCase()} đơn thành công`);
    closeDetailPopup();
    await loadRequests();
    await loadApprovedRequests();
    if (isManager) {
      updateStats();
    }
    filterRequests();
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Lỗi khi duyệt đơn: " + error.message);
  }
}

// Đăng xuất
async function logout() {
  try {
    const response = await requestService.logout();
    if (response.ok) {
      window.location.href = "/";
    }
  } catch (error) {
    console.error("Lỗi:", error);
  }
}

// Hàm làm popup có thể kéo thả
function makePopupDraggable() {
  const popup = document.getElementById("detailPopupContent");
  const header = document.getElementById("popupHeader");
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;

  header.addEventListener("mousedown", startDragging);

  function startDragging(e) {
    initialX = e.clientX - currentX;
    initialY = e.clientY - currentY;
    isDragging = true;
    document.addEventListener("mousemove", drag);
    document.addEventListener("mouseup", stopDragging);
  }

  function drag(e) {
    if (isDragging) {
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;

      // Giới hạn không cho popup ra ngoài màn hình
      const maxX = window.innerWidth - popup.offsetWidth;
      const maxY = window.innerHeight - popup.offsetHeight;
      currentX = Math.max(0, Math.min(currentX, maxX));
      currentY = Math.max(0, Math.min(currentY, maxY));

      popup.style.position = "absolute";
      popup.style.left = currentX + "px";
      popup.style.top = currentY + "px";
    }
  }

  function stopDragging() {
    isDragging = false;
    document.removeEventListener("mousemove", drag);
    document.removeEventListener("mouseup", stopDragging);
  }

  // Khởi tạo vị trí ban đầu
  centerPopup();
}

// Hàm căn giữa popup
function centerPopup() {
  const popup = document.getElementById("detailPopupContent");
  popup.style.display = "block";
  popup.style.width = "600px";
  popup.style.height = "auto";
  popup.style.maxHeight = "80vh";
  popup.style.resize = "both";
  isMaximized = false;

  const rect = popup.getBoundingClientRect();
  currentX = (window.innerWidth - rect.width) / 2;
  currentY = (window.innerHeight - rect.height) / 2;

  currentX = Math.max(0, currentX);
  currentY = Math.max(0, currentY);

  popup.style.position = "absolute";
  popup.style.left = `${currentX}px`;
  popup.style.top = `${currentY}px`;
}

// Hàm phóng to/thu nhỏ popup
function toggleMaximizePopup() {
  const popup = document.getElementById("detailPopupContent");
  if (isMaximized) {
    centerPopup();
  } else {
    const newWidth = window.innerWidth * 0.9;
    const newHeight = window.innerHeight * 0.9;
    currentX = (window.innerWidth - newWidth) / 2;
    currentY = (window.innerHeight - newHeight) / 2;
    popup.style.width = `${newWidth}px`;
    popup.style.height = `${newHeight}px`;
    popup.style.maxHeight = "none";
    popup.style.left = `${currentX}px`;
    popup.style.top = `${currentY}px`;
    popup.style.resize = "none";
  }
  isMaximized = !isMaximized;
}
