const Message = require("../models/message");

module.exports = function(io) {
  let users = {};
  // REMEMBER USER SOCKET BY USERNAME
  io.on("connection", socket => {
    users[socket.handshake.query.username] = socket;

    socket.on("disconnect", () => {
      for (username in users) {
        if (users[username] === socket.id) {
          console.log("true, remove this socket");
        }
      }
    });
  });

  const chatNsp = io.of("/chat");

  chatNsp.on("connection", socket => {
    // CREATE UNIQUE CHAT ROOM
    let roomName = createChatRoomName(
      socket.handshake.query.user1,
      socket.handshake.query.user2
    );

    socket.join(roomName);

    socket.on("new message", async message => {
      let numberOfUsersInRoom;
      chatNsp.in(roomName).clients((error, clients) => {
        if (error) console.log(error);
        numberOfUsersInRoom = clients.length;
      });

      // Validate message
      const messageTypeValidation = Boolean(
        typeof message.message === "string"
      );
      const messageLengthValidation =
        Boolean(message.message.length < 2000) &&
        Boolean(message.message.length);

      if (
        usernameValidation(message.to) &&
        usernameValidation(message.from) &&
        messageLengthValidation &&
        messageTypeValidation
      ) {
        // Create and save message in database
        const newMessage = new Message({
          message: message.message,
          to: message.to,
          from: message.from,
          createdAt: message.createdAt || new Date()
        });

        await newMessage.save();

        // Check if both users are in chatroom
        if (numberOfUsersInRoom !== 2) {
          // Send notification
          if (users[message.to])
            users[message.to].emit("chat notification", message.from);
        } else {
          const roomName = createChatRoomName(message.from, message.to);
          // Send private message to room
          socket.broadcast.to(roomName).emit("new message", message);
        }
      }
    });

    socket.on("disconnect", () => {});
  });
};

function usernameValidation(username) {
  // Type validation
  if (typeof username !== "string") return false;
  // Length validation
  if (username.length < 2 || username.length > 32) return false;
  // Characters validation
  if (!/^[\w\.\-\_]{2,32}$/.test(username)) return false;
  return true;
}

function createChatRoomName(username1, username2) {
  let roomName = username1;

  if (username1 < username2) {
    roomName = roomName + username2;
  } else {
    roomName = username2 + roomName;
  }

  return roomName;
}
