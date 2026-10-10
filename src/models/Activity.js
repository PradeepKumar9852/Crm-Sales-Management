const mongoose = require('mongoose');
const {
  ACTIVITY_TYPE_LIST,
  ACTIVITY_TYPES,
  ACTIVITY_STATUS_LIST,
  ACTIVITY_STATUSES,
} = require('../constants/roles');

const activitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: {
        values: ACTIVITY_TYPE_LIST,
        message: '{VALUE} is not a valid activity type',
      },
      default: ACTIVITY_TYPES.FOLLOW_UP,
      required: [true, 'Activity type is required'],
    },
    title: {
      type: String,
      required: [true, 'Activity title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    // Subject alias for backward compatibility
    subject: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ACTIVITY_STATUS_LIST,
        message: '{VALUE} is not a valid status',
      },
      default: ACTIVITY_STATUSES.PENDING,
      index: true,
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium',
    },
    dueDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    scheduledAt: {
      type: Date,
    },
    completedDate: {
      type: Date,
    },
    durationMinutes: {
      type: Number,
      default: 15,
      min: [1, 'Duration must be at least 1 minute'],
    },
    outcome: {
      type: String,
      trim: true,
    },
    entityType: {
      type: String,
      required: [true, 'Entity type is required (Lead, Customer, Deal)'],
      enum: ['Lead', 'Customer', 'Deal', 'Contact'],
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Associated Entity ID is required'],
      refPath: 'entityType',
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Activity creator is required'],
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual to determine if the activity is overdue dynamically
activitySchema.virtual('isOverdue').get(function () {
  const targetDate = this.dueDate || this.scheduledAt;
  if (!targetDate) return false;
  return this.status === ACTIVITY_STATUSES.PENDING && new Date(targetDate) < new Date();
});

activitySchema.pre('save', function () {
  // Sync title and subject
  if (!this.title && this.subject) this.title = this.subject;
  if (!this.subject && this.title) this.subject = this.title;

  // Sync dueDate and scheduledAt
  if (!this.dueDate && this.scheduledAt) this.dueDate = this.scheduledAt;
  if (!this.scheduledAt && this.dueDate) this.scheduledAt = this.dueDate;

  // Sync assignedTo and performedBy
  if (!this.assignedTo && this.performedBy) this.assignedTo = this.performedBy;
  if (!this.performedBy && this.assignedTo) this.performedBy = this.assignedTo;

  // Check if status should be dynamically marked as Overdue
  const targetDate = this.dueDate || this.scheduledAt;
  if (
    this.status === ACTIVITY_STATUSES.PENDING &&
    targetDate &&
    new Date(targetDate) < new Date()
  ) {
    this.status = ACTIVITY_STATUSES.OVERDUE;
  }

  // Mark completion date
  if (this.status === ACTIVITY_STATUSES.COMPLETED && !this.completedDate) {
    this.completedDate = new Date();
  }
});

// Performance indexing
activitySchema.index({ entityType: 1, entityId: 1, status: 1 });
activitySchema.index({ assignedTo: 1, dueDate: 1 });

const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity;
