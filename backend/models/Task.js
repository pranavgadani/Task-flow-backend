const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema({
  title: String,
  description: String,
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
  status: { type: mongoose.Schema.Types.ObjectId, ref: "TaskStatus" },
  project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
  image: String,
  video: String,
  priority: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Medium" },
  type: { type: String, enum: ["task", "issue"], default: "task" },
  startDate: { type: Date },
  estimatedHours: { type: Number, default: 0 },
  calculatedEndDate: { type: Date },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
}, { timestamps: true });

TaskSchema.index({ companyId: 1 });

module.exports = mongoose.model("Task", TaskSchema);