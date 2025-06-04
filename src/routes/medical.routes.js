import express from "express";
import {superadminChecker, userChecker} from "../middlewares/authchecker.middleware.js";
import medicalcontroller from "../controllers/medical.controller.js"
import {validateMedicalCentreInput} from "../validators/medical.validator.js";
const router = express.Router();


router.post('/addmedicalcentre',superadminChecker,validateMedicalCentreInput,medicalcontroller.addmedicalcentre )
router.post('/verifycentres/:medicalCentreId',superadminChecker,medicalcontroller.verifyCentre)
router.post('/getallmedicalcentres',superadminChecker,medicalcontroller.getAllMedicalCentres)
router.post('/getnearestmedicalcentres',userChecker,medicalcontroller.getNearestMedicalCentres)
router.post('/deletemedicalcentre/:id',superadminChecker,medicalcontroller.deleteMedicalCentre)
export default router;