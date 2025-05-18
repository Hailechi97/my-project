import mysql from "mysql2/promise";

export const connectDB = async () => {
  try {
    const pool = await mysql.createPool({
      host: "localhost",
      user: "root",
      password: "123456", // Thay bằng password thực tế
      database: "EmployeeManagement",
    });
    console.log("Kết nối database thành công");
    return pool;
  } catch (error) {
    console.error("Lỗi kết nối database:", error);
    throw error;
  }
};
