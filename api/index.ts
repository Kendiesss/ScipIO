import express from "express";

// Self-contained types to avoid Vercel build issues with relative imports
interface Word {
  word: string;
  start: number;
  end: number;
}

interface TranscriptionJSON {
  text: string;
  words: Word[];
}

interface ViralSegment {
  title: string;
  start_timestamp: number;
  end_timestamp: number;
}

const app = express();
app.use(express.json());

console.log("Vercel API initialized");

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", environment: "vercel" });
});

// Module A: Ingestion & Transcription
app.post("/api/process-video", async (req, res) => {
  const { youtubeUrl } = req.body;

  if (!youtubeUrl) {
    return res.status(400).json({ error: "YouTube URL is required" });
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

    res.json({
      success: true,
      transcription,
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    });
  } catch (error: any) {
    console.error("Error processing video:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/render", async (req, res) => {
  res.json({
    success: true,
    downloadUrl: "https://example.com/rendered_video.mp4",
  });
});

export default app;
