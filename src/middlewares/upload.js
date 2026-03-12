const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ABSOLUTE PATH
const uploadPath = path.join(
  __dirname,
  "../../uploads/groupChat"
);

// CREATE FOLDER IF NOT EXISTS
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, {
    recursive: true,
  });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log("File Saving to:", uploadPath);
    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

module.exports = multer({ storage });