import mongoose, { Schema, model, models } from 'mongoose';

export interface IPost {
  id: string;                    
  title: string;
  selftext: string;              
  subreddit: string;
  created_utc: number;           
  score: number;
  num_comments: number;
  author: string;
  url: string;
  stickied: boolean;
  embedding: number[];           // Vector embedding (384 dimensions)
  created_at: Date;              // Converted from created_utc
  inserted_at: Date;             // When inserted into our DB
}

const PostSchema = new Schema<IPost>({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
  },
  selftext: {
    type: String,
    default: '',
  },
  subreddit: {
    type: String,
    required: true,
    index: true,
  },
  created_utc: {
    type: Number,
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
    index: true,
  },
  url: {
    type: String,
    required: true,
  },
  stickied: {
    type: Boolean,
    default: false,
  },
  embedding: {
    type: [Number],
    required: true,
  },
  created_at: {
    type: Date,
    required: true,
    index: true,
  },
  inserted_at: {
    type: Date,
    default: Date.now,
  },
});

// Compound indexes for common queries
PostSchema.index({ subreddit: 1, created_at: -1 });
PostSchema.index({ author: 1, created_at: -1 });
PostSchema.index({ score: -1 });

// Use models to prevent model recompilation during hot reload
const Post = models.Post || model<IPost>('Post', PostSchema);

export default Post;

