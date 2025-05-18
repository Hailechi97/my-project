import express from "express";
const router = express.Router();
import { isAuthenticated } from "../middleware/auth.js";
import {
  createRequest,
  getRequests,
  getPendingRequests,
  getRequestDetails,
  updateRequestStatus,
} from "../controllers/requestController.js";

router.post("/requests", isAuthenticated, createRequest);
router.get("/requests", isAuthenticated, getRequests);
router.get("/requests/pending", isAuthenticated, getPendingRequests);
router.get("/requests/:id", isAuthenticated, getRequestDetails);
router.put("/requests/:id/status", isAuthenticated, updateRequestStatus);

export default router;
