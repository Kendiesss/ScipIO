import React from 'react';
import { AbsoluteFill, Video, useVideoConfig, useCurrentFrame, interpolate, staticFile } from 'remotion';
import { TranscriptionJSON, ViralSegment } from '../types';

interface ScipioCompositionProps {
  videoSrc: string;
  transcription: TranscriptionJSON;
  segment: ViralSegment;
  watermarkUrl?: string;
}

export const ScipioComposition: React.FC<ScipioCompositionProps> = ({
  videoSrc,
  transcription,
  segment,
  watermarkUrl,
}) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const currentTime = frame / fps + segment.start_timestamp;

  // Find the current word to highlight
  const currentWord = transcription.words.find(
    (w) => currentTime >= w.start && currentTime <= w.end
  );

  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      {/* Background Video - Cropped to 9:16 */}
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        <Video
          src={videoSrc}
          startFrom={Math.floor(segment.start_timestamp * fps)}
          endAt={Math.ceil(segment.end_timestamp * fps)}
          style={{
            width: 'auto',
            height: '100%',
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            objectFit: 'cover',
          }}
        />
      </AbsoluteFill>

      {/* Watermark */}
      {watermarkUrl && (
        <div
          style={{
            position: 'absolute',
            top: 40,
            right: 40,
            zIndex: 10,
          }}
        >
          <img
            src={watermarkUrl}
            alt="Watermark"
            style={{ width: 120, opacity: 0.7 }}
          />
        </div>
      )}

      {/* AI Subtitles */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          top: '70%',
          height: '20%',
        }}
      >
        <div
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: 64,
            fontWeight: '900',
            color: 'white',
            textTransform: 'uppercase',
            textAlign: 'center',
            padding: '0 40px',
            textShadow: '0 4px 12px rgba(0,0,0,0.8)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '10px',
          }}
        >
          {currentWord && (
            <span
              style={{
                color: '#FFD700', // Gold highlight
                transform: `scale(${interpolate(
                  currentTime,
                  [currentWord.start, (currentWord.start + currentWord.end) / 2, currentWord.end],
                  [1, 1.2, 1],
                  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                )})`,
              }}
            >
              {currentWord.word}
            </span>
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
