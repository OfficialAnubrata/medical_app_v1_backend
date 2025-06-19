import express from "express";
import authRoutes from "./auth.routes.js";
import medicalroutes from "./medical.routes.js"
import userRoutes from "./user.routes.js"
import superadminbookingroutes from "./superadmin.routes.js"

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/medical",medicalroutes)
router.use("/user",userRoutes)
router.use("/superadmin",superadminbookingroutes)

export default router;
