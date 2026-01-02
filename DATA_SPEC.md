Event & Data Schema (compact)

User
{
  _id: ObjectId,
  username: String,
  passwordHash: String,
  favoriteClub: String,
  badges: [String],
  reputation: Number,
  createdAt: Date
}

Post / Clip
{
  _id: ObjectId,
  user: ObjectId,
  matchId: String (optional),
  minute: Number (optional),
  tags: ["goal","assist","dribble"],
  clipUrl: String,
  thumbnailUrl: String,
  durationSec: Number,
  createdAt: Date
}

Match Event
{
  _id: ObjectId,
  matchId: String,
  timestamp: ISODate,
  minute: Number,
  eventType: String, // shot, goal, pass, tackle, substitution
  playerIds: [String],
  teamId: String,
  x: Number, y: Number, // normalized 0..1 coordinates
  meta: {outcome,assistId,shotOnTarget}
}

xG Timeseries
{
  matchId: String,
  entries: [ { minute: Number, timestamp: ISODate, xgHome: Number, xgAway: Number, winProbHome: Number } ]
}

Prediction
{
  _id: ObjectId,
  user: ObjectId,
  matchId: String,
  question: String,
  choice: String,
  expiresAt: Date,
  resolvedAt: Date,
  correct: Boolean,
  pointsAwarded: Number
}

Notes
- Use indexes on {matchId, minute} and {user} for quick retrieval.
- Store heavy objects (videos) in object storage and keep only metadata in Mongo.
- Use Redis for ephemeral counters and leaderboards; persist snapshots periodically.
