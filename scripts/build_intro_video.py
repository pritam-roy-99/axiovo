#!/usr/bin/env python3
"""Build a self-hosted Axiovo explainer, captions and poster.

The storyboard is a product walkthrough, not a recording of the live UI.
Audio narration uses espeak-ng/espeak when installed; captions are always made.
Requires Pillow and ffmpeg. No external video generation API or paid credits.
"""
from __future__ import annotations
import array
import shutil
import subprocess
import tempfile
import wave
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "assets"
WIDTH, HEIGHT, FPS = 960, 540, 12
SECONDS = 9
SCENES = [
 ("Welcome to Axiovo", "Explore three independent preprint archives.",
  "Welcome to Axiovo. Choose between arXiv, bioRxiv and ChemRxiv to explore scientific preprints."),
 ("Start with an archive", "arXiv, bioRxiv and ChemRxiv.",
  "The home page presents three equal choices. Each opens its own archive discovery page."),
 ("Discover arXiv", "Browse physics, mathematics, computing and more.",
  "Explore the full arXiv subject taxonomy, select an official category and search research papers."),
 ("Discover bioRxiv", "Browse life-science subject areas.",
  "Choose a biological subject, refine your query and inspect verified preprint records."),
 ("Discover ChemRxiv", "Find chemistry and materials preprints.",
  "Choose chemistry research areas, search by topic and follow source linked DOI records."),
 ("Customize research interests", "Add and remove specialized subtopics.",
  "Each archive lets you customize research interests and filter by subfield."),
 ("Save your research", "Collect papers and add private notes.",
  "Save papers to My Library and organize research collections on your own device."),
 ("Continue with Axiovo", "Research Assistant and reading tools.",
  "Use Research Assistant and research tools to explore source linked evidence and organize reading.")
]
BG=(8,27,47); SURFACE=(14,43,67); SURFACE2=(22,59,85)
WHITE=(242,249,254); MUTED=(161,193,211); BLUE=(38,135,206)
CYAN=(67,207,223); BORDER=(43,96,126)

def font(size, bold=False):
    name="DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    path="/usr/share/fonts/truetype/dejavu/"+name
    return ImageFont.truetype(path,size)

F10=font(10); F12=font(12); F14=font(14)
F18=font(18,True); F26=font(26,True); F32=font(32,True)

def card(d,box,fill=SURFACE,r=14):
    d.rounded_rectangle(box,radius=r,fill=fill,outline=BORDER,width=2)

def label(d,x,y,s,f=F14,col=WHITE):
    d.text((x,y),s,font=f,fill=col)

def clip(s,length=45):
    return s[:length-1]+"…" if len(s)>length else s

def pill(d,x,y,s):
    w=int(d.textbbox((0,0),s,font=F12)[2])+22
    d.rounded_rectangle((x,y,x+w,y+28),radius=14,fill=(25,80,111))
    label(d,x+11,y+6,s,F12,CYAN)
    return w

def paper(d,x,y,title,extra,width=397):
    card(d,(x,y,x+width,y+89),SURFACE2,10)
    label(d,x+14,y+13,clip(title,38),F14,WHITE)
    label(d,x+14,y+40,clip(extra,46),F12,MUTED)
    label(d,x+14,y+66,"Read original source  ↗",F10,CYAN)

def base(n):
    title,subtitle,_=SCENES[n]
    im=Image.new("RGB",(WIDTH,HEIGHT),BG);d=ImageDraw.Draw(im)
    card(d,(14,12,946,527),(9,33,55),22)
    card(d,(31,25,64,58),BLUE,9)
    label(d,42,31,"A",F18)
    label(d,78,31,"Axiovo",F18)
    label(d,785,34,"OPEN RESEARCH",F12,MUTED)
    d.line((32,72,928,72),fill=BORDER,width=1)
    pill(d,37,92,f"GUIDED TOUR  ·  {n+1} / {len(SCENES)}")
    label(d,38,139,title,F32,WHITE)
    label(d,40,185,subtitle,F14,MUTED)
    return im,d

def frame(n):
    im,d=base(n)
    card(d,(35,224,925,462))
    if n==0:
        card(d,(54,261,461,412),SURFACE2,14)
        card(d,(489,261,896,412),SURFACE2,14)
        label(d,81,289,"AXIO",F32,CYAN)
        label(d,82,348,"Axiom: foundations",F18,WHITE)
        label(d,515,289,"NOVO",F32,CYAN)
        label(d,517,348,"New discovery",F18,WHITE)
    elif n==1:
        x=55
        for word in ("quant-ph","cs.IT","physics.optics"):
            x+=pill(d,x,244,word)+12
        paper(d,55,294,"Measurement incompatibility in networks","Recent arXiv metadata")
        paper(d,474,294,"Secure protocols under noise","New submissions and updates")
        label(d,57,420,"Coverage is selected categories; source freshness can vary.",F12,MUTED)
    elif n==2:
        label(d,56,246,"Research field",F12,MUTED)
        card(d,(56,275,437,320),SURFACE2,9)
        label(d,69,286,"Quantum information & physics",F14,WHITE)
        label(d,470,246,"Search",F12,MUTED)
        card(d,(470,275,901,320),SURFACE2,9)
        label(d,483,286,"Contextuality and quantum networks",F14,WHITE)
        paper(d,56,343,"Device-independent cryptography","Live research search")
        paper(d,474,343,"Network steering witnesses","Results stay on Axiovo")
    elif n==3:
        x=55
        for word in ("Steering","Contextuality","Quantum sensing"):
            x+=pill(d,x,250,word)+12
        paper(d,55,307,"Steering-based certification in networks","Why this paper appeared: matches Steering",width=839)
        label(d,56,428,"Keyword relevance is not scientific novelty verification.",F12,MUTED)
    elif n==4:
        for i,head in enumerate(("To read","Reading","Finished")):
            x=55+i*288
            card(d,(x,248,x+269,438),SURFACE2,14)
            pill(d,x+15,265,head)
            card(d,(x+15,314,x+251,393),(22,77,104),10)
            label(d,x+26,329,("A new paper","A useful proof","Reviewed work")[i],F14)
            label(d,x+26,360,("Save for later","Check Eq. 8","Archived in library")[i],F12,MUTED)
    elif n==5:
        card(d,(56,242,577,444),SURFACE2,12)
        card(d,(74,257,383,429),(232,241,248),8)
        for i in range(6):
            d.rounded_rectangle((92,277+i*22,355-(i%3)*31,282+i*22),radius=2,fill=(130,160,183))
        label(d,403,271,"Page notes",F18)
        label(d,403,318,"Check assumption",F12,MUTED)
        label(d,403,340,"before Theorem 2.",F12,MUTED)
        card(d,(601,242,900,444),SURFACE2,12)
        label(d,620,265,"Compare papers",F18)
        paper(d,619,304,"Paper A","Methods & assumptions",width=258)
    elif n==6:
        card(d,(56,245,895,438),SURFACE2,12)
        label(d,77,262,"My research question",F18)
        card(d,(78,305,610,351),SURFACE,9)
        label(d,93,318,"What enables secure quantum networks?",F14)
        pill(d,77,376,"Keywords: quantum networks, steering")
        card(d,(641,305,866,401),SURFACE,10)
        label(d,657,323,"Related papers",F14)
        label(d,657,352,"Source-linked results",F12,CYAN)
    else:
        card(d,(65,255,143,334),BLUE,15)
        label(d,89,268,"A",F32)
        label(d,175,267,"Axiovo",F32)
        label(d,177,314,"Open source tools for researchers",F14,MUTED)
        pill(d,177,373,"Start exploring")
        label(d,365,382,"Discover  >  My workspace  >  Research tools",F12,CYAN)
    return im

def timestamp(s):
    milliseconds=int(round(s*1000))
    return f"{milliseconds//3600000:02}:{milliseconds//60000%60:02}:{milliseconds//1000%60:02}.{milliseconds%1000:03}"

def narration(folder):
    speaker=shutil.which("espeak-ng") or shutil.which("espeak")
    if not speaker:return None
    rate=22050;arr=array.array("h",[0])*(len(SCENES)*SECONDS*rate)
    for i,(_,_,words) in enumerate(SCENES):
        f=Path(folder)/f"scene{i}.wav"
        subprocess.run([speaker,"-v","en-us","-s","158","-a","115","-w",str(f),words],stdout=subprocess.DEVNULL,check=True)
        with wave.open(str(f),"rb") as wav:
            if (wav.getnchannels(),wav.getsampwidth(),wav.getframerate())!=(1,2,rate):raise RuntimeError("Unexpected voice audio format")
            samples=array.array("h");samples.frombytes(wav.readframes(wav.getnframes()))
        start=int((i*SECONDS+.5)*rate)
        end=int(((i+1)*SECONDS-.1)*rate)
        for j,v in enumerate(samples[:max(0,end-start)]):arr[start+j]=v
    path=Path(folder)/"narration.wav"
    with wave.open(str(path),"wb") as wav:
        wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(rate);wav.writeframes(arr.tobytes())
    return path

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    images=[frame(i) for i in range(len(SCENES))]
    images[0].save(OUT/"axiovo-tour-poster.jpg",quality=87,optimize=True)
    captions=["WEBVTT",""]
    for i,(_,_,sentence) in enumerate(SCENES):
        captions.extend([timestamp(i*SECONDS)+" --> "+timestamp((i+1)*SECONDS-.1),sentence,""])
    (OUT/"axiovo-tour.vtt").write_text("\n".join(captions),encoding="utf-8")
    with tempfile.TemporaryDirectory() as folder:
        audio=narration(folder)
        cmd=["ffmpeg","-y","-hide_banner","-loglevel","error","-f","rawvideo","-pix_fmt","rgb24","-s","960x540","-r",str(FPS),"-i","-"]
        if audio:cmd+=["-i",str(audio)]
        cmd+=["-c:v","libx264","-preset","veryfast","-crf","28","-pix_fmt","yuv420p","-movflags","+faststart"]
        if audio:cmd+=["-c:a","aac","-b:a","64k","-shortest"]
        cmd.append(str(OUT/"axiovo-tour.mp4"))
        proc=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=subprocess.PIPE)
        for i in range(len(images)):
            for t in range(FPS*SECONDS):
                im=images[i]
                if i>0 and t<6:im=Image.blend(images[i-1],images[i],t/6)
                else:im=im.copy()
                draw=ImageDraw.Draw(im)
                draw.rounded_rectangle((34,486,34+int(891*(i+t/(FPS*SECONDS))/len(images)),492),radius=3,fill=CYAN)
                label(draw,36,505,"Axiovo · open research discovery",F10,MUTED)
                proc.stdin.write(im.tobytes())
        proc.stdin.close();error=proc.stderr.read().decode(errors="replace")
        if proc.wait():raise RuntimeError("Video encoding failed: "+error[-1000:])
    assert (OUT/"axiovo-tour.mp4").stat().st_size>10000
    print("Axiovo MP4, poster and captions created")

if __name__=="__main__":main()
