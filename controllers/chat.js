module.exports = function(io) {
  const chatNsp = io.of("/chat");

  chatNsp.on("connection", socket => {
    console.log("new chat connection");

    let roomName = createChatRoomName(
      socket.handshake.query.user1,
      socket.handshake.query.user2
    );

    socket.join(roomName);

    socket.on("new message", message => {
      console.log(message);

      const roomName = createChatRoomName(
        message.from.username,
        message.to.username
      );

      socket.broadcast.to(roomName).emit("new message", message);
    });

    socket.on("disconnect", () => {
      console.log("user left");
    });
  });
};

function createChatRoomName(username1, username2) {
  let roomName = username1;

  if (username1 < username2) {
    roomName = roomName + username2;
  } else {
    roomName = username2 + roomName;
  }

  return roomName;
}
