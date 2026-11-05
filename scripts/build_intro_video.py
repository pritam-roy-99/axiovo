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
SECONDS = 6
SCENES = [
 ("Welcome to Axiovo", "Discover research through three independent archives.",
  "Axiovo helps you discover research in arXiv, bioRxiv and ChemRxiv. Begin by choosing the archive that fits your work."),
 ("Three independent Discover pages", "Source-specific fields, categories and records.",
  "Each archive has its own Discover page, with its own subject areas and original source links. Papers are not mixed across servers."),
 ("Explore all arXiv fields", "Physics, mathematics, computing and other disciplines.",
  "Browse official arXiv subjects across physics, mathematics, computer science, statistics, finance, engineering, biology and economics."),
 ("Browse life sciences and chemistry", "Independent bioRxiv and ChemRxiv experiences.",
  "Explore bioRxiv subjects such as neuroscience and genomics, or ChemRxiv areas such as catalysis and materials chemistry."),
 ("Refine your research interests", "Topic, field, subfield and custom search refinements.",
  "Select a subject and subfield, or add your own search refinements. These choices are saved in your browser."),
 ("Search original preprints", "Keywords, dates, authors, sort order and source links.",
  "Search paper metadata, filter by dates and authors, and open the original paper. The site reports its available index coverage."),
 ("Organize papers in My Library", "Saved reading lists, projects and private notes.",
  "Save papers locally, organize collections and revisit private notes and research questions."),
 ("Read, compare and analyze", "PDF tools, comparisons and a research assistant.",
  "Use PDF reading tools, compare publication metadata, and explore evidence with the Research Assistant. Local model use is optional."),
 ("Research starts with evidence", "Discover. Verify. Save. Revisit.",
  "Axiovo is an independent open source project. Follow the original evidence and organize your research in one place.")
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
    if n in (0,1):
        for i,(name,rows) in enumerate((
            ("arXiv",("Physics · mathematics","Computing · statistics")),
            ("bioRxiv",("Neuroscience · genomics","Cell biology · ecology")),
            ("ChemRxiv",("Catalysis · materials","Organic · analytical")))):
            x=53+i*287
            card(d,(x,249,x+268,439),SURFACE2,13)
            label(d,x+17,273,name,F26,CYAN)
            label(d,x+17,328,rows[0],F12,MUTED)
            label(d,x+17,355,rows[1],F12,MUTED)
            pill(d,x+17,396,"Explore "+name)
        if n==1:
            label(d,62,449,"Each link opens its own independent Discover page.",F10,MUTED)
    elif n==2:
        topics=(("PHYSICS","astro-ph · cond-mat · quant-ph"),
                ("MATHEMATICS","math.AG · math.PR · math.IT"),
                ("COMPUTER SCIENCE","cs.AI · cs.LG · cs.CR"),
                ("OTHER FIELDS","q-bio · q-fin · stat · eess · econ"))
        for i,(title,codes) in enumerate(topics):
            x=55+(i%2)*436
            y=244+(i//2)*102
            card(d,(x,y,x+412,y+88),SURFACE2,10)
            label(d,x+15,y+12,title,F18,CYAN)
            label(d,x+15,y+50,codes,F12,MUTED)
    elif n==3:
        card(d,(53,247,457,439),SURFACE2,12)
        label(d,75,265,"bioRxiv",F26,CYAN)
        for i,t in enumerate(("Neuroscience","Genomics","Ecology","Bioinformatics")):
            pill(d,75,313+(i//2)*47,t)
        card(d,(480,247,906,439),SURFACE2,12)
        label(d,500,265,"ChemRxiv",F26,CYAN)
        for i,t in enumerate(("Catalysis","Materials chemistry","Physical chemistry")):
            pill(d,502,313+i*39,t)
    elif n==4:
        headings=(("01 · TOPIC","Physics"),("02 · FIELD","Quantum physics"),("03 · SUBFIELD","Quantum networks"))
        for i,(head,value) in enumerate(headings):
            x=56+i*282
            card(d,(x,264,x+265,344),SURFACE2,10)
            label(d,x+13,272,head,F12,MUTED)
            label(d,x+13,303,value,F18,WHITE)
        pill(d,63,380,"+ Add custom subfield")
        pill(d,276,380,"Reset to defaults")
        label(d,63,432,"Custom subfields are personal search terms, not official source classifications.",F12,MUTED)
    elif n==5:
        card(d,(55,249,902,316),SURFACE2,12)
        label(d,72,267,"Search:    molecular networks",F18,WHITE)
        for i,t in enumerate(("Selected archive","Newest","Date range","Author")):
            pill(d,60+i*207,344,t)
        paper(d,61,395,"Source-linked preprint metadata","Verify dates, abstracts and original archive",width=835)
    elif n==6:
        for i,(head,a,b) in enumerate((
            ("TO READ","Saved paper","Open later"),
            ("READING","Private notes","Research project"),
            ("FINISHED","Reviewed work","Collection"))):
            x=54+i*288
            card(d,(x,245,x+266,437),SURFACE2,12)
            label(d,x+17,263,head,F18,CYAN)
            paper(d,x+14,311,a,b,width=234)
        label(d,66,448,"Your Library stays on this browser unless you export or sync it.",F10,MUTED)
    elif n==7:
        for i,(head,sub) in enumerate((
            ("PDF READER","Open local PDFs and annotate"),
            ("COMPARE","Inspect two paper records"),
            ("RESEARCH AI","Source-led analysis; local AI optional"))):
            x=53+i*287
            card(d,(x,250,x+268,433),SURFACE2,12)
            label(d,x+15,266,head,F18,CYAN)
            label(d,x+15,320,sub[:29],F12,MUTED)
            if len(sub)>29: label(d,x+15,343,sub[29:],F12,MUTED)
            pill(d,x+15,389,"Open tool")
    else:
        card(d,(65,259,153,347),BLUE,15)
        label(d,95,271,"A",F32)
        label(d,188,261,"Axiovo",F32)
        label(d,190,312,"Open research discovery",F18,CYAN)
        pill(d,190,370,"Discover  ·  Verify  ·  Save  ·  Revisit")
        label(d,190,426,"Independent from arXiv, bioRxiv and ChemRxiv.",F12,MUTED)
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
