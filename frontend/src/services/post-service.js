export async function fetchUser() {
  const response = await fetch("/api/user", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Lỗi lấy thông tin user");
  }

  return response.json();
}

export async function fetchPosts(page, limit, search) {
  const response = await fetch(
    `/api/posts?page=${page}&limit=${limit}&search=${encodeURIComponent(
      search
    )}`,
    {
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error("Lỗi tải bài viết");
  }

  return response.json();
}

export async function incrementPostView(postId) {
  const response = await fetch(`/api/posts/${postId}/view`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Lỗi tăng lượt xem");
  }
}

export async function toggleLike(postId, likeStatus) {
  const response = await fetch(`/api/posts/${postId}/like-dislike`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ likeStatus }),
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

export async function createPost(title, content, imageFile) {
  let imageURL = null;
  if (imageFile) {
    const formData = new FormData();
    formData.append("file", imageFile);
    const uploadResponse = await fetch("/api/upload", {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    if (!uploadResponse.ok) {
      throw new Error("Lỗi upload hình ảnh");
    }

    const uploadResult = await uploadResponse.json();
    imageURL = uploadResult.fileName;
  }

  const response = await fetch("/api/posts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title, content, imageURL }),
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

export async function updatePost(postId, title, content) {
  const response = await fetch(`/api/posts/${postId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title, content }),
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

export async function deletePost(postId) {
  const response = await fetch(`/api/posts/${postId}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}
