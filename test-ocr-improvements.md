# OCR Improvements Test Guide

## ✅ Implementation Complete

The following OCR improvements have been implemented and deployed:

### 1. **Multipart Support** ✅
- OCR client now always sends `multipart/form-data` with a `file` field
- Added `processBytesWithOCR()` function for direct byte processing
- Handles varied JSON response shapes: `{ text }`, `{ result: { text } }`, `{ data: { text } }`

### 2. **Instrumentation** ✅
- Upload route now tracks timing and OCR source
- Response headers include:
  - `X-OCR-Source`: `external`, `local`, or `none`
  - `X-OCR-Duration`: Processing time in milliseconds
- Console logging: `[upload] file=filename.pdf len=1234 src=external ms=1500`

### 3. **Local Fallback** ✅
- Created `/api/ocr` route for local PDF processing
- Disabled body parsing to handle binary data
- Falls back when external OCR fails

## 🧪 Testing Instructions

### Test 1: Direct External OCR
```bash
curl -s -X POST https://ocr-server-2-ykmk.onrender.com/upload \
  -F "file=@/path/to/test.pdf" | jq '.text | (.|type), (.|length)'
```

### Test 2: App Upload Route
```bash
curl -s -X POST https://your-domain.vercel.app/api/ask-ai/upload \
  -F "file=@/path/to/test.pdf" -i | sed -n '1,15p'
```

**Look for:**
- `X-OCR-Source: external` (or `local`)
- `X-OCR-Duration: [number]`
- Response body with `success: true` and `textLength > 50`

### Test 3: Browser Network Tab
1. Upload a PDF through the UI
2. Check Network tab for `/api/ask-ai/upload` request
3. Verify response headers show OCR source and duration
4. Confirm response includes raw extracted text

## 🔧 Environment Variables

Ensure these are set in Vercel:
- `OCR_SERVICE_URL`: Your OCR server endpoint
- `OCR_TOKEN`: Authentication token (if required)

## 📊 Expected Results

**Success Case:**
```json
{
  "success": true,
  "filename": "test.pdf",
  "ocrSource": "external",
  "textLength": 1234,
  "text": "extracted text content...",
  "extractedText": "extracted text content..."
}
```

**Headers:**
```
X-OCR-Source: external
X-OCR-Duration: 1500
```

**Console Log:**
```
[upload] file=test.pdf len=1234 src=external ms=1500
```

## 🚨 Troubleshooting

### If OCR Source is "none":
1. Check external OCR service is accessible
2. Verify environment variables are set
3. Check network connectivity to OCR server

### If Text Length is 0:
1. PDF may be image-based (no text layer)
2. OCR service may be experiencing issues
3. Check OCR service logs

### If Headers Missing:
1. Ensure you're hitting the updated route
2. Check for any middleware interference
3. Verify deployment completed successfully

## 🎯 Next Steps

1. **Test with real PDFs** to verify text extraction quality
2. **Monitor console logs** for timing and source information
3. **Implement local OCR** with actual PDF processing library
4. **Add retry logic** for failed OCR attempts
5. **Set up monitoring** for OCR success rates and performance
