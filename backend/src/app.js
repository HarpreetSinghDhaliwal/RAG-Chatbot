import express from "express";
import dotenv from "dotenv";
import chatRoutes from "./routes/index.js";

dotenv.config();
const app = express();

app.use(express.json());
app.use("/api", chatRoutes);

export default app;
