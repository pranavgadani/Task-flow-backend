const mongoose = require("mongoose");

const companySchema = new mongoose.Schema({
  companyName: { 
    type: String, 
    required: [true, "company name is required"],
    trim: true
  },
  gstNumber: { 
    type: String, 
    trim: true 
  },
  panNumber: { 
    type: String, 
    trim: true 
  },
  contactPersonName: { 
    type: String, 
    required: [true, "Contact Person Name is required"],
    trim: true
  },
  contactPersonPhone: { 
    type: String, 
    required: [true, "Contact Person Phone is required"],
    trim: true
  },
  contactPersonEmail: { 
    type: String, 
    required: [true, "Contact Person Email is required"],
    trim: true
  },
  email: { 
    type: String, 
    required: [true, "Company Email is required"],
    trim: true,
    unique: true
  },
  phone: { 
    type: String, 
    trim: true 
  },
  addressLine1: { 
    type: String, 
    required: [true, "Address Line 1 is required"],
    trim: true
  },
  addressLine2: { 
    type: String, 
    trim: true 
  },
  country: { 
    type: String, 
    required: [true, "Country is required"],
    trim: true,
    default: "India"
  },
  state: { 
    type: String, 
    required: [true, "State is required"],
    trim: true
  },
  city: { 
    type: String, 
    required: [true, "City is required"],
    trim: true
  },
  pincode: { 
    type: String, 
    required: [true, "Pincode is required"],
    trim: true
  },
  appLogo: { 
    type: String, 
    trim: true 
  },
  status: { 
    type: String, 
    enum: ["Active", "Inactive"], 
    default: "Active" 
  },
  subscription: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription", default: null },
  subscriptionStatus: { type: String, enum: ["trial", "active", "expired"], default: "trial" },
  subscriptionExpiry: { type: Date, default: null },
  workingHours: {
    start: { type: String, default: "09:00" },
    end: { type: String, default: "18:00" }
  },
  breakTime: {
    start: { type: String, default: "13:00" },
    end: { type: String, default: "14:00" }
  },
  holidays: [{
    date: Date,
    title: String
  }],
  timeFormat: { type: String, enum: ["12h", "24h"], default: "24h" },
  dateFormat: { type: String, default: "DD/MM/YYYY" },
}, { timestamps: true });

module.exports = mongoose.model("Company", companySchema);
