import fs from "fs";
import { parse } from "csv-parse/sync";

const csvContent = fs.readFileSync("./tamilnadu_data.csv");
const records = parse(csvContent, { columns: true, skip_empty_lines: true });

const combos = new Set();

for (const row of records) {
  const key = `${row.fin_year}_${row.month}_${row.district_code}`;
  combos.add(key);
}

console.log("Total rows:", records.length);
console.log("Unique (fin_year, month, district_code):", combos.size);
