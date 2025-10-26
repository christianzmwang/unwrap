import mongoose, { Schema, model, models } from 'mongoose';

// Individual mention/post reference within an insight
export interface IMention {
  post_id: string;
  post_title: string;
  post_body: string;
  date_posted: Date;
  score: number;
  num_comments: number;
  author: string;
  url: string;
  sentiment_score?: number;
}

// Insight data (used for both raw and filtered)
export interface IInsight {
  topic: string;
  date: Date;
  mentions: IMention[];
  num_mentions: number;
}

// Main data schema
export interface IDataSchema {
  subreddit: string;
  raw_insights: IInsight[];
  filtered_insights: IInsight[];
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
  post_body: {
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
  },
  date: {
    type: Date,
    required: true,
  },
  mentions: [MentionSchema],
  num_mentions: {
    type: Number,
    default: 0,
  },
}, { _id: false });

const DataSchema = new Schema<IDataSchema>({
  subreddit: {
    type: String,
    required: true,
    index: true,
  },
  raw_insights: [InsightSchema],
  filtered_insights: [InsightSchema],
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
DataSchema.index({ subreddit: 1, created_at: -1 });
DataSchema.index({ subreddit: 1, 'raw_insights.topic': 1 });

// Update the updated_at timestamp before saving
DataSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Use models to prevent model recompilation during hot reload
const Insight = models.Insight || model<IDataSchema>('Insight', DataSchema);

export default Insight;
