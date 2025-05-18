import express from "express";
const router = express.Router();
import { isAuthenticated } from "../middleware/auth.js";
import {
  getSchedule,
  createSchedule,
  deleteSchedule,
  updateSchedule,
} from "../controllers/scheduleController.js";

router.get("/schedule", isAuthenticated, getSchedule);
router.post("/schedule", isAuthenticated, createSchedule);
router.delete("/schedule/:id", isAuthenticated, deleteSchedule);
router.put("/schedule/:id", isAuthenticated, updateSchedule);

export default router;
