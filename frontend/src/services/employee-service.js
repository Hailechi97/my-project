// frontend/src/services/employee-service.js
const employeeService = {
  async getEmployees(filters = {}) {
    const response = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(filters),
      credentials: "include",
    });
    const data = await response.json();
    return data.employees || [];
  },

  async getEmployeeById(id) {
    const response = await fetch(`/api/employees/${id}`, {
      credentials: "include",
    });
    const data = await response.json();
    return data.employee || {};
  },

  async addEmployee(employee) {
    const response = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(employee),
      credentials: "include",
    });
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
