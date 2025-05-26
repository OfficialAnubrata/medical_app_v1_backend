import express from "express";
const router = express.Router();
import authcontroller from "../controllers/auth.controller.js"
import { validateLogin, validateSignup } from "../validators/auth.validators.js";

router.post("/login",validateLogin,authcontroller.login);

router.post("/signup",validateSignup,authcontroller.signup)

export default router;
