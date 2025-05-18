export async function fetchComments(postId) {
  const response = await fetch(`/api/comments/${postId}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Lỗi tải bình luận");
  }

  return response.json();
}

export async function addComment(postId, content) {
  const response = await fetch("/api/comments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ postId, content }),
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

export async function updateComment(commentId, content) {
  const response = await fetch(`/api/comments/${commentId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content }),
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

export async function deleteComment(commentId) {
  const response = await fetch(`/api/comments/${commentId}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}
