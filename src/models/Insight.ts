import mongoose, { Schema, model, models } from 'mongoose';

// Individual mention/post reference within an insight
export interface IMention {
  post_id: string;
  post_title: string;
  date_posted: Date;
  score: number;
  num_comments: number;
  author: string;
  url: string;
  sentiment_score?: number;
}

// Main insight tracking a specific topic
export interface IInsight {
  topic: string;
  date: Date;
  mentions: IMention[];
  num_mentions: number;
  created_at: Date;
  updated_at: Date;
}

const MentionSchema = new Schema<IMention>({
  post_id: {
    type: String,
    required: true,
    index: true,
  },
  post_title: {
    type: String,
    required: true,
  },
  date_posted: {
    type: Date,
    required: true,
  },
  score: {
    type: Number,
    default: 0,
  },
  num_comments: {
    type: Number,
    default: 0,
  },
  author: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  sentiment_score: {
    type: Number,
    min: -1,
    max: 1,
  },
}, { _id: false });

const InsightSchema = new Schema<IInsight>({
  topic: {
    type: String,
    required: true,
    index: true,
  },
  date: {
    type: Date,
    required: true,
    index: true,
  },
  mentions: [MentionSchema],
  num_mentions: {
    type: Number,
    default: 0,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

// Compound indexes for common queries
InsightSchema.index({ topic: 1, date: -1 });
InsightSchema.index({ num_mentions: -1 });

// Update the updated_at timestamp before saving
InsightSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Use models to prevent model recompilation during hot reload
const Insight = models.Insight || model<IInsight>('Insight', InsightSchema);

export default Insight;
