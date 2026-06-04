const { verifyToken } = require('../auth');
const { Message, User } = require('../db');

function initSocket(io) {
  const onlineUsers = new Map(); // userId → socketId
  const userLocations = new Map(); // userId → { lat, lng }

  io.on('connection', socket => {
    const payload = verifyToken(socket.handshake.query.token || '');
    if (!payload) { socket.disconnect(); return; }
    const userId = String(payload.userId);
    onlineUsers.set(userId, socket.id);

    socket.on('chat', async ({ receiverId, content, image_url }) => {
      if (!content?.trim() && !image_url) return;
      const msg = await Message.create({
        sender_id:   userId,
        receiver_id: receiverId,
        content:     (content || '').trim(),
        image_url:   image_url || null,
        message_type: 'user',
      });
      const data = { ...msg.toJSON(), id: msg._id.toString() };
      socket.emit('message', { type: 'sent',    data });
      const recvSid = onlineUsers.get(String(receiverId));
      if (recvSid) io.to(recvSid).emit('message', { type: 'message', data });
    });

    socket.on('typing', ({ receiverId, isTyping }) => {
      const recvSid = onlineUsers.get(String(receiverId));
      if (recvSid) io.to(recvSid).emit('typing', { senderId: userId, isTyping });
    });

    // Track user location for heatmap
    socket.on('update_location', (coords) => {
      if (coords && coords.lat && coords.lng) {
        userLocations.set(userId, { lat: coords.lat, lng: coords.lng, intensity: 0.8 });
        // Broadcast to all connected clients
        const heatData = Array.from(userLocations.values()).map(loc => [loc.lat, loc.lng, loc.intensity]);
        io.emit('active_users_update', heatData);
      }
    });

    // Digital Heritage Passport: Claim Artifact
    socket.on('claim_artifact', async ({ artifactId, stickerUrl, region }) => {
      if (!artifactId) return;
      try {
        const user = await User.findById(userId);
        if (user) {
          const exists = user.passport.find(p => p.artifactId === artifactId);
          if (!exists) {
            user.passport.push({ artifactId, stickerUrl, region });
            user.points = (user.points || 0) + 100;
            await user.save();
            socket.emit('artifact_claimed', { artifactId, points: user.points, stickerUrl });
          }
        }
      } catch(e) { console.error('claim_artifact error:', e); }
    });

    // Social UX: Shared Lanterns
    socket.on('light_lantern', ({ lat, lng }) => {
      if (lat && lng) {
        io.emit('lantern_lit', { lat, lng, userId });
      }
    });

    // Live visitor tracking
    socket.on('join_page', (pageName) => {
      socket.join('page:' + pageName);
      const count = io.sockets.adapter.rooms.get('page:' + pageName)?.size || 0;
      io.to('page:' + pageName).emit('visitor_count', { pageName, count });
    });

    socket.on('disconnecting', () => {
      for (const room of socket.rooms) {
        if (room.startsWith('page:')) {
          const count = (io.sockets.adapter.rooms.get(room)?.size || 1) - 1;
          io.to(room).emit('visitor_count', { pageName: room.split(':')[1], count });
        }
      }
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      if (userLocations.has(userId)) {
        userLocations.delete(userId);
        const heatData = Array.from(userLocations.values()).map(loc => [loc.lat, loc.lng, loc.intensity]);
        io.emit('active_users_update', heatData);
      }
    });
  });
}

module.exports = initSocket;
