const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

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

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function() {
  app.listen(PORT, () => console.log(`Server started at post: ${PORT}`));
});
