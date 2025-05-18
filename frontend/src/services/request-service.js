const BASE_URL = "/api";

export async function getCurrentUser() {
  return await fetch(`${BASE_URL}/user`, {
    credentials: "include",
  });
}

export async function getNotifications() {
  return await fetch(`${BASE_URL}/notifications`, {
    credentials: "include",
  });
}

export async function markNotificationAsRead(notificationId) {
  return await fetch(`${BASE_URL}/notifications/${notificationId}/read`, {
    method: "PUT",
    credentials: "include",
  });
}

export async function getPendingRequests() {
  return await fetch(`${BASE_URL}/requests/pending`, {
    credentials: "include",
  });
}

export async function getRequests() {
  return await fetch(`${BASE_URL}/requests`, {
    credentials: "include",
  });
}

export async function getRequestDetail(requestId) {
  return await fetch(`${BASE_URL}/requests/${requestId}`, {
    credentials: "include",
  });
}

export async function uploadFile(formData) {
  return await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });
}

export async function createRequest(payload) {
  return await fetch(`${BASE_URL}/requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    credentials: "include",
  });
}

export async function updateRequestStatus(requestId, payload) {
  return await fetch(`${BASE_URL}/requests/${requestId}/status`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    credentials: "include",
  });
}

export async function logout() {
  return await fetch(`${BASE_URL}/logout`, {
    method: "POST",
    credentials: "include",
  });
}
