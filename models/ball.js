const mongoose = require('mongoose');

const BallSchema = new mongoose.Schema({
    runsScored: Number,
    strikerName: String,
    nonStrikerName: String,
    bowlerName: String,
    isNoBall: Boolean,
});

const Ball = mongoose.model('Ball', BallSchema);

module.exports = Ball;
