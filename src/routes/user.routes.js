import express from "express";
import {
  superadminChecker,
  userChecker,
} from "../middlewares/authchecker.middleware.js";
import patientController from "../controllers/patient.controller.js";
import bookingController from "../controllers/booking.controller.js";

const router = express.Router();

router.post('/addpaitents',userChecker,patientController.addPatient)
router.post('/getallpatients',userChecker,patientController.getAllPatients)
router.post('/postaddress',userChecker,patientController.addAddress)
router.post('/getalladdresses',userChecker,patientController.getAllAddresses)
router.post('/addbooking',userChecker,bookingController.createBooking)
router.post('/getbookingsummary',userChecker,bookingController.getTestSummary)

export default router;