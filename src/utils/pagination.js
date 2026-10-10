/**
 * Standard pagination metadata builder
 *
 * @param {number} total - Total records found
 * @param {number|string} page - Current requested page
 * @param {number|string} limit - Page size limit
 * @returns {Object} Standardized pagination metadata
 */
const buildPaginationMeta = (total, page, limit) => {
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;
  const totalPages = Math.ceil(total / limitNum) || 1;

  return {
    page: pageNum,
    currentPage: pageNum,
    limit: limitNum,
    pageSize: limitNum,
    total,
    totalRecords: total,
    totalPages,
    hasNextPage: pageNum < totalPages,
    hasPrevPage: pageNum > 1,
  };
};

module.exports = {
  buildPaginationMeta,
};
