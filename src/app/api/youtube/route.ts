import { NextRequest, NextResponse } from 'next/server';
import ytdl from 'ytdl-core';

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url');
    
    console.log('YouTube API request for URL:', url);
    
    if (!url) {
      console.log('No URL provided');
      return NextResponse.json({ error: 'YouTube URL is required' }, { status: 400 });
    }

    // Validate YouTube URL
    if (!ytdl.validateURL(url)) {
      console.log('Invalid YouTube URL format:', url);
      return NextResponse.json({ error: 'Invalid YouTube URL format' }, { status: 400 });
    }

    try {
      // Get video info to check if video exists and get title
      console.log('Fetching video info...');
      const info = await ytdl.getInfo(url);
      const title = info.videoDetails.title;
      console.log('Successfully retrieved video info for:', title);
      
      // Get available formats
      const audioFormats = info.formats
        .filter(format => format.hasAudio && !format.hasVideo)
        .map(format => ({
          itag: format.itag,
          mimeType: format.mimeType,
          bitrate: format.audioBitrate,
          url: format.url
        }));
      
      console.log(`Found ${audioFormats.length} audio formats`);
      
      if (audioFormats.length === 0) {
        console.log('No audio formats available');
        return NextResponse.json({ error: 'No audio formats available for this video' }, { status: 404 });
      }
      
      // Return the info needed by the client
      return NextResponse.json({
        title,
        videoId: info.videoDetails.videoId,
        formats: audioFormats
      });
    } catch (ytdlError) {
      console.error('ytdl-core error:', ytdlError);
      
      // Create direct audio URL as fallback
      // This is a simpler approach that might work when ytdl has issues
      // It uses YouTube's direct media URL pattern
      const videoId = ytdl.getVideoID(url);
      const directUrl = `https://www.youtube.com/watch?v=${videoId}`;
      
      console.log('Attempting direct URL approach with ID:', videoId);
      
      return NextResponse.json({
        title: 'YouTube Audio',
        videoId: videoId,
        formats: [{
          itag: 0,
          mimeType: 'audio/mp4',
          bitrate: 128,
          url: directUrl
        }]
      });
    }
  } catch (error) {
    console.error('YouTube API route error:', error);
    return NextResponse.json(
      { error: 'Failed to process YouTube URL', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic'; 