import { JobTechApiSource } from '../sources/api/JobTechApiSource';
import { ApiSourceConfig } from '../interfaces/ApiSource';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('JobTechApiSource', () => {
  let jobTechSource: JobTechApiSource;
  let config: ApiSourceConfig;
  
  beforeEach(() => {
    // Reset all mocks
    jest.resetAllMocks();
    
    // Mock axios.create to return the mocked axios instance
    mockedAxios.create.mockReturnValue(mockedAxios);
    
    // Set up test configuration
    config = {
      id: 'jobtech-test',
      name: 'JobTech API Test',
      type: 'api',
      isEnabled: true,
      scheduleExpression: '0 0 * * *',
      priority: 100,
      concurrencyLimit: 5,
      requestDelay: 0, // No delay for tests
      baseUrl: 'https://jobsearch.api.jobtechdev.se/search',
      headers: {},
      sourceSpecificConfig: {
        oauth: {
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          tokenUrl: 'https://auth.jobtechdev.se/auth/realms/jobtech/protocol/openid-connect/token'
        }
      }
    };
    
    // Initialize the source
    jobTechSource = new JobTechApiSource(config);
  });
  
  test('should authenticate successfully', async () => {
    // Mock the token response
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        access_token: 'test-access-token',
        expires_in: 3600
      }
    });
    
    // Call authenticate
    await jobTechSource.authenticate();
    
    // Check that the token request was made
    expect(mockedAxios.post).toHaveBeenCalledWith(
      config.sourceSpecificConfig.oauth.tokenUrl,
      expect.any(URLSearchParams),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/x-www-form-urlencoded'
        })
      })
    );
    
    // Check that the Authorization header was set
    expect(mockedAxios.defaults.headers.common['Authorization']).toBe('Bearer test-access-token');
  });
  
  test('should fetch jobs successfully', async () => {
    // Mock authentication
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        access_token: 'test-access-token',
        expires_in: 3600
      }
    });
    
    // Mock the search response
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        total: { value: 2 },
        hits: [
          {
            id: 'job-1',
            headline: 'Test Job 1',
            description: { text: 'Test description 1', requirements: 'Test requirements 1' },
            application: { url: 'https://example.com/job1' },
            employer: { name: 'Test Company 1' },
            publication_date: '2023-01-01T00:00:00Z',
            last_publication_date: '2023-01-31T00:00:00Z',
            working_hours_type: { concept_id: 'DELT', label: 'Part-time' },
            workplace_address: { city: 'Stockholm', region: 'Stockholm' }
          },
          {
            id: 'job-2',
            headline: 'Test Job 2',
            description: { text: 'Test description 2', requirements: 'Test requirements 2' },
            application: { url: 'https://example.com/job2' },
            employer: { name: 'Test Company 2' },
            publication_date: '2023-01-02T00:00:00Z',
            last_publication_date: '2023-01-30T00:00:00Z',
            working_hours_type: { concept_id: 'STTJ', label: 'Full-time' },
            workplace_address: { city: 'Gothenburg', region: 'Västra Götaland' }
          }
        ]
      }
    });
    
    // Call collect
    const jobs = await jobTechSource.collect();
    
    // Check that authentication was called
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('token'),
      expect.any(URLSearchParams),
      expect.any(Object)
    );
    
    // Check that search was called
    expect(mockedAxios.post).toHaveBeenCalledWith(
      '/search',
      expect.objectContaining({
        filters: expect.any(Array),
        limit: expect.any(Number),
        offset: expect.any(Number)
      })
    );
    
    // Check that jobs were returned and transformed correctly
    expect(jobs).toHaveLength(2);
    expect(jobs[0]).toMatchObject({
      sourceId: 'jobtech-test',
      sourceJobId: 'job-1',
      title: 'Test Job 1',
      company: 'Test Company 1',
      location: 'Stockholm, Stockholm',
      description: 'Test description 1',
      requirements: 'Test requirements 1',
      url: 'https://example.com/job1',
      jobType: ['Part-time'],
      workHours: 'Part-time'
    });
    expect(jobs[1]).toMatchObject({
      sourceId: 'jobtech-test',
      sourceJobId: 'job-2',
      title: 'Test Job 2',
      company: 'Test Company 2',
      location: 'Gothenburg, Västra Götaland',
      description: 'Test description 2',
      requirements: 'Test requirements 2',
      url: 'https://example.com/job2',
      jobType: ['Full-time'],
      workHours: 'Full-time'
    });
  });
});