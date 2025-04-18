import { NextRequest, NextResponse } from 'next/server';
import ytdl from 'ytdl-core';

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url');
    
    if (!url) {
      return NextResponse.json({ error: 'YouTube URL is required' }, { status: 400 });
    }

    // Validate YouTube URL
    if (!ytdl.validateURL(url)) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
    }

    // Get video info to check if video exists and get title
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title;
    
    // Return the info needed by the client
    return NextResponse.json({
      title,
      videoId: info.videoDetails.videoId,
      formats: info.formats
        .filter(format => format.hasAudio && !format.hasVideo)
        .map(format => ({
          itag: format.itag,
          mimeType: format.mimeType,
          bitrate: format.audioBitrate,
          url: format.url
        }))
    });
  } catch (error) {
    console.error('YouTube API error:', error);
    return NextResponse.json(
      { error: 'Failed to process YouTube URL' }, 
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic'; 