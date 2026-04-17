const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const Staff = require("../models/Staff");
const Role = require("../models/Role");

const { generatePassword, sendMail } = require("../config/mail");
const { checkPermission } = require("../middleware/permissions");
const authMiddleware = require("../middleware/auth");
const { checkPlanLimit } = require("../middleware/subscriptionLimits");
const staffController = require("../controllers/staffController");
const companyController = require("../controllers/companyController");
const upload = require("../middleware/upload");

// GET all staff
router.get("/", authMiddleware, checkPermission("staff_management", "read"), async (req, res) => {
  try {
    const isSuperAdmin = req.user.email === "gadanipranav@gmail.com" || req.user.role?.name === "Super Admin";
    const companyId = req.user.companyId?._id || req.user.companyId;
    let query = {};

    // Safety: check for "undefined" string or empty string
    const cleanCompanyId = (companyId && companyId !== "undefined" && companyId !== "") ? companyId : null;

    // If not superadmin, only show staff from the same company
    if (!isSuperAdmin && cleanCompanyId) {
      query.companyId = cleanCompanyId;
    } else if (isSuperAdmin && req.query.companyId && req.query.companyId !== "undefined") {
      query.companyId = req.query.companyId;
    } else if (!isSuperAdmin && !cleanCompanyId) {
      query._id = req.user._id;
    }

    let data = await Staff.find(query).populate("role", "name");
    
    // Fallback: If list is empty and user is not superadmin, add current user
    if (!isSuperAdmin && data.length === 0) {
      data = [req.user];
    }
    
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD staff
router.post("/", authMiddleware, checkPermission("staff_management", "create"), checkPlanLimit("staff"), async (req, res) => {
  try {
    const { name, email, phone, status, role } = req.body;
    const plainPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    let roleDoc;
    if (role) roleDoc = await Role.findById(role);
    if (!roleDoc) roleDoc = await Role.findOne();

    const isSuperAdmin = req.user.email === (process.env.SUPERADMIN_EMAIL || "gadanipranav@gmail.com") || req.user.role?.name === "Super Admin";
    let companyId = req.user.companyId?._id || req.user.companyId;

    if (isSuperAdmin && !companyId) {
      companyId = req.body.companyId || req.query.companyId;
    }

    const staff = new Staff({
      name,
      email,
      phone,
      status,
      password: hashedPassword,
      role: roleDoc ? roleDoc._id : undefined,
      companyId: companyId
    });

    await staff.save();

    if (email && plainPassword) {
      try {
        sendMail(email, roleDoc ? roleDoc.name : "Staff", plainPassword);
      } catch (mailErr) {
        console.error("Failed to send welcome email:", mailErr);
      }
    }

    res.status(201).json(staff);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE
router.put("/:id", authMiddleware, checkPermission("staff_management", "update"), async (req, res) => {
  const staff = await Staff.findByIdAndUpdate(
    req.params.id,
    req.body,
    { returnDocument: 'after' }
  ).populate("role", "name");
  res.json(staff);
});

// DELETE
router.delete("/:id", authMiddleware, checkPermission("staff_management", "delete"), async (req, res) => {
  await Staff.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

// PROFILE ROUTES
router.get("/me", authMiddleware, staffController.getProfile);
router.put("/me", authMiddleware, staffController.updateProfile);

// COMPANY SETTINGS ROUTES
router.get("/company/settings", authMiddleware, companyController.getSettings);
router.put("/company/settings", authMiddleware, upload.single("appLogo"), companyController.updateSettings);

module.exports = router;