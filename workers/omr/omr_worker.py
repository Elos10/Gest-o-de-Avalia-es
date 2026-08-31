"""Deterministic OpenCV worker. JSON on stdout; diagnostics on stderr."""
from __future__ import annotations
import argparse,json,sys
from pathlib import Path
import cv2,numpy as np
try: import fitz
except ImportError: fitz=None

PX_PER_MM=10; W=1285; H=1900
MARKERS=np.float32([[130,130],[1355,130],[1355,1970],[130,1970]])
TARGET=np.float32([[30,30],[1255,30],[1255,1870],[30,1870]])

class PageLayoutDetector:
    def load(self,path:Path)->list[np.ndarray]:
        if path.suffix.lower()=='.pdf':
            if fitz is None: raise RuntimeError('PyMuPDF não instalado')
            doc=fitz.open(path); result=[]
            for page in doc:
                pix=page.get_pixmap(dpi=300,alpha=False)
                result.append(cv2.cvtColor(np.frombuffer(pix.samples,np.uint8).reshape(pix.height,pix.width,pix.n),cv2.COLOR_RGB2BGR))
            return result
        image=cv2.imread(str(path));
        if image is None: raise RuntimeError('Imagem ilegível')
        return [image]
    def candidates(self,image:np.ndarray)->list[np.ndarray]:
        h,w=image.shape[:2]
        if w/h>1.15: return [image[:,:w//2],image[:,w//2:]]
        return [image]
    def normalize(self,image:np.ndarray)->tuple[np.ndarray,float]:
        gray=cv2.cvtColor(image,cv2.COLOR_BGR2GRAY); blur=cv2.GaussianBlur(gray,(5,5),0); th=cv2.threshold(blur,0,255,cv2.THRESH_BINARY_INV+cv2.THRESH_OTSU)[1]
        contours,_=cv2.findContours(th,cv2.RETR_LIST,cv2.CHAIN_APPROX_SIMPLE); pts=[]
        area=image.shape[0]*image.shape[1]
        for c in contours:
            a=cv2.contourArea(c); x,y,w,h=cv2.boundingRect(c)
            if area*.00015<a<area*.01 and .72<w/max(h,1)<1.28 and a/(w*h)>.65:
                pts.append((x+w/2,y+h/2,a))
        if len(pts)<4: raise RuntimeError('LAYOUT_MARKERS_NOT_FOUND')
        corners=np.float32([[0,0],[image.shape[1],0],[image.shape[1],image.shape[0]],[0,image.shape[0]]]); selected=[]
        for c in corners:selected.append(min(pts,key=lambda p:(p[0]-c[0])**2+(p[1]-c[1])**2)[:2])
        src=np.float32(selected); matrix=cv2.getPerspectiveTransform(src,TARGET); normalized=cv2.warpPerspective(image,matrix,(W,H));
        spread=np.mean([np.linalg.norm(src[i]-corners[i]) for i in range(4)])/max(image.shape[:2]); return normalized,float(max(0,1-spread))

def decode_qr(image:np.ndarray)->dict|None:
    data,_,_=cv2.QRCodeDetector().detectAndDecode(image)
    if not data:return None
    try:return json.loads(data)
    except Exception:return None

def fills(image:np.ndarray,count=20):
    gray=cv2.cvtColor(image,cv2.COLOR_BGR2GRAY); binary=cv2.adaptiveThreshold(gray,255,cv2.ADAPTIVE_THRESH_GAUSSIAN_C,cv2.THRESH_BINARY_INV,31,8)
    answers=[]
    for q in range(count):
        y=int((78-10+q*4.6)*PX_PER_MM); values=[]
        for j,ch in enumerate('ABCDE'):
            x=int((34-10+j*14)*PX_PER_MM); r=14; roi=binary[y-r:y+r+1,x-r:x+r+1]; yy,xx=np.ogrid[-r:r+1,-r:r+1]; mask=(xx*xx+yy*yy)<=r*r; values.append({'choice':ch,'fill':round(float(np.mean(roi[mask]>0)),4)})
        answers.append({'question':q+1,'fills':values})
    return answers

def main():
    p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--template',required=True);args=p.parse_args(); detector=PageLayoutDetector(); best=None
    for page in detector.load(Path(args.input)):
        for candidate in detector.candidates(page):
            try:
                normalized,quality=detector.normalize(candidate);code=decode_qr(normalized)
                if best is None or quality>best[1]:best=(normalized,quality,code)
            except RuntimeError as e:print(str(e),file=sys.stderr)
    if best is None:raise RuntimeError('NO_ANSWER_SHEET_FOUND')
    image,quality,payload=best;print(json.dumps({'qrPayload':payload,'quality':{'alignment':round(quality,4)},'answers':fills(image)}))
if __name__=='__main__':
    try:main()
    except Exception as e:print(str(e),file=sys.stderr);sys.exit(2)
