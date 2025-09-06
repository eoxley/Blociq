import os
import json
import tempfile
from typing import Optional
from pathlib import Path
from datetime import datetime

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Header, Form
from fastapi.middleware.cors import CORSMiddleware
import pytesseract
from PIL import Image
from pdf2image import convert_from_path
import uvicorn

# Try importing Supabase (for storage integration)
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False

# Try importing Google Vision (optional)
try:
    from google.cloud import vision
    GOOGLE_VISION_AVAILABLE = True
except ImportError:
    GOOGLE_VISION_AVAILABLE = False

app = FastAPI(
    title="BlocIQ OCR Service",
    description="Lightweight OCR service for property management platform",
    version="1.0.0"
)

# Get allowed origins from environment variable or use defaults
allowed_origins = os.getenv("ALLOWED_ORIGINS", "").split(",") if os.getenv("ALLOWED_ORIGINS") else [
    "https://www.blociq.co.uk",
    "https://blociq-h3xv-bf7j9j1tw-eleanoroxley-9774s-projects.vercel.app",
    "https://*.vercel.app",
    "http://localhost:3000"
]

# Clean up any empty strings from the list
allowed_origins = [origin.strip() for origin in allowed_origins if origin.strip()]

print(f"CORS configured for origins: {allowed_origins}")

# Add CORS middleware with explicit configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Initialize Google Vision client if credentials are available
vision_client = None
if GOOGLE_VISION_AVAILABLE:
    credentials_json = os.getenv("GOOGLE_CREDENTIALS_JSON")
    if credentials_json:
        try:
            # Parse credentials JSON and create client
            credentials_dict = json.loads(credentials_json)
            # Write credentials to temporary file for Google client
            with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
                json.dump(credentials_dict, f)
                os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = f.name
            vision_client = vision.ImageAnnotatorClient()
            print("Google Vision client initialized successfully")
        except Exception as e:
            print(f"Failed to initialize Google Vision: {e}")

# Initialize Supabase client if available
supabase: Optional[Client] = None
if SUPABASE_AVAILABLE:
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if supabase_url and supabase_key:
        try:
            supabase = create_client(supabase_url, supabase_key)
            print("Supabase client initialized successfully")
        except Exception as e:
            print(f"Failed to initialize Supabase: {e}")
    else:
        print("Supabase credentials not configured")

# Authentication dependency
async def verify_token(authorization: str = Header(None)):
    """Verify Bearer token authentication"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = authorization.split(" ")[1]
    expected_token = os.getenv("RENDER_OCR_TOKEN")
    
    if not expected_token:
        raise HTTPException(status_code=500, detail="RENDER_OCR_TOKEN not configured on server")
    
    if token != expected_token:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    return token

def extract_text_with_tesseract(image_path: str) -> str:
    """Extract text using Tesseract OCR"""
    try:
        image = Image.open(image_path)
        # Configure Tesseract for better accuracy
        custom_config = r'--oem 3 --psm 6'
        text = pytesseract.image_to_string(image, config=custom_config)
        return text.strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Tesseract OCR failed: {str(e)}")

def extract_text_with_google_vision(image_path: str) -> str:
    """Extract text using Google Vision API"""
    if not vision_client:
        raise HTTPException(status_code=500, detail="Google Vision not configured")
    
    try:
        with open(image_path, 'rb') as image_file:
            content = image_file.read()
        
        image = vision.Image(content=content)
        response = vision_client.text_detection(image=image)
        
        if response.error.message:
            raise Exception(f"Google Vision API error: {response.error.message}")
        
        texts = response.text_annotations
        if texts:
            return texts[0].description.strip()
        else:
            return ""
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Google Vision OCR failed: {str(e)}")

def process_pdf(file_path: str, use_google_vision: bool = False) -> tuple[str, str]:
    """Process PDF file and extract text from all pages"""
    try:
        # Convert PDF to images
        images = convert_from_path(file_path, dpi=300)
        extracted_texts = []
        
        for i, image in enumerate(images):
            # Save image temporarily
            with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as temp_img:
                image.save(temp_img.name, 'PNG')
                
                # Extract text from this page
                if use_google_vision and vision_client:
                    page_text = extract_text_with_google_vision(temp_img.name)
                    source = "google-vision"
                else:
                    page_text = extract_text_with_tesseract(temp_img.name)
                    source = "tesseract"
                
                if page_text.strip():
                    extracted_texts.append(f"--- Page {i+1} ---\n{page_text}")
                
                # Clean up temporary image
                os.unlink(temp_img.name)
        
        combined_text = "\n\n".join(extracted_texts)
        return combined_text, source
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF processing failed: {str(e)}")

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "BlocIQ OCR Service is running",
        "tesseract_available": True,
        "google_vision_available": vision_client is not None,
        "supabase_available": supabase is not None,
        "allowed_origins": allowed_origins
    }

@app.get("/health")
async def health_check():
    """Detailed health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "tesseract_available": True,
            "google_vision_available": vision_client is not None,
            "supabase_available": supabase is not None,
            "supabase_imported": SUPABASE_AVAILABLE
        },
        "environment": {
            "google_credentials_configured": bool(os.getenv("GOOGLE_CREDENTIALS_JSON")),
            "supabase_url_configured": bool(os.getenv("NEXT_PUBLIC_SUPABASE_URL")),
            "supabase_key_configured": bool(os.getenv("SUPABASE_SERVICE_ROLE_KEY")),
            "render_token_configured": bool(os.getenv("RENDER_OCR_TOKEN"))
        },
        "allowed_origins": allowed_origins
    }

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(None),
    storage_key: Optional[str] = Form(None),
    filename: Optional[str] = Form(None),
    mime: Optional[str] = Form(None),
    use_google_vision: Optional[bool] = Form(False),
    token: str = Depends(verify_token)
):
    """
    Upload and process a file for OCR
    
    Supports two modes:
    1. Direct file upload (file parameter)
    2. StorageKey flow (storage_key parameter) - for large files from Supabase storage
    
    - **file**: PDF or image file to process (optional if storage_key provided)
    - **storage_key**: Supabase storage key for large files (optional if file provided)
    - **filename**: Original filename (required for storage_key flow)
    - **mime**: MIME type (required for storage_key flow)
    - **use_google_vision**: Use Google Vision API instead of Tesseract
    - **token**: Bearer token for authentication
    """
    
    print(f"Processing request - file: {file.filename if file else None}, storage_key: {storage_key}")
    
    # Determine processing mode
    if storage_key:
        # StorageKey flow - download from Supabase
        if not supabase:
            raise HTTPException(
                status_code=500, 
                detail="Supabase not configured. Cannot process storage_key requests."
            )
        
        if not filename or not mime:
            raise HTTPException(
                status_code=400, 
                detail="filename and mime are required for storage_key flow"
            )
        
        try:
            # Download file from Supabase storage
            bucket_name = os.getenv("SUPABASE_STORAGE_BUCKET", "building_documents")
            response = supabase.storage.from_(bucket_name).download(storage_key)
            
            if not response:
                raise HTTPException(status_code=404, detail=f"File not found in storage: {storage_key}")
            
            # Create temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=Path(filename).suffix) as temp_file:
                temp_file.write(response)
                temp_file_path = temp_file.name
                
            print(f"Downloaded file from storage: {filename} ({len(response)} bytes)")
            
        except Exception as e:
            print(f"Failed to download file from storage: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to download file from storage: {str(e)}")
            
    elif file:
        # Direct file upload flow
        print(f"Processing direct upload: {file.filename}, content_type: {file.content_type}")
        
        # Validate file type
        allowed_types = {
            'application/pdf': ['.pdf'],
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png'],
            'image/tiff': ['.tiff', '.tif'],
            'image/bmp': ['.bmp']
        }
        
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported file type: {file.content_type}. Supported types: {list(allowed_types.keys())}"
            )
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
            
        filename = file.filename
        mime = file.content_type
        
    else:
        raise HTTPException(
            status_code=400, 
            detail="Either file or storage_key must be provided"
        )
    
    # Check if Google Vision is requested but not available
    if use_google_vision and not vision_client:
        print("Google Vision requested but not available, falling back to Tesseract")
        use_google_vision = False
    
    try:
        # Process based on file type
        if mime == 'application/pdf':
            extracted_text, source = process_pdf(temp_file_path, use_google_vision)
        else:
            # Process image file
            if use_google_vision and vision_client:
                extracted_text = extract_text_with_google_vision(temp_file_path)
                source = "google-vision"
            else:
                extracted_text = extract_text_with_tesseract(temp_file_path)
                source = "tesseract"
        
        print(f"OCR completed: {len(extracted_text)} characters extracted using {source}")
        
        return {
            "success": True,
            "text": extracted_text,
            "source": source,
            "filename": filename,
            "content_type": mime,
            "text_length": len(extracted_text),
            "processing_mode": "storage_key" if storage_key else "direct_upload"
        }
        
    except Exception as e:
        print(f"OCR processing failed: {e}")
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")
        
    finally:
        # Clean up temporary file
        if 'temp_file_path' in locals():
            try:
                os.unlink(temp_file_path)
            except:
                pass

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)