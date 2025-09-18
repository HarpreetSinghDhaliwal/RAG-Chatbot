import { Router } from "express";
import { chat, history, reset } from "../controllers/chat.controller.js";

const router = Router();

router.post("/", chat);
router.get("/history", history);
router.post("/reset", reset);

export default router;
