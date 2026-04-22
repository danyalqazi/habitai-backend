const express = require("express");
const router = express.Router();
const db = require("../database");
const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

// GET all habits
router.get("/", auth, (req, res) => {
  const habits = db.getHabitsByUser(req.user.id);
  res.json(habits);
});

// CREATE habit
router.post("/", auth, (req, res) => {
  const { name, icon, color, frequency, reminder_time } = req.body;
  const habit = db.createHabit(req.user.id, name, icon, color, frequency, reminder_time);
  res.json(habit);
});

// DELETE habit
router.delete("/:id", auth, (req, res) => {
  db.deleteHabit(parseInt(req.params.id), req.user.id);
  res.json({ message: "Habit deleted" });
});

// COMPLETE habit for today
router.post("/:id/complete", auth, (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  try {
    db.completeHabit(parseInt(req.params.id), req.user.id, today);
    res.json({ message: "Habit completed!", date: today });
  } catch {
    res.status(400).json({ error: "Already completed today" });
  }
});

// UNCOMPLETE habit
router.delete("/:id/complete", auth, (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  db.uncompleteHabit(parseInt(req.params.id), req.user.id, today);
  res.json({ message: "Habit uncompleted" });
});

// GET habit logs
router.get("/:id/logs", auth, (req, res) => {
  const logs = db.getHabitLogs(parseInt(req.params.id), req.user.id);
  res.json(logs);
});

// GET today's completions
router.get("/today/completed", auth, (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const completedIds = db.getTodayCompleted(req.user.id, today);
  res.json(completedIds);
});

module.exports = router;