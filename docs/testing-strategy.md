# Teststrategi

Detta dokument beskriver teststrategin för studentjobbsplattformen.

## Testning på olika nivåer

### 1. Enhetstester (Unit Tests)

#### Backend
- **Ramverk**: Jest
- **Täckning**: Minst 70% kodtäckning
- **Område**: Alla services och utilities
- **Mock**: Databasanrop mockas

```typescript
// Exempel på enhetstest för JobService
import { JobService } from '../../src/services/jobs/jobService';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client');

describe('JobService', () => {
  let jobService: JobService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      job: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn()
      }
    };
    (PrismaClient as jest.Mock).mockImplementation(() => mockPrisma);
    jobService = new JobService();
  });

  test('getJobs returns jobs with filters applied', async () => {
    // Setup
    const mockJobs = [{id: '1', title: 'Developer'}, {id: '2', title: 'Designer'}];
    mockPrisma.job.findMany.mockResolvedValue(mockJobs);
    
    // Execute
    const result = await jobService.getJobs({location: 'Stockholm'});
    
    // Verify
    expect(mockPrisma.job.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          location: 'Stockholm'
        })
      })
    );
    expect(result).toEqual(mockJobs);
  });
});
```

#### Frontend
- **Ramverk**: React Testing Library + Jest
- **Täckning**: Minst 60% kodtäckning
- **Område**: Komponenter, hooks, utilities
- **Mock**: API-anrop, context-providers

```tsx
// Exempel på enhetstest för JobCard-komponent
import { render, screen } from '@testing-library/react';
import JobCard from '../../src/components/jobs/JobCard';

describe('JobCard', () => {
  const mockJob = {
    id: '1',
    title: 'Frontend Developer',
    company: 'TechCorp',
    location: 'Stockholm',
    postedDate: new Date().toISOString(),
  };

  test('renders job details correctly', () => {
    render(<JobCard job={mockJob} />);
    
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
    expect(screen.getByText('TechCorp')).toBeInTheDocument();
    expect(screen.getByText('Stockholm')).toBeInTheDocument();
  });
});
```

### 2. Integrationstester

#### Backend
- **Ramverk**: Jest + Supertest
- **Område**: API-endpoints, databasinteraktioner
- **Databas**: Test-databas med Docker

```typescript
// Exempel på integrationstest för Jobs API
import request from 'supertest';
import app from '../../src/app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Jobs API', () => {
  beforeAll(async () => {
    // Seed test database
    await prisma.job.createMany({
      data: [
        { title: 'Developer', company: 'TechCorp', location: 'Stockholm' },
        { title: 'Designer', company: 'DesignStudio', location: 'Göteborg' }
      ]
    });
  });

  afterAll(async () => {
    await prisma.job.deleteMany({});
    await prisma.$disconnect();
  });

  test('GET /api/jobs returns all jobs', async () => {
    const response = await request(app).get('/api/jobs');
    
    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThanOrEqual(2);
  });

  test('GET /api/jobs with filter returns filtered jobs', async () => {
    const response = await request(app)
      .get('/api/jobs?location=Stockholm');
    
    expect(response.status).toBe(200);
    expect(response.body.data.every(job => job.location === 'Stockholm')).toBe(true);
  });
});
```

#### Frontend
- **Ramverk**: React Testing Library + MSW (Mock Service Worker)
- **Område**: Sidor, datahämtning, formulär
- **Mock**: API med MSW

```tsx
// Exempel på integrationstest för JobsPage
import { render, screen, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import JobsPage from '../../src/pages/jobs';

// Mock server
const server = setupServer(
  rest.get('/api/jobs', (req, res, ctx) => {
    return res(
      ctx.json({
        data: [
          { id: '1', title: 'Developer', company: 'TechCorp', location: 'Stockholm' },
          { id: '2', title: 'Designer', company: 'DesignStudio', location: 'Göteborg' }
        ]
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('JobsPage', () => {
  test('fetches and displays jobs', async () => {
    render(<JobsPage />);
    
    // Bör visa laddningsindikator först
    expect(screen.getByText(/laddar/i)).toBeInTheDocument();
    
    // Vänta på att jobben dyker upp
    await waitFor(() => {
      expect(screen.getByText('Developer')).toBeInTheDocument();
      expect(screen.getByText('Designer')).toBeInTheDocument();
    });
  });
});
```

### 3. End-to-End (E2E) Tester

- **Ramverk**: Cypress
- **Område**: Kritiska användarflöden
- **Miljö**: Utveckling/Staging

```typescript
// Exempel på Cypress E2E-test för jobbsökningsflöde
describe('Job Search Flow', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('allows filtering jobs by location', () => {
    // Skriv in sökterm
    cy.get('[data-testid="search-input"]').type('developer');
    
    // Välj plats från dropdown
    cy.get('[data-testid="location-filter"]').click();
    cy.get('[data-testid="location-option-stockholm"]').click();
    
    // Klicka på sök
    cy.get('[data-testid="search-button"]').click();
    
    // Verifiera att resultaten bara visar jobb i Stockholm
    cy.get('[data-testid="job-card"]').should('have.length.at.least', 1);
    cy.get('[data-testid="job-location"]').each(($loc) => {
      expect($loc.text()).to.include('Stockholm');
    });
  });

  it('allows users to bookmark a job', () => {
    // Logga in först (mock)
    cy.login();
    
    // Hitta första jobbet och bokmärk det
    cy.get('[data-testid="job-card"]').first()
      .find('[data-testid="bookmark-button"]')
      .click();
    
    // Verifiera bekräftelsemeddelande
    cy.get('[data-testid="toast-success"]')
      .should('contain', 'Jobbet har sparats');
    
    // Gå till sparade jobb
    cy.get('[data-testid="nav-saved-jobs"]').click();
    
    // Verifiera att jobbet finns i listan
    cy.get('[data-testid="job-card"]').should('have.length.at.least', 1);
  });
});
```

### 4. Mobile-specifik testning

- **Verktyg**: Cypress med mobilinställningar, BrowserStack
- **Område**: Layout och funktionalitet på mobilenheter
- **Enheter**: iOS och Android med olika skärmstorlekar

```typescript
// Exempel på Cypress mobiltest
describe('Mobile Job Search Interface', () => {
  beforeEach(() => {
    // Set viewport to mobile size
    cy.viewport('iphone-x');
    cy.visit('/');
  });

  it('shows mobile search interface', () => {
    // Verifiera att mobilmeny är synlig
    cy.get('[data-testid="mobile-menu-button"]').should('be.visible');
    
    // Verifiera att sökfältet är anpassat för mobil
    cy.get('[data-testid="search-form"]').should('have.class', 'mobile');
    
    // Öppna filter
    cy.get('[data-testid="filter-button"]').click();
    
    // Verifiera filteröverlägg
    cy.get('[data-testid="filter-overlay"]').should('be.visible');
  });
});
```

### 5. Prestandatestning

- **Verktyg**: Lighthouse, WebPageTest
- **Område**: Svarstider, sidladdningstid, mobilprestanda
- **Mål**: 
  - First Contentful Paint < 1.5s
  - Time to Interactive < 3s på 3G
  - Lighthouse Mobile Score > 90

### 6. Tillgänglighetstestning

- **Verktyg**: axe-core, Lighthouse
- **Ramverk**: jest-axe, cypress-axe
- **Standarder**: WCAG 2.1 AA

```typescript
// Exempel på tillgänglighetstestning med jest-axe
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import JobsPage from '../../src/pages/jobs';

expect.extend(toHaveNoViolations);

describe('JobsPage Accessibility', () => {
  test('should have no accessibility violations', async () => {
    const { container } = render(<JobsPage />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### 7. API Integration Testing

#### JobTech API Testing

1. **Interactive Test UI**
- Location: `/test/jobtech` route
- Purpose: Real-time API testing and validation
- Features:
  - Search parameter testing
  - Response format validation
  - Error handling verification
  - Multi-language support testing

2. **Test Coverage Areas**
- Parameter validation
  - Search query construction
  - Municipality codes
  - Experience filters
  - Work time extent filters
  - Occupation field codes
- Response handling
  - Data structure validation
  - Null/undefined checks
  - Multi-language content
  - Error scenarios
- Performance aspects
  - Response times
  - Pagination handling
  - Result set sizes

3. **Test Data Examples**
```typescript
// Basic student job search test
const basicSearchTest = {
  q: "student praktik",
  experience: false,
  municipality: "0180",  // Stockholm
  limit: 10
};

// Advanced filter test
const advancedFilterTest = {
  q: "student programmering",
  experience: false,
  worktime_extent: ["PART_TIME"],
  occupation_field: "3",  // Data/IT
  limit: 10
};
```

4. **Error Scenario Testing**
- Invalid parameter combinations
- Network failures
- Rate limiting
- Malformed responses
- Edge cases:
  - Empty result sets
  - Maximum result limits
  - Special characters in search
  - Invalid location codes

5. **Integration Test Infrastructure**
```typescript
// Example of JobTech API integration test
describe('JobTech API Integration', () => {
  it('handles search with all parameters correctly', async () => {
    const params = {
      q: "student",
      experience: false,
      worktime_extent: ["PART_TIME"],
      municipality: "0180",
      occupation_field: "3",
      limit: 5
    };

    const response = await searchJobs(params);
    
    expect(response.status).toBe(200);
    expect(response.data.total.value).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(response.data.hits)).toBe(true);
  });

  it('handles error scenarios gracefully', async () => {
    const invalidParams = {
      municipality: "invalid-code",
      limit: 5
    };

    try {
      await searchJobs(invalidParams);
    } catch (error) {
      expect(error.response.status).toBe(400);
      expect(error.response.data).toHaveProperty('error');
    }
  });
});
```

6. **UI Component Testing**
```typescript
describe('JobTech Search Component', () => {
  it('updates search parameters correctly', async () => {
    render(<JobTechTest />);
    
    // Test municipality selection
    await userEvent.selectOptions(
      screen.getByLabelText(/stad/i),
      "0180"
    );
    
    // Test work time filter
    await userEvent.click(screen.getByLabelText(/deltid/i));
    
    // Verify search parameters
    await userEvent.click(screen.getByRole('button', { name: /sök/i }));
    expect(mockSearchFunction).toHaveBeenCalledWith(
      expect.objectContaining({
        municipality: "0180",
        worktime_extent: ["PART_TIME"]
      })
    );
  });
});
```

7. **Performance Testing Considerations**
- Response time benchmarks:
  - Basic search: < 500ms
  - Complex filters: < 1000ms
  - Large result sets: < 2000ms
- Cache effectiveness monitoring
- Rate limit tracking
- Error rate monitoring

8. **Documentation Testing**
- API endpoint documentation accuracy
- Parameter description correctness
- Response format documentation
- Error code documentation
- Example request/response pairs

## Testautomatisering

### CI/CD Pipeline

- **Pre-commit hooks**: ESLint, Prettier, TypeScript check
- **Pull Request**: Enhetstester och vissa integrationstester
- **Main branch**: Alla tester inklusive E2E
- **Release**: Prestandatester, tillgänglighetstester

### Testrapportering

- Testresultat publiceras till GitHub Actions
- Kodtäckning med Codecov/Coveralls
- Prestandaresultat från Lighthouse sparas för att jämföra över tid

## Ansvar

- Utvecklare ansvarar för enhetstester
- QA/Testare ansvarar för integrations- och E2E-tester
- Alla PR:er kräver testgodkännande innan merge