require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { MongoClient } = require("mongodb");

const app = express();
app.use(cors());
app.use(express.json());

// Logger middleware: runs on every request
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Static file middleware: serves lesson images
app.use("/images", express.static(path.join(__dirname, "images")));

// If the image wasn't found above, return an error message
app.use("/images", (req, res) => {
  res.status(404).json({ error: "Image not found" });
});

const client = new MongoClient(process.env.MONGODB_URI);
let db;

app.get("/lessons", async (req, res) => {
  const lessons = await db.collection("lesson").find({}).toArray();
  res.json(lessons);
});

async function start() {
  await client.connect();
  db = client.db("after-school");
  console.log("Connected to MongoDB Atlas");

  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Server running on port ${port}`));
}

start();