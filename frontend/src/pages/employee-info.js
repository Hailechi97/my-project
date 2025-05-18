import employeeService from "../services/employee-service.js";

document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.getElementById("sidebar");
  const toggleBtn = document.getElementById("toggleBtn");
  const navbar = document.querySelector(".navbar");
  const container = document.querySelector(".container");
  const userInfo = document.getElementById("userInfo");
  const dropdownMenu = document.getElementById("dropdownMenu");
  const notificationBell = document.getElementById("notificationBell");
  const notificationDropdown = document.getElementById("notificationDropdown");
  const searchInput = document.getElementById("searchInput");
  const startDateFilter = document.getElementById("startDateFilter");
  const endDateFilter = document.getElementById("endDateFilter");
  const sortFilter = document.getElementById("sortFilter");
  const tabs = document.querySelectorAll(".tab");
  const employeesTableBody = document.getElementById("employeesTableBody");
  const employeeDetailContainer = document.getElementById(
    "employeeDetailContainer"
  );
  const newEmployeeBtn = document.getElementById("newEmployeeBtn");
  const contextMenu = document.getElementById("contextMenu");
  let selectedEmployeeId = null;

  // Toggle Sidebar
  toggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
    navbar.classList.toggle("sidebar-collapsed");
    container.classList.toggle("sidebar-collapsed");
    document.body.classList.toggle("sidebar-collapsed");
  });

  // Toggle User Dropdown
  userInfo.addEventListener("click", () => {
    dropdownMenu.classList.toggle("show");
  });

  // Toggle Notification Dropdown
  notificationBell.addEventListener("click", () => {
    notificationDropdown.classList.toggle("show");
  });

  // Close Dropdowns on Outside Click
  document.addEventListener("click", (e) => {
    if (!userInfo.contains(e.target)) {
      dropdownMenu.classList.remove("show");
    }
    if (!notificationBell.contains(e.target)) {
      notificationDropdown.classList.remove("show");
    }
    if (!contextMenu.contains(e.target)) {
      contextMenu.style.display = "none";
    }
  });

  // Handle Tab Switching
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const tabContent = tab.getAttribute("data-tab");
      // Logic to load content based on tab (e.g., API call)
      loadEmployees(tabContent);
    });
  });

  // Filter Employees
  const filterEmployees = () => {
    const searchTerm = searchInput.value.toLowerCase();
    const startDate = startDateFilter.value;
    const endDate = endDateFilter.value;
    const sortOrder = sortFilter.value;
    loadEmployees("all-employees", {
      searchTerm,
      startDate,
      endDate,
      sortOrder,
    });
  };

  searchInput.addEventListener("input", filterEmployees);
  startDateFilter.addEventListener("change", filterEmployees);
  endDateFilter.addEventListener("change", filterEmployees);
  sortFilter.addEventListener("change", filterEmployees);

  const loadEmployees = async (tab, filters = {}) => {
    try {
      const employees = await employeeService.getEmployees(filters);
      console.log("Danh sách nhân viên nhận được:", employees);
      if (!Array.isArray(employees)) {
        throw new Error("Dữ liệu nhân viên không hợp lệ");
      }
      employeesTableBody.innerHTML = "";
      if (employees.length === 0) {
        employeesTableBody.innerHTML =
          '<tr><td colspan="7">Không có nhân viên nào trong phòng ban</td></tr>';
        return;
      }
      employees.forEach((employee) => {
        console.log("Hiển thị từng nhân viên:", employee); // Log từng object trước khi hiển thị
        const row = document.createElement("tr");
        row.classList.add("employee-row");
        row.setAttribute("data-id", employee.id);
        row.innerHTML = `
        <td><input type="checkbox" class="employee-checkbox" /></td>
        <td class="employee-name-cell">
          <div class="employee-avatar">
            <img src="${
              employee.avatar || "/avatars/default-avatar.png"
            }" alt="Avatar" onerror="this.src='/avatars/nva.jpg';" />
          </div>
          ${employee.name || "Chưa có tên"}
        </td>
        <td>${employee.employeeId || "Chưa có mã"}</td>
        <td>${employee.role || "Chưa có chức vụ"}</td>
        <td class="${
          employee.status === "active" ? "status-active" : "status-inactive"
        }">
          ${
            employee.status === "active"
              ? "Hoạt động"
              : "Ngưng hoạt động" || "Chưa xác định"
          }
        </td>
        <td>${employee.department || "Chưa có phòng ban"}</td>
        <td><i class="fas fa-ellipsis-v"></i></td>
      `;
        row.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          contextMenu.style.display = "block";
          contextMenu.style.left = `${e.pageX}px`;
          contextMenu.style.top = `${e.pageY}px`;
          selectedEmployeeId = employee.id;
        });
        employeesTableBody.appendChild(row);
      });
    } catch (error) {
      console.error("Lỗi khi tải danh sách nhân viên:", error);
      employeesTableBody.innerHTML = `<tr><td colspan="7">Lỗi: ${error.message}</td></tr>`;
    }
  };

  // Show Employee Detail
  const showEmployeeDetail = async (employeeId) => {
    const employee = await employeeService.getEmployeeById(employeeId);
    employeeDetailContainer.innerHTML = `
      <div class="employee-header">
        <div class="employee-avatar-container">
          <div class="employee-avatar">
            <img src="${
              employee.avatar || "/avatars/default-avatar.png"
            }" alt="Avatar" />
          </div>
          <label class="avatar-upload">
            <i class="fas fa-upload"></i> Tải lên
            <input type="file" style="display: none" accept="image/*" />
          </label>
        </div>
        <div class="employee-info">
          <div class="employee-name">${employee.name}</div>
          <div class="employee-meta">
            <span class="employee-department">${employee.department}</span>
            <span class="employee-role">${employee.role}</span>
          </div>
        </div>
      </div>
      <div class="employee-details">
        <div class="info-section">
          <h3>Thông tin cá nhân</h3>
          <div class="info-grid">
            <div class="detail-group">
              <div class="detail-label">Mã nhân viên</div>
              <div class="detail-value">${employee.employeeId}</div>
            </div>
            <div class="detail-group">
              <div class="detail-label">Email</div>
              <div class="detail-value">${employee.email}</div>
            </div>
            <div class="detail-group">
              <div class="detail-label">Số điện thoại</div>
              <div class="detail-value">${employee.phone}</div>
            </div>
            <div class="detail-group">
              <div class="detail-label">Ngày gia nhập</div>
              <div class="detail-value">${employee.joinDate}</div>
            </div>
          </div>
        </div>
        <div class="action-buttons">
          <button class="edit-btn"><i class="fas fa-edit"></i> Sửa</button>
          <button class="change-password-btn"><i class="fas fa-lock"></i> Đổi mật khẩu</button>
          <button class="back-btn"><i class="fas fa-arrow-left"></i> Quay lại</button>
        </div>
      </div>
    `;
    employeesListContainer.style.display = "none";
    employeeDetailContainer.style.display = "flex";

    // Back Button
    document.querySelector(".back-btn").addEventListener("click", () => {
      employeesListContainer.style.display = "block";
      employeeDetailContainer.style.display = "none";
    });

    // Edit and Change Password Logic (Mock)
    document.querySelector(".edit-btn").addEventListener("click", () => {
      // Enable editing fields (mock)
      console.log("Edit employee", employeeId);
    });

    document
      .querySelector(".change-password-btn")
      .addEventListener("click", () => {
        employeeDetailContainer.innerHTML += `
        <div class="change-password-form">
          <h3>Đổi mật khẩu</h3>
          <div class="form-group">
            <label for="currentPassword">Mật khẩu hiện tại</label>
            <input type="password" id="currentPassword" />
          </div>
          <div class="form-group">
            <label for="newPassword">Mật khẩu mới</label>
            <input type="password" id="newPassword" />
          </div>
          <div class="form-group">
            <label for="confirmPassword">Xác nhận mật khẩu</label>
            <input type="password" id="confirmPassword" />
          </div>
          <div class="action-buttons">
            <button class="save-btn"><i class="fas fa-save"></i> Lưu</button>
            <button class="cancel-btn"><i class="fas fa-times"></i> Hủy</button>
          </div>
        </div>
      `;
        document.querySelector(".save-btn").addEventListener("click", () => {
          // Save password logic (mock)
          console.log("Save new password for", employeeId);
        });
        document.querySelector(".cancel-btn").addEventListener("click", () => {
          showEmployeeDetail(employeeId); // Reset form
        });
      });
  };

  // Context Menu Actions
  contextMenu.querySelectorAll(".context-menu-item").forEach((item) => {
    item.addEventListener("click", async () => {
      if (item.getAttribute("data-action") === "view" && selectedEmployeeId) {
        showEmployeeDetail(selectedEmployeeId);
      } else if (
        item.getAttribute("data-action") === "delete" &&
        selectedEmployeeId
      ) {
        if (confirm("Bạn có chắc muốn xóa nhân viên này?")) {
          await employeeService.deleteEmployee(selectedEmployeeId);
          loadEmployees("all-employees");
        }
      }
      contextMenu.style.display = "none";
    });
  });

  // New Employee Button
  newEmployeeBtn.addEventListener("click", () => {
    const modal = document.createElement("div");
    modal.classList.add("modal");
    modal.innerHTML = `
    <div class="modal-content">
      <button class="close-modal">×</button>
      <h2>Thêm nhân viên mới</h2>
      <form id="newEmployeeForm">
        <div class="form-group">
          <label for="newLastName">Họ</label>
          <input type="text" id="newLastName" required />
        </div>
        <div class="form-group">
          <label for="newFirstName">Tên</label>
          <input type="text" id="newFirstName" required />
        </div>
        <div class="form-group">
          <label for="newEmployeeId">Mã nhân viên</label>
          <input type="text" id="newEmployeeId" required />
        </div>
        <div class="form-group">
          <label for="newRole">Chức vụ</label>
          <input type="text" id="newRole" required />
        </div>
        <div class="form-group">
          <label for="newDepartment">Phòng ban</label>
          <input type="text" id="newDepartment" required />
        </div>
        <button type="submit" class="submit-btn">Thêm</button>
      </form>
    </div>
  `;
    document.body.appendChild(modal);

    const closeModal = modal.querySelector(".close-modal");
    closeModal.addEventListener("click", () => modal.remove());

    document
      .getElementById("newEmployeeForm")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        const newEmployee = {
          lastName: document.getElementById("newLastName").value,
          firstName: document.getElementById("newFirstName").value,
          employeeId: document.getElementById("newEmployeeId").value,
          role: document.getElementById("newRole").value,
          department: document.getElementById("newDepartment").value,
          status: "active",
        };
        await employeeService.addEmployee(newEmployee);
        loadEmployees("all-employees");
        modal.remove();
      });
  });

  // Initial Load
  loadEmployees("all-employees");
});
