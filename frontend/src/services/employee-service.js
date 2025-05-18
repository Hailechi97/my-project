// frontend/src/services/employee-service.js
const employeeService = {
  async getEmployees(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    const response = await fetch(`/api/employees${query ? `?${query}` : ""}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Không thể lấy danh sách nhân viên");
    }
    const data = await response.json();
    console.log("Dữ liệu trả về từ API /api/employees:", data);
    const employees = data.employees || [];
    const mappedEmployees = employees.map((employee) => {
      console.log("Ánh xạ từng nhân viên:", employee);
      return {
        id: employee.EmpID,
        name: `${employee.FirstName || ""} ${employee.LastName || ""}`.trim(),
        employeeId: employee.EmpID,
        role: employee.ChucVu || "Nhân viên",
        status: employee.Status === "Hoạt động" ? "active" : "inactive",
        department: employee.Department || "Chưa xác định",
        avatar: employee.Photo ? `/avatars/${employee.Photo}` : null,
      };
    });
    console.log("Danh sách nhân viên sau khi ánh xạ:", mappedEmployees);
    return mappedEmployees;
  },

  async getEmployeeById(id) {
    const response = await fetch(`/api/employees/${id}`, {
      credentials: "include",
    });
    const data = await response.json();
    return data.employee || {};
  },

  async addEmployee(employee) {
    if (
      !employee.lastName ||
      !employee.firstName ||
      !employee.employeeId ||
      !employee.role ||
      !employee.department
    ) {
      throw new Error(
        "Thiếu thông tin bắt buộc: lastName, firstName, employeeId, role, department"
      );
    }
    const response = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(employee),
      credentials: "include",
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Không thể thêm nhân viên");
    }
    return response.json();
  },

  async deleteEmployee(id) {
    const response = await fetch(`/api/employees/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    return response.json();
  },

  async updateEmployee(id, updates) {
    const response = await fetch(`/api/employees/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
      credentials: "include",
    });
    return response.json();
  },
};

export default employeeService;
