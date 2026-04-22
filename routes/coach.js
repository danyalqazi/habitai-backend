const express = require("express");
const router = express.Router();
const db = require("../database");
const jwt = require("jsonwebtoken");
const Groq = require("groq-sdk");

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

router.post("/message", auth, async (req, res) => {
  const { message } = req.body;
  const userId = parseInt(req.user.id);

  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === "gsk_your_groq_key_here") {
    return res.status(400).json({ error: "Groq API key not configured." });
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const user = db.getUserById(userId) || { name: "Friend" };
    const habits = db.getHabitsByUser(userId) || [];

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fromDate = sevenDaysAgo.toISOString().split("T")[0];
    const logs = db.getLogsSince(userId, fromDate) || [];

    const today = new Date().toISOString().split("T")[0];
    const todayLogs = logs.filter((l) => l.completed_date === today);

    const habitSummary =
      habits.length > 0
        ? habits
            .map((h) => {
              const habitLogs = logs.filter((l) => l.habit_id === h.id);
              return `- ${h.icon} ${h.name}: completed ${habitLogs.length}/7 days`;
            })
            .join("\n")
        : "No habits added yet";

    console.log("🤖 Calling Groq API...");

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 300,
      messages: [
        {
          role: "system",
          content: `You are a friendly habit coach named HabitAI talking to ${user.name}.
Habits this week:\n${habitSummary}
Today: ${todayLogs.length}/${habits.length} habits completed.
Be warm, personal, concise (2-4 sentences). Use 1-2 emojis.`,
        },
        { role: "user", content: message },
      ],
    });

    const aiMessage = completion.choices[0].message.content;
    console.log("✅ Groq responded successfully!");

    // Save both user message and AI reply to database
    db.saveAiMessage(userId, message, "user");
    db.saveAiMessage(userId, aiMessage, "motivation");

    res.json({ message: aiMessage });
  } catch (err) {
    console.error("❌ Groq error:", err.message);
    res.status(500).json({ error: "AI failed: " + err.message });
  }
});

router.get("/history", auth, (req, res) => {
  const messages = db.getAiMessages(parseInt(req.user.id));
  res.json(messages);
});

module.exports = router;