# GDPR Compliance Documentation

Detta dokument beskriver hur studentjobbsplattformen implementerar "Privacy by Design"-principer och följer GDPR.

## Principer

1. **Datahantering**
   - Endast nödvändiga användardata samlas in
   - Tydlig information om vilka data som samlas in och varför
   - Data anonymiseras/raderas när syftet uppfyllts

2. **Användarrättigheter**
   - Rätt till åtkomst av egna personuppgifter
   - Rätt till rättelse av felaktiga uppgifter
   - Rätt till radering ("rätten att bli glömd")
   - Rätt till dataportabilitet (export i maskinläsbart format)
   - Rätt att återkalla samtycke

3. **Tekniska åtgärder**
   - Kryptering av personuppgifter
   - Anonymisering när möjligt
   - Segmenterade databasrättigheter
   - Regelbundna säkerhetsgranskningar

## Implementering

### Användardata
Användarmodellen har designats för att tillåta:
- Anonymisering av konton (via `anonymizedAt` fält)
- Tracking av samtyckesversioner och datum
- Krypterad lagring av lösenord

### API-endpoints för datahantering
- `/api/user/data` - Hämta alla användarens personuppgifter
- `/api/user/data/export` - Exportera data i JSON-format
- `/api/user/delete` - Begär radering av konto
- `/api/user/preferences` - Uppdatera användarpreferenser och samtycke

### Datahanteringsservices

Följande åtgärder implementeras för att säkerställa GDPR-compliance:

1. **Anonymiseringsprocess**
   - Vid kontoborttagning anonymiseras data istället för att raderas helt
   - Personlig information ersätts med platshållare
   - Relationslänkar bryts eller anonymiseras

2. **Dataminimering**
   - Vi samlar endast in data som är nödvändig för tjänstens funktion
   - Sökningsmönster anonymiseras efter 90 dagar

3. **Datalagring**
   - Tydliga lagringsperioder för olika datatyper
   - Automatisk borttagning av inaktiva konton efter 24 månader

## Ytterligare dokumentation
- [Integritetspolicy](./privacy-policy.md)
- [Användaravtal](./terms-of-service.md)
- [Databehandlingsprocesser](./data-processing.md)
- [Säkerhetsrutiner](./security-measures.md)