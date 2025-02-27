// prisma/seed.ts

import { PrismaClient, JobType, JobStatus } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  
  // Clean existing data
  // This is safe to do in development, but should not be done in production
  if (process.env.NODE_ENV === 'development') {
    await cleanDatabase();
  }
  
  // Seed data
  await seedJobSources();
  await seedCities();
  await seedEducationAreas();
  await seedCompanies();
  await seedJobs();
  await seedUsers();
  
  console.log('Database seeding completed');
}

/**
 * Clean database (for development only)
 */
async function cleanDatabase() {
  console.log('Cleaning database...');
  
  const tablesToClean = [
    'bookmark',
    'user_preferred_city',
    'user_education_area',
    'job_city',
    'job_education_area',
    'job',
    'user',
    'company',
    'city',
    'education_area',
    'job_source'
  ];
  
  // Disable foreign key checks to allow cleaning
  await prisma.$executeRaw`SET session_replication_role = 'replica';`;
  
  // Truncate all tables
  for (const table of tablesToClean) {
    try {
      await prisma.$executeRaw`TRUNCATE TABLE "${table}" CASCADE;`;
      console.log(`Truncated table: ${table}`);
    } catch (error) {
      console.error(`Error truncating table ${table}:`, error);
    }
  }
  
  // Re-enable foreign key checks
  await prisma.$executeRaw`SET session_replication_role = 'origin';`;
  
  console.log('Database cleaned');
}

/**
 * Seed job sources
 */
async function seedJobSources() {
  console.log('Seeding job sources...');
  
  const jobSources = [
    {
      name: 'JobTech API',
      url: 'https://jobtechdev.se/docs/apis/jobstream/',
      description: 'Official API for job listings in Sweden',
      active: true,
      scraperConfig: {
        apiKey: 'demo-key',
        endpoint: 'https://jobstream.api.jobtechdev.se/stream',
        filters: {
          regions: ['Stockholm', 'Göteborg', 'Malmö'],
          positions: ['student', 'intern', 'trainee']
        }
      }
    },
    {
      name: 'Academic Work',
      url: 'https://www.academicwork.se',
      description: 'Student and graduate jobs',
      active: true,
      scraperConfig: {
        selector: {
          jobList: '.job-list',
          jobItem: '.job-item',
          title: '.job-title',
          description: '.job-description',
          applyLink: '.apply-link'
        },
        updateInterval: 24 // hours
      }
    },
    {
      name: 'LinkedIn',
      url: 'https://www.linkedin.com/jobs',
      description: 'LinkedIn job listings',
      active: true,
      scraperConfig: {
        useAPI: true,
        apiConfig: {
          clientId: 'demo-client-id',
          clientSecret: 'demo-client-secret',
          grantType: 'client_credentials'
        },
        filters: {
          keywords: ['student', 'internship', 'thesis', 'part-time'],
          locations: ['Sweden']
        }
      }
    }
  ];
  
  for (const source of jobSources) {
    await prisma.jobSource.upsert({
      where: { name: source.name },
      update: {},
      create: source
    });
  }
  
  console.log(`Seeded ${jobSources.length} job sources`);
}

/**
 * Seed cities
 */
async function seedCities() {
  console.log('Seeding cities...');
  
  const cities = [
    { name: 'Stockholm', region: 'Stockholm', country: 'Sweden', active: true },
    { name: 'Göteborg', region: 'Västra Götaland', country: 'Sweden', active: true },
    { name: 'Malmö', region: 'Skåne', country: 'Sweden', active: true },
    { name: 'Uppsala', region: 'Uppsala', country: 'Sweden', active: true },
    { name: 'Lund', region: 'Skåne', country: 'Sweden', active: true },
    { name: 'Linköping', region: 'Östergötland', country: 'Sweden', active: true },
    { name: 'Umeå', region: 'Västerbotten', country: 'Sweden', active: true },
    { name: 'Luleå', region: 'Norrbotten', country: 'Sweden', active: true },
    { name: 'Örebro', region: 'Örebro', country: 'Sweden', active: true },
    { name: 'Västerås', region: 'Västmanland', country: 'Sweden', active: true }
  ];
  
  for (const city of cities) {
    await prisma.city.upsert({
      where: { 
        name_country: {
          name: city.name,
          country: city.country
        }
      },
      update: {},
      create: city
    });
  }
  
  console.log(`Seeded ${cities.length} cities`);
}

/**
 * Seed education areas
 */
async function seedEducationAreas() {
  console.log('Seeding education areas...');
  
  // Parent education areas
  const parentAreas = [
    {
      name: 'Engineering',
      description: 'Engineering and technology fields'
    },
    {
      name: 'Business',
      description: 'Business, economics and management'
    },
    {
      name: 'IT',
      description: 'Information technology and computer science'
    },
    {
      name: 'Healthcare',
      description: 'Healthcare and medical fields'
    },
    {
      name: 'Social Sciences',
      description: 'Social sciences and humanities'
    }
  ];
  
  // Create parent areas
  for (const area of parentAreas) {
    await prisma.educationArea.upsert({
      where: { name: area.name },
      update: {},
      create: area
    });
  }
  
  // Child education areas
  const childAreas = [
    // Engineering sub-areas
    {
      name: 'Mechanical Engineering',
      description: 'Design and manufacturing of physical systems',
      parentName: 'Engineering'
    },
    {
      name: 'Electrical Engineering',
      description: 'Study of electricity and electronics',
      parentName: 'Engineering'
    },
    {
      name: 'Civil Engineering',
      description: 'Design and construction of infrastructure',
      parentName: 'Engineering'
    },
    
    // Business sub-areas
    {
      name: 'Marketing',
      description: 'Promotion and selling of products or services',
      parentName: 'Business'
    },
    {
      name: 'Finance',
      description: 'Management of money and investments',
      parentName: 'Business'
    },
    {
      name: 'Management',
      description: 'Coordination of business activities',
      parentName: 'Business'
    },
    
    // IT sub-areas
    {
      name: 'Software Development',
      description: 'Creation and maintenance of software',
      parentName: 'IT'
    },
    {
      name: 'Data Science',
      description: 'Analysis and interpretation of data',
      parentName: 'IT'
    },
    {
      name: 'Cybersecurity',
      description: 'Protection of computer systems and networks',
      parentName: 'IT'
    },
    
    // Healthcare sub-areas
    {
      name: 'Nursing',
      description: 'Care of individuals, families, and communities',
      parentName: 'Healthcare'
    },
    {
      name: 'Medicine',
      description: 'Diagnosis, treatment, and prevention of disease',
      parentName: 'Healthcare'
    },
    {
      name: 'Psychology',
      description: 'Study of mind and behavior',
      parentName: 'Healthcare'
    },
    
    // Social Sciences sub-areas
    {
      name: 'Economics',
      description: 'Study of production, distribution, and consumption',
      parentName: 'Social Sciences'
    },
    {
      name: 'Sociology',
      description: 'Study of society and social relations',
      parentName: 'Social Sciences'
    },
    {
      name: 'Political Science',
      description: 'Study of politics and government',
      parentName: 'Social Sciences'
    }
  ];
  
  // Create child areas
  for (const area of childAreas) {
    const parent = await prisma.educationArea.findUnique({
      where: { name: area.parentName }
    });
    
    if (parent) {
      await prisma.educationArea.upsert({
        where: { name: area.name },
        update: {},
        create: {
          name: area.name,
          description: area.description,
          parentId: parent.id
        }
      });
    }
  }
  
  console.log(`Seeded ${parentAreas.length + childAreas.length} education areas`);
}

/**
 * Seed companies
 */
async function seedCompanies() {
  console.log('Seeding companies...');
  
  const companies = [
    {
      name: 'Tech Innovations AB',
      website: 'https://techinnovations.example.com',
      logoUrl: 'https://placekitten.com/200/200',
      description: 'Leading technology company focused on innovation',
      industry: 'Technology',
      verified: true
    },
    {
      name: 'Finance Solutions',
      website: 'https://financesolutions.example.com',
      logoUrl: 'https://placekitten.com/201/201',
      description: 'Financial services and solutions',
      industry: 'Finance',
      verified: true
    },
    {
      name: 'Health Partners',
      website: 'https://healthpartners.example.com',
      logoUrl: 'https://placekitten.com/202/202',
      description: 'Healthcare provider and research',
      industry: 'Healthcare',
      verified: true
    },
    {
      name: 'Startup Vision',
      website: 'https://startupvision.example.com',
      logoUrl: 'https://placekitten.com/203/203',
      description: 'Innovative startup incubator',
      industry: 'Technology',
      verified: false
    },
    {
      name: 'Marketing Experts',
      website: 'https://marketingexperts.example.com',
      logoUrl: 'https://placekitten.com/204/204',
      description: 'Digital marketing agency',
      industry: 'Marketing',
      verified: true
    }
  ];
  
  for (const company of companies) {
    await prisma.company.upsert({
      where: { 
        name_website: {
          name: company.name,
          website: company.website || ''
        }
      },
      update: {},
      create: company
    });
  }
  
  console.log(`Seeded ${companies.length} companies`);
}

/**
 * Seed jobs
 */
async function seedJobs() {
  console.log('Seeding jobs...');
  
  // Get existing companies, sources, cities, and education areas
  const companies = await prisma.company.findMany();
  const sources = await prisma.jobSource.findMany();
  const cities = await prisma.city.findMany();
  const educationAreas = await prisma.educationArea.findMany();
  
  // Sample job data
  const jobs = [
    {
      title: 'Student Developer',
      description: 'Part-time developer position for students with interest in web development.',
      requirements: 'JavaScript, React, Node.js experience. Currently studying IT or similar.',
      jobType: 'part_time' as JobType,
      status: 'active' as JobStatus,
      companyId: companies[0].id,
      sourceId: sources[0].id,
      externalId: 'ext-12345',
      applyUrl: 'https://example.com/apply/12345',
      salaryRange: '150-200 SEK/hour',
      hoursPerWeek: 20,
      remoteOption: true,
      postedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      cities: [cities[0], cities[1]], // Stockholm, Göteborg
      educationAreas: [
        { area: educationAreas.find(a => a.name === 'Software Development'), relevance: 100 },
        { area: educationAreas.find(a => a.name === 'IT'), relevance: 80 }
      ]
    },
    {
      title: 'Finance Intern',
      description: 'Internship opportunity at a leading financial services company.',
      requirements: 'Currently studying business, finance, or economics. Excel skills required.',
      jobType: 'internship' as JobType,
      status: 'active' as JobStatus,
      companyId: companies[1].id,
      sourceId: sources[1].id,
      externalId: 'ext-23456',
      applyUrl: 'https://example.com/apply/23456',
      salaryRange: '25,000 SEK/month',
      hoursPerWeek: 40,
      remoteOption: false,
      postedAt: new Date(),
      expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
      cities: [cities[0]], // Stockholm
      educationAreas: [
        { area: educationAreas.find(a => a.name === 'Finance'), relevance: 100 },
        { area: educationAreas.find(a => a.name === 'Business'), relevance: 90 }
      ]
    },
    {
      title: 'Marketing Assistant',
      description: 'Assist with various marketing tasks for a growing agency.',
      requirements: 'Interest in digital marketing. Studies in marketing, business, or communications.',
      jobType: 'part_time' as JobType,
      status: 'active' as JobStatus,
      companyId: companies[4].id,
      sourceId: sources[2].id,
      externalId: 'ext-34567',
      applyUrl: 'https://example.com/apply/34567',
      salaryRange: '160 SEK/hour',
      hoursPerWeek: 15,
      remoteOption: true,
      postedAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
      cities: [cities[2]], // Malmö
      educationAreas: [
        { area: educationAreas.find(a => a.name === 'Marketing'), relevance: 100 },
        { area: educationAreas.find(a => a.name === 'Business'), relevance: 70 }
      ]
    },
    {
      title: 'Research Assistant - Healthcare',
      description: 'Assist with medical research projects part-time.',
      requirements: 'Currently studying medicine, nursing, or related field. Research interest required.',
      jobType: 'part_time' as JobType,
      status: 'active' as JobStatus,
      companyId: companies[2].id,
      sourceId: sources[0].id,
      externalId: 'ext-45678',
      applyUrl: 'https://example.com/apply/45678',
      salaryRange: '170-200 SEK/hour',
      hoursPerWeek: 10,
      remoteOption: false,
      postedAt: new Date(),
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      cities: [cities[4]], // Lund
      educationAreas: [
        { area: educationAreas.find(a => a.name === 'Medicine'), relevance: 100 },
        { area: educationAreas.find(a => a.name === 'Healthcare'), relevance: 90 }
      ]
    },
    {
      title: 'Software Engineering Thesis',
      description: 'Thesis opportunity in software engineering with a focus on cloud technologies.',
      requirements: 'Master\'s student in Computer Science or similar. Strong programming skills required.',
      jobType: 'thesis' as JobType,
      status: 'active' as JobStatus,
      companyId: companies[0].id,
      sourceId: sources[1].id,
      externalId: 'ext-56789',
      applyUrl: 'https://example.com/apply/56789',
      salaryRange: 'Unpaid',
      hoursPerWeek: 40,
      remoteOption: true,
      postedAt: new Date(),
      expiresAt: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), // 120 days from now
      cities: [cities[5]], // Linköping
      educationAreas: [
        { area: educationAreas.find(a => a.name === 'Software Development'), relevance: 100 },
        { area: educationAreas.find(a => a.name === 'IT'), relevance: 80 }
      ]
    }
  ];
  
  // Create jobs and relationships
  for (const jobData of jobs) {
    // Extract relationships
    const { cities: jobCities, educationAreas: jobEducationAreas, ...jobDetails } = jobData;
    
    // Create job
    const job = await prisma.job.create({
      data: jobDetails
    });
    
    // Create job-city relationships
    for (const city of jobCities) {
      await prisma.jobCity.create({
        data: {
          jobId: job.id,
          cityId: city.id,
          primaryLocation: jobCities.indexOf(city) === 0 // First city is primary
        }
      });
    }
    
    // Create job-education area relationships
    for (const { area, relevance } of jobEducationAreas) {
      if (area) {
        await prisma.jobEducationArea.create({
          data: {
            jobId: job.id,
            educationAreaId: area.id,
            relevance
          }
        });
      }
    }
  }
  
  console.log(`Seeded ${jobs.length} jobs`);
}

/**
 * Seed users
 */
async function seedUsers() {
  console.log('Seeding users...');
  
  // Get education areas and cities for relationships
  const itArea = await prisma.educationArea.findUnique({ where: { name: 'IT' } });
  const businessArea = await prisma.educationArea.findUnique({ where: { name: 'Business' } });
  const stockholm = await prisma.city.findFirst({ where: { name: 'Stockholm' } });
  const gothenburg = await prisma.city.findFirst({ where: { name: 'Göteborg' } });
  
  // Sample user data
  const users = [
    {
      email: 'student@example.com',
      passwordHash: await hash('Password123!', 10),
      firstName: 'Student',
      lastName: 'User',
      phone: '0701234567',
      bio: 'IT student looking for part-time opportunities',
      graduationYear: 2024,
      isActive: true,
      emailVerified: true,
      consentToDataProcessing: true,
      consentGivenAt: new Date(),
      privacyPolicyVersion: '1.0',
      marketingConsent: true,
      lastLogin: new Date(),
      educationAreas: itArea ? [itArea.id] : [],
      preferredCities: stockholm ? [stockholm.id] : []
    },
    {
      email: 'business@example.com',
      passwordHash: await hash('Password123!', 10),
      firstName: 'Business',
      lastName: 'Student',
      phone: '0709876543',
      bio: 'Business student interested in finance and marketing opportunities',
      graduationYear: 2023,
      isActive: true,
      emailVerified: true,
      consentToDataProcessing: true,
      consentGivenAt: new Date(),
      privacyPolicyVersion: '1.0',
      marketingConsent: false,
      lastLogin: new Date(),
      educationAreas: businessArea ? [businessArea.id] : [],
      preferredCities: gothenburg ? [gothenburg.id] : []
    }
  ];
  
  // Create users and relationships
  for (const userData of users) {
    // Extract relationships
    const { educationAreas: userEducationAreas, preferredCities, ...userDetails } = userData;
    
    // Create user
    const user = await prisma.user.create({
      data: userDetails
    });
    
    // Create user-education area relationships
    for (const areaId of userEducationAreas) {
      await prisma.userEducationArea.create({
        data: {
          userId: user.id,
          educationAreaId: areaId
        }
      });
    }
    
    // Create user-preferred city relationships
    for (const cityId of preferredCities) {
      await prisma.userPreferredCity.create({
        data: {
          userId: user.id,
          cityId: cityId
        }
      });
    }
    
    // Create a bookmark for the first job for the first user
    if (userEducationAreas.includes(itArea?.id || '') && user.email === 'student@example.com') {
      const firstJob = await prisma.job.findFirst({
        where: {
          jobEducationAreas: {
            some: {
              educationAreaId: itArea?.id
            }
          }
        }
      });
      
      if (firstJob) {
        await prisma.bookmark.create({
          data: {
            userId: user.id,
            jobId: firstJob.id,
            notes: 'Interesting opportunity, should apply soon!'
          }
        });
      }
    }
  }
  
  console.log(`Seeded ${users.length} users`);
}

// Execute the main function
main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    // Close Prisma client connection
    await prisma.$disconnect();
  });