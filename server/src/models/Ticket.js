import mongoose from 'mongoose';

export const TICKET_STATUSES = ['waiting', 'called', 'serving', 'completed', 'skipped', 'cancelled'];

export const VALID_TRANSITIONS = {
  waiting: ['called', 'serving', 'skipped', 'cancelled'],
  called: ['serving', 'completed', 'skipped', 'cancelled'],
  serving: ['completed', 'skipped', 'cancelled'],
  completed: [],
  skipped: [],
  cancelled: [],
};

export const isValidTransition = (fromStatus, toStatus) => {
  // Terminal states cannot transition to anything, including themselves
  if (['completed', 'skipped', 'cancelled'].includes(fromStatus)) {
    return false;
  }
  if (fromStatus === toStatus) return true;
  const allowed = VALID_TRANSITIONS[fromStatus];
  return Array.isArray(allowed) && allowed.includes(toStatus);
};

const ticketSchema = new mongoose.Schema(
  {
    queue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Queue',
      required: [true, 'A ticket must belong to a queue.'],
      index: true,
    },
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'A ticket must belong to a business.'],
      index: true,
    },
    tokenNumber: {
      type: Number,
      required: [true, 'Token number is required.'],
      min: [1, 'Token number must be greater than 0.'],
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required.'],
      trim: true,
      maxlength: [100, 'Customer name cannot exceed 100 characters.'],
    },
    customerContact: {
      type: String,
      trim: true,
      default: '',
      maxlength: [100, 'Customer contact cannot exceed 100 characters.'],
    },
    status: {
      type: String,
      enum: {
        values: TICKET_STATUSES,
        message: 'Status must be waiting, called, serving, completed, skipped, or cancelled.',
      },
      default: 'waiting',
      index: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    calledAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
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

// Compound Unique Index: Prevents duplicate token numbers in the same queue
ticketSchema.index({ queue: 1, tokenNumber: 1 }, { unique: true });

// Compound Query Indexes for performance
ticketSchema.index({ queue: 1, status: 1, tokenNumber: 1 });
ticketSchema.index({ business: 1, createdAt: -1 });

const Ticket = mongoose.model('Ticket', ticketSchema);

export default Ticket;
