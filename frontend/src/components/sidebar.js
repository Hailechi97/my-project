// Xử lý thu nhỏ/phóng to sidebar
const sidebar = document.getElementById("sidebar");
const toggleBtn = document.getElementById("toggleBtn");
const body = document.body;

toggleBtn.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
  body.classList.toggle("sidebar-collapsed");
});

// Thêm class active cho mục sidebar tương ứng với trang hiện tại
const currentPath = window.location.pathname;
const sidebarItems = document.querySelectorAll(".sidebar-item a");
sidebarItems.forEach((item) => {
  if (item.getAttribute("href") === currentPath) {
    item.parentElement.classList.add("active");
  }
});
