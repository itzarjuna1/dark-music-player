import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Jamendo test client ID for read-only API access
// For production, register at https://devportal.jamendo.com
const JAMENDO_CLIENT_ID = '709fa152';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, limit = 20 } = await req.json();
    
    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching Jamendo for: ${query}`);

    // Search Jamendo API for tracks
    const searchUrl = new URL('https://api.jamendo.com/v3.0/tracks/');
    searchUrl.searchParams.set('client_id', JAMENDO_CLIENT_ID);
    searchUrl.searchParams.set('format', 'json');
    searchUrl.searchParams.set('limit', String(Math.min(limit, 50)));
    searchUrl.searchParams.set('namesearch', query);
    searchUrl.searchParams.set('audioformat', 'mp32'); // Higher quality VBR
    searchUrl.searchParams.set('imagesize', '300');
    searchUrl.searchParams.set('include', 'musicinfo');

    const response = await fetch(searchUrl.toString());
    
    if (!response.ok) {
      console.error('Jamendo API error:', response.status, response.statusText);
      throw new Error(`Jamendo API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Found ${data.results?.length || 0} Jamendo tracks`);

    // Transform Jamendo response to match our track format
    const tracks = (data.results || []).map((track: any) => ({
      id: track.id,
      title: track.name,
      artist: track.artist_name,
      album: track.album_name || 'Single',
      cover: track.album_image || track.image || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
      preview: track.audio, // Full track streaming URL!
      duration: track.duration,
      source: 'jamendo',
      license: track.license_ccurl || 'Creative Commons',
    }));

    return new Response(
      JSON.stringify({ tracks }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in jamendo-search function:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
