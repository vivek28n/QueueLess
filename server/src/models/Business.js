import mongoose from 'mongoose';

const businessSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
      maxlength: [100, 'Business name cannot exceed 100 characters'],
    },
    businessId: {
      type: String,
      required: [true, 'Unique business ID is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    industry: {
      type: String,
      required: [true, 'Industry category is required'],
      trim: true,
      lowercase: true,
      enum: {
        values: ['healthcare', 'restaurant', 'retail', 'banking', 'government', 'other'],
        message: '{VALUE} is not a supported industry category',
      },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Method to format public business object
businessSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id;
  delete obj.__v;
  return obj;
};

const Business = mongoose.model('Business', businessSchema);

export default Business;
