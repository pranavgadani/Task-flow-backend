const express = require("express");
const router = express.Router();
const Client = require("../models/Client");
const authMiddleware = require("../middleware/auth");

// ─── Resolve Company ID ───────────────────────────────────────
const getCompanyId = (req) => {
  const id = req.body.companyId || req.query.companyId || req.user?.companyId?._id || req.user?.companyId;
  return id ? id.toString() : null;
};

// ─── GET ALL ──────────────────────────────────────────────────
router.get("/", authMiddleware, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    const isSuperAdmin = req.user?.email === "gadanipranav@gmail.com" || req.user?.role?.name === "Super Admin";

    const filter = {};
    if (cid) {
      filter.companyId = cid;
    } else if (!isSuperAdmin) {
      console.warn("⚠️ No companyId for regular user:", req.user?._id);
      return res.json([]);
    }

    const clients = await Client.find(filter).sort({ createdAt: -1 }).populate("projects", "name");
    res.json(clients);
  } catch (err) {
    console.error("❌ GET Clients Error:", err);
    res.status(500).json({ error: "Server error", message: err.message });
  }
});

// ─── CREATE ───────────────────────────────────────────────────
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name, email, projects } = req.body;
    
    // Safety check for user
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });

    // Validate inputs
    if (!name || !email) return res.status(400).json({ message: "Name and Email are required" });

    // Resolve Company
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ message: "Company context missing. Please re-login." });

    // Deduplication
    const cleanEmail = email.toLowerCase().trim();
    const exists = await Client.findOne({ email: cleanEmail, companyId });
    if (exists) return res.status(400).json({ message: "Client already exists" });

    // Map projects properly (clean empty strings if any)
    const projectList = Array.isArray(projects) ? projects.filter(p => p && p.length === 24) : [];

    const newClient = new Client({
      ...req.body,
      email: cleanEmail,
      companyId: companyId,
      createdBy: req.user._id,
      projects: projectList
    });

    await newClient.save();
    const populated = await newClient.populate("projects", "name");
    res.status(201).json(populated);

  } catch (err) {
    console.error("❌ POST Client Error:", err);
    res.status(500).json({ error: "Server error", message: err.message });
  }
});

// ─── UPDATE ───────────────────────────────────────────────────
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const updated = await Client.findOneAndUpdate(
      { _id: req.params.id, companyId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: "Client not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE ───────────────────────────────────────────────────
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const deleted = await Client.findOneAndDelete({ _id: req.params.id, companyId });
    if (!deleted) return res.status(404).json({ message: "Client not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
