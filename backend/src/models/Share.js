import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    path: { type: String, required: true }
  },
  { _id: false }
);

const shareSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true, index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["text", "file"], required: true },
    text: { type: String, default: null },
    file: { type: fileSchema, default: null },
    expiresAt: { type: Date, required: true, index: true },
    oneTimeView: { type: Boolean, default: false },
    maxViews: { type: Number, default: null },
    viewCount: { type: Number, default: 0 },
    downloadCount: { type: Number, default: 0 },
    reports: {
      type: [
        {
          reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
          reason: { type: String, default: "" },
          createdAt: { type: Date, default: Date.now }
        }
      ],
      default: []
    },
    passwordHash: { type: String, default: null },
    passwordSalt: { type: String, default: null }
  },
  { timestamps: true }
);

shareSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Share = mongoose.model("Share", shareSchema);
