from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import math
out=Path(__file__).resolve().parents[1]/'images'/'depth'; out.mkdir(parents=True, exist_ok=True); W,H=900,600
font='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def text(d,t,size,y=300):
 f=ImageFont.truetype(font,size);d.text((450,y),t,font=f,anchor='mm',fill=245,stroke_width=0)
def ellipse(d,box,fill):d.ellipse(box,fill=fill)
for kind in ['sphere','torus','heart','rings','spiral','mountain','star','wave','69420','smiley','troll','rage','deal','cat','alien','jenga']:
 im=Image.new('L',(W,H),0);d=ImageDraw.Draw(im)
 if kind in ['sphere','torus','wave']:
  pix=im.load()
  for y in range(H):
   for x in range(W):
    dx,dy=x-450,y-300;r=math.hypot(dx,dy)
    if kind=='sphere':v=math.sqrt(max(0,1-(r/235)**2))
    elif kind=='torus':v=math.sqrt(max(0,1-((r-168)/70)**2))
    else:v=(.5+.5*math.sin(x/60+y/110))*max(0,1-((x-450)/400)**8)*max(0,1-((y-300)/240)**8)
    pix[x,y]=round(245*max(0,v))
 elif kind=='rings':
  for i in range(5):d.ellipse((205+i*43,55+i*43,695-i*43,545-i*43),fill=60+i*45)
 elif kind=='heart':
  pts=[]
  for i in range(500):
   t=i*2*math.pi/500;pts.append((450+14*16*math.sin(t)**3,300-14*(13*math.cos(t)-5*math.cos(2*t)-2*math.cos(3*t)-math.cos(4*t))))
  d.polygon(pts,fill=240)
 elif kind=='spiral':
  pts=[]
  for i in range(800):
   t=i/50;r=10+13*t;pts.append((450+r*math.cos(t),300+r*math.sin(t)))
  d.line(pts,fill=235,width=23)
 elif kind=='star':
  pts=[(450+(240 if i%2==0 else 100)*math.cos(-math.pi/2+i*math.pi/5),300+(240 if i%2==0 else 100)*math.sin(-math.pi/2+i*math.pi/5)) for i in range(10)]
  d.polygon(pts,fill=235)
 elif kind=='mountain':
  for pts,fill in [([(60,520),(280,120),(540,520)],90), ([(300,520),(560,65),(850,520)],170), ([(500,170),(560,65),(628,170),(590,150),(560,180),(530,150)],245)]:d.polygon(pts,fill=fill)
 elif kind in ['69420','jenga']:text(d,'69420' if kind=='69420' else 'JENGA',205 if kind=='69420' else 190)
 elif kind in ['smiley','deal','rage','troll']:
  if kind=='troll':
   d.polygon([(210,175),(300,85),(575,105),(700,205),(665,415),(530,500),(285,455),(180,330)],fill=200)
   d.arc((245,165,425,280),180,340,fill=0,width=18);d.arc((475,170,635,290),180,340,fill=0,width=18)
   d.line([(430,220),(405,310),(480,315)],fill=0,width=15)
   d.polygon([(240,300),(325,345),(535,350),(650,280),(620,395),(530,440),(350,425),(270,365)],fill=0)
   d.polygon([(260,320),(330,360),(535,365),(630,305),(605,378),(530,410),(350,395),(285,350)],fill=250)
   for x in range(310,620,42):d.line([(x,340),(x+5,410)],fill=0,width=6)
  else:
   d.ellipse((205,55,695,545),fill=220)
   if kind=='deal':
    d.rectangle((230,195,430,280),fill=0);d.rectangle((470,195,670,280),fill=0);d.line((410,215,490,215),fill=0,width=20)
    d.line((260,210,320,260),fill=250,width=10);d.line((500,210,560,260),fill=250,width=10)
   elif kind=='rage':
    d.line([(290,170),(390,225),(315,265)],fill=0,width=20);d.line([(610,170),(510,225),(585,265)],fill=0,width=20)
   else:
    d.ellipse((315,175,365,260),fill=0);d.ellipse((535,175,585,260),fill=0)
   if kind=='rage':d.rectangle((315,330,585,430),fill=0);d.rectangle((330,343,570,365),fill=250)
   else:d.arc((290,230,610,440),0,180,fill=0,width=22)
 elif kind=='cat':
  d.polygon([(250,360),(230,100),(365,180),(535,180),(670,100),(650,360),(560,445),(340,445)],fill=210)
  d.ellipse((320,245,370,290),fill=0);d.ellipse((530,245,580,290),fill=0);d.polygon([(425,310),(475,310),(450,340)],fill=0)
  d.rectangle((190,435,710,530),fill=160)
  for x in range(210,700,50):d.rectangle((x,445,x+35,500),fill=245)
 elif kind=='alien':
  grid=['00100000100','00010001000','00111111100','01101110110','11111111111','10111111101','10100000101','00011011000']
  for y,row in enumerate(grid):
   for x,c in enumerate(row):
    if c=='1':d.rectangle((175+x*50,100+y*50,219+x*50,144+y*50),fill=240)
 im.convert('RGB').save(out/f'{kind}.png',optimize=True)
