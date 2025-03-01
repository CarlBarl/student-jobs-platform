/**
 * Simple test script for JobTech API integration
 */
const { jobtechService } = require('../services/scrapers/types/jobtech/jobtechService');

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
    
    if (results.hits && results.hits.length > 0) {
      console.log('\nSample job titles:');
      results.hits.forEach((job, index) => {
        console.log(`${index + 1}. ${job.headline}`);
      });
      
      // Test fetching a specific job
      const jobId = results.hits[0].id;
      console.log(`\nFetching details for job ID: ${jobId}`);
      
      const jobDetails = await jobtechService.getJob(jobId);
      console.log('Job Details:');
      console.log(`Title: ${jobDetails.headline}`);
      console.log(`Company: ${jobDetails.employer.name}`);
      console.log(`Location: ${jobDetails.workplace_address ? jobDetails.workplace_address.city || 'Not specified' : 'Not specified'}`);
    } else {
      console.log('No jobs found in the search results');
    }
    
    console.log('\nJobTech API test completed successfully!');
  } catch (error) {
    console.error('Error testing JobTech API:', error);
  }
}

// Execute the test
testJobTechApi();