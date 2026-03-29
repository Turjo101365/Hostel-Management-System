const mongoose = require('mongoose');
const StudentSchema = new mongoose.Schema({
  name: String,
  roomId: Number
});
module.exports = mongoose.model('Student', StudentSchema);
