"use client"

import { useState } from 'react';
import Layout from '../../../components/layout/Layout';

interface JobResult {
  id: string;
  headline: string;
  employer: { name: string };
  workplace_address: { city: string };
  description: {
    text: string;
    text_formatted: string;
  };
  publication_date: string;
  application_details: {
    url?: string;
    email?: string;
    information?: string;
  };
  working_hours_type?: {
    label: string;
  };
}

export default function JobTechTest() {
  const [searchParams, setSearchParams] = useState({
    q: 'student praktik',
    experience: false,
    worktime_extent: [],  // Start with empty array
    municipality: '',
    occupation_field: '',
    limit: 10,
    offset: 0
  });
  const [lang, setLang] = useState<'sv' | 'en'>('sv');
  const [results, setResults] = useState<JobResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [totalJobs, setTotalJobs] = useState(0);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    console.log('Sending search request with params:', searchParams);

    try {
      const response = await fetch('/api/test/jobtech/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchParams)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Search failed');
      }

      console.log('Received response:', data);
      
      if (!data.hits || !Array.isArray(data.hits)) {
        console.error('Unexpected response format:', data);
        throw new Error('Invalid response format from API');
      }

      setResults(data.hits);
      setTotalJobs(data.total?.value || 0);
      
      if (data.hits.length === 0) {
        setError(t.noResults);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.noResults);
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const translations = {
    sv: {
      title: 'Hitta studentjobb',
      subtitle: 'Sök bland alla tillgängliga studentjobb i Sverige',
      searchPlaceholder: 't.ex. programmering, ekonomi, marknadsföring',
      searchTip: 'Tips: Kombinera ord som "student", "praktik", "trainee" eller specifika kompetenser',
      location: 'Stad',
      allLocations: 'Alla städer',
      field: 'Yrkesområde',
      allFields: 'Alla områden',
      noExperience: 'Ingen erfarenhet krävs',
      partTime: 'Deltid',
      searchButton: 'Sök jobb',
      searching: 'Söker...',
      resultsCount: (count: number) => `Hittade ${count} jobb`,
      applyOnline: 'Ansök online',
      applyEmail: 'Ansök via mail',
      published: 'Publicerad',
      noResults: 'Inga jobb hittades. Försök med andra söktermer.',
      fields: {
        '3': 'Data/IT',
        '5': 'Utbildning',
        '9': 'Naturvetenskap/Forskning',
        '11': 'Ekonomi/Administration',
        '18': 'Teknik/Ingenjör',
        '22': 'Kultur/Media/Design'
      }
    },
    en: {
      title: 'Find Student Jobs',
      subtitle: 'Search all available student jobs in Sweden',
      searchPlaceholder: 'e.g. programming, finance, marketing',
      searchTip: 'Tips: Combine terms like "student", "internship", "trainee" or specific skills',
      location: 'City',
      allLocations: 'All cities',
      field: 'Field',
      allFields: 'All fields',
      noExperience: 'No experience required',
      partTime: 'Part-time',
      searchButton: 'Search jobs',
      searching: 'Searching...',
      resultsCount: (count: number) => `Found ${count} jobs`,
      applyOnline: 'Apply online',
      applyEmail: 'Apply via email',
      published: 'Published',
      noResults: 'No jobs found. Try different search terms.',
      fields: {
        '3': 'Data/IT',
        '5': 'Education',
        '9': 'Natural sciences/Research',
        '11': 'Economics/Administration',
        '18': 'Technology/Engineering',
        '22': 'Culture/Media/Design'
      }
    }
  };

  const t = translations[lang];

  return (
    <Layout title={t.title}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Language toggle */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setLang(lang === 'sv' ? 'en' : 'sv')}
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
          >
            <span>{lang === 'sv' ? '🇬🇧 English' : '🇸🇪 Svenska'}</span>
          </button>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{t.title}</h1>
          <p className="text-xl text-gray-600">{t.subtitle}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <form onSubmit={handleSearch} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="col-span-2">
                <label className="block text-base font-medium text-gray-700 mb-2">{t.searchPlaceholder}</label>
                <input
                  type="text"
                  className="block w-full px-4 py-3 rounded-xl bg-gray-50 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                  value={searchParams.q}
                  onChange={(e) => setSearchParams({ ...searchParams, q: e.target.value })}
                  placeholder={t.searchPlaceholder}
                />
                <p className="mt-2 text-sm text-gray-500">
                  {t.searchTip}
                </p>
              </div>

              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">{t.location}</label>
                <select
                  className="block w-full px-4 py-3 rounded-xl bg-gray-50 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                  value={searchParams.municipality}
                  onChange={(e) => setSearchParams({ ...searchParams, municipality: e.target.value })}
                >
                  <option value="">{t.allLocations}</option>
                  <option value="0180">Stockholm</option>
                  <option value="1480">Göteborg</option>
                  <option value="1280">Malmö</option>
                  <option value="0380">Uppsala</option>
                  <option value="0580">Linköping</option>
                  <option value="1880">Örebro</option>
                </select>
              </div>

              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">{t.field}</label>
                <select
                  className="block w-full px-4 py-3 rounded-xl bg-gray-50 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                  value={searchParams.occupation_field}
                  onChange={(e) => setSearchParams({ ...searchParams, occupation_field: e.target.value })}
                >
                  <option value="">{t.allFields}</option>
                  {Object.entries(t.fields).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-2 flex flex-wrap items-center gap-6">
                <label className="flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    checked={searchParams.experience === false}
                    onChange={(e) => setSearchParams({ ...searchParams, experience: !e.target.checked })}
                  />
                  <span className="ml-2 text-gray-700 group-hover:text-gray-900">{t.noExperience}</span>
                </label>
                
                <label className="flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    checked={searchParams.worktime_extent.includes('part_time')}
                    onChange={(e) => {
                      setSearchParams({
                        ...searchParams,
                        worktime_extent: e.target.checked ? ['part_time'] : []
                      });
                    }}
                  />
                  <span className="ml-2 text-gray-700 group-hover:text-gray-900">{t.partTime}</span>
                </label>
              </div>
            </div>

            <div className="flex justify-between items-center pt-6 border-t border-gray-100">
              <div className="text-sm text-gray-600">
                {totalJobs > 0 && t.resultsCount(totalJobs)}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? t.searching : t.searchButton}
              </button>
            </div>
          </form>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-xl">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {results.map((job) => (
            <div key={job.id} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">{job.headline}</h3>
              <div className="space-y-4">
                <div className="flex items-center text-gray-600">
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="font-medium">{job.employer.name}</span>
                </div>
                
                <div className="flex items-center text-gray-600">
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{job.workplace_address.city}</span>
                </div>

                {job.working_hours_type && (
                  <div className="flex items-center text-gray-600">
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{job.working_hours_type.label}</span>
                  </div>
                )}

                <div className="flex items-center text-gray-500 text-sm">
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{t.published}: {new Date(job.publication_date).toLocaleDateString(lang === 'sv' ? 'sv-SE' : 'en-US')}</span>
                </div>

                {job.description?.text && (
                  <div className="text-gray-600">
                    <p className="line-clamp-3">{job.description.text}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  {job.application_details.url && (
                    <a
                      href={job.application_details.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200"
                    >
                      {t.applyOnline}
                      <svg className="ml-2 -mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                  {job.application_details.email && (
                    <a
                      href={`mailto:${job.application_details.email}`}
                      className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                    >
                      {t.applyEmail}
                      <svg className="ml-2 -mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}