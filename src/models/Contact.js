const mongoose = require('mongoose');
const { CONTACT_STATUSES, CONTACT_TYPES } = require('../constants/roles');

const addressSchema = new mongoose.Schema(
  {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    country: { type: String, trim: true },
  },
  { _id: false }
);

const contactSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
      index: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    title: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
    },
    address: addressSchema,
    status: {
      type: String,
      enum: {
        values: CONTACT_STATUSES,
        message: '{VALUE} is not a valid contact status',
      },
      default: 'Customer',
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: CONTACT_TYPES,
        message: '{VALUE} is not a valid contact type',
      },
      default: 'Customer',
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    leadSource: {
      type: String,
      trim: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Contact creator is required'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for full name
contactSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`.trim();
});

contactSchema.index({ firstName: 'text', lastName: 'text', company: 'text', email: 'text' });

const Contact = mongoose.model('Contact', contactSchema);

module.exports = Contact;
