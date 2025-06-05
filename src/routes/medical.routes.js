import express from "express";
import {
  superadminChecker,
  userChecker,
} from "../middlewares/authchecker.middleware.js";
import medicalcontroller from "../controllers/medical.controller.js";
import testController from "../controllers/test.controller.js";
import { validateMedicalCentreInput } from "../validators/medical.validator.js";
const router = express.Router();

router.post(
  "/addmedicalcentre",
  superadminChecker,
  validateMedicalCentreInput,
  medicalcontroller.addmedicalcentre
);
router.post(
  "/verifycentres/:medicalCentreId",
  superadminChecker,
  medicalcontroller.verifyCentre
);
router.post(
  "/getallmedicalcentres",
  superadminChecker,
  medicalcontroller.getAllMedicalCentres
);
router.post(
  "/getnearestmedicalcentres",
  userChecker,
  medicalcontroller.getNearestMedicalCentres
);
router.post(
  "/deletemedicalcentre/:id",
  superadminChecker,
  medicalcontroller.deleteMedicalCentre
);
router.post(
  "/addtesttocatalogue",
  superadminChecker,
  testController.addTestCatalog
);
router.post(
  "/tests/assign",
  superadminChecker,
  testController.addTestToMedicalCentre
);



// user tests route
router.post("/tests/centre/:medicalcentre_id", userChecker, testController.getTestsForMedicalCentre);
export default router;
