const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 5000;

// middlewares
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Welcome to playfit sports");
});

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    res.status(401).send({ error: true, message: "unauthorized access" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.JWT_SECRET, function (err, decoded) {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.glhjkho.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const classCollection = client.db("Playfit-Sports").collection("classes");
    const instructorCollection = client
      .db("Playfit-Sports")
      .collection("instructors");
    const usersCollection = client.db("Playfit-Sports").collection("users");

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user.role !== "admin") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden message" });
      }
      next();
    };

    const verifyInstructor = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user.role !== "instructor") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden message" });
      }
      next();
    };

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "3h" });
      res.send({ token });
    });

    // classes crud operation
    app.get("/classes", async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    });

    app.get("/myclasses/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await classCollection.findOne(query);
      res.send(result);
    });

    app.get(
      "/classes/:email",
      verifyJWT,
      verifyInstructor,
      async (req, res) => {
        const email = req.params.email;
        const query = { instructorEmail: email };
        const result = await classCollection.find(query).toArray();
        res.send(result);
      }
    );

    app.post("/classes", verifyJWT, verifyInstructor, async (req, res) => {
      const data = req.body;
      const classes = {
        name: data.name,
        instructor: data.instructor,
        availableSeats: parseFloat(data.availableSeats),
        totalSeat: parseFloat(data.totalSeat),
        instructorEmail: data.instructorEmail,
        status: data.status,
        image: data.image,
        price: parseFloat(data.price),
      };
      const result = await classCollection.insertOne(classes);
      res.send(result);
    });

    app.delete("/classes/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await classCollection.deleteOne(query);
      res.send(result);
    });

    app.patch("/classes/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const query = { _id: new ObjectId(id) };
      const option = { upsert: true };
      const updateDoc = {
        $set: {
          feedback: data.feedback,
          status: data.name,
        },
      };
      const result = await classCollection.updateOne(query, updateDoc, option);
      res.send(result);
    });

    app.patch(
      "/myclasses/:id",
      verifyJWT,
      verifyInstructor,
      async (req, res) => {
        const id = req.params.id;
        const data = req.body;
        const query = { _id: new ObjectId(id) };
        const option = {upsert:true}
        const updateDoc = {
          $set: {
            name: data?.name,
            instructor: data?.instructor,
            availableSeats: parseFloat(data?.availableSeats),
            totalSeat: parseFloat(data?.totalSeat),
            instructorEmail: data?.instructorEmail,
            image: data?.image,
            price: parseFloat(data?.price),
          }
        };
        console.log(updateDoc);
        const result = await classCollection.updateOne(query, updateDoc,option);
        res.send(result);
      }
    );

    //instructors crud operation
    app.get("/instructors", async (req, res) => {
      const result = await instructorCollection.find().toArray();
      res.send(result);
    });

    app.get("/instructors/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await instructorCollection.findOne(query);
      res.send(result);
    });

    //user crud operation
    app.post("/user", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const exist = await usersCollection.findOne(query);
      if (exist) {
        return res.send({ message: "already exist" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get("/user", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.get("/user/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (req.decoded.email !== email) {
        res.send({ admin: false });
      }
      const result = { admin: user.role === "admin" };
      res.send(result);
    });

    app.get("/user/instructor/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (req.decoded.email !== email) {
        res.send({ admin: false });
      }
      const result = { instructor: user.role === "instructor" };
      res.send(result);
    });

    app.patch("/user/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const role = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: role?.name,
        },
      };
      const user = await usersCollection.updateOne(query, updateDoc);
      res.send(user);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port);
