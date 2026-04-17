const express = require("express");
const router = express.Router();
const Client = require("../models/Client");
const authMiddleware = require("../middleware/auth");

// ─── Helper ────────────────────────────────────────────────────────────────
const getCompanyId = (req) => {
  const isSuperAdmin =
    req.user?.email === "gadanipranav@gmail.com" ||
    req.user?.role?.name === "Super Admin";
  let c =
    req.query.companyId ||
    req.body.companyId ||
    req.user?.companyId?._id?.toString() ||
    req.user?.companyId?.toString();
  
  if (isSuperAdmin && req.query.companyId) {
    c = req.query.companyId;
  }
  
  if (c === "undefined" || c === "null" || c === "") {
    return undefined;
  }
  
  return c;
};

const isOwnerOrAdmin = (req) => {
  const isSuperAdmin =
    req.user?.email === "gadanipranav@gmail.com" ||
    req.user?.role?.name === "Super Admin";
  return isSuperAdmin || req.user?.role?.name === "Company Owner";
};

// ─── GET ALL ────────────────────────────────────────────────────────────────
router.get("/", authMiddleware, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const clients = await Client.find({ companyId })
      .sort({ createdAt: -1 })
      .populate("projects", "name")
      .populate("createdBy", "name");
    res.json(clients);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET SINGLE ─────────────────────────────────────────────────────────────
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const client = await Client.findOne({ _id: req.params.id, companyId })
      .populate("projects", "name")
      .populate("createdBy", "name");
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.json(client);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── CREATE ─────────────────────────────────────────────────────────────────
router.post("/", authMiddleware, async (req, res) => {
  try {
    if (!isOwnerOrAdmin(req))
      return res.status(403).json({ message: "Only project owners can add clients" });

    const companyId = getCompanyId(req);
    const { name, email, phone, company, address, status, notes, projects } = req.body;

    // Duplicate check within same company
    const exists = await Client.findOne({
      email: email?.toLowerCase().trim(),
      companyId,
    });
    if (exists)
      return res.status(400).json({ message: "A client with this email already exists" });

    const client = await Client.create({
      name,
      email,
      phone,
      company,
      address,
      status: status || "Active",
      notes,
      projects: projects || [],
      companyId,
      createdBy: req.user._id,
    });

    const populated = await client.populate("projects", "name");
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── UPDATE ─────────────────────────────────────────────────────────────────
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    if (!isOwnerOrAdmin(req))
      return res.status(403).json({ message: "Only project owners can update clients" });

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
    if (!isOwnerOrAdmin(req))
      return res.status(403).json({ message: "Only project owners can delete clients" });

    const companyId = getCompanyId(req);
    const client = await Client.findOneAndDelete({ _id: req.params.id, companyId });
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.json({ message: "Client deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
