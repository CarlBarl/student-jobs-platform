"use client"
import { useState } from 'react';
import Layout from '../components/layout/Layout';

export default function Home() {
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Söker efter:', search, 'i', location);
    // Här skulle vi anropa backend API
  };

  // Exempel på jobbdata (ersätt med data från API)
  const mockJobs = [
    {
      id: '1',
      title: 'Frontend-utvecklare (deltid)',
      company: 'TechStartup AB',
      location: 'Stockholm',
      postedDate: '2025-02-20',
      educationArea: 'IT/Systemvetenskap'
    },
    {
      id: '2',
      title: 'Marknadsassistent',
      company: 'MarketingByrån',
      location: 'Göteborg',
      postedDate: '2025-02-18',
      educationArea: 'Marknadsföring/Ekonomi'
    },
    {
      id: '3',
      title: 'Ekonomiassistent (deltid)',
      company: 'Finance Group',
      location: 'Malmö',
      postedDate: '2025-02-15',
      educationArea: 'Ekonomi'
    }
  ];

  return (
    <Layout title="Hitta studentjobb">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Hitta det perfekta studentjobbet</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Vi samlar studentjobb från hela Sverige på ett ställe för att göra det enkelt för dig att hitta deltidsjobb som passar din utbildning.
          </p>
        </div>
        
        <form onSubmit={handleSearch} className="mb-10 bg-white p-6 rounded-lg shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Sökord
              </label>
              <input
                type="text"
                id="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Jobb eller företag..."
              />
            </div>
            
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                Plats
              </label>
              <input
                type="text"
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Stad..."
              />
            </div>
            
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                Sök jobb
              </button>
            </div>
          </div>
        </form>
        
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Senaste studentjobben</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockJobs.map((job) => (
              <div key={job.id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-semibold text-primary-700">{job.title}</h3>
                  <button className="text-gray-400 hover:text-primary-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  </button>
                </div>
                <p className="text-gray-600 mt-1">{job.company}</p>
                <p className="text-gray-500 mt-1">{job.location}</p>
                <p className="text-gray-500 mt-1">{job.educationArea}</p>
                <div className="mt-4 flex justify-between items-center">
                  <span className="text-gray-400 text-sm">{new Date(job.postedDate).toLocaleDateString('sv-SE')}</span>
                  <button className="text-primary-600 hover:text-primary-800 text-sm font-medium">
                    Läs mer →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-primary-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-primary-700 mb-2">Jobb som passar dig</h3>
            <p className="text-gray-600">Vi matchar jobb med din utbildning och erfarenhet för bättre träffar.</p>
          </div>
          <div className="bg-primary-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-primary-700 mb-2">Snabb sökfunktion</h3>
            <p className="text-gray-600">Optimerad för mobilen så att du kan söka jobb var du än befinner dig.</p>
          </div>
          <div className="bg-primary-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-primary-700 mb-2">Uppdateras dagligen</h3>
            <p className="text-gray-600">Vi hämtar nya jobb varje dag från flera olika källor.</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}