/**
 * Test script for JobTech API integration
 */
import { jobtechService } from '../services/scrapers/types/jobtech/jobtechService';

async function testJobTechApi() {
  console.log('Testing JobTech API connection...');
  
  try {
    // Test with a simple search
    const searchParams = {
      q: 'student',
      limit: 5
    };
    
    console.log('Searching for jobs with query:', searchParams);
    const results = await jobtechService.searchJobs(searchParams);
    console.log(`Found ${results.total.value} jobs matching query "student"`);
    
    console.log('\nSample job titles:');
    results.hits.forEach((job, index) => {
      console.log(`${index + 1}. ${job.headline}`);
    });
    
    // Test fetching a specific job
    if (results.hits.length > 0) {
      const jobId = results.hits[0].id;
      console.log(`\nFetching details for job ID: ${jobId}`);
      
      const jobDetails = await jobtechService.getJob(jobId);
      console.log('Job Details:');
      console.log(`Title: ${jobDetails.headline}`);
      console.log(`Company: ${jobDetails.employer.name}`);
      console.log(`Location: ${jobDetails.workplace_address ? jobDetails.workplace_address.city || 'Not specified' : 'Not specified'}`);
      console.log(`Publication date: ${jobDetails.publication_date}`);
      console.log(`Application deadline: ${jobDetails.application_deadline || 'Not specified'}`);
      
      // Display application methods
      console.log('\nApplication methods:');
      if (jobDetails.application_details?.url) {
        console.log(`- Website: ${jobDetails.application_details.url}`);
      }
      if (jobDetails.application_details?.email) {
        console.log(`- Email: ${jobDetails.application_details.email}`);
      }
    }
    
    // Test student-specific job search
    console.log('\nTesting student-specific job search...');
    const studentParams = {
      q: 'student praktik trainee',
      experience: false,
      'worktime-extent': ['PART_TIME'],
      limit: 5
    };
    
    const studentResults = await jobtechService.searchJobs(studentParams);
    console.log(`Found ${studentResults.total.value} student-relevant jobs`);
    
    console.log('\nSample student job titles:');
    studentResults.hits.forEach((job, index) => {
      console.log(`${index + 1}. ${job.headline}`);
    });
    
    console.log('\nJobTech API test completed successfully!');
  } catch (error) {
    console.error('Error testing JobTech API:', error);
  }
}

// Execute the test
testJobTechApi().catch(console.error);