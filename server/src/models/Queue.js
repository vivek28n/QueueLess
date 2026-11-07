import mongoose from 'mongoose';
import crypto from 'crypto';

const queueSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'A queue must be associated with a business.'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Queue name is required.'],
      trim: true,
      maxlength: [100, 'Queue name cannot exceed 100 characters.'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters.'],
      default: '',
    },
    queueCode: {
      type: String,
      required: [true, 'Queue code is required.'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'paused', 'closed'],
        message: 'Status must be active, paused, or closed.',
      },
      default: 'active',
      index: true,
    },
    currentTokenNumber: {
      type: Number,
      default: 0,
      min: [0, 'Current token number cannot be negative.'],
    },
    currentlyServing: {
      type: Number,
      default: 0,
      min: [0, 'Currently serving token cannot be negative.'],
    },
    averageServiceTime: {
      type: Number,
      default: 5,
      min: [1, 'Average service time must be at least 1 minute.'],
      max: [240, 'Average service time cannot exceed 240 minutes.'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound indexes
queueSchema.index({ business: 1, status: 1 });
queueSchema.index({ business: 1, createdAt: -1 });

/**
 * Static generator for random unique Queue Codes
 * Format: QL-<CLEAN_NAME>-<SUFFIX> (e.g. QL-RECEP-7B42)
 */
queueSchema.statics.generateQueueCode = async function (queueName = 'QUEUE') {
  const cleanPrefix = queueName
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 5)
    .toUpperCase() || 'QUEUE';

  let unique = false;
  let candidateCode = '';

  while (!unique) {
    const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
    candidateCode = `QL-${cleanPrefix}-${randomHex}`;
    const existing = await this.findOne({ queueCode: candidateCode });
    if (!existing) {
      unique = true;
    }
  }

  return candidateCode;
};

const Queue = mongoose.model('Queue', queueSchema);

export default Queue;
