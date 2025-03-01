# API Testing Guide

## JobTech API Integration Testing

### Test Environment

The JobTech API test environment is available at `/test/jobtech` in the development server, providing an interactive interface for testing API functionality.

### Key Testing Areas

1. **Search Parameters**
   - Query combinations
   - Filter interactions
   - Language-specific searches
   - Edge cases

2. **Response Validation**
   - Data structure integrity
   - Field completeness
   - Type validation
   - Null handling

### Common Test Scenarios

#### Basic Search Tests
```typescript
// Student jobs in Stockholm
{
  q: "student praktik",
  municipality: "0180",
  experience: false
}

// Part-time IT jobs
{
  q: "programmering",
  occupation_field: "3",
  worktime_extent: ["PART_TIME"]
}

// Recent internships
{
  q: "internship trainee",
  sort: "pubdate-desc",
  experience: false
}
```

#### Edge Cases
1. Special Characters
   - Swedish characters (å, ä, ö)
   - Quotation marks in search
   - HTML in job descriptions

2. Filter Combinations
   - Multiple municipalities
   - Multiple occupation fields
   - Combined experience and work time filters

3. Pagination
   - Large result sets
   - Empty pages
   - Last page scenarios

### Error Handling Tests

1. **Client Errors**
   - Invalid municipality codes
   - Malformed search queries
   - Missing required parameters

2. **Server Responses**
   - Timeout handling
   - Rate limit management
   - Service unavailability

### Performance Testing

1. **Response Times**
   - Simple queries: < 500ms
   - Complex filters: < 1000ms
   - Large result sets: < 2000ms

2. **Load Testing**
   - Concurrent requests
   - Rate limit testing
   - Cache effectiveness

### Multi-language Support

1. **Search Queries**
   - Swedish terms
   - English terms
   - Mixed language queries

2. **Response Content**
   - Swedish job descriptions
   - English job descriptions
   - Field translations

### Testing Checklist

- [ ] Basic search functionality
- [ ] All filter combinations
- [ ] Error scenarios
- [ ] Performance benchmarks
- [ ] Language support
- [ ] Mobile responsiveness
- [ ] Accessibility compliance

### Common Issues and Solutions

1. **Character Encoding**
   - Use proper encoding for Swedish characters
   - URL encode search parameters
   - Handle HTML entities in responses

2. **Filter Conflicts**
   - Document incompatible filter combinations
   - Implement validation rules
   - Provide user feedback

3. **Performance**
   - Implement response caching
   - Optimize query parameters
   - Monitor response times

### Automated Testing Setup

1. **Unit Tests**
   ```typescript
   import { validateSearchParams } from '../utils/validation';

   describe('Search Parameter Validation', () => {
     test('validates municipality codes', () => {
       expect(validateSearchParams({ municipality: '0180' })).toBe(true);
       expect(validateSearchParams({ municipality: 'invalid' })).toBe(false);
     });
   });
   ```

2. **Integration Tests**
   ```typescript
   describe('JobTech API Integration', () => {
     test('handles complex search parameters', async () => {
       const response = await searchJobs({
         q: 'student',
         municipality: '0180',
         experience: false,
         worktime_extent: ['PART_TIME']
       });
       
       expect(response.status).toBe(200);
       expect(response.data.hits).toBeDefined();
     });
   });
   ```

3. **E2E Tests**
   ```typescript
   describe('Search Interface', () => {
     test('performs search with multiple filters', async () => {
       await page.goto('/test/jobtech');
       await page.fill('[data-testid="search-input"]', 'student');
       await page.selectOption('[data-testid="municipality"]', '0180');
       await page.click('[data-testid="part-time-checkbox"]');
       await page.click('[data-testid="search-button"]');
       
       await expect(page.locator('[data-testid="results"]')).toBeVisible();
     });
   });
   ```

### Monitoring and Logging

1. **API Metrics**
   - Request success rate
   - Average response time
   - Error frequency
   - Cache hit rate

2. **Error Tracking**
   - Log all API errors
   - Track parameter validation failures
   - Monitor rate limit hits

### Documentation Updates

Keep this guide updated with:
- New test scenarios
- Common issues discovered
- Performance benchmarks
- API changes and updates