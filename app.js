const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

const authRoutes = require("./routes/auth");

app.use(bodyParser.json());

const corsOptions = {
  origin: "http://localhost:3000",
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

app.use("/auth", authRoutes);

app.use((req, res, next) => {
  return res.status(404).json({
    message: "Route not found"
  });
});

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
  app.listen(PORT, () => console.log(`Server started at post: ${PORT}`));
});
