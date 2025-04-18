# YouTube Audio Integration for EMDR Therapy

This feature allows users to integrate audio from YouTube videos into their EMDR therapy sessions, with stereo panning synchronized to the visual target movement.

## Features

- Paste any YouTube URL to extract and stream the audio
- Audio is processed through Web Audio API to create stereo panning effects
- Pan position is tied to the visual target's position on screen
- Works alongside existing EMDR visual stimulation
- Full volume control
- Maintains all accessibility features

## How to Use

1. Open the settings panel by clicking the hamburger menu (☰)
2. Paste a YouTube URL into the "YouTube URL" field
3. Click the download button to fetch the audio information
4. Toggle "Use YouTube audio" to enable the feature
5. Click the play button to start the session
6. The audio will pan from left to right as the visual target moves

## Technical Implementation

- Server-side YouTube audio extraction using ytdl-core
- Client-side audio processing with Web Audio API (StereoPannerNode)
- Audio context is initialized only on user interaction (required by browsers)
- Stereo panning synchronized with visual animation

## Accessibility

- All controls have appropriate ARIA attributes
- Status updates are provided for screen readers
- Visual feedback is complemented by audio feedback

## Troubleshooting

- If audio doesn't play, try clicking the play button again to ensure the audio context is properly initialized
- Some YouTube videos may have copyright restrictions that prevent audio extraction
- For best results, use videos with clear audio and minimal background noise

## Credits

This feature uses:
- ytdl-core for YouTube data extraction
- Web Audio API for audio processing
- Next.js API routes for server-side processing 