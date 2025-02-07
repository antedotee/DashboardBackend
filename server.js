// Path: /Users/devanshdv/Documents/Backend/server.js
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
require("dotenv").config();

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// Routes

app.use("/api/auth", require("./routes/auth"));
app.use("/api/authors", require("./routes/author"));
app.use("/api/books", require("./routes/book"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/sales", require("./routes/sales"));
app.use("/api/inventory", require("./routes/inventory"));
app.use("/api/earnings", require("./routes/earnings"));
app.use("/api/admin", require("./routes/admin"));

const PORT = process.env.PORT || 5777;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
