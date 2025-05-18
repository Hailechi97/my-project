import {
  fetchNotifications,
  markNotificationAsRead,
} from "../services/notification-service.js";
import {
  fetchUser,
  fetchPosts,
  incrementPostView,
  toggleLike,
  createPost,
  updatePost,
  deletePost,
} from "../services/post-service.js";
import {
  fetchComments,
  addComment,
  updateComment,
  deleteComment,
} from "../services/comment-service.js";
import {
  createDeleteRequest,
  fetchDeleteRequests,
  handleDeleteRequest,
} from "../services/delete-request-service.js";

let currentUser = null;
let deleteRequests = new Map();
let currentPage = 1;
const postsPerPage = 5;
let totalPosts = 0;
let searchQuery = "";
let ws;

// Function to initialize WebSocket connection
function initWebSocket() {
  ws = new WebSocket("ws://localhost:8080");
  ws.onopen = () => {
    console.log("Connected to WebSocket server");
  };
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.event === "newNotification" || data.event === "updateRequest") {
      fetchNotifications(); // Refresh notifications when a new one arrives
    }
  };
  ws.onclose = () => {
    console.log("Disconnected from WebSocket server. Reconnecting...");
    setTimeout(initWebSocket, 5000); // Reconnect after 5 seconds
  };
  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
  };
}

// Function to render notifications in the dropdown
function renderNotifications(notifications) {
  const notificationList = document.getElementById("notificationList");
  const notificationCount = document.getElementById("notificationCount");
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Update notification count
  if (unreadCount > 0) {
    notificationCount.textContent = unreadCount;
    notificationCount.style.display = "inline-block";
  } else {
    notificationCount.style.display = "none";
  }

  // Render notifications
  if (notifications.length === 0) {
    notificationList.innerHTML =
      '<div style="padding: 10px; text-align: center;">Không có thông báo</div>';
    return;
  }

  notificationList.innerHTML = notifications
    .map(
      (notification) => `
        <div class="dropdown-item notification-item ${
          notification.read ? "" : "unread"
        }" data-id="${notification.id}">
          <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas ${
              notification.type === "request"
                ? "fa-file-alt"
                : notification.type === "post"
                ? "fa-newspaper"
                : "fa-bell"
            }"></i>
            <div style="flex: 1;">
              <strong>${notification.title}</strong>
              <div style="font-size: 0.85rem; color: #6c757d;">${
                notification.content
              }</div>
              <div style="font-size: 0.8rem; color: #6c757d;">${new Date(
                notification.date
              ).toLocaleString("vi-VN")}</div>
            </div>
          </div>
        </div>
      `
    )
    .join("");

  // Add click event to mark as read and redirect
  document.querySelectorAll(".notification-item").forEach((item) => {
    item.addEventListener("click", async (e) => {
      const notificationId = item.dataset.id;
      const notification = notifications.find((n) => n.id == notificationId);

      // Mark as read
      if (!notification.read) {
        try {
          await markNotificationAsRead(notificationId);
          fetchNotifications(); // Refresh notifications
        } catch (error) {
          console.error("Lỗi:", error);
        }
      }

      // Redirect to details link if exists
      if (notification.detailsLink) {
        window.location.href = notification.detailsLink;
      }
    });
  });
}

// Handle notification dropdown
const notificationBell = document.getElementById("notificationBell");
const notificationCount = document.getElementById("notificationCount");
const notificationDropdown = document.getElementById("notificationDropdown");

notificationBell.addEventListener("click", (e) => {
  e.stopPropagation();
  notificationDropdown.classList.toggle("show");
  fetchNotifications();
});

notificationCount.addEventListener("click", (e) => {
  e.stopPropagation();
  notificationDropdown.classList.toggle("show");
  fetchNotifications();
});

document.addEventListener("click", (e) => {
  if (
    !notificationBell.contains(e.target) &&
    !notificationDropdown.contains(e.target) &&
    !notificationCount.contains(e.target)
  ) {
    notificationDropdown.classList.remove("show");
  }
});

// Cập nhật thông tin user
function updateUserInfo(user) {
  const avatarImg = document.getElementById("userAvatarImg");
  const userName = document.getElementById("userName");

  userName.textContent = `${user.FirstName} ${user.LastName}`;

  if (user.Photo) {
    avatarImg.src = `/uploads/${user.Photo}`;
  } else {
    const avatarDiv = document.getElementById("userAvatar");
    avatarDiv.innerHTML = user.FirstName.charAt(0) + user.LastName.charAt(0);
    avatarDiv.style.display = "flex";
    avatarDiv.style.alignItems = "center";
    avatarDiv.style.justifyContent = "center";
    avatarDiv.style.backgroundColor = "#4e73df";
    avatarDiv.style.color = "white";
    avatarDiv.style.fontWeight = "bold";
  }
}

// Tạo HTML cho 1 bài viết forum
function createPostElement(post) {
  const postDate = new Date(post.PostedDate).toLocaleString("vi-VN");
  const isAuthor = currentUser && currentUser.UserID === post.UserID;

  const postElement = document.createElement("div");
  postElement.className = "post";
  postElement.dataset.postId = post.PostID;

  postElement.innerHTML = `
    <div class="post-header">
      <div class="author-avatar">
        ${
          post.Photo
            ? `<img src="/uploads/${post.Photo}" alt="${post.FirstName} ${post.LastName}">`
            : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#4e73df;color:white;font-weight:bold">
            ${post.FirstName.charAt(0)}${post.LastName.charAt(0)}
          </div>`
        }
      </div>
      <div class="author-info">
        <div class="author-name">${post.FirstName} ${post.LastName}</div>
        <div class="post-meta">
          <span>${post.Department}</span>
          <span>•</span>
          <span>${postDate}</span>
        </div>
      </div>
    </div>
    
    <div class="post-content" id="post-content-${post.PostID}">
      <h3 id="post-title-${post.PostID}">${post.Title}</h3>
      <p id="post-body-${post.PostID}">${post.Content}</p>
      ${
        post.ImageURL
          ? `<img src="/uploads/${post.ImageURL}" alt="Post Image" class="post-image">`
          : ""
      }
    </div>
    
    <div class="post-stats">
      <span><i class="far fa-eye"></i> ${post.Views || 0} lượt xem</span>
      <span><i class="far fa-thumbs-up"></i> ${
        post.Likes || 0
      } lượt thích</span>
    </div>
    
    <div class="post-footer">
      <button class="action-btn like-btn ${
        post.userLikeStatus === true ? "liked" : ""
      }" data-post-id="${post.PostID}" onclick="toggleLike(${post.PostID})">
        <i class="far fa-thumbs-up"></i>
        <span>Thích (${post.Likes || 0})</span>
      </button>
      <button class="action-btn comment-toggle-btn" data-post-id="${
        post.PostID
      }">
        <i class="far fa-comment"></i>
        <span>Bình luận (${post.commentCount || 0})</span>
      </button>
    </div>
    
    <div class="comments-container" id="comments-container-${post.PostID}">
      <div class="comments-list" id="comments-list-${post.PostID}"></div>
      <div class="comment-form">
        <input type="text" class="comment-input" id="comment-input-${
          post.PostID
        }" placeholder="Viết bình luận...">
        <button class="comment-submit" onclick="addComment(${post.PostID})">
          <i class="fas fa-paper-plane"></i>
        </button>
      </div>
    </div>
    <div class="options-menu">
      <button class="options-btn" onclick="toggleOptionsMenu('post-options-${
        post.PostID
      }')">
        <i class="fas fa-ellipsis-h"></i>
      </button>
      <div class="options-dropdown" id="post-options-${post.PostID}">
        ${
          isAuthor
            ? `
        <a href="#" class="options-item" onclick="editPost(${post.PostID}); return false;">Sửa</a>
      `
            : ""
        }
        <a href="#" class="options-item delete" id="delete-post-${
          post.PostID
        }" onclick="deletePost(${post.PostID}, '${
    post.Department
  }'); return false;">Xóa</a>
      </div>
    </div>
  `;

  // Thêm sự kiện toggle bình luận
  const toggleBtn = postElement.querySelector(".comment-toggle-btn");
  toggleBtn.addEventListener("click", () => toggleComments(post.PostID));

  // Gửi yêu cầu tăng lượt xem
  incrementPostView(post.PostID);

  return postElement;
}

// Tạo HTML cho 1 bình luận
function createCommentElement(comment) {
  const commentDate = new Date(comment.CommentDate).toLocaleString("vi-VN");
  const isAuthor = currentUser && currentUser.UserID === comment.UserID;

  const commentElement = document.createElement("div");
  commentElement.className = "comment";
  commentElement.dataset.commentId = comment.CommentID;

  commentElement.innerHTML = `
    <div class="comment-avatar">
      ${
        comment.Photo
          ? `<img src="/uploads/${comment.Photo}" alt="${comment.FirstName} ${comment.LastName}">`
          : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#4e73df;color:white;font-weight:bold">
          ${comment.FirstName.charAt(0)}${comment.LastName.charAt(0)}
        </div>`
      }
    </div>
    <div class="comment-body">
      <div class="comment-author">${comment.FirstName} ${comment.LastName}</div>
      <div class="comment-meta" style="font-size:0.8rem;color:#6c757d">${commentDate}</div>
      <div class="comment-content" id="comment-content-${comment.CommentID}">${
    comment.Content
  }</div>
    </div>
    <div class="options-menu">
      <button class="options-btn" onclick="toggleOptionsMenu('comment-options-${
        comment.CommentID
      }')">
        <i class="fas fa-ellipsis-h"></i>
      </button>
      <div class="options-dropdown" id="comment-options-${comment.CommentID}">
        ${
          isAuthor
            ? `
        <a href="#" class="options-item" onclick="editComment(${comment.CommentID}, ${comment.PostID}); return false;">Sửa</a>
      `
            : ""
        }
        <a href="#" class="options-item delete" id="delete-comment-${
          comment.CommentID
        }" onclick="deleteComment(${comment.CommentID}, ${comment.PostID}, '${
    comment.Department
  }'); return false;">Xóa</a>
      </div>
    </div>
  `;

  return commentElement;
}

// Toggle menu ba chấm
window.toggleOptionsMenu = function (menuId) {
  const menu = document.getElementById(menuId);
  const isShown = menu.classList.contains("show");

  document.querySelectorAll(".options-dropdown").forEach((dropdown) => {
    dropdown.classList.remove("show");
  });

  if (!isShown) {
    menu.classList.add("show");
  }
};

// Ẩn menu ba chấm khi nhấp ra ngoài
document.addEventListener("click", (e) => {
  if (!e.target.closest(".options-menu")) {
    document.querySelectorAll(".options-dropdown").forEach((dropdown) => {
      dropdown.classList.remove("show");
    });
  }
});

// Hiển thị bài viết forum
function renderPosts(posts) {
  const container = document.getElementById("postsContainer");

  if (posts.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem; color: var(--dark);">
        <i class="fas fa-comment-slash" style="font-size: 3rem; opacity: 0.5; margin-bottom: 1rem;"></i>
        <h3>Chưa có bài viết nào</h3>
        <p>Hãy là người đầu tiên đăng bài!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = "";

  posts.forEach((post) => {
    const postElement = createPostElement(post);
    container.appendChild(postElement);
  });
}

// Hiển thị phân trang
function renderPagination() {
  const totalPages = Math.ceil(totalPosts / postsPerPage);
  const pagination = document.getElementById("pagination");
  pagination.innerHTML = "";

  if (totalPages <= 1) return;

  // Nút Previous
  const prevBtn = document.createElement("button");
  prevBtn.className = "page-btn";
  prevBtn.textContent = "Trước";
  prevBtn.classList.toggle("disabled", currentPage === 1);
  prevBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      loadPosts();
    }
  });
  pagination.appendChild(prevBtn);

  // Các nút số trang
  for (let i = 1; i <= totalPages; i++) {
    const pageBtn = document.createElement("button");
    pageBtn.className = "page-btn";
    pageBtn.classList.toggle("active", i === currentPage);
    pageBtn.textContent = i;
    pageBtn.addEventListener("click", () => {
      currentPage = i;
      loadPosts();
    });
    pagination.appendChild(pageBtn);
  }

  // Nút Next
  const nextBtn = document.createElement("button");
  nextBtn.className = "page-btn";
  nextBtn.textContent = "Sau";
  nextBtn.classList.toggle("disabled", currentPage === totalPages);
  nextBtn.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      loadPosts();
    }
  });
  pagination.appendChild(nextBtn);
}

// Hiển thị danh sách yêu cầu xóa
function renderDeleteRequests(requests) {
  const container = document.getElementById("postsContainer");
  container.innerHTML = `
    <div class="delete-requests">
      <h2 style="color: var(--primary); margin-bottom: 1rem;">Danh sách yêu cầu xóa nội dung</h2>
      <div class="requests-list">
        ${
          requests.length === 0
            ? "<p>Không có yêu cầu nào</p>"
            : requests
                .map(
                  (request) => `
              <div class="request-item">
                <div class="request-info">
                  <p><strong>Người yêu cầu:</strong> ${
                    request.requesterName
                  }</p>
                  <p><strong>Loại nội dung:</strong> ${
                    request.postId ? "Bài viết" : "Bình luận"
                  }</p>
                  <p><strong>ID:</strong> ${
                    request.postId || request.commentId
                  }</p>
                  <p><strong>Thời gian:</strong> ${new Date(
                    request.createdAt
                  ).toLocaleString("vi-VN")}</p>
                </div>
                <div class="request-actions">
                  <button class="approve-btn" data-request-id="${
                    request.id
                  }" onclick="handleDeleteRequest(${
                    request.id
                  }, 'approve')">Phê duyệt</button>
                  <button class="reject-btn" data-request-id="${
                    request.id
                  }" onclick="handleDeleteRequest(${
                    request.id
                  }, 'reject')">Từ chối</button>
                </div>
              </div>
            `
                )
                .join("")
        }
      </div>
    </div>
  `;
}

// Khởi tạo khi trang load
document.addEventListener("DOMContentLoaded", async () => {
  // Initialize WebSocket
  initWebSocket();

  // Fetch notifications on page load
  fetchNotifications();

  // Lấy thông tin user
  try {
    currentUser = await fetchUser();
    updateUserInfo(currentUser);

    // Hiển thị mục "Yêu cầu xóa" cho trưởng phòng
    if (currentUser.Role === "Manager") {
      const deleteRequestsMenu = document.getElementById("deleteRequestsMenu");
      deleteRequestsMenu.style.display = "block";
      deleteRequestsMenu.innerHTML = `
        <a href="/delete-requests">
          <i class="fas fa-trash-alt"></i>
          <span>Yêu cầu xóa</span>
        </a>
      `;
    }

    // Kiểm tra nếu đang ở trang yêu cầu xóa
    const currentPath = window.location.pathname;
    if (currentPath === "/delete-requests" && currentUser.Role === "Manager") {
      loadDeleteRequests();
    } else {
      loadPosts();
    }
  } catch (error) {
    console.error("Lỗi:", error);
    window.location.href = "/";
  }

  // Xử lý đăng bài
  document.getElementById("postBtn").addEventListener("click", createPost);

  // Xử lý tìm kiếm
  document.getElementById("searchBtn").addEventListener("click", () => {
    searchQuery = document.getElementById("searchInput").value.trim();
    currentPage = 1;
    loadPosts();
  });

  document.getElementById("searchInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      searchQuery = e.target.value.trim();
      currentPage = 1;
      loadPosts();
    }
  });

  // Xử lý preview hình ảnh
  const postImageInput = document.getElementById("postImage");
  const postImagePreview = document.getElementById("postImagePreview");
  postImageInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      postImagePreview.src = URL.createObjectURL(file);
      postImagePreview.style.display = "block";
    } else {
      postImagePreview.style.display = "none";
    }
  });
});

// Tải danh sách bài viết forum
async function loadPosts() {
  try {
    // Đảm bảo searchQuery không chứa các ký tự không hợp lệ
    const safeSearchQuery = searchQuery.replace(/[^a-zA-Z0-9\s]/g, ""); // Chỉ giữ lại chữ cái, số và khoảng trắng
    const data = await fetchPosts(currentPage, postsPerPage, safeSearchQuery);
    totalPosts = data.total;
    renderPosts(data.posts);
    renderPagination();
  } catch (error) {
    console.error("Lỗi:", error);
    document.getElementById("postsContainer").innerHTML = `
      <div class="error" style="text-align: center; padding: 2rem; color: var(--danger);">
        <i class="fas fa-exclamation-triangle"></i> ${error.message}
      </div>
    `;
  }
}

// Toggle hiển thị bình luận
async function toggleComments(postId) {
  const container = document.getElementById(`comments-container-${postId}`);
  const commentsList = document.getElementById(`comments-list-${postId}`);

  if (container.classList.contains("show")) {
    container.classList.remove("show");
  } else {
    if (commentsList.innerHTML === "") {
      try {
        const comments = await fetchComments(postId);

        if (comments.length === 0) {
          commentsList.innerHTML =
            '<div class="no-comments">Chưa có bình luận nào</div>';
        } else {
          comments.forEach((comment) => {
            const commentElement = createCommentElement(comment);
            commentsList.appendChild(commentElement);
          });
        }
      } catch (error) {
        console.error("Lỗi:", error);
        commentsList.innerHTML = `<div class="error">Lỗi tải bình luận</div>`;
      }
    }

    container.classList.add("show");
  }
}

// Thích bài viết
window.toggleLike = async function (postId) {
  try {
    const likeBtn = document.querySelector(
      `.like-btn[data-post-id="${postId}"]`
    );
    const isCurrentlyLiked = likeBtn.classList.contains("liked");
    const likeStatus = !isCurrentlyLiked;

    const data = await toggleLike(postId, likeStatus);
    likeBtn.classList.toggle("liked", data.userLikeStatus === true);
    likeBtn.querySelector("span").textContent = `Thích (${data.likes})`;
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Lỗi khi thích bài viết: " + error.message);
  }
};

// Sửa bài viết
window.editPost = function (postId) {
  const titleElement = document.getElementById(`post-title-${postId}`);
  const bodyElement = document.getElementById(`post-body-${postId}`);
  const contentElement = document.getElementById(`post-content-${postId}`);

  const currentTitle = titleElement.textContent;
  const currentBody = bodyElement.textContent;

  contentElement.innerHTML = `
    <input type="text" id="edit-title-${postId}" value="${currentTitle}" class="post-input" style="margin-bottom: 10px;">
    <textarea id="edit-body-${postId}" class="post-input post-content">${currentBody}</textarea>
    <button class="post-btn" onclick="savePost(${postId})">Lưu</button>
    <button class="action-btn" onclick="cancelEditPost(${postId}, '${currentTitle}', '${currentBody}')">Hủy</button>
  `;
};

// Lưu bài viết đã sửa
window.savePost = async function (postId) {
  const newTitle = document.getElementById(`edit-title-${postId}`).value.trim();
  const newBody = document.getElementById(`edit-body-${postId}`).value.trim();

  if (!newTitle || !newBody) {
    alert("Vui lòng nhập tiêu đề và nội dung");
    return;
  }

  try {
    const updatedPost = await updatePost(postId, newTitle, newBody);
    const contentElement = document.getElementById(`post-content-${postId}`);
    contentElement.innerHTML = `
      <h3 id="post-title-${postId}">${updatedPost.Title}</h3>
      <p id="post-body-${postId}">${updatedPost.Content}</p>
      ${
        updatedPost.ImageURL
          ? `<img src="/uploads/${updatedPost.ImageURL}" alt="Post Image" class="post-image">`
          : ""
      }
    `;
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Lỗi khi sửa bài viết: " + error.message);
  }
};

// Hủy sửa bài viết
window.cancelEditPost = function (postId, originalTitle, originalBody) {
  const contentElement = document.getElementById(`post-content-${postId}`);
  contentElement.innerHTML = `
    <h3 id="post-title-${postId}">${originalTitle}</h3>
    <p id="post-body-${postId}">${originalBody}</p>
  `;
};

// Xóa bài viết
window.deletePost = async function (postId, department) {
  if (currentUser.Role === "Manager" && currentUser.Department === department) {
    if (!confirm("Bạn có chắc chắn muốn xóa bài viết này?")) return;

    try {
      await deletePost(postId);
      const postElement = document.querySelector(
        `.post[data-post-id="${postId}"]`
      );
      postElement.remove();

      totalPosts--;
      if (currentPage > Math.ceil(totalPosts / postsPerPage)) {
        currentPage = Math.max(1, currentPage - 1);
      }
      loadPosts();
      alert("Xóa bài viết thành công");
    } catch (error) {
      console.error("Lỗi:", error);
      alert("Lỗi khi xóa bài viết: " + error.message);
    }
  } else {
    if (deleteRequests.has(`post-${postId}`)) {
      alert("Yêu cầu xóa bài viết này đang chờ xử lý");
      return;
    }

    try {
      await createDeleteRequest(
        postId,
        null,
        currentUser.UserID,
        currentUser.Department
      );
      deleteRequests.set(`post-${postId}`, true);
      const deleteBtn = document.getElementById(`delete-post-${postId}`);
      deleteBtn.textContent = "Đã gửi yêu cầu xóa";
      deleteBtn.classList.add("disabled");
      deleteBtn.onclick = (e) => {
        e.preventDefault();
        alert("Yêu cầu xóa đang chờ xử lý");
      };
      alert("Yêu cầu xóa đã được gửi đến trưởng phòng");
    } catch (error) {
      console.error("Lỗi:", error);
      alert("Lỗi khi gửi yêu cầu xóa: " + error.message);
    }
  }
};

// Sửa bình luận
window.editComment = function (commentId, postId) {
  const contentElement = document.getElementById(
    `comment-content-${commentId}`
  );
  const currentContent = contentElement.textContent;

  contentElement.innerHTML = `
    <textarea id="edit-comment-${commentId}" class="comment-input">${currentContent}</textarea>
    <button class="comment-submit" onclick="saveComment(${commentId}, ${postId})">Lưu</button>
    <button class="action-btn" onclick="cancelEditComment(${commentId}, '${currentContent}')">Hủy</button>
  `;
};

// Lưu bình luận đã sửa
window.saveComment = async function (commentId, postId) {
  const newContent = document
    .getElementById(`edit-comment-${commentId}`)
    .value.trim();

  if (!newContent) {
    alert("Vui lòng nhập nội dung bình luận");
    return;
  }

  try {
    const updatedComment = await updateComment(commentId, newContent);
    const contentElement = document.getElementById(
      `comment-content-${commentId}`
    );
    contentElement.innerHTML = updatedComment.Content;
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Lỗi khi sửa bình luận: " + error.message);
  }
};

// Hủy sửa bình luận
window.cancelEditComment = function (commentId, originalContent) {
  const contentElement = document.getElementById(
    `comment-content-${commentId}`
  );
  contentElement.innerHTML = originalContent;
};

// Xóa bình luận
window.deleteComment = async function (commentId, postId, department) {
  if (currentUser.Role === "Manager" && currentUser.Department === department) {
    if (!confirm("Bạn có chắc chắn muốn xóa bình luận này?")) return;

    try {
      await deleteComment(commentId);
      const commentElement = document.querySelector(
        `.comment[data-comment-id="${commentId}"]`
      );
      commentElement.remove();

      const commentsList = document.getElementById(`comments-list-${postId}`);
      if (!commentsList.children.length) {
        commentsList.innerHTML =
          '<div class="no-comments">Chưa có bình luận nào</div>';
      }

      const commentBtn = document.querySelector(
        `.comment-toggle-btn[data-post-id="${postId}"]`
      );
      if (commentBtn) {
        const countSpan = commentBtn.querySelector("span");
        const currentCount =
          parseInt(countSpan.textContent.match(/\d+/)[0]) || 0;
        countSpan.textContent = `Bình luận (${currentCount - 1})`;
      }

      alert("Xóa bình luận thành công");
    } catch (error) {
      console.error("Lỗi:", error);
      alert("Lỗi khi xóa bình luận: " + error.message);
    }
  } else {
    if (deleteRequests.has(`comment-${commentId}`)) {
      alert("Yêu cầu xóa bình luận này đang chờ xử lý");
      return;
    }

    try {
      await createDeleteRequest(
        null,
        commentId,
        currentUser.UserID,
        currentUser.Department
      );
      deleteRequests.set(`comment-${commentId}`, true);
      const deleteBtn = document.getElementById(`delete-comment-${commentId}`);
      deleteBtn.textContent = "Đã gửi yêu cầu xóa";
      deleteBtn.classList.add("disabled");
      deleteBtn.onclick = (e) => {
        e.preventDefault();
        alert("Yêu cầu xóa đang chờ xử lý");
      };
      alert("Yêu cầu xóa đã được gửi đến trưởng phòng");
    } catch (error) {
      console.error("Lỗi:", error);
      alert("Lỗi khi gửi yêu cầu xóa: " + error.message);
    }
  }
};

// Tải danh sách yêu cầu xóa
async function loadDeleteRequests() {
  if (currentUser.Role !== "Manager") {
    window.location.href = "/forum";
    return;
  }

  try {
    const requests = await fetchDeleteRequests();
    renderDeleteRequests(requests);
  } catch (error) {
    console.error("Lỗi:", error);
    document.getElementById("postsContainer").innerHTML = `
      <div class="error" style="text-align: center; padding: 2rem; color: var(--danger);">
        <i class="fas fa-exclamation-triangle"></i> ${error.message}
      </div>
    `;
  }
}

// Xử lý yêu cầu xóa
window.handleDeleteRequest = async function (requestId, action) {
  try {
    await handleDeleteRequest(requestId, action);
    alert(
      `${action === "approve" ? "Phê duyệt" : "Từ chối"} yêu cầu thành công`
    );
    loadDeleteRequests();
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Lỗi: " + error.message);
  }
};

// Thêm bình luận
window.addComment = async function (postId) {
  const input = document.getElementById(`comment-input-${postId}`);
  const content = input.value.trim();

  if (!content) {
    alert("Vui lòng nhập nội dung bình luận");
    return;
  }

  try {
    const data = await addComment(postId, content);
    const commentsList = document.getElementById(`comments-list-${postId}`);

    if (commentsList.querySelector(".no-comments")) {
      commentsList.innerHTML = "";
    }

    const commentElement = createCommentElement(data.comment);
    commentsList.appendChild(commentElement);
    input.value = "";

    const commentBtn = document.querySelector(
      `.comment-toggle-btn[data-post-id="${postId}"]`
    );
    if (commentBtn) {
      const countSpan = commentBtn.querySelector("span");
      const currentCount = parseInt(countSpan.textContent.match(/\d+/)[0]) || 0;
      countSpan.textContent = `Bình luận (${currentCount + 1})`;
    }
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Lỗi khi thêm bình luận: " + error.message);
  }
};
