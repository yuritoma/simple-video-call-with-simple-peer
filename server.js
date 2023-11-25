// const express = require('express');
// const http = require('http');
// const cors = require('cors');
// const app = express();
// const server = http.createServer(app);
// const socket = require('socket.io');
// const io = socket(server);

const { Server } = require("socket.io");

const io = new Server(8000, {
  cors: true,
});

const users = {};

io.on('connection', (socket) => {
  console.log(`User connected:`, socket.id);

  if (!users[socket.id]) {
    users[socket.id] = socket.id;
  }

  socket.emit('yourID', socket.id);
  io.sockets.emit('allUsers', users);

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    delete users[socket.id];
  });

  socket.on('callUser', (data) => {
    io.to(data.userToCall).emit('hey', { signal: data.signalData, from: data.from });
  });

  socket.on('acceptCall', (data) => {
    io.to(data.to).emit('callAccepted', data.signal);
  });
});

// const PORT = process.env.PORT || 8000;

// server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
