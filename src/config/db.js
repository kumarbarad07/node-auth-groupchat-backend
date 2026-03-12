// mongoose connection
const mongoose = require('mongoose');
const db = process.env.MONGODB_URI;

module.exports = mongoose.connect(db)
    .then(() => console.log('connected to mongodb', process.env.MONGODB_URI))
    .catch(err => console.error('Could not connect to MongoDB...', err));