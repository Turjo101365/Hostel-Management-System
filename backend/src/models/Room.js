const mongoose = require('mongoose');
const RoomSchema = new mongoose.Schema({
  number: String,
  capacity: Number
});
module.exports = mongoose.model('Room', RoomSchema);
