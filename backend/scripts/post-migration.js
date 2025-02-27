const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function runSQLFile(filePath) {
  try {
    console.log(`Running SQL file: ${filePath}`);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Split the SQL by semicolons to execute statements separately
    // This is a simple approach and may not work for complex SQL with functions, triggers, etc.
    const statements = sql
      .split(';')
      .filter(statement => statement.trim() !== '')
      .map(statement => statement.trim() + ';');
    
    for (const statement of statements) {
      try {
        await prisma.$executeRawUnsafe(statement);
      } catch (error) {
        console.error(`Error executing statement: ${statement.substring(0, 100)}...`);
        console.error(error);
      }
    }
    
    console.log(`Successfully executed SQL file: ${filePath}`);
  } catch (error) {
    console.error(`Error running SQL file ${filePath}:`, error);
  }
}

async function main() {
  const functionsDir = path.join(__dirname, '..', 'prisma', 'migrations', 'functions');
  
  // Check if the directory exists
  if (!fs.existsSync(functionsDir)) {
    console.error(`Functions directory does not exist: ${functionsDir}`);
    return;
  }
  
  // Get all SQL files in the functions directory
  const files = fs.readdirSync(functionsDir)
    .filter(file => file.endsWith('.sql'))
    .map(file => path.join(functionsDir, file));
  
  // Run each SQL file
  for (const file of files) {
    await runSQLFile(file);
  }
  
  console.log('Post-migration scripts completed');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });