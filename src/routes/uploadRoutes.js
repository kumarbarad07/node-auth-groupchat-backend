const express = require("express");
const router = express.Router();
const upload = require("../middlewares/upload");

// SINGLE IMAGE
router.post(
  "/group-image",
  upload.single("image"),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "No file uploaded",
        });
      }

      res.json({
        message: "Image uploaded",
        imagePath: `/uploads/groupChat/${req.file.filename}`,
      });
    } catch (err) {
      res.status(500).json({
        message: err.message,
      });
    }
  }
);

module.exports = router;