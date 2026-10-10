const mongoose = require('mongoose');
const {
  LEAD_STATUS,
  LEAD_STATUS_LIST,
  LEAD_PRIORITY,
  LEAD_PRIORITY_LIST,
  LEAD_SOURCES,
} = require('../constants/roles');

const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Lead name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    phone: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      enum: {
        values: LEAD_SOURCES,
        message: '{VALUE} is not a valid lead source',
      },
      default: 'Website',
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: LEAD_STATUS_LIST,
        message: '{VALUE} is not a valid lead status',
      },
      default: LEAD_STATUS.NEW,
      index: true,
    },
    priority: {
      type: String,
      enum: {
        values: LEAD_PRIORITY_LIST,
        message: '{VALUE} is not a valid lead priority',
      },
      default: LEAD_PRIORITY.MEDIUM,
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    estimatedValue: {
      type: Number,
      default: 0,
      min: [0, 'Estimated value cannot be negative'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Lead creator is required'],
      index: true,
    },
    isConverted: {
      type: Boolean,
      default: false,
      index: true,
    },
    convertedAt: {
      type: Date,
    },
    convertedCustomer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
    },
    convertedDeal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deal',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast searching and filtering
leadSchema.index({ name: 'text', company: 'text', email: 'text' });
leadSchema.index({ status: 1, priority: 1, assignedTo: 1 });
leadSchema.index({ createdAt: -1 });

const Lead = mongoose.model('Lead', leadSchema);

module.exports = Lead;
