export async function createDeleteRequest(
  postId,
  commentId,
  requesterId,
  department
) {
  const response = await fetch("/api/delete-request", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      postId,
      commentId,
      requesterId,
      department,
    }),
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error((await response.text()) || "Lỗi tạo yêu cầu xóa");
  }

  return response.json();
}

export async function fetchDeleteRequests() {
  const response = await fetch("/api/delete-requests", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error((await response.text()) || "Lỗi tải danh sách yêu cầu xóa");
  }

  return response.json();
}

export async function handleDeleteRequest(requestId, action) {
  const response = await fetch(`/api/delete-request/${requestId}/${action}`, {
    method: "PUT",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error((await response.text()) || "Lỗi xử lý yêu cầu xóa");
  }
}
