const mongoose = require('mongoose');

const timelineSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: [true, 'Timeline action is required'],
      trim: true,
    },
    entityType: {
      type: String,
      required: [true, 'Entity type is required (Lead, Customer, Deal)'],
      enum: ['Lead', 'Customer', 'Deal'],
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Entity ID is required'],
      refPath: 'entityType',
      index: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User who performed action is required'],
      index: true,
    },
    previousValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying an entity's timeline efficiently
timelineSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

const Timeline = mongoose.model('Timeline', timelineSchema);

module.exports = Timeline;
