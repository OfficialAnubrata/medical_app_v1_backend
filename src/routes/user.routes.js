import express from "express";
import {
  superadminChecker,
  userChecker,
} from "../middlewares/authchecker.middleware.js";
import patientController from "../controllers/patient.controller.js";
import bookingController from "../controllers/booking.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import authController from "../controllers/auth.controller.js";

const router = express.Router();

router.post('/addpaitents',userChecker,upload.single('prescription'),patientController.addPatient)
router.post('/getallpatients',userChecker,patientController.getAllPatients)
router.post('/postaddress',userChecker,patientController.addAddress)
router.post('/getalladdresses',userChecker,patientController.getAllAddresses)
router.post('/addbooking',userChecker,bookingController.createBooking)
router.post('/getbookingsummary',userChecker,bookingController.getTestSummary)
router.post('/allorders',userChecker,bookingController.allordersuser)
router.post('/bookingdetails/:booking_id',userChecker,bookingController.getBookingById);
router.post('/addprescription/:patient_id',userChecker,upload.single('prescription'),patientController.addPrescription)
router.post("/distance",userChecker,bookingController.distancebetweenpoints)
router.post('/userdetails', userChecker, authController.userdetails);
router.post('/editpatient/:patient_id', userChecker,  upload.single("prescription"),  patientController.editPatient);
router.post('/userreport', userChecker, bookingController.userReportFetch);

export default router;