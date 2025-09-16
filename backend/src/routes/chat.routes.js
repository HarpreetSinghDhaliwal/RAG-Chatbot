import { Router } from "express";
import { handleChat, getHistory, resetHistory } from "../controllers/chat.controller.js";

const router = Router();

router.post("/", handleChat);
router.get("/:sessionId", getHistory);
router.post("/reset/:sessionId", resetHistory);

export default router;
