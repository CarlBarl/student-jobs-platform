import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const searchParams = await req.json();
    console.log('Search params received:', searchParams);
    
    // Prepare parameters for JobTech API
    const params = new URLSearchParams();
    if (searchParams.q) params.append('q', searchParams.q);
    if (searchParams.municipality) params.append('municipality', searchParams.municipality);
    if (searchParams.occupation_field) params.append('occupation-field', searchParams.occupation_field);
    if (searchParams.experience === false) params.append('experience', 'false');
    
    // Fix worktime-extent parameter - use the correct format expected by the API
    if (searchParams.worktime_extent?.length) {
      searchParams.worktime_extent.forEach((wt: string) => {
        // Convert from our internal format to the API's format (e.g., part_time -> PART_TIME)
        const apiFormat = wt.toUpperCase();
        params.append('worktime-extent', apiFormat);
      });
    }
    
    // Add sorting by publication date
    params.append('sort', 'pubdate-desc');
    params.append('limit', searchParams.limit?.toString() || '10');
    params.append('offset', searchParams.offset?.toString() || '0');

    const apiUrl = `https://jobsearch.api.jobtechdev.se/search?${params.toString()}`;
    console.log('Making request to:', apiUrl);

    // Call JobTech API with additional headers
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const responseText = await response.text();
    console.log('Raw API response:', responseText);

    if (!response.ok) {
      console.error('JobTech API error response:', {
        status: response.status,
        statusText: response.statusText,
        body: responseText
      });
      throw new Error(`JobTech API failed: ${response.status} ${response.statusText}`);
    }

    const data = JSON.parse(responseText);
    console.log('JobTech API response:', {
      total: data.total?.value,
      numHits: data.hits?.length,
      params: params.toString()
    });
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('JobTech API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs from JobTech API', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}