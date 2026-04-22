const express = require("express");
const router = express.Router();
const db = require("../database");
const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

router.get("/summary", auth, (req, res) => {
  const userId = req.user.id;
  const habits = db.getHabitsByUser(userId);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const fromDate = thirtyDaysAgo.toISOString().split("T")[0];

  const logs = db.getLogsSince(userId, fromDate);

  const dailyMap = {};
  logs.forEach((log) => {
    if (!dailyMap[log.completed_date]) dailyMap[log.completed_date] = 0;
    dailyMap[log.completed_date]++;
  });

  const habitStats = habits.map((habit) => {
    const habitLogs = db.getHabitLogs(habit.id, userId);
    return {
      id: habit.id,
      name: habit.name,
      icon: habit.icon,
      color: habit.color,
      totalCompleted: habitLogs.length,
      logDates: habitLogs.map((l) => l.completed_date),
    };
  });

  res.json({ totalHabits: habits.length, dailyMap, habitStats });
});

module.exports = router;