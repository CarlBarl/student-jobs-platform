import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/layout/Layout';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  postedDate: string;
}

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:4000/api/jobs');
      setJobs(response.data.data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:4000/api/jobs?search=${search}&location=${location}`);
      setJobs(response.data.data);
    } catch (error) {
      console.error('Error searching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Hitta studentjobb">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Hitta studentjobb</h1>
        
        <form onSubmit={handleSearch} className="mb-8 bg-white p-4 rounded-lg shadow-md">
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
        
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-10">
              <p className="text-gray-500">Laddar jobb...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500">Inga jobb hittades</p>
            </div>
          ) : (
            jobs.map((job) => (
              <div key={job.id} className="bg-white p-4 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold text-primary-700">{job.title}</h2>
                <p className="text-gray-600">{job.company}</p>
                <p className="text-gray-500">{job.location}</p>
                <p className="text-gray-400 text-sm">{new Date(job.postedDate).toLocaleDateString('sv-SE')}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}