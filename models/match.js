const mongoose = require('mongoose');

const BatsmanSchema = new mongoose.Schema({
    name: String,
    runs: Number,
    ballsFaced: Number,
    strikeRate: Number,
});

const BowlerSchema = new mongoose.Schema({
    name: String,
    runsConceded: Number,
    deliveries: Number,
    noBalls: Number,
    economyRate: Number,
});

const MatchSchema = new mongoose.Schema({
    teamRuns: Number,
    teamBallsPlayed: Number,
    batsmanStats: [BatsmanSchema],
    bowlerStats: [BowlerSchema],
    currentRunRate: Number,
    currentOver: String,
});

const Match = mongoose.model('Match', MatchSchema);

module.exports = Match;
