// const app = require('./app');
// const port = process.env.PORT || 4000;

// app.listen(port, () => {
//     (`Server Running on port ${port}`);
// });


const http = require("http");
const { Server } = require("socket.io");

const app = require("./app");

const port = process.env.PORT || 4000;

// Create HTTP server
const server = http.createServer(app);

// Socket setup
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// Import socket file
require("./src/sockets/groupChat")(io);

// Inject io into controller
const {
  setSocketInstance,
} = require("./src/controllers/groupChatController");

setSocketInstance(io);

// Listen server
server.listen(port, () => {
  console.log(`Server Running on port ${port}`);
});