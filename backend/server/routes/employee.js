import express from "express";
const router = express.Router();
import {
  getEmployees,
  getEmployeeById,
  addEmployee,
  deleteEmployee,
  updateEmployee,
} from "../controllers/employeeController.js";
import { isAuthenticated } from "../middleware/auth.js";

router.use(isAuthenticated);

// Route GET /employees để lấy danh sách nhân viên
// routes/employee.js
router.get("/employees", async (req, res) => {
  try {
    const user = req.session.user;
    const empId = user.EmpID;

    const [userRecord] = await req.db.query(
      "SELECT Department FROM Employees WHERE EmpID = ?",
      [empId]
    );

    if (!userRecord.length) {
      return res.status(404).json({ error: "Người dùng không tồn tại" });
    }

    const department = userRecord[0].Department;

    const [employees] = await req.db.query(
      "SELECT EmpID, FirstName, LastName, Gender, Birthdate, Telephone, Email, Address_loc, Department, ChucVu, CapBac, Photo, ChuKiLuong, LuongCoBan, NgayThamGia, Status FROM Employees WHERE Department = ?",
      [department]
    );

    console.log("Danh sách nhân viên trả về:", employees); // Log dữ liệu
    res.json({ employees });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách nhân viên:", error);
    res.status(500).json({ error: "Lỗi server" });
  }
});

router.post("/employees", addEmployee);
router.get("/employees/:id", getEmployeeById);
router.delete("/employees/:id", deleteEmployee);
router.put("/employees/:id", updateEmployee);

export default router;
