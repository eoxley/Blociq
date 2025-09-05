import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import ocrRouter from "./routes/ocr";

const app = express();

// Enable CORS for all routes
app.use(cors());

// JSON bodies (Vercel → Render proxy sends small JSON only)
app.use(bodyParser.json({ limit: "50mb" }));

// Global health check
app.get("/health", (_req, res) => {
  console.log('🏥 Global health check');
  res.json({ 
    ok: true, 
    service: 'BlocIQ Render OCR Service',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Register OCR routes
app.use(ocrRouter);

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('🚨 Global error handler:', error);
  res.status(500).json({
    success: false,
    detail: 'Internal server error'
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    detail: 'Not Found'
  });
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`🚀 OCR server listening on port ${port}`);
  console.log(`📍 Service URL: http://localhost:${port}`);
  console.log('🔧 Available endpoints:');
  console.log('  GET  /health - Global health check');  
  console.log('  GET  /ocr/health - OCR service health check');
  console.log('  POST /ocr/process - Main OCR processing endpoint');
  
  // Log environment status
  const envStatus = {
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasRenderToken: !!process.env.RENDER_OCR_TOKEN,
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    hasDocAI: !!process.env.DOCUMENT_AI_PROCESSOR_ID,
    storageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'building_documents (default)'
  };
  
  console.log('⚙️ Environment status:', envStatus);
});