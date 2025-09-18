import { Router } from "express";
import chatRoutes from "./chat.routes.js";

const router = Router();

router.use("/chat", chatRoutes);

export default router;
