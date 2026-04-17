const express = require("express");
const router = express.Router();
const Client = require("../models/Client");
const authMiddleware = require("../middleware/auth");

// ─── Helper: Get Company ID ───────────────────────────────────────────────
const getCompanyId = (req) => {
  return (
    req.body.companyId ||
    req.query.companyId ||
    req.user?.companyId?._id?.toString() ||
    req.user?.companyId?.toString()
  );
};

// ─── Helper: Check Permissions ─────────────────────────────────────────────
const isOwnerOrAdmin = (req) => {
  const isSuperAdmin =
    req.user?.email === "gadanipranav@gmail.com" ||
    req.user?.role?.name === "Super Admin";
  return isSuperAdmin || req.user?.role?.name === "Company Owner";
};

// ─── GET ALL ────────────────────────────────────────────────────────────────
router.get("/", authMiddleware, async (req, res) => {
  try {
    const isSuperAdmin = req.user?.email === "gadanipranav@gmail.com" || req.user?.role?.name === "Super Admin";
    const cid = getCompanyId(req);
    const filter = {};
    if (cid) {
      filter.companyId = cid;
    } else if (!isSuperAdmin) {
      return res.json([]);
    }
    const clients = await Client.find(filter)
      .sort({ createdAt: -1 })
      .populate("projects", "name");
    res.json(clients);
  } catch (err) {
    console.error("❌ GET Clients Error:", err);
    res.status(500).json({ message: "Error fetching clients" });
  }
});

// ─── CREATE ─────────────────────────────────────────────────────────────────
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ message: "Name and Email are required" });
    if (!isOwnerOrAdmin(req)) return res.status(403).json({ message: "Access denied" });

    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ message: "Company profile not found. Please re-login." });

    const cleanEmail = email.toLowerCase().trim();
    const exists = await Client.findOne({ email: cleanEmail, companyId });
    if (exists) return res.status(400).json({ message: "Client with this email already exists" });

    const client = await Client.create({
      ...req.body,
      email: cleanEmail,
      companyId,
      createdBy: req.user._id
    });
    const populated = await client.populate("projects", "name");
    res.status(201).json(populated);
  } catch (err) {
    console.error("❌ CREATE Client Error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ─── UPDATE ─────────────────────────────────────────────────────────────────
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    if (!isOwnerOrAdmin(req)) return res.status(403).json({ message: "Access denied" });
    const companyId = getCompanyId(req);
    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, companyId },
      req.body,
      { new: true, runValidators: true }
    ).populate("projects", "name");
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.json(client);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── DELETE ─────────────────────────────────────────────────────────────────
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    if (!isOwnerOrAdmin(req)) return res.status(403).json({ message: "Access denied" });
    const companyId = getCompanyId(req);
    const client = await Client.findOneAndDelete({ _id: req.params.id, companyId });
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
