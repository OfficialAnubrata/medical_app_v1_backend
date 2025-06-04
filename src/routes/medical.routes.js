import express from "express";
import {superadminChecker, userChecker} from "../middlewares/authchecker.middleware.js";
import medicalcontroller from "../controllers/medical.controller.js"
import {validateMedicalCentreInput} from "../validators/medical.validator.js";
const router = express.Router();


router.post('/addmedicalcentre',superadminChecker,validateMedicalCentreInput,medicalcontroller.addmedicalcentre )
router.patch('/verifycentres/:medicalCentreId',superadminChecker,medicalcontroller.verifyCentre)
router.get('/getallmedicalcentres',superadminChecker,medicalcontroller.getAllMedicalCentres)
router.post('/getnearestmedicalcentres',userChecker,medicalcontroller.getNearestMedicalCentres)
export default router;