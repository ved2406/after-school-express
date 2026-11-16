require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { MongoClient, ObjectId } = require("mongodb");

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

// GET: all lessons
app.get("/lessons", async (req, res) => {
  const lessons = await db.collection("lesson").find({}).toArray();
  res.json(lessons);
});

// POST: save a new order
app.post("/orders", async (req, res) => {
  const { name, phone, lessonIDs, spaces } = req.body;

  if (!name || !phone || !lessonIDs || !spaces) {
    return res.status(400).json({ error: "Missing order details" });
  }

  const result = await db.collection("order").insertOne({
    name,
    phone,
    lessonIDs,
    spaces
  });

  res.status(201).json({ message: "Order saved", id: result.insertedId });
});

// PUT: update any attribute of a lesson
app.put("/lessons/:id", async (req, res) => {
  const result = await db.collection("lesson").updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: req.body }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({ error: "Lesson not found" });
  }

  res.json({ message: "Lesson updated" });
});

// GET: how many slots have been purchased for one lesson
app.get("/enrolment/:lessonid", async (req, res) => {
  const lessonId = req.params.lessonid;

  // find every order that contains this lesson id
  const orders = await db.collection("order")
    .find({ lessonIDs: lessonId })
    .toArray();

  // count how many times the id appears in each order's lessonIDs array
  let slotsPurchased = 0;
  orders.forEach(order => {
    order.lessonIDs.forEach(id => {
      if (id === lessonId) {
        slotsPurchased++;
      }
    });
  });

  res.json({ lessonId: lessonId, slotsPurchased: slotsPurchased });
});

async function start() {
  await client.connect();
  db = client.db("after-school");
  console.log("Connected to MongoDB Atlas");

  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Server running on port ${port}`));
}

start();