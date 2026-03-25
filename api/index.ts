import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import { TranscriptionJSON, ViralSegment } from "../src/types";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || "dummy_key" });

// Module A: Ingestion & Transcription
app.post("/api/process-video", async (req, res) => {
  const { youtubeUrl } = req.body;

  if (!youtubeUrl) {
    return res.status(400).json({ error: "YouTube URL is required" });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "Gemini API Key is not configured in environment variables." });
  }

  try {
    // Mocking transcription for demo purposes (Vercel has execution limits)
    const transcription: TranscriptionJSON = {
      text: "Welcome to the future of video editing with Scipio. This system automatically finds the best parts of your video and turns them into vertical clips.",
      words: [
        { word: "Welcome", start: 0, end: 0.5 },
        { word: "to", start: 0.5, end: 0.7 },
        { word: "the", start: 0.7, end: 0.9 },
        { word: "future", start: 0.9, end: 1.5 },
        { word: "of", start: 1.5, end: 1.7 },
        { word: "video", start: 1.7, end: 2.2 },
        { word: "editing", start: 2.2, end: 2.8 },
        { word: "with", start: 2.8, end: 3.2 },
        { word: "Scipio.", start: 3.2, end: 4.0 },
      ],
    };

    // Module B: AI Slicing Logic with Gemini
    const segmentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Given this transcript, identify 3 viral segments (15-60s). Return ONLY a JSON array of {title, start_timestamp, end_timestamp}. Transcript: ${transcription.text}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              start_timestamp: { type: Type.NUMBER },
              end_timestamp: { type: Type.NUMBER },
            },
            required: ["title", "start_timestamp", "end_timestamp"],
          },
        },
      },
    });

    const segments: ViralSegment[] = JSON.parse(segmentResponse.text || "[]");

    res.json({
      success: true,
      transcription,
      segments,
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    });
  } catch (error: any) {
    console.error("Error processing video:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/render", async (req, res) => {
  const { segment, transcription, videoUrl } = req.body;
  
  try {
    res.json({
      success: true,
      downloadUrl: "https://example.com/rendered_video.mp4",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default app;
