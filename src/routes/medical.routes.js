import express from "express";
import {
  superadminChecker,
  userChecker,
} from "../middlewares/authchecker.middleware.js";
import medicalcontroller from "../controllers/medical.controller.js";
import testController from "../controllers/test.controller.js";
import testcatalougeController from "../controllers/testcatalouge.controller.js";
import { validateMedicalCentreInput } from "../validators/medical.validator.js";
import { upload } from "../middlewares/multer.middleware.js";
import medicalController from "../controllers/medical.controller.js";
const router = express.Router();

router.post(
  "/addmedicalcentre",
  superadminChecker,
  validateMedicalCentreInput,
  upload.single("logo"),
  medicalcontroller.addmedicalcentre
);
router.post(
  "/updatemedicalcentre/:medicalcentre_id",
  superadminChecker,
  validateMedicalCentreInput,
  upload.single("logo"),
  medicalcontroller.editMedicalCentre
)
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
  "/update_tests_catalouge/:test_id",
  superadminChecker,
  testcatalougeController.patchTestCatalog
);
router.post(
  "/delete_tests_catalouge/:test_id",
  superadminChecker,
  testcatalougeController.deleteTestCatalog
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

router.post(
  "/medical-centre/:medicalcentre_id/deletetest/:test_id",
  superadminChecker,
  testController.deleteTestFromMedicalCentre
)

router.post("/fetchtesttypes", userChecker, testController.fetchtesttypes);

router.post("/fetchtests/user", userChecker, medicalController.getTests);

router.post("/fetchthreeRandomtests/user", userChecker, medicalController.getThreeRandomTests);
export default router;
