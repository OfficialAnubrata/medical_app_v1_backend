import express from "express";
import superadminChecker from "../middlewares/authchecker.middleware.js";
import medicalcontroller from "../controllers/medical.controller.js"
import {validateMedicalCentreInput} from "../validators/medical.validator.js";
const router = express.Router();


router.post('/addmedicalcentre',superadminChecker,validateMedicalCentreInput,medicalcontroller.addmedicalcentre )

export default router;