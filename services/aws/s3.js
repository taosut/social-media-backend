const aws = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");
const uuidv4 = require("uuid").v4;
require("dotenv").config();

const s3 = new aws.S3({ apiVersion: "2006-03-01" });

function fileFilter(req, file, cb) {
  if (
    file.mimetype !== "image/jpg" &&
    file.mimetype !== "image/png" &&
    file.mimetype !== "image/jpeg" &&
    file.mimetype !== "image/svg" &&
    file.mimetype !== "image/gif"
  ) {
    cb(null, false);
  } else {
    cb(null, true);
  }
}

const fileLimits = {
  fileSize: 1048576
};

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME,
    acl: "public-read",
    contentDesposition: "inline",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function(req, file, cb) {
      cb(null, {
        fieldName: req.fieldName,
        username: req.body.username,
        email: req.body.email
      });
    },
    key: function(req, file, cb) {
      req.fieldName = uuidv4() + "." + file.mimetype.split("/")[1];
      cb(null, req.fieldName);
    }
  }),
  fileFilter: fileFilter,
  limits: fileLimits
});

const deleteObject = function(bucketName, objectKey) {
  const params = {
    Bucket: bucketName,
    Key: objectKey
  };

  s3.deleteObject(params, function(error, data) {
    if (error) console.log(err, err.stack);
  });
};

module.exports = {
  uploadImage: upload,
  deleteObject: deleteObject
};
