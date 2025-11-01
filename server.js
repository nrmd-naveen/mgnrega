import express from "express";
import cors from "cors";
import { PrismaClient } from "./generated/prisma/index.js";
import "dotenv/config";

import path from "path";
import { fileURLToPath } from "url";


const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Needed for __dirname when using ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from the Vite build folder
const distPath = path.join(__dirname, "./dist");
console.log("Serving static files from:", distPath);
app.use(express.static(distPath));



/**
 * @route GET /districts
 * @description Get all distinct districts with their codes.
 * @returns {Array<{district_code: string, district_name: string}>}
 */
app.get('/districts', async (req, res) => {
  try {
    const districts = await prisma.districtData.findMany({
      distinct: ['district_code', 'district_name'],
      select: {
        district_code: true,
        district_name: true,
      },
      orderBy: {
        district_name: 'asc',
      },
    });
    // console.log("Total districts:", districts.length);
    res.json(districts);
  } catch (error) {
    console.error('Error fetching districts:', error);
    res.status(500).json({ error: 'Failed to fetch districts' });
  }
});

/**
 * @route GET /district-records/:district_code
 * @description Get all records for a specific district.
 * @param {string} district_code - The code of the district.
 * @returns {Array<DistrictData>}
 */
app.get('/district-records/:district_code', async (req, res) => {
  const { district_code } = req.params;

  if (!district_code) {
    return res.status(400).json({ error: 'District code is required' });
  }

  try {
    const districtRecords = await prisma.districtData.findMany({
      where: {
        district_code: district_code,
      },
      orderBy: [
        {
          id: 'asc',
        }
      ],
    });

    if (districtRecords.length === 0) {
      return res.status(404).json({ message: 'No data found for this district code' });
    }

    res.json(districtRecords);
  } catch (error) {
    console.error(`Error fetching data for district ${district_code}:`, error);
    res.status(500).json({ error: `Failed to fetch data for district ${district_code}` });
  }
});


/**
 * @route GET /map-data
 * @description Get the latest persondays of central liability for each district.
 * It finds the latest month available in the dataset for each district and returns that record's data.
 * @returns {Array<{district_code: string, district_name: string, persondays_of_central_liability_so_far: number}>}
 */
app.get('/map-data', async (req, res) => {
  try {
    // Get all distinct districts first
    const districts = await prisma.districtData.findMany({
      distinct: ['district_code'],
      select: {
        district_code: true,
        district_name: true,
      },
      orderBy: {
        district_name: 'asc',
      },
    });

    // For each district, get the record with the latest month data.
    // We use the 'id' field to determine the latest entry for a district.
    const mapDataPromises = districts.map(district =>
      prisma.districtData.findFirst({
        where: {
          district_code: district.district_code,
        },
        orderBy: {
          id: 'desc', 
        },
        select: {
          district_code: true,
          district_name: true,
          persondays_of_central_liability_so_far: true,
          month: true,
          fin_year: true,
        },
      })
    );

    const mapData = await Promise.all(mapDataPromises);

    res.json(mapData.filter(Boolean)); // Filter out any null results
  } catch (error) {
    console.error('Error fetching map data:', error);
    res.status(500).json({ error: 'Failed to fetch map data' });
  }
});

/**
 * @route GET /all-district-records
 * @description Get all records for all districts.
 * @returns {Array<DistrictData>}
 */
app.get('/all-district-records', async (req, res) => {
  try {
    const allRecords = await prisma.districtData.findMany({
      orderBy: {
        id: 'asc', // Order by ID
      },
    });
    res.json(allRecords);
  } catch (error) {
    console.error('Error fetching all district records:', error);
    res.status(500).json({ error: 'Failed to fetch all district records' });
  }
});


app.get(/^\/(?!api).*/, (_, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});



app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
