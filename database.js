const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const path = require("path");

const adapter = new FileSync(path.join(__dirname, "habittracker.json"));
const db = low(adapter);

// Set default structure
db.defaults({
  users: [],
  habits: [],
  habit_logs: [],
  ai_messages: [],
  _counters: { users: 0, habits: 0, habit_logs: 0, ai_messages: 0 },
}).write();

// Helper to auto-increment IDs
const nextId = (table) => {
  const current = db.get(`_counters.${table}`).value();
  const next = current + 1;
  db.set(`_counters.${table}`, next).write();
  return next;
};

// Helper functions to mimic SQLite API
const dbHelper = {
  // USERS
  createUser: (name, email, password) => {
    const id = nextId("users");
    const user = {
      id,
      name,
      email,
      password,
      created_at: new Date().toISOString(),
    };
    db.get("users").push(user).write();
    return { lastInsertRowid: id };
  },
  getUserByEmail: (email) => {
    return db.get("users").find({ email }).value();
  },
  getUserById: (id) => {
    return db.get("users").find({ id: parseInt(id) }).value();
  },

  // HABITS
  createHabit: (user_id, name, icon, color, frequency, reminder_time) => {
    const id = nextId("habits");
    const habit = {
      id,
      user_id,
      name,
      icon: icon || "⭐",
      color: color || "#7F77DD",
      frequency: frequency || "daily",
      reminder_time: reminder_time || null,
      created_at: new Date().toISOString(),
    };
    db.get("habits").push(habit).write();
    return habit;
  },
  getHabitsByUser: (user_id) => {
    return db
      .get("habits")
      .filter({ user_id })
      .value()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },
  getHabitById: (id) => {
    return db.get("habits").find({ id }).value();
  },
  deleteHabit: (id, user_id) => {
    db.get("habits").remove({ id, user_id }).write();
    db.get("habit_logs").remove({ habit_id: id }).write();
  },

  // HABIT LOGS
  completeHabit: (habit_id, user_id, completed_date) => {
    const existing = db
      .get("habit_logs")
      .find({ habit_id, user_id, completed_date })
      .value();
    if (existing) throw new Error("Already completed today");
    const id = nextId("habit_logs");
    db.get("habit_logs")
      .push({ id, habit_id, user_id, completed_date, created_at: new Date().toISOString() })
      .write();
    return { id };
  },
  uncompleteHabit: (habit_id, user_id, completed_date) => {
    db.get("habit_logs").remove({ habit_id, user_id, completed_date }).write();
  },
  getTodayCompleted: (user_id, today) => {
    return db
      .get("habit_logs")
      .filter({ user_id, completed_date: today })
      .map("habit_id")
      .value();
  },
  getHabitLogs: (habit_id, user_id) => {
    return db
      .get("habit_logs")
      .filter({ habit_id, user_id })
      .value()
      .sort((a, b) => new Date(b.completed_date) - new Date(a.completed_date));
  },
  getLogsSince: (user_id, fromDate) => {
    return db
      .get("habit_logs")
      .filter((l) => l.user_id === user_id && l.completed_date >= fromDate)
      .value();
  },

  // AI MESSAGES
  saveAiMessage: (user_id, message, type) => {
    const id = nextId("ai_messages");
    db.get("ai_messages")
      .push({ id, user_id, message, type, created_at: new Date().toISOString() })
      .write();
  },
  getAiMessages: (user_id) => {
    return db
      .get("ai_messages")
      .filter({ user_id })
      .value()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 20);
  },

  // ADMIN FUNCTIONS
  getAllUsers: () => {
    const users = db.get("users").value();
    return users.map((u) => {
      const habits = db.get("habits").filter({ user_id: u.id }).value();
      const logs = db.get("habit_logs").filter({ user_id: u.id }).value();
      const aiMessages = db.get("ai_messages").filter({ user_id: u.id, type: "motivation" }).value();
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        created_at: u.created_at,
        totalHabits: habits.length,
        totalCompletions: logs.length,
        totalAiMessages: aiMessages.length,
      };
    });
  },

  deleteUser: (id) => {
    db.get("users").remove({ id }).write();
    db.get("habits").remove({ user_id: id }).write();
    db.get("habit_logs").remove({ user_id: id }).write();
    db.get("ai_messages").remove({ user_id: id }).write();
  },

  getAdminStats: () => {
    const users = db.get("users").value();
    const habits = db.get("habits").value();
    const logs = db.get("habit_logs").value();
    const aiMessages = db.get("ai_messages").filter({ type: "motivation" }).value();

    const today = new Date().toISOString().split("T")[0];
    const todayLogs = logs.filter((l) => l.completed_date === today);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fromDate = sevenDaysAgo.toISOString().split("T")[0];
    const newUsersThisWeek = users.filter((u) => u.created_at >= fromDate);

    return {
      totalUsers: users.length,
      totalHabits: habits.length,
      totalCompletions: logs.length,
      totalAiMessages: aiMessages.length,
      todayCompletions: todayLogs.length,
      newUsersThisWeek: newUsersThisWeek.length,
    };
  },

  getAllHabits: () => {
    const habits = db.get("habits").value();
    return habits.map((h) => {
      const user = db.get("users").find({ id: h.user_id }).value();
      const logs = db.get("habit_logs").filter({ habit_id: h.id }).value();
      return {
        ...h,
        userName: user?.name || "Unknown",
        userEmail: user?.email || "Unknown",
        totalCompletions: logs.length,
      };
    });
  },
  
// it only shows ai messages

  // getAllAiMessages: () => {
  //   const messages = db.get("ai_messages")
  //     .filter({ type: "motivation" })
  //     .value()
  //     .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  //     .slice(0, 50);
  //   return messages.map((m) => {
  //     const user = db.get("users").find({ id: m.user_id }).value();
  //     return {
  //       ...m,
  //       userName: user?.name || "Unknown",
  //     };
  //   });
  // },

  //it shows all messages of ai and user
  getAllAiMessages: () => {
    // Get all messages (both user and AI)
    const messages = db.get("ai_messages")
      .value()
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    // Group by user
    const grouped = {};
    messages.forEach((m) => {
      const user = db.get("users").find({ id: m.user_id }).value();
      const userName = user?.name || "Unknown";
      const userEmail = user?.email || "Unknown";
      if (!grouped[m.user_id]) {
        grouped[m.user_id] = {
          userId: m.user_id,
          userName,
          userEmail,
          messages: [],
        };
      }
      grouped[m.user_id].messages.push({
        id: m.id,
        type: m.type,
        message: m.message,
        created_at: m.created_at,
      });
    });

    return Object.values(grouped);
  },

  getDailySignups: () => {
    const users = db.get("users").value();
    const last30 = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      last30[dateStr] = 0;
    }
    users.forEach((u) => {
      const date = u.created_at?.split("T")[0];
      if (date && last30[date] !== undefined) {
        last30[date]++;
      }
    });
    return Object.entries(last30).map(([date, count]) => ({
      date: date.slice(5),
      signups: count,
    }));
  },
};

console.log("✅ Database ready!");
module.exports = dbHelper;