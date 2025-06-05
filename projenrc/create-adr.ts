import * as fs from "fs";
import * as path from "path";

// Configuration
const ADR_DIR = "docs/decisions";
const ADR_TEMPLATE = path.join(ADR_DIR, "adr-template.md");
const ADR_FILE_PATTERN = /^(\d{4})-.*\.md$/;

function getNextAdrNumber(): number {
  // Ensure the directory exists
  if (!fs.existsSync(ADR_DIR)) {
    fs.mkdirSync(ADR_DIR, { recursive: true });
  }

  // Read the directory and find the highest ADR number
  const files = fs.readdirSync(ADR_DIR);
  let maxNumber = 0;

  files.forEach((file) => {
    const match = file.match(ADR_FILE_PATTERN);
    if (match) {
      const num = parseInt(match[1], 10);
      maxNumber = Math.max(maxNumber, num);
    }
  });

  return maxNumber + 1;
}

function createAdr(title: string): void {
  // Get the next ADR number
  const nextNumber = getNextAdrNumber();
  const paddedNumber = nextNumber.toString().padStart(4, "0");

  // Convert title to kebab-case
  const kebabTitle = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-");

  // Create the new ADR filename
  const newAdrFilename = `${paddedNumber}-${kebabTitle}.md`;
  const newAdrPath = path.join(ADR_DIR, newAdrFilename);

  // Check if the template exists
  if (!fs.existsSync(ADR_TEMPLATE)) {
    console.error(`Error: Template file ${ADR_TEMPLATE} does not exist.`);
    process.exit(1);
  }

  // Read the template and write the new ADR file
  const templateContent = fs.readFileSync(ADR_TEMPLATE, "utf8");
  fs.writeFileSync(newAdrPath, templateContent);

  console.log(`✅ Created new ADR: ${newAdrPath}`);
  console.log(`You can now edit this file to document your decision.`);
}

// Get the title from command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Error: Please provide a title for the ADR.");
  console.error('Usage: npx projen create-adr "Your ADR Title"');
  process.exit(1);
}

// Create the ADR with the provided title
const title = args.join(" "); // Join all arguments in case title has spaces
console.log(`Creating ADR with title: ${title}`);
createAdr(title);
