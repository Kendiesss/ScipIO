import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import { execSync } from "child_process";
import { TranscriptionJSON, ViralSegment, Word } from "./src/types";
import dotenv from "dotenv";
import ytdl from "@distube/ytdl-core";
import { YoutubeTranscript } from "youtube-transcript";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", env: process.env.NODE_ENV });
  });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("CRITICAL: GEMINI_API_KEY is missing from environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey: apiKey || "dummy_key" });

  // Helper to extract YouTube ID
  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Module A: Ingestion & Transcription
  app.post("/api/process-video", async (req, res) => {
    console.log("POST /api/process-video received");
    const { youtubeUrl } = req.body;

    if (!youtubeUrl) {
      return res.status(400).json({ error: "YouTube URL is required" });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Gemini API Key is not configured in the Secrets panel." });
    }

    try {
      console.log(`Processing URL: ${youtubeUrl}`);
      
      const videoId = getYoutubeId(youtubeUrl);
      
      // Handle Direct MP4 URL (Bypass YouTube)
      if (!videoId && (youtubeUrl.endsWith(".mp4") || youtubeUrl.includes("commondatastorage"))) {
        console.log("Direct MP4 URL detected. Bypassing YouTube fetch.");
        return res.json({
          success: true,
          transcription: {
            text: "[DIRECT VIDEO] This is a direct video link. In a full app, you would use an AI transcription service like Whisper to generate the text for this video.",
            words: [
              { word: "Direct", start: 0, end: 1.0 },
              { word: "Video", start: 1.0, end: 2.0 },
              { word: "Detected", start: 2.0, end: 3.0 },
            ],
          },
          segments: [
            { title: "Viral Segment 1", start_timestamp: 0, end_timestamp: 10 },
            { title: "Viral Segment 2", start_timestamp: 10, end_timestamp: 20 },
          ],
          videoUrl: youtubeUrl,
        });
      }

      if (!videoId) throw new Error("Invalid YouTube URL format. Please use a full YouTube watch link or a direct .mp4 link.");

      // 1. Get Real Transcription from YouTube
      let transcription: TranscriptionJSON;
      try {
        console.log(`Fetching transcript for ${videoId}...`);
        const transcriptPromise = YoutubeTranscript.fetchTranscript(videoId);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Transcript fetch timed out (8s)")), 8000));
        
        const transcriptItems = (await Promise.race([transcriptPromise, timeoutPromise])) as any[];
        const allWords: Word[] = [];
        transcriptItems.forEach(item => {
          const words = item.text.split(/\s+/);
          const durationPerWord = item.duration / words.length;
          words.forEach((word, i) => {
            allWords.push({
              word: word.trim(),
              start: (item.offset + (i * durationPerWord)) / 1000,
              end: (item.offset + ((i + 1) * durationPerWord)) / 1000,
            });
          });
        });

        transcription = {
          text: transcriptItems.map(item => item.text).join(" "),
          words: allWords,
        };
        console.log("Transcript fetched successfully.");
      } catch (err: any) {
        console.warn(`YouTube transcript fetch failed: ${err.message}. Using descriptive fallback.`);
        transcription = {
          text: "[FALLBACK TRANSCRIPT] YouTube blocked the transcript request from this server. This often happens due to bot detection. In a production environment, you would use a proxy or a dedicated transcription service like Whisper.",
          words: [
            { word: "[FALLBACK]", start: 0, end: 1.0 },
            { word: "YouTube", start: 1.0, end: 2.0 },
            { word: "blocked", start: 2.0, end: 3.0 },
            { word: "the", start: 3.0, end: 4.0 },
            { word: "request.", start: 4.0, end: 5.0 },
          ],
        };
      }

      // 2. Get Real Video URL using ytdl-core
      let videoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
      try {
        console.log(`Fetching video stream for ${videoId}...`);
        const ytdlPromise = ytdl.getInfo(videoId, {
          requestOptions: {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
              'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
              'Sec-Ch-Ua-Mobile': '?0',
              'Sec-Ch-Ua-Platform': '"Windows"',
            }
          }
        });
        const ytdlTimeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Video stream fetch timed out (8s)")), 8000));
        
        const info = (await Promise.race([ytdlPromise, ytdlTimeoutPromise])) as any;
        const format = ytdl.chooseFormat(info.formats, { quality: 'highestvideo', filter: 'videoandaudio' });
        if (format && format.url) {
          videoUrl = format.url;
          console.log("Video stream URL fetched successfully.");
        }
      } catch (err: any) {
        console.warn(`ytdl-core failed to get video URL: ${err.message}. Using BigBuckBunny fallback.`);
      }

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
        videoUrl,
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

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
