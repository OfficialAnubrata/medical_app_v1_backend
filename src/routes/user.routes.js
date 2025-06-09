import express from "express";
import {
  superadminChecker,
  userChecker,
} from "../middlewares/authchecker.middleware.js";
import patientController from "../controllers/patient.controller.js";

const router = express.Router();

router.post('/addpaitents',userChecker,patientController.addPatient)
router.post('/getallpatients',userChecker,patientController.getAllPatients)

export default router;