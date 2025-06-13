import Joi from 'joi';

const medicalCentreSchema = Joi.object({
  medicalcentre_name: Joi.string().trim().required().messages({
    'any.required': 'Medical centre name is required',
  }),
  registration_number: Joi.string().trim().required().messages({
    'any.required': 'Registration number is required',
  }),
  mobile_no: Joi.string().pattern(/^[0-9]{10,15}$/).required().messages({
    'string.pattern.base': 'Mobile number must be 10-15 digits',
    'any.required': 'Mobile number is required',
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Email must be valid',
    'any.required': 'Email is required',
  }),
  address_line: Joi.string().allow(null, ''),
  area: Joi.string().allow(null, ''),
  district: Joi.string().allow(null, ''),
  state: Joi.string().allow(null, ''),
  pincode: Joi.string().pattern(/^[0-9]{5,10}$/).allow(null, '').messages({
    'string.pattern.base': 'Pincode must be 5 to 10 digits',
  }),
  mclatitude: Joi.number().allow(null, ''),
  mclongitude: Joi.number().allow(null, ''),
});

export function validateMedicalCentreInput(req, res, next) {
  const { error } = medicalCentreSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      details: error.details.map(e => e.message),
    });
  }
  next();
}

