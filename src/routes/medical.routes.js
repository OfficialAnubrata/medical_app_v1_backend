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
  "/tests_catalouge",
  superadminChecker,
  testController.fetchTestCatalog
);
router.post(
  "/tests/assign",
  superadminChecker,
  testController.addTestToMedicalCentre
);

// user tests route
router.post(
  "/tests/centre/:medicalcentre_id",
  userChecker,
  testController.getTestsForMedicalCentre
);
// user tests route
router.post(
  "/superadmin/tests/centre/:medicalcentre_id",
  superadminChecker,
  testController.getTestsForMedicalCentre
);

router.post(
  "/details/:medicalcentre_id",
  userChecker,
  medicalcontroller.getMedicalCentreSummary
);
router.post(
  "/superadmin/details/:medicalcentre_id",
  superadminChecker,
  medicalcontroller.getMedicalCentreSummary
);
export default router;
