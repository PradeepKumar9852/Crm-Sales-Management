const customerService = require('../services/customer.service');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Create a new customer
 * POST /api/v1/customers
 */
const createCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.createCustomer(req.body, req.user);

  return ApiResponse.success(res, {
    statusCode: 201,
    message: 'Customer created successfully',
    data: { customer },
  });
});

/**
 * Get customers with search, filters, pagination
 * GET /api/v1/customers
 */
const getCustomers = asyncHandler(async (req, res) => {
  const result = await customerService.getCustomers(req.query, req.user);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Customers retrieved successfully',
    data: result.customers,
    meta: result.meta,
  });
});

/**
 * Get single customer by ID
 * GET /api/v1/customers/:id
 */
const getCustomerById = asyncHandler(async (req, res) => {
  const result = await customerService.getCustomerById(req.params.id, req.user);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Customer retrieved successfully',
    data: result,
  });
});

/**
 * Update customer
 * PUT /api/v1/customers/:id
 */
const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.updateCustomer(req.params.id, req.body, req.user);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Customer updated successfully',
    data: { customer },
  });
});

/**
 * Delete customer
 * DELETE /api/v1/customers/:id
 */
const deleteCustomer = asyncHandler(async (req, res) => {
  await customerService.deleteCustomer(req.params.id, req.user);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Customer deleted successfully',
  });
});

module.exports = {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
};
