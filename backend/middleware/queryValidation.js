'use strict';

const { body, validationResult } = require('express-validator');
const { isSpam, getQualityFailures } = require('../utils/spamFilter');
const { Query } = require('../models/Query');
const { ROLES } = require('../utils/roles');

/**
 * Common validations shared across routes.
 */
const questionValidation = body('question')
  .trim()
  .notEmpty().withMessage('Question is required')
  .isLength({ max: 500 }).withMessage('Question cannot exceed 500 characters');

const descriptionValidation = body('description')
  .optional()
  .trim()
  .isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters');

const priorityValidation = body('priority')
  .optional()
  .isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority');

const categoryValidation = body('category')
  .trim()
  .notEmpty().withMessage('Please select a category');

/**
 * Custom validator — runs after express-validator chain.
 * Checks spam, quality, and rate limit.
 */
const spamAndQualityCheck = async (req, _res, next) => {
  const question = req.body.question || '';
  const description = req.body.description || '';

  // Spam check on question
  if (isSpam(question)) {
    req.validationError = 'Question is too short or meaningless — please be more specific.';
    return next();
  }

  // Quality check on question
  const failures = getQualityFailures(question);
  if (failures.length > 0) {
    req.validationError = failures[0];
    return next();
  }

  // Rate limit: max 5 queries per user per 24h
  if (req.user && req.user.role === ROLES.USER) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const count = await Query.countDocuments({
      raisedBy: req.user._id,
      createdAt: { $gte: oneDayAgo },
    });
    if (count >= 5) {
      req.validationError = 'You can only raise up to 5 queries per 24 hours. Please wait before submitting another.';
      return next();
    }
  }

  next();
};

/**
 * Validate that category is valid
 */
const categoryCheck = async (req, _res, next) => {
  const Category = require('../models/Category');
  const { QUERY_CATEGORIES } = require('../models/Query');
  const cats = await Category.find().select('name').lean();
  const validCategories = cats.length > 0 ? cats.map((c) => c.name) : QUERY_CATEGORIES;
  const cat = String(req.body.category || '').toLowerCase().trim();
  if (!validCategories.includes(cat)) {
    req.validationError = `Invalid category. Please choose a valid category.`;
    return next();
  }
  req.body.category = cat;
  next();
};

/**
 * Express-validator chain for POST /queries
 */
const raiseQueryValidation = [
  questionValidation,
  descriptionValidation,
  priorityValidation,
  categoryValidation,
  spamAndQualityCheck,
  categoryCheck,
];

/**
 * Middleware to check validation result and return errors.
 * Use after the express-validator chain.
 */
const handleValidationErrors = (req, _res, next) => {
  // If our custom middleware set an error
  if (req.validationError) {
    return next(new Error(req.validationError));
  }
  // Let express-validator handle its own errors
  validationResult(req).throw();
  next();
};

module.exports = { raiseQueryValidation, handleValidationErrors };