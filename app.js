const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const socket = require("./socket");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const postRoutes = require("./routes/post");
const commentRoutes = require("./routes/comment");
const messageRoutes = require("./routes/message");

const chatController = require("./controllers/chat");
const globalBruteforce = require("./controllers/rate-limit").globalBruteforce;

const app = express();
// Enable proxy
app.enable("trust proxy");
app.set("trust proxy", 1);

app.use(bodyParser.json());

// CORS(Cross-Origin-Resource-Sharing)
const origin = process.env.CLIENT_URL || "http://localhost:3000";
const corsOptions = {
  origin: origin,
  optionsSuccessStatus: 200
};

app.options("*", cors(corsOptions));
app.use(cors(corsOptions));

// DATABASE CONNECT AND START SERVER
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  autoIndex: false,
  useCreateIndex: true,
  useUnifiedTopology: true
});

// GLOBAL RATE-LIMIT
app.use(globalBruteforce.prevent);

// ROUTES
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/posts", postRoutes);
app.use("/comments", commentRoutes);
app.use("/messages", messageRoutes);

// HANDLING 404 ROUTES
app.use((req, res, next) => {
  return res.status(404).json({
    message: "Route not found"
  });
});

// HANDLING ERRORS/EXCEPTIONS
app.use((error, req, res, next) => {
  console.log(error);
  if (!error.statusCode) error.statusCode = 500;
  if (!error.message) error.message = "An error occurred";

  return res.status(Number(error.statusCode)).json({
    message: error.message
  });
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function() {
  let server = app.listen(PORT, () =>
    console.log(`Server started at post: ${PORT}`)
  );

  let io = socket.init(server);

  chatController(io);
});
