const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require("cookie-parser");

const authRoutes = require('./src/routes/authRoutes');
const groupChatRoutes = require('./src/routes/groupChatRoutes');
const uploadRoutes = require('./src/routes/uploadRoutes');

require('dotenv').config();
require('./src/config/db');

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(helmet());

app.get('/', (req, res) => {
    res.send('Server is Running');
});

app.use('/auth', authRoutes);
app.use('/groupChat', groupChatRoutes);
app.use("/upload", uploadRoutes);
app.use(
  "/uploads",
  express.static("uploads")
);


app.use((req, res) => {
    res.status(404).send('404:Route not found');
});

app.use((err, req, res, next) => {
    if (err.message) {
    // Custom error message from fileFilter or other checks
        return res.status(400).json({ error: err.message });
    }

    else if (err instanceof SyntaxError) {
        return res.status(400).send('400: Bad Request');
    } else {
        next();
    }
});

module.exports = app;