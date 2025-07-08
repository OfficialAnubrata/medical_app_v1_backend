import Joi from "joi";

export const signupSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  phone: Joi.string().pattern(/^\+?[0-9]{7,15}$/).optional()
    .messages({
      "string.pattern.base": "Phone number must be a valid international format"
    }),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(128).optional(),
  gender: Joi.string().valid("Male", "Female", "Other").optional(),
  dob: Joi.date().iso().optional(),
  profilePic: Joi.string().uri().optional(),
  location_latitude: Joi.number().min(-90).max(90).optional(),
  location_longitude: Joi.number().min(-180).max(180).optional(),
  isGoogleUser: Joi.boolean().optional(),
});

export function validateSignup(req, res, next) {
  const { error } = signupSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      details: error.details.map(e => e.message)
    });
  }
  next();
}

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export function validateLogin(req, res, next) {
  const { error } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      details: error.details.map(e => e.message),
    });
  }
  next();
}