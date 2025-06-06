import express from 'express';
import pino from 'pino';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import ReportDB from '../../models/Forum/report.js';
import crypto from 'crypto';

dotenv.config();

const app = express();

// Structured Logger Setup
const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
});

// Request ID Middleware
const requestIdMiddleware = (req, res, next) => {
  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-ID', req.requestId);
  next();
};
app.use(requestIdMiddleware);

// Custom Error Classes
class AppError extends Error {
  constructor(message, statusCode, errorCode, details = {}) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isAppError = true;
  }
}

class ValidationError extends AppError {
  constructor(message, details = {}) {
    super(message, StatusCodes.BAD_REQUEST, 'VALIDATION_ERROR', details);
  }
}

class NotFoundError extends AppError {
  constructor(message, details = {}) {
    super(message, StatusCodes.NOT_FOUND, 'NOT_FOUND', details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message, details = {}) {
    super(message, StatusCodes.UNAUTHORIZED, 'UNAUTHORIZED', details);
  }
}

class ForbiddenError extends AppError {
  constructor(message, details = {}) {
    super(message, StatusCodes.FORBIDDEN, 'FORBIDDEN', details);
  }
}

// Error Handler
const errorHandler = (error, req, res, action = 'process') => {
  const requestId = req.requestId || crypto.randomUUID();

  // Default values for unexpected errors
  let statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = `Failed to ${action}`;
  const details = {};

  // Handle AppError instances
  if (error.isAppError) {
    statusCode = error.statusCode;
    errorCode = error.errorCode;
    message = error.message;
    Object.assign(details, error.details);
  }

  // Log the error
  logger.error({
    requestId,
    action,
    method: req.method,
    url: req.originalUrl,
    error: {
      message: error.message,
      code: errorCode,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    },
  });

  // Send response
  res.status(statusCode).json({
    success: false,
    errorCode,
    message,
    details,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && {
      debug: { message: error.message, stack: error.stack?.split('\n')[0] },
    }),
  });
};

// Helper Functions
const validateId = (id, type) => {
  const parsedId = parseInt(id);
  if (isNaN(parsedId) || parsedId < 1) {
    throw new ValidationError(`Invalid ${type}`, { id });
  }
  return parsedId;
};

const validateReason = (reason) => {
  if (!reason || typeof reason !== 'string' || reason.trim() === '') {
    throw new ValidationError('Reason is required and must be a non-empty string', { reason });
  }
  if (reason.length > 1000) {
    throw new ValidationError('Reason must be less than 1000 characters', { reasonLength: reason.length });
  }
  return reason.trim();
};

const validateStatus = (status) => {
  const validStatuses = ['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED'];
  if (!status || !validStatuses.includes(status.toUpperCase())) {
    throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, { status });
  }
  return status.toUpperCase();
};

const getUserIdFromToken = (req) => {
  if (!req.cookies?.auth_token) {
    throw new UnauthorizedError('No authentication token provided');
  }

  try {
    const decoded = jwt.verify(req.cookies.auth_token, process.env.JWT_SECRET);
    if (!decoded.user_id) {
      throw new UnauthorizedError('Invalid token payload');
    }
    return decoded.user_id;
  } catch (jwtError) {
    throw new UnauthorizedError('Invalid or expired token', { token: req.cookies.auth_token });
  }
};

const verifyAdmin = async (userId) => {
  // Assume a method to check if user is admin exists in ReportDB or another model
  const isAdmin = await ReportDB.isAdminDB(userId); // Placeholder; implement actual admin check
  if (!isAdmin) {
    throw new ForbiddenError('Admin access required');
  }
};

// Controller Functions
const reportComment = async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    const { commentId } = req.params;
    const validatedCommentId = validateId(commentId, 'Comment ID');
    const { reason } = req.body;
    const validatedReason = validateReason(reason);

    const result = await ReportDB.reportCommentDB(userId, validatedCommentId, validatedReason);

    if (!result) {
      throw new AppError('Failed to create comment report', StatusCodes.INTERNAL_SERVER_ERROR, 'CREATE_FAILED');
    }

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: result.message || 'Comment reported successfully',
      metadata: {
        userId,
        commentId: validatedCommentId,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    errorHandler(error, req, res, 'report comment');
  }
};

const reportPost = async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    const { postId } = req.params;
    const validatedPostId = validateId(postId, 'Post ID');
    const { reason } = req.body;
    const validatedReason = validateReason(reason);

    const result = await ReportDB.reportPostDB(userId, validatedPostId, validatedReason);

    if (!result) {
      throw new AppError('Failed to create post report', StatusCodes.INTERNAL_SERVER_ERROR, 'CREATE_FAILED');
    }

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: result.message || 'Post reported successfully',
      metadata: {
        userId,
        postId: validatedPostId,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    errorHandler(error, req, res, 'report post');
  }
};

const getReportsForComment = async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    await verifyAdmin(userId);
    const { commentId } = req.params;
    const validatedCommentId = validateId(commentId, 'Comment ID');

    const reports = await ReportDB.getReportsForCommentDB(validatedCommentId);

    if (!reports || reports.length === 0) {
      throw new NotFoundError('No reports found for this comment', { commentId: validatedCommentId });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      reports,
      count: reports.length,
      message: 'Comment reports retrieved successfully',
      metadata: {
        commentId: validatedCommentId,
        retrievedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    errorHandler(error, req, res, 'fetch comment reports');
  }
};

const getReportsForPost = async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    await verifyAdmin(userId);
    const { postId } = req.params;
    const validatedPostId = validateId(postId, 'Post ID');

    const reports = await ReportDB.getReportsForPostDB(validatedPostId);

    if (!reports || reports.length === 0) {
      throw new NotFoundError('No reports found for this post', { postId: validatedPostId });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      reports,
      count: reports.length,
      message: 'Post reports retrieved successfully',
      metadata: {
        postId: validatedPostId,
        retrievedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    errorHandler(error, req, res, 'fetch post reports');
  }
};

const updateCommentReportStatus = async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    await verifyAdmin(userId);
    const { reportId } = req.params;
    const validatedReportId = validateId(reportId, 'Report ID');
    const { status } = req.body;
    const validatedStatus = validateStatus(status);

    const result = await ReportDB.updateCommentReportStatusDB(userId, validatedReportId, validatedStatus);

    if (!result) {
      throw new NotFoundError('Report not found', { reportId: validatedReportId });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: result.message || 'Comment report status updated successfully',
      metadata: {
        userId,
        reportId: validatedReportId,
        updatedAt: new Date().toISOString(),
        updatedFields: ['status'],
      },
    });
  } catch (error) {
    errorHandler(error, req, res, 'update comment report status');
  }
};

const updatePostReportStatus = async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    await verifyAdmin(userId);
    const { reportId } = req.params;
    const validatedReportId = validateId(reportId, 'Report ID');
    const { status } = req.body;
    const validatedStatus = validateStatus(status);

    const result = await ReportDB.updatePostReportStatusDB(userId, validatedReportId, validatedStatus);

    if (!result) {
      throw new NotFoundError('Report not found', { reportId: validatedReportId });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: result.message || 'Post report status updated successfully',
      metadata: {
        userId,
        reportId: validatedReportId,
        updatedAt: new Date().toISOString(),
        updatedFields: ['status'],
      },
    });
  } catch (error) {
    errorHandler(error, req, res, 'update post report status');
  }
};

const deleteCommentReport = async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    await verifyAdmin(userId);
    const { reportId } = req.params;
    const validatedReportId = validateId(reportId, 'Report ID');

    const result = await ReportDB.deleteCommentReportDB(validatedReportId);

    if (!result) {
      throw new NotFoundError('Report not found', { reportId: validatedReportId });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: result.message || 'Comment report deleted successfully',
      metadata: {
        userId,
        reportId: validatedReportId,
        deletedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    errorHandler(error, req, res, 'delete comment report');
  }
};

const deletePostReport = async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    await verifyAdmin(userId);
    const { reportId } = req.params;
    const validatedReportId = validateId(reportId, 'Report ID');

    const result = await ReportDB.deletePostReportDB(validatedReportId);

    if (!result) {
      throw new NotFoundError('Report not found', { reportId: validatedReportId });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: result.message || 'Post report deleted successfully',
      metadata: {
        userId,
        reportId: validatedReportId,
        deletedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    errorHandler(error, req, res, 'delete post report');
  }
};

// Global Error Handler
app.use((err, req, res, next) => {
  errorHandler(err, req, res, 'unknown operation');
});

export default {
  reportComment,
  reportPost,
  getReportsForComment,
  getReportsForPost,
  updateCommentReportStatus,
  updatePostReportStatus,
  deleteCommentReport,
  deletePostReport,
};