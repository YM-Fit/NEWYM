const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '123.csv');
const outputPath = path.join(__dirname, 'foodCatalog.ts');

const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n').filter(line => line.trim() !== '');

const header = lines[0];
const dataLines = lines.slice(1);

const categoryMap = {
  'חלבון': 'protein',
  'שומן': 'fat',
  'פחמימה': 'carb',
};

function parseCsvLine(line) {
  const parts = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current.trim());
  return parts;
}

const items = [];

for (let i = 0; i < dataLines.length; i++) {
  const fields = parseCsvLine(dataLines[i]);

  const categoryHebrew = fields[1] || '';
  const category = categoryMap[categoryHebrew];
  if (!category) {
    console.warn(`Skipping line ${i + 2}: unknown category "${categoryHebrew}"`);
    continue;
  }

  const name = fields[2] || '';
  const calories = parseFloat(fields[3]) || 0;
  const protein = parseFloat(fields[4]) || 0;
  const carbs = parseFloat(fields[5]) || 0;
  const fat = parseFloat(fields[6]) || 0;
  const brand = fields[7] || '';
  const proteinEnrichedRaw = fields[8] || '';
  const proteinEnriched = proteinEnrichedRaw === 'כן';

  items.push({
    id: i,
    category,
    name,
    calories_per_100g: calories,
    protein_per_100g: protein,
    carbs_per_100g: carbs,
    fat_per_100g: fat,
    brand,
    protein_enriched: proteinEnriched,
  });
}

function escapeString(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

let output = '';

output += `export interface FoodCatalogItem {\n`;
output += `  id: number;\n`;
output += `  category: 'protein' | 'fat' | 'carb';\n`;
output += `  name: string;\n`;
output += `  calories_per_100g: number;\n`;
output += `  protein_per_100g: number;\n`;
output += `  carbs_per_100g: number;\n`;
output += `  fat_per_100g: number;\n`;
output += `  brand: string;\n`;
output += `  protein_enriched: boolean;\n`;
output += `}\n\n`;

output += `export const FOOD_CATALOG: FoodCatalogItem[] = [\n`;

for (const item of items) {
  output += `  {\n`;
  output += `    id: ${item.id},\n`;
  output += `    category: '${item.category}',\n`;
  output += `    name: '${escapeString(item.name)}',\n`;
  output += `    calories_per_100g: ${item.calories_per_100g},\n`;
  output += `    protein_per_100g: ${item.protein_per_100g},\n`;
  output += `    carbs_per_100g: ${item.carbs_per_100g},\n`;
  output += `    fat_per_100g: ${item.fat_per_100g},\n`;
  output += `    brand: '${escapeString(item.brand)}',\n`;
  output += `    protein_enriched: ${item.protein_enriched},\n`;
  output += `  },\n`;
}

output += `];\n\n`;

output += `export const FOOD_CATEGORIES = [\n`;
output += `  { value: 'protein' as const, label: 'חלבון' },\n`;
output += `  { value: 'fat' as const, label: 'שומן' },\n`;
output += `  { value: 'carb' as const, label: 'פחמימה' },\n`;
output += `] as const;\n`;

fs.writeFileSync(outputPath, output, 'utf-8');
console.log(`Generated ${outputPath} with ${items.length} items.`);
