const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface YouTubeVideo {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, limit = 20 } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('YOUTUBE_API_KEY');
    if (!apiKey) {
      console.error('YOUTUBE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'YouTube API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Search for music videos
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('q', `${query} music`);
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('videoCategoryId', '10'); // Music category
    searchUrl.searchParams.set('maxResults', String(Math.min(limit, 50)));
    searchUrl.searchParams.set('key', apiKey);

    const searchResponse = await fetch(searchUrl.toString());
    const searchData = await searchResponse.json();

    if (!searchResponse.ok) {
      console.error('YouTube API error:', searchData);
      return new Response(
        JSON.stringify({ error: searchData.error?.message || 'YouTube API error' }),
        { status: searchResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!searchData.items || searchData.items.length === 0) {
      return new Response(
        JSON.stringify({ tracks: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get video details for duration
    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');
    const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    detailsUrl.searchParams.set('part', 'contentDetails,snippet');
    detailsUrl.searchParams.set('id', videoIds);
    detailsUrl.searchParams.set('key', apiKey);

    const detailsResponse = await fetch(detailsUrl.toString());
    const detailsData = await detailsResponse.json();

    const tracks: YouTubeVideo[] = detailsData.items?.map((video: any, index: number) => {
      // Parse ISO 8601 duration (PT4M13S -> 253 seconds)
      const duration = parseDuration(video.contentDetails?.duration || 'PT0S');
      
      // Try to extract artist from title (common format: "Artist - Song Title")
      const title = video.snippet?.title || 'Unknown';
      const channelTitle = video.snippet?.channelTitle || 'Unknown Artist';
      
      let artist = channelTitle.replace(/ - Topic$/, '').replace(/VEVO$/, '').trim();
      let songTitle = title;
      
      // Check for "Artist - Title" format
      if (title.includes(' - ')) {
        const parts = title.split(' - ');
        artist = parts[0].trim();
        songTitle = parts.slice(1).join(' - ').trim();
      }
      
      // Clean up common suffixes
      songTitle = songTitle
        .replace(/\s*\(Official\s*(Music\s*)?Video\)/gi, '')
        .replace(/\s*\[Official\s*(Music\s*)?Video\]/gi, '')
        .replace(/\s*\(Lyrics?\)/gi, '')
        .replace(/\s*\[Lyrics?\]/gi, '')
        .replace(/\s*\(Official Audio\)/gi, '')
        .replace(/\s*\[Official Audio\]/gi, '')
        .replace(/\s*\(Audio\)/gi, '')
        .replace(/\s*\|.*$/g, '')
        .trim();

      return {
        id: video.id,
        title: songTitle,
        artist: artist,
        album: 'YouTube',
        thumbnail: video.snippet?.thumbnails?.high?.url || 
                   video.snippet?.thumbnails?.medium?.url ||
                   video.snippet?.thumbnails?.default?.url,
        duration: duration,
        source: 'youtube',
      };
    }) || [];

    console.log(`YouTube search returned ${tracks.length} tracks for: ${query}`);
    
    return new Response(
      JSON.stringify({ tracks }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('YouTube search error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function parseDuration(isoDuration: string): number {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  
  return hours * 3600 + minutes * 60 + seconds;
}
