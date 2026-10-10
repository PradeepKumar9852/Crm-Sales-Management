const contactService = require('../services/contact.service');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Create a new customer contact
 * POST /api/v1/contacts
 */
const createContact = asyncHandler(async (req, res) => {
  const contact = await contactService.createContact(req.body, req.user);

  return ApiResponse.success(res, {
    statusCode: 201,
    message: 'Contact created successfully',
    data: { contact },
  });
});

/**
 * Get contacts with search, filters, pagination
 * GET /api/v1/contacts
 */
const getContacts = asyncHandler(async (req, res) => {
  const result = await contactService.getContacts(req.query, req.user);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Contacts retrieved successfully',
    data: result.contacts,
    meta: result.meta,
  });
});

/**
 * Get single contact by ID
 * GET /api/v1/contacts/:id
 */
const getContactById = asyncHandler(async (req, res) => {
  const contact = await contactService.getContactById(req.params.id, req.user);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Contact retrieved successfully',
    data: { contact },
  });
});

/**
 * Update contact
 * PUT /api/v1/contacts/:id
 */
const updateContact = asyncHandler(async (req, res) => {
  const contact = await contactService.updateContact(req.params.id, req.body, req.user);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Contact updated successfully',
    data: { contact },
  });
});

/**
 * Delete contact
 * DELETE /api/v1/contacts/:id
 */
const deleteContact = asyncHandler(async (req, res) => {
  await contactService.deleteContact(req.params.id, req.user);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Contact deleted successfully',
  });
});

/**
 * Get contact interaction history & complete timeline
 * GET /api/v1/contacts/:id/timeline
 */
const getContactTimeline = asyncHandler(async (req, res) => {
  const result = await contactService.getContactTimeline(req.params.id, req.user);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Contact timeline retrieved successfully',
    data: result,
  });
});

module.exports = {
  createContact,
  getContacts,
  getContactById,
  updateContact,
  deleteContact,
  getContactTimeline,
};
