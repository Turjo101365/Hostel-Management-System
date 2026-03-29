const mongoose = require('mongoose');
const PaymentSchema = new mongoose.Schema({
  studentId: Number,
  amount: Number
});
module.exports = mongoose.model('Payment', PaymentSchema);
