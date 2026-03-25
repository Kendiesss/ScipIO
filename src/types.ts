export interface Word {
  word: string;
  start: number;
  end: number;
}

export interface TranscriptionJSON {
  text: string;
  words: Word[];
}

export interface ViralSegment {
  title: string;
  start_timestamp: number;
  end_timestamp: number;
}

export interface ScipioMetadata {
  videoUrl: string;
  transcription: TranscriptionJSON;
  segment: ViralSegment;
  watermarkUrl?: string;
}
