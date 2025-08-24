from supabase import create_client
from pdf2image import convert_from_path
from pdfminer.high_level import extract_text
from ocr_utils import preprocess, ocr_page
import os, time

supabase = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_SERVICE_ROLE_KEY'])

while True:
  docs = supabase.table('documents').select('*').eq('processing_status','queued').limit(1).execute().data
  if not docs: 
    time.sleep(3); continue
  doc = docs[0]; doc_id = doc['id']
  supabase.table('documents').update({'processing_status':'extracting'}).eq('id',doc_id).execute()

  # download file
  pdf_bytes = supabase.storage.from_('building_documents').download(doc['file_path'])
  with open(f'/tmp/{doc_id}.pdf','wb') as f: f.write(pdf_bytes)

  # try text layer
  text = extract_text(f'/tmp/{doc_id}.pdf')
  if text and len(text) > 2000:
    supabase.table('document_chunks').insert({
      'document_id': doc_id,
      'page_from':1, 'page_to':None,
      'text':text, 'confidence':1.0,
      'source':'text-layer'
    }).execute()
    supabase.table('documents').update({'processing_status':'complete','confidence_avg':1.0}).eq('id',doc_id).execute()
    continue

  # OCR pages
  images = convert_from_path(f'/tmp/{doc_id}.pdf', dpi=300)
  confs=[]; texts=[]
  for i,img in enumerate(images,1):
    p = preprocess(img)
    t,c = ocr_page(p)
    supabase.table('document_pages').upsert({
      'document_id':doc_id,'page_number':i,
      'text':t,'confidence':c,
      'ocr_engine':'tesseract','status':'ok' if c>=0.55 else 'low'
    }).execute()
    texts.append(t); confs.append(c)

  avg = sum(confs)/len(confs)
  supabase.table('documents').update({'processing_status':'complete','confidence_avg':avg}).eq('id',doc_id).execute()
