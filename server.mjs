
import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is missing from environment variables.");
}

const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
});

// Try the configured models first, followed by another supported model.
const MODELS_TO_TRY = [
  process.env.GEMINI_MODEL || "gemini-3.8-flash",
  process.env.GEMINI_FALLBACK_MODEL || "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
].filter((model, index, models) => models.indexOf(model) === index);

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://aarush-fuel-station.web.app",
  "https://aarush-fuel-station.firebaseapp.com",
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS."));
    },
    methods: ["GET", "POST", "OPTIONS"],
  })
);

// --------------------------------------------------
// IMAGE UPLOAD CONFIGURATION
// --------------------------------------------------

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 12,
  },
  fileFilter(req, file, callback) {
    if (file.mimetype.startsWith("image/")) {
      callback(null, true);
    } else {
      callback(new Error("Only image files are allowed."));
    }
  },
});

// --------------------------------------------------
// HEALTH CHECK
// --------------------------------------------------

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "AARUSH Gemini AI server is running.",
    models: MODELS_TO_TRY,
  });
});

// --------------------------------------------------
// ERROR HELPERS
// --------------------------------------------------

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTemporaryError(error) {
  const message = String(
    error?.message || error || ""
  ).toLowerCase();

  const status = String(
    error?.status || error?.code || ""
  ).toLowerCase();

  return (
    status.includes("503") ||
    status.includes("429") ||
    status.includes("500") ||
    status.includes("unavailable") ||
    status.includes("resource_exhausted") ||
    message.includes("503") ||
    message.includes("429") ||
    message.includes("500") ||
    message.includes("unavailable") ||
    message.includes("high demand") ||
    message.includes("overloaded") ||
    message.includes("resource exhausted") ||
    message.includes("rate limit") ||
    message.includes("internal")
  );
}

// --------------------------------------------------
// GEMINI REQUEST WITH RETRIES
// --------------------------------------------------

async function generateWithRetry(model, contents) {
  const maxAttempts = 2;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(
        `Trying model ${model}, attempt ${attempt}/${maxAttempts}`
      );

      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
          maxOutputTokens: 8192,
        },
      });

      const responseText = response.text;

      if (!responseText) {
        throw new Error("Gemini returned an empty response.");
      }

      console.log(`Gemini success using ${model}`);

      return responseText;

    } catch (error) {
      lastError = error;

      console.error(
        `Model ${model}, attempt ${attempt} failed:`,
        error?.message || error
      );

      if (!isTemporaryError(error)) {
        throw error;
      }

      if (attempt < maxAttempts) {
        const delay = 3000 * attempt;

        console.log(`Waiting ${delay}ms before retry...`);

        await wait(delay);
      }
    }
  }

  throw lastError;
}

// --------------------------------------------------
// TRY PRIMARY AND FALLBACK MODELS
// --------------------------------------------------

async function generateReceiptAnalysis(contents) {
  let lastError;

  for (const model of MODELS_TO_TRY) {
    try {
      console.log(`Starting analysis using ${model}`);

      return await generateWithRetry(model, contents);

    } catch (error) {
      lastError = error;

      console.error(
        `Model ${model} failed. Trying the next model.`,
        error?.message || error
      );
    }
  }

  console.error(
    "All configured Gemini models failed:",
    lastError?.message || lastError
  );

  const finalError = new Error(
    "Gemini AI is temporarily busy. Please wait 30–60 seconds and try again."
  );

  finalError.statusCode = 503;

  throw finalError;
}

// --------------------------------------------------
// RECEIPT ANALYSIS API
// --------------------------------------------------

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

      if (
        yesterdayImages.length === 0 ||
        todayImages.length === 0
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Upload at least one yesterday image and one today image.",
        });
      }

      console.log(
        `Received ${yesterdayImages.length} yesterday images and ${todayImages.length} today images.`
      );

      // Prepare image data for Gemini.
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

      // Receipt-reading instructions.
      const prompt = `
You are the receipt-reading assistant for AARUSH petrol bunk.

Analyze ALL supplied receipt images together.

Extract these details from every receipt:

1. Date printed on the receipt.
2. DU SERIAL NO.
3. Nozzle number.
4. Product if visible.
5. Vtot value for that nozzle.

IMPORTANT RULES:

- Use the assigned image day (YESTERDAY or TODAY).
- DU SERIAL NO. identifies the dispensing unit/pump.
- Match readings using the same DU serial number and nozzle number.
- Read Vtot, NOT Atot.
- Do not confuse Vtot with Atot.
- Each receipt can contain multiple nozzle readings.
- Extract every nozzle reading separately.
- Preserve decimal values exactly.
- Never guess missing or unclear digits.
- Use null for unclear values and explain in notes.
- Do not treat a receipt total as an individual nozzle reading.
- Avoid duplicate readings when photos show the same receipt.
- Return valid JSON only.

Pump mapping:

Pump 1 DU serial: M2519363
Pump 2 DU serial: M2519364

Nozzle mapping:

Nozzle 1: HSD
Nozzle 2: MS

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

Do not invent readings. Include all clearly readable readings from the supplied images.
`;

      const contents = [
        ...imageParts,
        { text: prompt },
      ];

      // Run Gemini with retries and fallback models.
      const geminiText =
        await generateReceiptAnalysis(contents);

      // Parse Gemini response.
      let result;

      try {
        const cleanedText = geminiText
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();

        result = JSON.parse(cleanedText);

      } catch (error) {
        console.error("Invalid Gemini JSON response:", geminiText);

        throw new Error(
          "Gemini returned an invalid receipt analysis. Please try again."
        );
      }

      if (!Array.isArray(result.readings)) {
        throw new Error(
          "Gemini response is missing the readings array."
        );
      }

      // --------------------------------------------------
      // CALCULATE DIFFERENCES
      // --------------------------------------------------

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
              yesterday.product ||
              today.product ||
              null,

            yesterdayVtot,
            todayVtot,

            difference: Number(
              (todayVtot - yesterdayVtot).toFixed(2)
            ),
          });
        }
      }

      console.log(
        `Analysis completed. ${result.readings.length} readings extracted.`
      );

      return res.status(200).json({
        success: true,
        readings: result.readings,
        differences,
        warnings: result.warnings || [],
      });

    } catch (error) {
      console.error(
        "Receipt analysis error:",
        error?.message || error
      );

      const statusCode =
        error.statusCode ||
        (isTemporaryError(error) ? 503 : 500);

      return res.status(statusCode).json({
        success: false,
        error:
          error.message ||
          "Unable to analyze receipt images.",
      });
    }
  }
);

// --------------------------------------------------
// GLOBAL ERROR HANDLER
// --------------------------------------------------

app.use((error, req, res, next) => {
  console.error("Server error:", error?.message || error);

  if (res.headersSent) {
    return next(error);
  }

  const statusCode =
    error instanceof multer.MulterError ? 400 : 400;

  return res.status(statusCode).json({
    success: false,
    error:
      error.message ||
      "An unexpected server error occurred.",
  });
});

// --------------------------------------------------
// START SERVER
// --------------------------------------------------

app.listen(PORT, "0.0.0.0", () => {
  console.log("--------------------------------");
  console.log("AARUSH Gemini AI server started");
  console.log("Port:", PORT);
  console.log("Models to try:", MODELS_TO_TRY.join(", "));
  console.log("--------------------------------");
});
