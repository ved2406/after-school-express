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

// GET: search lessons by subject, location, price or spaces
app.get("/search", async (req, res) => {
  const query = (req.query.q || "").trim().toLowerCase();
  const lessons = await db.collection("lesson").find({}).toArray();

  if (query === "") {
    return res.json(lessons);
  }

  const results = lessons.filter(lesson => {
    return (
      String(lesson.subject).toLowerCase().includes(query) ||
      String(lesson.location).toLowerCase().includes(query) ||
      String(lesson.price).includes(query) ||
      String(lesson.space).includes(query)
    );
  });

  res.json(results);
});

// GET: all teachers
app.get("/teachers", async (req, res) => {
  const teachers = await db.collection("teacher").find({}).toArray();
  res.json(teachers);
});

// GET: all lessons taught by one teacher
app.get("/teachers/:id/lessons", async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "Invalid teacher id" });
  }

  const teacher = await db.collection("teacher").findOne({
    _id: new ObjectId(req.params.id)
  });

  if (!teacher) {
    return res.status(404).json({ error: "Teacher not found" });
  }

  // the teacher stores lesson ids as strings, so convert them to ObjectIds
  const ids = teacher.lessonIDs.map(id => new ObjectId(id));
  const lessons = await db.collection("lesson")
    .find({ _id: { $in: ids } })
    .toArray();

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

  const orders = await db.collection("order")
    .find({ lessonIDs: lessonId })
    .toArray();

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