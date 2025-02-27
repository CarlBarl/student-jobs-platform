# Studentjobbsplattform

En plattform för att samla studentjobb från olika källor med mobile-first design och snabb sökfunktionalitet.

## Funktioner

- Samlar studentjobb från flera källor via API och web scraping
- Möjlighet att filtrera jobb efter stad och utbildningsområde
- Mobilanpassad sökfunktionalitet
- GDPR-kompatibel design

## Teknisk stack

- **Frontend**: React med Next.js och Tailwind CSS
- **Backend**: Node.js med Express
- **Databas**: PostgreSQL med Prisma ORM
- **Sökmotor**: MeiliSearch/Elasticsearch

## Kom igång

### Förutsättningar

- Node.js (v18 eller senare)
- Docker och Docker Compose
- Git

### Installation

1. Klona repositoryt:
   ```bash
   git clone https://github.com/yourusername/student-jobs-platform.git
   cd student-jobs-platform
   ```

2. Starta utvecklingsmiljön:
   ```bash
   docker-compose up -d
   ```

3. Installera frontend-dependencies:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. Installera backend-dependencies:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

5. Öppna [http://localhost:3000](http://localhost:3000) i din webbläsare.

## Utveckling

Se [utvecklingsdokumentationen](./docs/development.md) för mer information.

## Testning

```bash
# Kör backend-tester
cd backend
npm test

# Kör frontend-tester
cd frontend
npm test
```

## GDPR-compliance

Denna plattform är byggd med "Privacy by Design"-principer. Se [GDPR-dokumentationen](./docs/gdpr/README.md) för mer information.

## Licens

Detta projekt är licensierat under [MIT License](LICENSE).
