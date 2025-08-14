import express from "express";
const router = express.Router();

import superadminBookingController from "../controllers/superadmin.booking.controller.js";
import { superadminChecker } from "../middlewares/authchecker.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

router.post('/allorders',superadminChecker,superadminBookingController.allorderfromsuperadmin)
router.post('/changeteststatus/:booking_id',superadminChecker,upload.single('reportFile'),superadminBookingController.changeteststatusbysuperadmin)

export default router;