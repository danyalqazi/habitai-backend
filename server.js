const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();
require("./database");

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "DELETE", "PUT"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

app.use("/api/auth", require("./routes/auth"));
app.use("/api/habits", require("./routes/habits"));
app.use("/api/progress", require("./routes/progress"));
app.use("/api/coach", require("./routes/coach"));
app.use("/api/admin", require("./routes/admin"));

app.get("/", (req, res) => {
  res.json({ message: "HabitAI API is running! 🚀" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});