import express from "express";
const router = express.Router();

import superadminBookingController from "../controllers/superadmin.booking.controller.js";
import { superadminChecker } from "../middlewares/authchecker.middleware.js";

router.post('/allorders',superadminChecker,superadminBookingController.allorderfromsuperadmin)

export default router;