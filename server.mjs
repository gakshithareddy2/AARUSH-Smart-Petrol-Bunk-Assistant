
import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// --------------------------------------
// 1. GEMINI API CONFIGURATION
// --------------------------------------

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is missing from environment variables.");
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// --------------------------------------
// 2. CORS CONFIGURATION
// --------------------------------------
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://aarush-fuel-station.web.app",
  "https://aarush-fuel-station.firebaseapp.com",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS."));
    },
    methods: ["GET", "POST", "OPTIONS"],
  })
);

// --------------------------------------
// 3. IMAGE UPLOAD CONFIGURATION
// --------------------------------------

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 12,
  },

  fileFilter: (req, file, callback) => {
    if (file.mimetype.startsWith("image/")) {
      callback(null, true);
    } else {
      callback(new Error("Only image files are allowed."));
    }
  },
});

// --------------------------------------
// 4. HEALTH CHECK ROUTE
// --------------------------------------

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "AARUSH Gemini AI server is running.",
  });
});

// --------------------------------------
// 5. RECEIPT ANALYSIS ROUTE
// --------------------------------------

app.post(
  "/api/analyze-receipts",

  upload.fields([
    { name: "yesterday", maxCount: 6 },
    { name: "today", maxCount: 6 },
  ]),

  async (req, res) => {
    try {
      const yesterdayImages = req.files?.yesterday || [];
      const todayImages = req.files?.today || [];

      // Validate uploaded images
      if (!yesterdayImages.length || !todayImages.length) {
        return res.status(400).json({
          success: false,
          error:
            "Upload at least one yesterday image and one today image.",
        });
      }

      // --------------------------------------
      // 6. PREPARE IMAGE DATA FOR GEMINI
      // --------------------------------------

      const imageParts = [];

      function addImages(files, day) {
        for (const file of files) {
          imageParts.push({
            text: `This image belongs to ${day}. Filename: ${file.originalname}`,
          });

          imageParts.push({
            inlineData: {
              mimeType: file.mimetype,
              data: file.buffer.toString("base64"),
            },
          });
        }
      }

      addImages(yesterdayImages, "YESTERDAY");
      addImages(todayImages, "TODAY");

      // --------------------------------------
      // 7. GEMINI PROMPT
      // --------------------------------------

      const prompt = `
You are the receipt-reading assistant for AARUSH petrol bunk.

Analyze ALL the supplied receipt images together.

Each receipt is from a fuel dispensing unit (DU).

Extract these details from every receipt:

1. Date printed on the receipt.
2. DU SERIAL NO.
3. Nozzle number.
4. Product if visible.
5. Vtot value for that nozzle.

IMPORTANT RULES:

- Use the image's assigned day (YESTERDAY or TODAY), not the upload order.
- DU SERIAL NO. identifies the dispensing unit/pump.
- Match readings from different days using the same DU serial number and nozzle number.
- Read Vtot, NOT Atot.
- Do not confuse Vtot with Atot.
- Each receipt can contain multiple nozzle readings.
- Extract every nozzle reading separately.
- Preserve decimal values exactly.
- Do not guess missing or unclear digits.
- If a value is unclear, use null and explain why.
- Do not treat a receipt total as an individual nozzle reading.
- Multiple photos may show the same receipt. Avoid duplicate readings.
- Return JSON only.

Return this structure:

{
  "readings": [
    {
      "day": "YESTERDAY",
      "duSerial": "M2519363",
      "nozzleNumber": 1,
      "product": "HSD",
      "vtot": 126749.47,
      "confidence": "high",
      "notes": ""
    }
  ],
  "warnings": []
}

Allowed confidence values: high, medium, low.
Use null for values you cannot confidently read.
`;

      // --------------------------------------
      // 8. SEND IMAGES TO GEMINI
      // --------------------------------------

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",

        contents: [
          ...imageParts,
          { text: prompt },
        ],

        config: {
          responseMimeType: "application/json",
        },
      });

      const geminiText = response.text;

      if (!geminiText) {
        throw new Error("Gemini returned an empty response.");
      }

      // --------------------------------------
      // 9. PARSE GEMINI JSON RESPONSE
      // --------------------------------------

      let result;

      try {
        result = JSON.parse(geminiText);
      } catch (error) {
        console.error("Invalid Gemini response:", geminiText);

        throw new Error("Gemini did not return valid JSON.");
      }

      if (!Array.isArray(result.readings)) {
        throw new Error(
          "Gemini response is missing the readings array."
        );
      }

      // --------------------------------------
      // 10. CALCULATE READING DIFFERENCES
      // --------------------------------------

      const differences = [];

      const yesterdayReadings = result.readings.filter(
        (reading) =>
          reading.day === "YESTERDAY" &&
          reading.vtot !== null &&
          reading.vtot !== undefined &&
          Number.isFinite(Number(reading.vtot))
      );

      const todayReadings = result.readings.filter(
        (reading) =>
          reading.day === "TODAY" &&
          reading.vtot !== null &&
          reading.vtot !== undefined &&
          Number.isFinite(Number(reading.vtot))
      );

      for (const yesterday of yesterdayReadings) {
        const today = todayReadings.find(
          (reading) =>
            reading.duSerial === yesterday.duSerial &&
            Number(reading.nozzleNumber) ===
              Number(yesterday.nozzleNumber)
        );

        if (today) {
          const yesterdayVtot = Number(yesterday.vtot);
          const todayVtot = Number(today.vtot);

          differences.push({
            duSerial: yesterday.duSerial,

            nozzleNumber: Number(yesterday.nozzleNumber),

            product:
              yesterday.product || today.product || null,

            yesterdayVtot,

            todayVtot,

            difference: Number(
              (todayVtot - yesterdayVtot).toFixed(2)
            ),
          });
        }
      }

      // --------------------------------------
      // 11. SEND FINAL RESPONSE
      // --------------------------------------

      return res.status(200).json({
        success: true,
        readings: result.readings,
        differences,
        warnings: result.warnings || [],
      });

    } catch (error) {
      console.error("Receipt analysis error:", error);

      return res.status(500).json({
        success: false,
        error:
          error.message || "Unable to analyze receipt images.",
      });
    }
  }
);

// --------------------------------------
// 12. GLOBAL ERROR HANDLER
// --------------------------------------

app.use((error, req, res, next) => {
  console.error("Server error:", error);

  if (res.headersSent) {
    return next(error);
  }

  return res.status(400).json({
    success: false,
    error: error.message || "An unexpected server error occurred.",
  });
});

// --------------------------------------
// 13. START SERVER
// --------------------------------------

app.listen(PORT, "0.0.0.0", () => {
  console.log(`AARUSH Gemini AI server running on port ${PORT}`);
});
