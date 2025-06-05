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
