import express from "express";
const router = express.Router();
import { isAuthenticated } from "../middleware/auth.js";
import {
  getNotifications,
  markNotificationAsRead,
} from "../controllers/notificationController.js";

router.get("/notifications", isAuthenticated, getNotifications);
router.put("/notifications/:id/read", isAuthenticated, markNotificationAsRead);

export default router;
