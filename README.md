# Student Jobs Platform

A comprehensive platform for students to find part-time jobs aligned with their education and career goals.

## Project Overview

This platform is designed to connect students with relevant part-time job opportunities. It aggregates job listings from various sources, allows personalized searches based on education area and location, and includes features for bookmarking favorite jobs.

## Tech Stack

### Frontend
- **Framework**: Next.js (React)
- **Styling**: TailwindCSS
- **Form Handling**: React Hook Form
- **Data Fetching**: React Query
- **Form Validation**: Zod

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT
- **Validation**: Zod
- **Logging**: Winston
- **Security**: Helmet, CORS, Rate limiting

### External APIs
- **JobTech API**: Swedish Public Employment Service API
  - Real-time job listings
  - Advanced search capabilities
  - Taxonomy integration

### DevOps
- **Containerization**: Docker
- **CI/CD**: GitHub Actions
- **Version Control**: Git

## Project Structure

```
student-jobs-platform/
├── backend/                  # Express.js API server
│   ├── prisma/               # Database schema and migrations
│   │   ├── migrations/       # Database migrations
│   │   │   ├── functions/    # Custom SQL functions
│   │   ├── schema.prisma     # Prisma schema definition
│   │   └── seed.ts           # Database seeding script
│   ├── scripts/              # Utility scripts
│   │   └── post-migration.js # Post-migration script
│   ├── src/
│   │   ├── api/              # API layer
│   │   │   ├── controllers/  # Request handlers
│   │   │   ├── middlewares/  # Express middlewares
│   │   │   └── routes/       # API route definitions
│   │   ├── services/         # Business logic layer
│   │   │   ├── database/     # Database service
│   │   │   ├── gdpr/         # GDPR compliance services
│   │   │   ├── scrapers/     # Job source integrations
│   │   │   │   ├── jobtech/  # JobTech API integration
│   │   │   │   │   ├── jobtechTypes.ts    # API type definitions
│   │   │   │   │   ├── jobtechService.ts  # API client
│   │   │   │   │   └── jobtechMapper.ts   # Data transformation
│   │   │   └── users/        # User-related services
│   └── utils/                # Utility functions and helpers
│   ├── app.ts                # Express application setup
│   └── server.ts             # Server entry point
├── frontend/                 # Next.js web application
│   ├── public/               # Static assets
│   └── src/
│       ├── app/              # Next.js 13+ app router
│       ├── components/       # Reusable UI components
│       │   └── layout/       # Layout components (navbar, footer, etc)
│       └── pages/            # Page components
├── docker/                   # Docker configuration files
│   ├── backend.Dockerfile    # Backend container config
│   ├── frontend.Dockerfile   # Frontend container config
│   └── docker-compose.yml    # Multi-container setup
├── docs/                     # Project documentation
│   ├── testing-strategy.md   # Testing approach documentation
│   ├── api/                  # API documentation
│   └── gdpr/                 # GDPR compliance documentation
└── scripts/                  # Project-wide scripts
```

## Core Features

1. **Job Search & Filtering**:
   - Integration with JobTech API for comprehensive job coverage
   - Search by keywords
   - Filter by location and education area
   - Sort by posting date
   - Advanced filtering options:
     - Experience level (entry-level focus)
     - Work hours (full-time/part-time)
     - Location (municipality-based)
     - Occupation fields
   - Multi-language support (Swedish/English)
   - Real-time search with immediate feedback

2. **User Account Management**:
   - Registration and authentication
   - Profile management
   - GDPR compliant data handling

3. **Personalization**:
   - Job bookmarking
   - Search history
   - Job recommendations based on education area

4. **Job Aggregation**:
   - Automated collection from multiple sources (JobTech API, Academic Work, LinkedIn)
   - Daily updates
   - Standardized job info display

## Data Model

The key entities in the system include:

- **Jobs**: Job listings with title, company, location, description, requirements, and more
- **Users**: Student profiles with authentication info and preferences
- **Companies**: Organizations posting jobs with verification status
- **Education Areas**: Hierarchical structure of study fields
- **Cities**: Geographic locations with region and country information
- **Bookmarks**: Saved job listings for each user
- **Job Sources**: Configuration for different job listing sources

## GDPR Compliance

The application is designed with GDPR principles in mind:
- Explicit user consent tracking
- Data minimization
- User data export and deletion capabilities
- Anonymization options
- Secure data handling
- Consent middleware for validating user permissions

## Getting Started

### Prerequisites
- Node.js (v16+)
- PostgreSQL
- Docker (optional)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/CarlBarl/student-jobs-platform.git
   cd student-jobs-platform
   ```

2. Install root dependencies:
   ```bash
   npm install
   ```

3. Setup backend:
   ```bash
   cd backend
   npm install
   npx prisma generate
   npx prisma migrate dev
   npx prisma db seed
   ```

4. Setup frontend:
   ```bash
   cd ../frontend
   npm install
   ```

5. Environment configuration:
   - Create `.env` files in both backend and frontend directories based on provided examples

### Running the Application

#### Using Docker:
```bash
docker-compose -f docker/docker-compose.yml up
```

#### Manual Development Setup:
1. Start backend:
   ```bash
   cd backend
   npm run dev
   ```

2. Start frontend:
   ```bash
   cd frontend
   npm run dev
   ```

3. Access the application at `http://localhost:3000`

## API Documentation

API documentation is available at `http://localhost:4000/api-docs` when running in development mode.

## Data Integration

### JobTech API Integration
The platform leverages the Swedish Public Employment Service's JobTech API as a primary data source:

1. **Search Parameters**:
   - Keywords (headline, description, employer)
   - Location (municipality codes)
   - Experience requirements
   - Working hours
   - Occupation fields

2. **Data Mapping**:
   - Standardized job information format
   - Education area matching
   - Location normalization
   - Multi-language support

3. **Performance Optimization**:
   - Efficient query construction
   - Response caching
   - Error handling and recovery
   - Rate limit management

4. **Testing Environment**:
   - Interactive test interface (`/test/jobtech`)
   - Real-time API testing
   - Parameter validation
   - Response visualization

## Development Guidelines

### API Integration Best Practices

1. **Error Handling**:
   - Implement comprehensive error catching
   - Provide meaningful error messages
   - Handle API-specific error codes
   - Log detailed error information

2. **Data Transformation**:
   - Use typed interfaces for API responses
   - Implement data mappers for consistency
   - Handle missing or null values
   - Support multiple languages

3. **Testing**:
   - Create integration tests for API endpoints
   - Test error scenarios
   - Validate response formats
   - Monitor API performance

4. **Documentation**:
   - Keep API documentation updated
   - Document common issues and solutions
   - Maintain example queries and responses
   - Track API version changes

## Environment Configuration

### Required Environment Variables

#### Backend
```bash
# Database Configuration
DATABASE_URL="postgresql://..."

# JobTech API Configuration
JOBTECH_API_URL=https://jobsearch.api.jobtechdev.se
JOBTECH_API_CACHE_MINUTES=15
JOBTECH_SEARCH_DEFAULT_LIMIT=20
JOBTECH_SEARCH_MAX_LIMIT=100
JOBTECH_REQUEST_TIMEOUT_MS=30000

# Other configurations...
```

## Testing Strategy

Refer to `docs/testing-strategy.md` for detailed information about the project's testing approach.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

ISC License - See the LICENSE file for details.

## Contact

Project Link: [https://github.com/CarlBarl/student-jobs-platform](https://github.com/CarlBarl/student-jobs-platform)