const mongoose = require("mongoose");
const ExpressBrute = require("express-brute");
const MongooseStore = require("express-brute-mongoose");
const BruteForceSchema = require("express-brute-mongoose/dist/schema");
const moment = require("moment");

const model = mongoose.model(
  "bruteforce",
  new mongoose.Schema(BruteForceSchema)
);

const store = new MongooseStore(model);

const failCallback = function(req, res, next, nextValidRequestDate) {
  res
    .status(429)
    .json({
      message: `You've made too many attempts in short period of time, please try again ${moment(
        nextValidRequestDate
      ).fromNow()}`
    });
};

const handleStoreError = function(err) {
  console.error(err);

  throw {
    message: err.message,
    parent: err.parent
  };
};

const globalBruteforce = new ExpressBrute(store, {
  freeRetries: 1000,
  minWait: 500,
  maxWait: 15 * 60 * 1000,
  failCallback: failCallback,
  handleStoreError: handleStoreError
});

const signUpBruteforce = new ExpressBrute(store, {
  freeRetries: 30,
  minWait: 25 * 60 * 60 * 1000,
  maxWait: 25 * 60 * 60 * 1000,
  attachResetToRequest: false,
  refreshTimeoutOnRequest: false,
  lifetime: 24 * 60 * 60,
  failCallback: failCallback,
  handleStoreError: handleStoreError
});

module.exports = {
  signUpBruteforce
};
