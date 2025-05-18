import express from "express";
const router = express.Router();
import { isAuthenticated } from "../middleware/auth.js";
import { createPost, getPosts } from "../controllers/postController.js";

router.post("/posts", isAuthenticated, createPost);
router.get("/posts", isAuthenticated, getPosts);

export default router;
