import cors from "cors";
import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://bokbok-chi.vercel.app",
      "https://alap2.vercel.app",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://bokbok-chi.vercel.app",
      "https://alap2.vercel.app",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  })
);

const users = {}; // Store connected users

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // socket.on("toggle-video", (data) => {
  //   socket.broadcast.emit("toggle-video", data);
  // });

  // socket.on("toggle-audio", (data) => {
  //   socket.broadcast.emit("toggle-audio", data);
  // });

  // socket.on("screen-share", (data) => {
  //   socket.broadcast.emit("screen-share", data);
  // });

  // socket.on("hang-up", (data) => {
  //   socket.broadcast.emit("hang-up", data);
  // });

  // socket.on("offer", (data) => {
  //   socket.broadcast.emit("offer", data);
  // });

  // socket.on("answer", (data) => {
  //   socket.broadcast.emit("answer", data);
  // });

  // socket.on("ice-candidate", (data) => {
  //   socket.broadcast.emit("ice-candidate", data);
  // });

  console.log(`User connected: ${socket.id}`);

  socket.on("join-meeting-room", (roomId) => {
    const room = io.sockets.adapter.rooms.get(roomId);
    const numUsers = room ? room.size : 0; // Get number of users in the room

    if (numUsers >= 2) {
      // If the room already has 2 users, deny entry
      socket.emit("room-full", roomId);
      return;
    }
    
    socket.join(roomId);
    socket.broadcast.to(roomId).emit("user-joined", socket.id);
  });

  socket.on("call-user", ({ targetUserId, offer }) => {
    io.to(targetUserId).emit("incoming-call", { from: socket.id, offer });
  });

  socket.on("answer-call", ({ targetUserId, answer }) => {
    io.to(targetUserId).emit("call-accepted", { answer });
  });

  socket.on("ice-candidate", ({ targetUserId, candidate }) => {
    io.to(targetUserId).emit("ice-candidate", candidate);
  });

  socket.on("disconnecting", () => {
    // Notify others in the rooms this socket was part of
    socket.rooms.forEach((roomId) => {
      socket.to(roomId).emit("user-disconnected", socket.id);
    });
  });

  socket.on("toggle-video", ({ targetUserId, enabled }) => {
    io.to(targetUserId).emit("toggle-video", enabled);
  });

  socket.on("toggle-audio", ({ targetUserId, enabled }) => {
    io.to(targetUserId).emit("toggle-audio", enabled);
  });

  socket.on("screen-share", ({ targetUserId, enabled }) => {
    io.to(targetUserId).emit("screen-share", enabled);
  });

  // =================

  // group call
  socket.on("join-room", (roomId) => {
    console.log(`User joined room ${roomId}`);
    socket.join(roomId); // <-- Join the room

    if (!users[roomId]) users[roomId] = [];
    users[roomId].push(socket.id);

    // Notify existing users
    users[roomId].forEach((peerId) => {
      if (peerId !== socket.id) {
        io.to(peerId).emit("room:user-joined", socket.id);
      }
    });

    socket.on("room:user-toggle-video", (peerId, data) => {
      socket.broadcast.to(roomId).emit("room:user-toggle-video", peerId, data);
    });

    socket.on("room:user-toggle-audio", (peerId, data) => {
      socket.broadcast.to(roomId).emit("room:user-toggle-audio", peerId, data);
    });

    socket.on("room:user-screen-share", (screenTrackId, isSharing) => {
      socket.broadcast
        .to(roomId)
        .emit("room:user-screen-share", screenTrackId, isSharing);
    });

    socket.on("room:user-hang-up", (peerId) => {
      socket.broadcast.to(roomId).emit("room:user-hang-up", peerId);
    });

    socket.on("room:offer", (peerId, offer) => {
      io.to(peerId).emit("room:offer", socket.id, offer);
    });

    socket.on("room:answer", (peerId, answer) => {
      io.to(peerId).emit("room:answer", socket.id, answer);
    });

    socket.on("room:ice-candidate", (peerId, candidate) => {
      io.to(peerId).emit("room:ice-candidate", socket.id, candidate);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", roomId, socket.id);
      socket.broadcast.to(roomId).emit("room:user-left", socket.id);
      users[roomId] = users[roomId].filter((id) => id !== socket.id);
    });
  });
});

server.listen(3000, () => {
  console.log("Signaling server running on http://localhost:3000");
});
