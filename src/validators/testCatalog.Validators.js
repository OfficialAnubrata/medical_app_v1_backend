import Joi from 'joi';

export const testCatalogSchema = Joi.object({
  test_name: Joi.string().trim().required().messages({
    'any.required': 'Test name is required',
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