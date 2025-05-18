export async function login(email, password) {
  const response = await fetch("/api/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || "Đăng nhập thất bại");
  }

  const data = await response.json();
  return data;
}

export async function requestPasswordReset(email) {
  const response = await fetch("/api/reset-password/request", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || "Có lỗi xảy ra khi gửi yêu cầu");
  }

  const data = await response.json();
  return data;
}

export function logout() {
  localStorage.removeItem("currentUser");
  fetch("/api/logout", {
    method: "POST",
    credentials: "include",
  })
    .then(() => {
      window.location.href = "/";
    })
    .catch((err) => {
      console.error("Lỗi đăng xuất:", err);
      window.location.href = "/";
    });
}
