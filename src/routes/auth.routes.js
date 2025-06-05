import express from "express";
const router = express.Router();
import authcontroller from "../controllers/auth.controller.js"
import { validateLogin, validateSignup } from "../validators/auth.validators.js";
import { refreshAccessToken } from "../controllers/refresh.controller.js";

router.post("/login",validateLogin,authcontroller.login);

router.post("/signup",validateSignup,authcontroller.signup);

router.post("/superadmin/signup",validateLogin,authcontroller.superadminsignup);

router.post("/superadmin/login",validateLogin,authcontroller.superadminlogin);

router.post("/medicalcentre/login",validateLogin,authcontroller.medicalCentreLogin);

router.post('/refresh', refreshAccessToken);

export default router;
