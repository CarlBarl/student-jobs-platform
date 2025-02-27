# Student Jobs Platform

A comprehensive platform for students to find part-time jobs aligned with their education and career goals.

## Project Overview

This platform is designed to connect students with relevant part-time job opportunities. It aggregates job listings from various sources, allows personalized searches based on education area and location, and includes features for bookmarking favorite jobs.

## Tech Stack

### Frontend
- **Framework**: Next.js (React)
- **Styling**: TailwindCSS
- **Form Handling**: Formik, React Hook Form
- **Data Fetching**: React Query, SWR
- **Form Validation**: Zod

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT
- **Validation**: Joi, Zod
- **Logging**: Winston, Morgan
- **Security**: Helmet, CORS, Rate limiting

### DevOps
- **Containerization**: Docker
- **CI/CD**: GitHub Actions (inferred)
- **Version Control**: Git

## Project Structure

```
student-jobs-platform/
├── backend/               # Express.js API server
│   ├── prisma/            # Database schema and migrations
│   └── src/
│       ├── api/           # API routes, controllers, middlewares
│       ├── services/      # Business logic layer
│       └── utils/         # Utility functions and helpers
├── frontend/              # Next.js web application
│   ├── public/            # Static assets
│   └── src/
│       ├── app/           # Next.js 13+ app router
│       ├── components/    # Reusable UI components
│       └── pages/         # Page components
├── docker/                # Docker configuration files
└── docs/                  # Project documentation
    └── gdpr/              # GDPR compliance documentation
```

## Core Features

1. **Job Search & Filtering**:
   - Search by keywords
   - Filter by location and education area
   - Sort by posting date

2. **User Account Management**:
   - Registration and authentication
   - Profile management
   - GDPR compliant data handling

3. **Personalization**:
   - Job bookmarking
   - Search history
   - Job recommendations based on education area

4. **Job Aggregation**:
   - Automated collection from multiple sources
   - Daily updates
   - Standardized job info display

## Data Model

The key entities in the system include:

- **Jobs**: Job listings with title, company, location, description, and more
- **Users**: Student profiles with authentication info and preferences
- **Bookmarks**: Saved job listings for each user
- **User Preferences**: Personalization settings including preferred locations and education areas
- **Search History**: Record of search queries for improved recommendations

## GDPR Compliance

The application is designed with GDPR principles in mind:
- Explicit user consent tracking
- Data minimization
- User data export and deletion capabilities
- Anonymization options
- Secure data handling

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
docker-compose up
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