const scheduleService = {
  // Get schedules for a department within a date range
  getSchedules: async (department, startDate, endDate) => {
    try {
      const response = await fetch(
        `/api/schedule?department=${department}&startDate=${startDate}&endDate=${endDate}`,
        {
          credentials: "include",
        }
      );
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return await response.json();
    } catch (error) {
      throw new Error(error.message || "Lỗi khi tải lịch họp");
    }
  },

  // Create a new schedule
  createSchedule: async (schedule) => {
    try {
      const response = await fetch("/api/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(schedule),
        credentials: "include",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Lỗi không xác định");
      }
      return await response.json();
    } catch (error) {
      throw new Error(error.message || "Lỗi khi tạo lịch họp");
    }
  },

  // Update an existing schedule
  updateSchedule: async (scheduleId, updates) => {
    try {
      const response = await fetch(`/api/schedule/${scheduleId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return await response.json();
    } catch (error) {
      throw new Error(error.message || "Lỗi khi chỉnh sửa lịch họp");
    }
  },

  // Delete a schedule
  deleteSchedule: async (scheduleId) => {
    try {
      const response = await fetch(`/api/schedule/${scheduleId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
    } catch (error) {
      throw new Error(error.message || "Lỗi khi xóa lịch họp");
    }
  },
};

export default scheduleService;
