import mongoose, { Schema, model, models } from 'mongoose';

export interface IComment {
  id: string;
  body: string;
  post_id: string;
  created_utc: number;
  score: number;
  author: string;
  is_submitter: boolean;
  embedding: number[];
  created_at: Date;
  inserted_at: Date;
}

const CommentSchema = new Schema<IComment>({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  body: {
    type: String,
    required: true,
  },
  post_id: {
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
  author: {
    type: String,
    required: true,
    index: true,
  },
  is_submitter: {
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
CommentSchema.index({ post_id: 1, created_at: -1 });
CommentSchema.index({ author: 1, created_at: -1 });
CommentSchema.index({ post_id: 1, score: -1 });
CommentSchema.index({ score: -1 });

// Use models to prevent model recompilation during hot reload
const Comment = models.Comment || model<IComment>('Comment', CommentSchema);

export default Comment;

