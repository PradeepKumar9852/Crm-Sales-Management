/**
 * Standardized API Response Helper
 * Ensures uniform response payloads across all CRM API endpoints
 */
class ApiResponse {
  /**
   * Successful response formatter
   *
   * Example:
   * {
   *   "success": true,
   *   "message": "Lead created successfully",
   *   "data": { ... },
   *   "meta": { ... } // optional pagination metadata
   * }
   */
  static success(res, { statusCode = 200, message = 'Success', data = {}, meta = null } = {}) {
    const payload = {
      success: true,
      message,
      data: data !== undefined ? data : {},
    };

    if (meta !== null && meta !== undefined) {
      payload.meta = meta;
    }

    return res.status(statusCode).json(payload);
  }

  /**
   * Paginated success response helper
   */
  static paginated(res, { statusCode = 200, message = 'Success', data = [], total = 0, page = 1, limit = 10 } = {}) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const totalPages = Math.ceil(total / limitNum) || 1;

    return res.status(statusCode).json({
      success: true,
      message,
      data,
      meta: {
        page: pageNum,
        currentPage: pageNum,
        limit: limitNum,
        pageSize: limitNum,
        total,
        totalRecords: total,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    });
  }

  /**
   * Error response formatter
   *
   * Example:
   * {
   *   "success": false,
   *   "message": "Lead not found",
   *   "errors": null
   * }
   */
  static error(res, { statusCode = 500, message = 'Internal Server Error', errors = null } = {}) {
    const payload = {
      success: false,
      message,
      errors: errors !== undefined ? errors : null,
    };

    return res.status(statusCode).json(payload);
  }
}

module.exports = ApiResponse;

