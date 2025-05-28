import express from "express";
import authRoutes from "./auth.routes.js";
import medicalroutes from "./medical.routes.js"

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/medical",medicalroutes)

export default router;
