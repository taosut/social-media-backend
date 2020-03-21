module.exports = function(io) {
  const chatNsp = io.of("/chat");

  chatNsp.on("connection", socket => {
    console.log("new chat connection");

    const user1 = socket.handshake.query.user1;
    const user2 = socket.handshake.query.user2;

    let roomName = user1;

    if (user1 < user2) {
      roomName = roomName + user2;
    } else {
      roomName = user2 + roomName;
    }

    console.log(roomName);

    socket.join(roomName);

    socket.on("disconnect", () => {
      console.log("user left");
    });
  });
};
