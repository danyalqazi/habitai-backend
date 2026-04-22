const express = require("express");
const router = express.Router();
const db = require("../database");
const jwt = require("jsonwebtoken");

// Admin auth middleware
const adminAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Check if admin email
    if (decoded.email !== process.env.ADMIN_EMAIL) {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

// GET all users
router.get("/users", adminAuth, (req, res) => {
  try {
    const users = db.getAllUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE user
router.delete("/users/:id", adminAuth, (req, res) => {
  try {
    db.deleteUser(parseInt(req.params.id));
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET app stats
router.get("/stats", adminAuth, (req, res) => {
  try {
    const stats = db.getAdminStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all habits across all users
router.get("/habits", adminAuth, (req, res) => {
  try {
    const habits = db.getAllHabits();
    res.json(habits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all AI messages across all users
router.get("/messages", adminAuth, (req, res) => {
  try {
    const messages = db.getAllAiMessages();
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET daily signups for last 30 days
router.get("/signups", adminAuth, (req, res) => {
  try {
    const signups = db.getDailySignups();
    res.json(signups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;