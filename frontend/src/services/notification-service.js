export async function fetchNotifications() {
  const response = await fetch("/api/notifications", {
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Lỗi lấy thông báo");
  }

  return response.json();
}

export async function markNotificationAsRead(notificationId) {
  const response = await fetch(`/api/notifications/${notificationId}/read`, {
    method: "PUT",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Lỗi đánh dấu đã đọc");
  }
}
