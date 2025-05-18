// frontend/src/pages/login.js
// Hàm validate email cơ bản
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Login Form Handler
document.getElementById("loginForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorElement = document.getElementById("errorMessage");

  errorElement.style.display = "none";

  if (!validateEmail(email)) {
    errorElement.textContent = "Vui lòng nhập email hợp lệ";
    errorElement.style.display = "block";
    return;
  }

  const btn = e.target.querySelector("button");
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang đăng nhập...';
  btn.disabled = true;

  fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    credentials: "include",
  })
    .then((response) => {
      console.log("Response status:", response.status); // Log trạng thái phản hồi
      console.log("Response headers:", response.headers); // Log headers
      return response.json();
    })
    .then((data) => {
      console.log("Response data:", data); // Log dữ liệu phản hồi
      if (!data || typeof data !== "object") {
        throw new Error("Phản hồi từ server không hợp lệ");
      }
      if (data.message === "Đăng nhập thành công") {
        localStorage.setItem("currentUser", JSON.stringify(data.user));
        window.location.href = "/forum";
      } else {
        throw new Error(data.message || "Đăng nhập thất bại");
      }
    })
    .catch((error) => {
      console.error("Fetch error:", error); // Log lỗi chi tiết
      errorElement.textContent = error.message;
      errorElement.style.display = "block";

      btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Thử lại';
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }, 1500);
    });
});

// Forgot Password Handler
const forgotPasswordLink = document.getElementById("forgotPasswordLink");
const forgotPasswordModal = document.getElementById("forgotPasswordModal");
const closeModal = document.getElementById("closeModal");
const forgotPasswordForm = document.getElementById("forgotPasswordForm");
const resetMessage = document.getElementById("resetMessage");

// Show modal
forgotPasswordLink.addEventListener("click", (e) => {
  e.preventDefault();
  forgotPasswordModal.style.display = "flex";
  resetMessage.style.display = "none";
  forgotPasswordForm.reset();
});

// Close modal
closeModal.addEventListener("click", () => {
  forgotPasswordModal.style.display = "none";
  resetMessage.style.display = "none";
  forgotPasswordForm.reset();
});

// Close modal when clicking outside
window.addEventListener("click", (e) => {
  if (e.target === forgotPasswordModal) {
    forgotPasswordModal.style.display = "none";
    resetMessage.style.display = "none";
    forgotPasswordForm.reset();
  }
});

// Handle forgot password form submission
forgotPasswordForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const email = document.getElementById("resetEmail").value.trim();
  const btn = e.target.querySelector("button");
  const originalText = btn.innerHTML;

  resetMessage.style.display = "none";
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang gửi...';
  btn.disabled = true;

  if (!validateEmail(email)) {
    resetMessage.textContent = "Vui lòng nhập email hợp lệ";
    resetMessage.className = "alert alert-danger";
    resetMessage.style.display = "block";
    btn.innerHTML = originalText;
    btn.disabled = false;
    return;
  }

  fetch("/api/reset-password/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
    credentials: "include",
  })
    .then((response) => response.json())
    .then((data) => {
      if (!data || typeof data !== "object") {
        throw new Error("Phản hồi từ server không hợp lệ");
      }
      resetMessage.textContent =
        data.message ||
        "Yêu cầu reset mật khẩu đã được gửi. Vui lòng chờ quản lý duyệt.";
      resetMessage.className = "alert alert-success";
      resetMessage.style.display = "block";

      btn.innerHTML = originalText;
      btn.disabled = false;

      setTimeout(() => {
        forgotPasswordModal.style.display = "none";
        forgotPasswordForm.reset();
        resetMessage.style.display = "none";
      }, 3000);
    })
    .catch((error) => {
      resetMessage.textContent =
        error.message || "Có lỗi xảy ra khi gửi yêu cầu";
      resetMessage.className = "alert alert-danger";
      resetMessage.style.display = "block";

      btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Thử lại';
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }, 1500);
    });
});
