/**
 * Simple test script for JobTech API integration (TypeScript version)
 */
import dotenv from 'dotenv';
import { jobtechService } from '../services/scrapers/types/jobtech/jobtechService';
import { JobTechSearchParams, JobTechAd } from '../services/scrapers/types/jobtech/jobtechTypes';

// Load environment variables
dotenv.config();

async function testJobTechApi(): Promise<void> {
  console.log('Testing JobTech API connection...');
  
  try {
    // Test with a simple search
    const searchParams: JobTechSearchParams = {
      q: 'student',
      limit: 5,
      offset: 0
    };
    
    console.log('Searching for jobs with query:', searchParams);
    const results = await jobtechService.searchJobs(searchParams);
    console.log(`Found ${results.total.value} jobs matching query "student"`);
    
    if (results.hits && results.hits.length > 0) {
      console.log('\nSample job titles:');
      results.hits.forEach((job: JobTechAd, index: number) => {
        console.log(`${index + 1}. ${job.headline}`);
      });
      
      // Test fetching a specific job
      const jobId = results.hits[0].id;
      console.log(`\nFetching details for job ID: ${jobId}`);
      
      const jobDetails = await jobtechService.getJob(jobId);
      console.log('Job Details:');
      console.log(`Title: ${jobDetails.headline}`);
      console.log(`Company: ${jobDetails.employer.name}`);
      console.log(`Location: ${jobDetails.workplace_address?.city || 'Not specified'}`);
      console.log(`Published: ${new Date(jobDetails.publication_date).toLocaleDateString()}`);
      
      if (jobDetails.application_details) {
        console.log('\nApplication methods:');
        if (jobDetails.application_details.url) {
          console.log(`- Website: ${jobDetails.application_details.url}`);
        }
        if (jobDetails.application_details.email) {
          console.log(`- Email: ${jobDetails.application_details.email}`);
        }
      }
    } else {
      console.log('No jobs found in the search results');
    }
    
    // Test student-specific job search
    console.log('\nTesting student-specific job search...');
    const studentParams: JobTechSearchParams = {
      q: 'student praktik trainee',
      experience: false,
      'worktime-extent': ['PART_TIME'],
      limit: 5,
      offset: 0
    };
    
    const studentResults = await jobtechService.searchJobs(studentParams);
    console.log(`Found ${studentResults.total.value} student-relevant jobs`);
    
    if (studentResults.hits && studentResults.hits.length > 0) {
      console.log('\nSample student job titles:');
      studentResults.hits.forEach((job: JobTechAd, index: number) => {
        console.log(`${index + 1}. ${job.headline}`);
      });
    }
    
    console.log('\nJobTech API test completed successfully!');
  } catch (error) {
    console.error('Error testing JobTech API:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Execute the test
testJobTechApi().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});