import Conversation from "../models/conversation.model.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Always detect creator-related questions (simple & robust)
const isAskingAboutModelCreator = (text) => {
  const lowerText = text.toLowerCase();
  return (
    lowerText.includes("who created you") ||
    lowerText.includes("who made you") ||
    lowerText.includes("who built you") ||
    lowerText.includes("who developed you") ||
    lowerText.includes("who is your creator") ||
    lowerText.includes("who is your developer") ||
    lowerText.includes("who designed you") ||
    lowerText.includes("who programmed you") ||
    lowerText.includes("created by") ||
    lowerText.includes("made by") ||
    lowerText.includes("developed by") ||
    lowerText.includes("aapko kisne bnaya hai?")||
    lowerText.includes("aapko kisne bnaya hai ?")||
    lowerText.includes("aap ko bnane wala kon hai ?")||
    lowerText.includes("aap ko bnane wala kon hai?")

  );
};

// Predefined responses
const predefinedResponses = {
  "what is your name?": "I'm Chatboat, your friendly AI assistant 🛳️🤖",
  "how are you?": "I'm doing great! Thanks for asking 😄",
  "what can you do?": "I can chat with you, answer questions, and help with tasks! 🧠✨",
};

// Helper function to stream text word by word
const streamText = (res, text, delay = 50) => {
  return new Promise((resolve) => {
    const words = text.split(' ');
    let currentIndex = 0;

    const sendNextWord = () => {
      if (currentIndex < words.length) {
        const word = words[currentIndex];
        const isLastWord = currentIndex === words.length - 1;
        
        res.write(`data: ${JSON.stringify({
          type: 'word',
          word: word + (isLastWord ? '' : ' '),
          isComplete: false,
          wordIndex: currentIndex
        })}\n\n`);
        
        currentIndex++;
        setTimeout(sendNextWord, delay);
      } else {
        // Send completion signal
        res.write(`data: ${JSON.stringify({
          type: 'complete',
          fullText: text,
          isComplete: true
        })}\n\n`);
        resolve();
      }
    };

    sendNextWord();
  });
};

// Streaming endpoint for real-time responses
export const MessageStream = async (req, res) => {
  try {
    const { text, conversationId } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: "Message text cannot be empty" 
      });
    }

    // Set up Server-Sent Events headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
    });

    console.log("📩 User input:", text);

    let botResponse = "";
    const lowerText = text.trim().toLowerCase();

    // Send typing indicator
    res.write(`data: ${JSON.stringify({
      type: 'typing',
      message: 'AI is thinking...'
    })}\n\n`);

    // Small delay to show typing indicator
    await new Promise(resolve => setTimeout(resolve, 500));

    // 1️⃣ First priority → "who created you" type questions
    if (isAskingAboutModelCreator(text)) {
      botResponse = "I was created by Nova AI team 🤖💻";
      console.log("🎯 Model creator question detected");
    }
    // 2️⃣ Check predefined responses
    else if (predefinedResponses[lowerText]) {
      botResponse = predefinedResponses[lowerText];
    }
    // 3️⃣ Otherwise → call Gemini API
    else {
      try {
        const result = await model.generateContent(text);
        botResponse = result?.response?.text() || "Sorry, I couldn't generate a response.";
      } catch (err) {
        console.error("⚠️ Gemini API Error:", err);
        botResponse = "⚠️ The AI service is busy right now. Please try again later.";
      }
    }

    // Stream the response word by word
    await streamText(res, botResponse, 80); // 80ms delay between words

    // Save to database after streaming is complete
    try {
      let conversation;

      if (conversationId) {
        conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          res.write(`data: ${JSON.stringify({
            type: 'error',
            message: 'Conversation not found'
          })}\n\n`);
          res.end();
          return;
        }

        conversation.messages.push(
          { sender: "user", text: text.trim() },
          { sender: "bot", text: botResponse }
        );
      } else {
        conversation = new Conversation({
          messages: [
            { sender: "user", text: text.trim() },
            { sender: "bot", text: botResponse },
          ],
        });
      }

      await conversation.save();

      // Send final success message with conversation ID
      res.write(`data: ${JSON.stringify({
        type: 'saved',
        conversationId: conversation._id,
        message: 'Conversation saved successfully'
      })}\n\n`);

    } catch (dbError) {
      console.error("❌ Database Error:", dbError);
      res.write(`data: ${JSON.stringify({
        type: 'warning',
        message: 'Response generated but not saved to database'
      })}\n\n`);
    }

    res.end();

  } catch (error) {
    console.error("❌ Error in Streaming Message Controller:", error);
    
    res.write(`data: ${JSON.stringify({
      type: 'error',
      message: 'Internal Server Error',
      details: error.message
    })}\n\n`);
    
    res.end();
  }
};

// Regular non-streaming endpoint (for backward compatibility)
export const Message = async (req, res) => {
  try {
    const { text, conversationId } = req.body;

    if (!text || !text.trim()) {
      return res
        .status(400)
        .json({ success: false, error: "Message text cannot be empty" });
    }

    console.log("📩 User input:", text);

    let botResponse = "";
    const lowerText = text.trim().toLowerCase();

    // 1️⃣ First priority → "who created you" type questions
    if (isAskingAboutModelCreator(text)) {
      botResponse = "I was created by Nova AI team 🤖💻";
      console.log("🎯 Model creator question detected");
    }
    // 2️⃣ Check predefined responses
    else if (predefinedResponses[lowerText]) {
      botResponse = predefinedResponses[lowerText];
    }
    // 3️⃣ Otherwise → call Gemini API
    else {
      try {
        const result = await model.generateContent(text);
        botResponse =
          result?.response?.text() || "Sorry, I couldn't generate a response.";
      } catch (err) {
        console.error("⚠️ Gemini API Error:", err);
        botResponse =
          "⚠️ The AI service is busy right now. Please try again later.";
      }
    }

    let conversation;

    if (conversationId) {
      // Update existing conversation
      conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res
          .status(404)
          .json({ success: false, error: "Conversation not found" });
      }

      conversation.messages.push(
        { sender: "user", text: text.trim() },
        { sender: "bot", text: botResponse }
      );
    } else {
      // Create new conversation
      conversation = new Conversation({
        messages: [
          { sender: "user", text: text.trim() },
          { sender: "bot", text: botResponse },
        ],
      });
    }

    await conversation.save();

    // Send back latest message
    return res.status(200).json({
      success: true,
      conversationId: conversation._id,
      botMessage: botResponse,
    });
  } catch (error) {
    console.error("❌ Error in Message Controller:", error);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: error.message,
    });
  }
};