// frontend/src/main.js
import { createApp } from "vue"; // Hoặc framework bạn dùng, ví dụ: React, nếu dùng
import App from "./App.vue"; // Hoặc file tương ứng

const app = createApp(App);

// Thêm kiểm tra an toàn cho localStorage
let initialState = {};
const storedState = window.localStorage.getItem("redux_store");
if (storedState) {
  try {
    initialState = JSON.parse(storedState);
  } catch (error) {
    console.error("Lỗi khi parse redux_store:", error);
    initialState = {}; // Giá trị mặc định
  }
}

app.mount("#app");
