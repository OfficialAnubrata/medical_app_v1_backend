import Joi from 'joi';

export const testCatalogSchema = Joi.object({
  test_name: Joi.string().trim().required().messages({
    'any.required': 'Test name is required',
  }),
special_requirements: Joi.string().trim().optional().allow("").messages({
    'string.base': 'Special requirements must be a string',
  }),
  type_of_test: Joi.string().trim().required().messages({
    'any.required': 'Type of test is required',
  }),
  components: Joi.array().items(Joi.string().trim()).min(1).required().messages({
    'any.required': 'At least one component is required',
  }),
});


export const medicalTestSchema = Joi.object({
  test_id: Joi.string().trim().required().messages({
    'any.required': 'Test ID is required',
  }),
  medicalcentre_id: Joi.string().trim().required().messages({
    'any.required': 'Medical centre ID is required',
  }),
  price: Joi.number().positive().required().messages({
    'any.required': 'Price is required',
    'number.positive': 'Price must be a positive number',
  }),
});


// Joi schema for validating request body
export const patientSchema = Joi.object({
  full_name: Joi.string().min(3).max(100).required(),
  gender: Joi.string().valid('Male', 'Female', 'Other').optional(),
  dob: Joi.date().optional(),
  relation: Joi.string().max(50).optional()
});


export const addAddressSchema = Joi.object({
  label: Joi.string().max(50).optional().allow(null, ''),
  address_line: Joi.string().max(255).required(),
  area: Joi.string().max(100).optional().allow(null, ''),
  city: Joi.string().max(100).optional().allow(null, ''),
  district: Joi.string().max(100).optional().allow(null, ''),
  state: Joi.string().max(100).optional().allow(null, ''),
  pincode: Joi.string().max(20).optional().allow(null, ''),
  landmark: Joi.string().max(255).optional().allow(null, ''),
  contact_number: Joi.string().pattern(/^\+?\d{7,15}$/).optional().allow(null, ''), // simple phone number pattern
  latitude: Joi.number().min(-90).max(90).optional().allow(null),
  longitude: Joi.number().min(-180).max(180).optional().allow(null),
});
