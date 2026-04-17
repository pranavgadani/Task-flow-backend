const Project = require("../models/Project");
const Staff = require("../models/Staff");
const { sendProjectMail } = require("../config/mail");

// Input validation helper
const validateProjectInput = (data) => {
    const errors = [];

    // Validate name
    if (!data.name || typeof data.name !== 'string') {
        errors.push("Project name is required and must be a string");
    } else if (data.name.trim().length === 0) {
        errors.push("Project name cannot be empty");
    } else if (data.name.length > 100) {
        errors.push("Project name cannot exceed 100 characters");
    }

    // Validate description
    if (data.description && typeof data.description !== 'string') {
        errors.push("Description must be a string");
    } else if (data.description && data.description.length > 500) {
        errors.push("Description cannot exceed 500 characters");
    }

    // Validate status
    if (data.status && !["Active", "Inactive"].includes(data.status)) {
        errors.push("Status must be either 'Active' or 'Inactive'");
    }

    return errors;
};

// Sanitize input - removes potentially dangerous characters
const sanitizeInput = (data) => {
    return {
        name: data.name?.trim() || "",
        description: data.description?.trim() || "",
        assignedTo: Array.isArray(data.assignedTo) ? data.assignedTo : [],
        status: data.status || "Active",
        companyId: data.companyId || null
    };
};

exports.createProject = async (req, res) => {
    try {
        // Validate input
        const validationErrors = validateProjectInput(req.body);
        if (validationErrors.length > 0) {
            return res.status(400).json({ error: validationErrors.join(", ") });
        }

        // Sanitize input
        const sanitizedData = sanitizeInput(req.body);

        let companyId = req.user.companyId?._id || req.user.companyId;
        const isSuperAdmin = req.user.email === (process.env.SUPERADMIN_EMAIL || "gadanipranav@gmail.com") || req.user.role?.name === "Super Admin";
        
        if (isSuperAdmin && !companyId) {
            companyId = req.body.companyId || req.query.companyId;
        }

        if (companyId) {
            sanitizedData.companyId = companyId;
        }

        const project = new Project(sanitizedData);
        await project.save();

        // Return populated project
        const populated = await Project.findById(project._id).populate("assignedTo", "name email");

        // 📩 Send email to all assigned staff/managers
        if (populated.assignedTo && populated.assignedTo.length > 0) {
            for (const user of populated.assignedTo) {
                if (user.email) {
                    sendProjectMail(user.email, user.name, populated.name, populated.description || "");
                }
            }
        }

        res.status(201).json(populated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getProjects = async (req, res) => {
    try {
        const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || "gadanipranav@gmail.com";
        const isSuperAdmin = req.user?.email === SUPERADMIN_EMAIL || req.user?.role?.name === "Super Admin";

        const companyId = req.user.companyId?._id || req.user.companyId;
        let filter = {};
        
        if (!isSuperAdmin) {
            if (companyId) {
                filter.$or = [
                    { companyId: companyId },
                    { companyId: String(companyId) }
                ];
            }
        } else if (req.query.companyId && req.query.companyId !== "undefined") {
            filter.$or = [
                { companyId: req.query.companyId },
                { companyId: String(req.query.companyId) }
            ];
        }

        const projects = await Project.find(filter).populate("assignedTo", "name email");
        res.json(projects);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getProject = async (req, res) => {
    try {
        const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || "gadanipranav@gmail.com";
        const isSuperAdmin = req.user?.email === SUPERADMIN_EMAIL || req.user?.role?.name === "Super Admin";
        const companyId = req.user.companyId?._id || req.user.companyId;

        const query = { _id: req.params.id };
        if (!isSuperAdmin) query.companyId = companyId;

        const project = await Project.findOne(query).populate("assignedTo", "name email");
        if (!project) return res.status(404).json({ error: "Project not found" });

        if (!isSuperAdmin) {
            const isAssigned = project.assignedTo.some(user => user._id.toString() === req.user._id.toString());
            if (!isAssigned) return res.status(403).json({ error: "You are not assigned to this project" });
        }

        res.json(project);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateProject = async (req, res) => {
    try {
        // Validate input
        const validationErrors = validateProjectInput(req.body);
        if (validationErrors.length > 0) {
            return res.status(400).json({ error: validationErrors.join(", ") });
        }

        // Sanitize input
        const sanitizedData = sanitizeInput(req.body);

        const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || "gadanipranav@gmail.com";
        const isSuperAdmin = req.user.email === SUPERADMIN_EMAIL || req.user.role?.name === "Super Admin";
        let companyId = req.user.companyId?._id || req.user.companyId;

        if (isSuperAdmin && !companyId) {
            companyId = req.body.companyId || req.query.companyId;
        }

        const query = { _id: req.params.id };
        if (!isSuperAdmin) {
            query.companyId = companyId;
            sanitizedData.companyId = companyId; // Prevent accidental company change
        } else if (companyId) {
            sanitizedData.companyId = companyId;
        }

        // Get old project to find newly assigned users
        const oldProject = await Project.findOne(query);
        if (!oldProject) return res.status(404).json({ error: "Project not found" });

        const oldAssignedIds = (oldProject?.assignedTo || []).map(id => id.toString());

        const project = await Project.findOneAndUpdate(query, sanitizedData, {
            new: true,
            runValidators: true
        }).populate("assignedTo", "name email");

        // 📩 Send email only to NEWLY assigned staff/managers
        if (project.assignedTo && project.assignedTo.length > 0) {
            for (const user of project.assignedTo) {
                if (user.email && !oldAssignedIds.includes(user._id.toString())) {
                    sendProjectMail(user.email, user.name, project.name, project.description || "", "updated");
                }
            }
        }

        res.json(project);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteProject = async (req, res) => {
    try {
        const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || "gadanipranav@gmail.com";
        const isSuperAdmin = req.user.email === SUPERADMIN_EMAIL || req.user.role?.name === "Super Admin";
        const companyId = req.user.companyId?._id || req.user.companyId;

        const query = { _id: req.params.id };
        if (!isSuperAdmin) query.companyId = companyId;

        const project = await Project.findOneAndDelete(query);
        if (!project) return res.status(404).json({ error: "Project not found" });
        res.json({ message: "Project deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
