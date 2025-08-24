from PIL import Image
import cv2, numpy as np, pytesseract

def preprocess(img: Image.Image, mode: str = 'adaptive') -> Image.Image:
    arr = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2GRAY)
    if mode == 'adaptive':
        arr = cv2.adaptiveThreshold(arr, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                    cv2.THRESH_BINARY, 35, 15)
    else:
        arr = cv2.threshold(arr, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
    return Image.fromarray(arr)

def ocr_page(img: Image.Image, psm: int = 6):
    cfg = f'--oem 1 --psm {psm}'
    data = pytesseract.image_to_data(img, config=cfg, output_type=pytesseract.Output.DICT)
    text = "\n".join([w for w in data['text'] if w.strip()])
    confs = [int(c) for c in data['conf'] if c.isdigit()]
    conf = (sum(confs)/len(confs))/100.0 if confs else 0.0
    return text, conf
