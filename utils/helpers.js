const { Friendship, FriendRequest } = require('../db');

function safeUser(u, priv = false) {
  if (!u) return null;
  const id = u._id ? u._id.toString() : u.id;
  const o  = { id, username: u.username, bio: u.bio, location: u.location,
    website: u.website, avatar_url: u.avatar_url, cover_url: u.cover_url,
    created_at: u.created_at, role: u.role || 'user' };
  if (priv) { o.email = u.email; o.phone = u.phone; }
  return o;
}

function friendPair(a, b) {
  const sa = String(a), sb = String(b);
  return sa < sb ? [sa, sb] : [sb, sa];
}

async function areFriends(a, b) {
  const [low, high] = friendPair(a, b);
  return !!(await Friendship.findOne({ user_low: low, user_high: high }));
}

async function friendshipStatus(meId, otherId) {
  if (await areFriends(meId, otherId)) return 'friends';
  if (await FriendRequest.findOne({ sender_id: meId,   receiver_id: otherId, status: 'pending' })) return 'outgoing';
  if (await FriendRequest.findOne({ sender_id: otherId, receiver_id: meId,   status: 'pending' })) return 'incoming';
  return 'none';
}

module.exports = {
  safeUser,
  friendPair,
  areFriends,
  friendshipStatus
};
