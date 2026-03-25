import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import { execSync } from "child_process";
import { TranscriptionJSON, ViralSegment } from "./src/types";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  // Module A: Ingestion & Transcription
  app.post("/api/process-video", async (req, res) => {
    const { youtubeUrl } = req.body;

    if (!youtubeUrl) {
      return res.status(400).json({ error: "YouTube URL is required" });
    }

    try {
      console.log(`Processing URL: ${youtubeUrl}`);
      
      // 1. Download Video/Audio using yt-dlp (Mocking for this environment)
      // In a real environment:
      // execSync(`yt-dlp -f "bestvideo[height<=720]+bestaudio/best[height<=720]" --merge-output-format mp4 -o "temp_video.mp4" ${youtubeUrl}`);
      // execSync(`ffmpeg -i temp_video.mp4 -vn -acodec libmp3lame temp_audio.mp3`);
      
      const videoPath = "temp_video.mp4";
      const audioPath = "temp_audio.mp3";

      // 2. Send to Whisper API
      // const formData = new FormData();
      // formData.append("file", fs.createReadStream(audioPath));
      // formData.append("model", "whisper-1");
      // formData.append("response_format", "verbose_json");
      // formData.append("timestamp_granularities[]", "word");

      // const whisperResponse = await axios.post(
      //   "https://api.openai.com/v1/audio/transcriptions",
      //   formData,
      //   {
      //     headers: {
      //       ...formData.getHeaders(),
      //       Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      //     },
      //   }
      // );

      // Mocking transcription for demo purposes
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
        videoUrl: "/temp_video.mp4", // In real app, this would be a signed URL or local path
      });
    } catch (error: any) {
      console.error("Error processing video:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Module D: Rendering & Export (Trigger Remotion)
  app.post("/api/render", async (req, res) => {
    const { segment, transcription, videoUrl } = req.body;
    
    try {
      // In a real environment, you'd use @remotion/renderer to render the video
      // const { renderMedia } = await import("@remotion/renderer");
      // await renderMedia({
      //   composition: "Scipio",
      //   serveUrl: "...",
      //   inputProps: { segment, transcription, videoUrl },
      //   outputLocation: "out.mp4",
      // });
      
      res.json({
        success: true,
        downloadUrl: "https://example.com/rendered_video.mp4",
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
