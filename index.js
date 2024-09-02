const express = require('express');
const { body, validationResult } = require('express-validator');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const Match = require('./models/match.js'); 
const Ball = require('./models/ball.js'); 
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => console.error('Failed to connect to MongoDB Atlas', err));

// Helper function to format validation errors
const formatErrors = (errorsArray) => errorsArray.map(err => ({ field: err.param, message: err.msg }));

app.post('/add', 
    // Validation middleware
    [
        body('runsScored').isInt({ min: 0 }).withMessage('Runs scored must be a non-negative integer'),
        body('strikerName').notEmpty().withMessage('Striker name is required'),
        body('nonStrikerName').notEmpty().withMessage('Non-striker name is required'),
        body('bowlerName').notEmpty().withMessage('Bowler name is required'),
        body('isNoBall').isBoolean().withMessage('isNoBall must be a boolean value'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: formatErrors(errors.array()) });
        }

        try {
            const { runsScored, strikerName, nonStrikerName, bowlerName, isNoBall } = req.body;

            // Create a new Ball entry
            const newBall = new Ball({ runsScored, strikerName, nonStrikerName, bowlerName, isNoBall });
            await newBall.save();

            // Fetch or create the match document
            let match = await Match.findOne({});
            if (!match) {
                match = new Match({
                    teamRuns: 0,
                    teamBallsPlayed: 0,
                    batsmanStats: [],
                    bowlerStats: [],
                    currentRunRate: 0,
                    currentOver: '0.0',
                });
            }

            // Update match details 
            match.teamRuns += runsScored;
            match.teamBallsPlayed += isNoBall ? 0 : 1;

            let striker = match.batsmanStats.find(b => b.name === strikerName);
            if (!striker) {
                striker = { name: strikerName, runs: 0, ballsFaced: 0, strikeRate: 0 };
                match.batsmanStats.push(striker);
            }
            striker.runs += runsScored;
            striker.ballsFaced += isNoBall ? 0 : 1;
            striker.strikeRate = (striker.runs / striker.ballsFaced) * 100;

            let bowler = match.bowlerStats.find(b => b.name === bowlerName);
            if (!bowler) {
                bowler = { name: bowlerName, runsConceded: 0, deliveries: 0, noBalls: 0, economyRate: 0 };
                match.bowlerStats.push(bowler);
            }
            bowler.runsConceded += runsScored;
            bowler.deliveries += isNoBall ? 0 : 1;
            bowler.noBalls += isNoBall ? 1 : 0;
            bowler.economyRate = bowler.runsConceded / (bowler.deliveries / 6);

            match.currentRunRate = (match.teamRuns / match.teamBallsPlayed) * 6;
            match.currentOver = `${Math.floor(match.teamBallsPlayed / 6)}.${match.teamBallsPlayed % 6}`;

            await match.save();

            res.status(201).json({ message: 'Ball data added successfully!' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
);

app.put('/edit',
    // Validation middleware
    [
        body('ballId').isMongoId().withMessage('Invalid Ball ID'),
        body('runsScored').isInt({ min: 0 }).withMessage('Runs scored must be a non-negative integer'),
        body('strikerName').notEmpty().withMessage('Striker name is required'),
        body('nonStrikerName').notEmpty().withMessage('Non-striker name is required'),
        body('bowlerName').notEmpty().withMessage('Bowler name is required'),
        body('isNoBall').isBoolean().withMessage('isNoBall must be a boolean value'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: formatErrors(errors.array()) });
        }

        try {
            const { ballId, runsScored, strikerName, nonStrikerName, bowlerName, isNoBall } = req.body;
            const ballObjectId = new mongoose.Types.ObjectId(`${ballId}`);

            const ball = await Ball.findById(ballObjectId);
            if (!ball) {
                return res.status(404).json({ error: 'Ball not found' });
            }

            const match = await Match.findOne({});
            if (!match) {
                return res.status(404).json({ error: 'Match data not found' });
            }

            // Reverse previous ball data 
            match.teamRuns -= ball.runsScored;
            match.teamBallsPlayed -= ball.isNoBall ? 0 : 1;

            const striker = match.batsmanStats.find(b => b.name === ball.strikerName);
            striker.runs -= ball.runsScored;
            striker.ballsFaced -= ball.isNoBall ? 0 : 1;
            striker.strikeRate = (striker.runs / striker.ballsFaced) * 100;

            const bowler = match.bowlerStats.find(b => b.name === ball.bowlerName);
            bowler.runsConceded -= ball.runsScored;
            bowler.deliveries -= ball.isNoBall ? 0 : 1;
            bowler.noBalls -= ball.isNoBall ? 1 : 0;
            bowler.economyRate = bowler.runsConceded / (bowler.deliveries / 6);

            // Update the ball data 
            ball.runsScored = runsScored;
            ball.strikerName = strikerName;
            ball.nonStrikerName = nonStrikerName;
            ball.bowlerName = bowlerName;
            ball.isNoBall = isNoBall;
            await ball.save();

            // Apply new ball data 
            match.teamRuns += runsScored;
            match.teamBallsPlayed += isNoBall ? 0 : 1;

            let updatedStriker = match.batsmanStats.find(b => b.name === strikerName);
            if (!updatedStriker) {
                updatedStriker = { name: strikerName, runs: 0, ballsFaced: 0, strikeRate: 0 };
                match.batsmanStats.push(updatedStriker);
            }
            updatedStriker.runs += runsScored;
            updatedStriker.ballsFaced += isNoBall ? 0 : 1;
            updatedStriker.strikeRate = (updatedStriker.runs / updatedStriker.ballsFaced) * 100;

            let updatedBowler = match.bowlerStats.find(b => b.name === bowlerName);
            if (!updatedBowler) {
                updatedBowler = { name: bowlerName, runsConceded: 0, deliveries: 0, noBalls: 0, economyRate: 0 };
                match.bowlerStats.push(updatedBowler);
            }
            updatedBowler.runsConceded += runsScored;
            updatedBowler.deliveries += isNoBall ? 0 : 1;
            updatedBowler.noBalls += isNoBall ? 1 : 0;
            updatedBowler.economyRate = updatedBowler.runsConceded / (updatedBowler.deliveries / 6);

            match.currentRunRate = (match.teamRuns / match.teamBallsPlayed) * 6;
            match.currentOver = `${Math.floor(match.teamBallsPlayed / 6)}.${match.teamBallsPlayed % 6}`;

            await match.save();

            res.status(200).json({ message: 'Ball data edited successfully!' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
);

app.get('/details', async (req, res) => {
    try {
        const match = await Match.findOne({});
        if (!match) {
            return res.status(404).json({ error: 'Match data not found' });
        }
        res.status(200).json(match);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
