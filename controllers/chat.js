const Message = require("../models/message");

module.exports = function(io) {
  const chatNsp = io.of("/chat");

  chatNsp.on("connection", socket => {
    console.log("new chat connection");

    let roomName = createChatRoomName(
      socket.handshake.query.user1,
      socket.handshake.query.user2
    );

    socket.join(roomName);

    socket.on("new message", async message => {
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
        const newMessage = new Message({
          message: message.message,
          to: message.to,
          from: message.from,
          createdAt: message.createdAt || new Date()
        });

        await newMessage.save();

        const roomName = createChatRoomName(message.from, message.to);

        socket.broadcast.to(roomName).emit("new message", message);
      }
      console.log(message);
    });

    socket.on("disconnect", () => {
      console.log("user left");
    });
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
