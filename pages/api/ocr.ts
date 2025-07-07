// pages/api/ocr.ts
import type { NextApiRequest, NextApiResponse } from "next";
import vision from "@google-cloud/vision";

const client = new vision.ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { fileUrl } = req.body;

  if (!fileUrl) {
    return res.status(400).json({ error: "Missing file URL" });
  }

  try {
    const [result] = await client.documentTextDetection(fileUrl);
    const text = result.fullTextAnnotation?.text;

    if (!text || text.trim().length === 0) {
      return res.status(422).json({ error: "OCR found no readable text." });
    }

    return res.status(200).json({ text });
  } catch (err: any) {
    console.error("❌ OCR error:", err.message);
    return res.status(500).json({
      error: "Google Vision OCR failed",
      details: err.message,
    });
  }
}
