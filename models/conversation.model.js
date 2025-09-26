import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ["user", "bot"], // who sent the message
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const conversationSchema = new mongoose.Schema({
  messages: [messageSchema], // array of messages (user + bot)
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Auto update `updatedAt` on save
conversationSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Conversation = mongoose.model("Conversation", conversationSchema);

export default Conversation;
