import { logout } from "../services/auth-service.js";

// Xử lý hiển thị/ẩn dropdown menu
const userInfo = document.getElementById("userInfo");
const dropdownMenu = document.getElementById("dropdownMenu");

userInfo.addEventListener("click", (e) => {
  e.stopPropagation();
  dropdownMenu.classList.toggle("show");
});

// Ẩn dropdown khi nhấp ra ngoài
document.addEventListener("click", (e) => {
  if (!userInfo.contains(e.target)) {
    dropdownMenu.classList.remove("show");
  }
});

// Xử lý click vào "Thông tin nhân viên" trong dropdown
const employeeInfoLink = document.getElementById("employeeInfoLink");
employeeInfoLink.addEventListener("click", (e) => {
  e.preventDefault();
  window.location.href = "/employee-info";
});

// Xử lý đăng xuất
document.getElementById("logoutBtn").addEventListener("click", logout);
