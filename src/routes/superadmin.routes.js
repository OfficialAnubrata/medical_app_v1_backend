import express from "express";
const router = express.Router();

import superadminBookingController from "../controllers/superadmin.booking.controller.js";
import { superadminChecker } from "../middlewares/authchecker.middleware.js";

router.post('/allorders',superadminChecker,superadminBookingController.allorderfromsuperadmin)
router.post('/changeteststatus/:booking_id',superadminChecker,superadminBookingController.changeteststatusbysuperadmin)

export default router;