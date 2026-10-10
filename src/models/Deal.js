const mongoose = require('mongoose');
const {
  DEAL_STAGES,
  DEAL_STAGE_LIST,
  DEAL_STAGE_PROBABILITIES,
} = require('../constants/roles');

const dealSchema = new mongoose.Schema(
  {
    dealName: {
      type: String,
      required: [true, 'Deal name is required'],
      trim: true,
      maxlength: [150, 'Deal name cannot exceed 150 characters'],
    },
    // Supporting title alias for backwards compatibility
    title: {
      type: String,
      trim: true,
    },
    dealValue: {
      type: Number,
      required: [true, 'Deal value is required'],
      min: [1, 'Deal value must be greater than zero'],
    },
    value: {
      type: Number,
      min: [0, 'Deal value must be positive'],
    },
    currency: {
      type: String,
      default: 'USD',
      trim: true,
      uppercase: true,
    },
    currentStage: {
      type: String,
      enum: {
        values: DEAL_STAGE_LIST,
        message: '{VALUE} is not a valid deal stage',
      },
      default: DEAL_STAGES.QUALIFICATION,
      index: true,
    },
    stage: {
      type: String,
      enum: DEAL_STAGE_LIST,
    },
    probability: {
      type: Number,
      min: [0, 'Probability cannot be less than 0'],
      max: [100, 'Probability cannot be greater than 100'],
    },
    expectedRevenue: {
      type: Number,
      default: 0,
    },
    expectedClosingDate: {
      type: Date,
      required: [true, 'Expected closing date is required'],
    },
    actualClosingDate: {
      type: Date,
    },
    lostReason: {
      type: String,
      trim: true,
      validate: {
        validator: function (val) {
          // If stage is Lost, lostReason is required
          const activeStage = this.currentStage || this.stage;
          if (activeStage === DEAL_STAGES.LOST) {
            return typeof val === 'string' && val.trim().length > 0;
          }
          return true;
        },
        message: 'A valid reason is required when a deal is marked as Lost',
      },
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      index: true,
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assigned sales employee is required'],
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Deal creator is required'],
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    pipeline: {
      type: String,
      default: 'Standard Sales Pipeline',
      trim: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Sync aliases and calculate values before saving
dealSchema.pre('save', function () {
  // Sync title and dealName
  if (!this.dealName && this.title) this.dealName = this.title;
  if (!this.title && this.dealName) this.title = this.dealName;

  // Sync value and dealValue
  if (this.dealValue === undefined && this.value !== undefined) this.dealValue = this.value;
  if (this.value === undefined && this.dealValue !== undefined) this.value = this.dealValue;

  // Sync stage and currentStage
  if (!this.currentStage && this.stage) this.currentStage = this.stage;
  if (!this.stage && this.currentStage) this.stage = this.currentStage;

  const currentStg = this.currentStage || this.stage || DEAL_STAGES.QUALIFICATION;

  // Set default probability according to stage if not custom
  if (this.probability === undefined || this.probability === null) {
    this.probability = DEAL_STAGE_PROBABILITIES[currentStg] ?? 10;
  }

  // Calculate expected revenue
  const amount = this.dealValue || this.value || 0;
  this.expectedRevenue = Math.round((amount * this.probability) / 100);

  // Set actual closing date for won/lost
  if (
    (currentStg === DEAL_STAGES.WON || currentStg === DEAL_STAGES.LOST) &&
    !this.actualClosingDate
  ) {
    this.actualClosingDate = new Date();
  }
});

// Indexes for performance
dealSchema.index({ currentStage: 1, assignedTo: 1 });
dealSchema.index({ expectedClosingDate: 1 });
dealSchema.index({ dealValue: 1 });
dealSchema.index({ createdAt: -1 });

const Deal = mongoose.model('Deal', dealSchema);

module.exports = Deal;
