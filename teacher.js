require("dotenv").config();
const { MongoClient } = require("mongodb");

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db("after-school");

  const lessons = await db.collection("lesson").find({}).toArray();

  // finds a lesson by subject and returns its id as a string
  const idOf = subject => String(lessons.find(l => l.subject === subject)._id);

  const teachers = [
    { firstName: "Sarah", lastName: "Khan", lessonIDs: [idOf("Maths"), idOf("Science"), idOf("Chess")] },
    { firstName: "James", lastName: "Wilson", lessonIDs: [idOf("English"), idOf("Drama")] },
    { firstName: "Priya", lastName: "Patel", lessonIDs: [idOf("Music"), idOf("Art"), idOf("Dance")] },
    { firstName: "Daniel", lastName: "Brown", lessonIDs: [idOf("Football"), idOf("Coding")] }
  ];

  await db.collection("teacher").deleteMany({});
  const result = await db.collection("teacher").insertMany(teachers);
  console.log("Teachers added:", result.insertedCount);

  await client.close();
}

run();