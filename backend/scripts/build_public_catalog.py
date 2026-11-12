"""Import a public 2024 English Coursera metadata snapshot into SkillPath.

Source: https://huggingface.co/datasets/azrai99/coursera-course-dataset
License declared by dataset author: Apache-2.0. Course metadata is a snapshot
and does not guarantee that any course is free, available or accurate today.

Optional input: python backend/scripts/build_public_catalog.py --input courses.csv
Outputs backend/data/public_courses.json and frontend/src/data/public_courses.json.
The GitHub Actions ingestion workflow also runs this script.
"""
from __future__ import annotations
import argparse
import ast
import csv
import io
import json
import math
import re
import unicodedata
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[2]
URL = "https://huggingface.co/datasets/azrai99/coursera-course-dataset/resolve/main/coursera_course_2024.csv"
OUTS = [ROOT/"backend/data/public_courses.json",ROOT/"frontend/src/data/public_courses.json"]

# MIT OCW resources below are confirmed public links. Category, estimated
# durations and skill tags are project-curated metadata, not official labels.
MIT = [
    ("mit-signals-6-003","Signals and Systems","Introduction to discrete and continuous signals, LTI systems, Fourier analysis, convolution, Laplace and Z transforms, and sampling.","Intermediate",["signals and systems","signal processing","fourier transform","convolution","lti systems","laplace transform","z transform"],"https://ocw.mit.edu/courses/6-003-signals-and-systems-fall-2011/"),
    ("mit-signals-res-6-007","Signals and Systems: Video Lectures","A video introduction to analog and digital signal processing; continuous-time and discrete-time signal representations, time and frequency domains.","Beginner",["signals and systems","signal processing","fourier transform","sampling","discrete time signals"],"https://ocw.mit.edu/courses/res-6-007-signals-and-systems-spring-2011/"),
    ("mit-signals-6-011","Signals, Systems and Inference","Signals and inference in communication and control; state-space models, stochastic processes, correlations, spectra and Wiener filters.","Advanced",["signals and systems","signal processing","control systems","wiener filtering","state space"],"https://ocw.mit.edu/courses/6-011-signals-systems-and-inference-spring-2018/"),
    ("mit-signals-6-341","Discrete-Time Signal Processing","Sampling and multirate systems, digital filter design, DFT, FFT, spectral analysis and Fourier methods.","Advanced",["digital signal processing","signal processing","fourier transform","fft","filter design"],"https://ocw.mit.edu/courses/6-341-discrete-time-signal-processing-fall-2005/"),
    ("mit-signals-res-6-dtsp","Discrete-Time Signal Processing: Oppenheim and Schafer","Open course resources on Fourier analysis, filter design and multirate signal processing.","Advanced",["digital signal processing","signal processing","fourier transform","filter design"],"https://ocw.mit.edu/courses/res-6-dtsp-discrete-time-signal-processing/"),
    ("mit-signals-6-011-2010","Introduction to Communication, Control, and Signal Processing","Signals, systems and inference; communication, state space, correlation, stochastic processes and spectral analysis.","Advanced",["signals and systems","communication systems","signal processing","control systems"],"https://ocw.mit.edu/courses/6-011-introduction-to-communication-control-and-signal-processing-spring-2010/"),
]

def clean(value,limit=1500):
    text=unicodedata.normalize("NFKC",str(value or "")).strip()
    return re.sub(r"\s+"," ",text)[:limit]

def parse_skills(value,title):
    raw=clean(value,2500)
    skills=[]
    if raw.startswith("["):
        try:
            parsed=ast.literal_eval(raw)
            if isinstance(parsed,list):skills=[clean(x,85).casefold() for x in parsed if clean(x)]
        except (ValueError,SyntaxError):pass
    if not skills and raw not in ("","[]","nan"):
        skills=[s.strip().casefold() for s in re.split(r"[,;|]",raw) if s.strip()]
    if not skills: skills=[clean(title,105).casefold()]
    return list(dict.fromkeys(skills))[:14]

def category_for(title,skills):
    text=(title+" "+" ".join(skills)).lower()
    buckets=[
        ("Electrical Engineering",r"signal processing|signals and systems|electrical|electronics|circuit|telecommunication|semiconductor|fourier|vlsi"),
        ("Computing & Software",r"software|computer|programming|python|java|javascript|typescript|sql|data structure|web development|cybersecurity|networking|backend"),
        ("Data & AI",r"machine learning|deep learning|data science|artificial intelligence|neural network|data analysis|statistics|generative ai"),
        ("Mathematics",r"calculus|linear algebra|mathematics|differential equation|geometry|algebra"),
        ("Business & Management",r"business|marketing|finance|management|entrepreneurship|leadership"),
        ("Health & Life Sciences",r"medical|health|clinical|biology|genetics|nursing"),
        ("Physical Sciences",r"physics|chemistry|astronomy|quantum|mechanics"),
        ("Arts & Humanities",r"history|art|design|music|philosophy|psychology|language"),
    ]
    for category,pattern in buckets:
        if re.search(pattern,text):return category
    return "Other disciplines"

def parse_hours(value):
    match=re.search(r"(\d+(?:\.\d+)?)\s*hours?",clean(value,250).lower())
    return min(180,max(2,round(float(match.group(1))))) if match else 12

def parse_quality(rating,enrollment):
    try: number=float(clean(rating))
    except ValueError: number=0
    # Non-verified quality/popularity proxy for ranking, never a success estimate.
    return round(max(.05,min(.98,(number/5*.75 if 0<number<=5 else .40))),3)

def parse_row(raw,index):
    title=clean(raw.get("title"),145)
    desc=clean(raw.get("Description"),850)
    url=clean(raw.get("URL"),380)
    if len(title)<4 or not url.startswith("https://") or "coursera.org/" not in url: return None
    if sum(ord(char)>127 for char in title)>len(title)*.25: return None
    raw_level=clean(raw.get("Level")).lower()
    level="Advanced" if "advanced" in raw_level else "Beginner" if "beginner" in raw_level else "Intermediate"
    skills=parse_skills(raw.get("Skills"),title)
    return {
        "id":f"coursera-{index:05d}","title":title,"description":desc or title,
        "provider":clean(raw.get("Organization"),100) or "Coursera",
        "url":url,"category":category_for(title,skills),"difficulty":level,
        "hours":parse_hours(raw.get("Schedule")),"skills":skills,"prerequisites":[],
        "popularity":parse_quality(raw.get("rating"),raw.get("enrolled")),
        "source":"coursera-metadata-2024","prerequisite_source":"not provided",
        "duration_source":"dataset schedule or fallback",
        "category_source":"heuristic keyword classifier"
    }

def ingest(local_file:Path|None=None):
    if local_file:
        handle=local_file.open("r",newline="",encoding="utf-8-sig")
        reader=csv.DictReader(handle)
    else:
        request=Request(URL,headers={"User-Agent":"SkillPath/1.0 public education research"})
        response=urlopen(request,timeout=140)
        handle=io.TextIOWrapper(response,encoding="utf-8-sig",errors="replace",newline="")
        reader=csv.DictReader(handle)
    results,seen=[],set()
    try:
        for index,raw in enumerate(reader):
            row=parse_row(raw,index)
            if not row or row["url"] in seen:continue
            seen.add(row["url"])
            results.append(row)
    finally:handle.close()
    for id,title,desc,level,skills,url in MIT:
        results.append({
            "id":id,"title":title,"description":desc,"provider":"MIT OpenCourseWare",
            "category":"Electrical Engineering","difficulty":level,"hours":28,
            "skills":skills,"prerequisites":[],"popularity":.75,"url":url,
            "source":"mit-ocw-curated","prerequisite_source":"not verified",
            "duration_source":"illustrative estimate","category_source":"manual"
        })
    if len(results)<3000:raise RuntimeError(f"Only {len(results)} valid records, refusing to replace the catalogue")
    serialized=json.dumps(results,ensure_ascii=False,separators=(",",":"))+"\n"
    for out in OUTS:
        out.parent.mkdir(parents=True,exist_ok=True)
        out.write_text(serialized,encoding="utf-8")
    print(f"Built {len(results)} resources from the public dataset + {len(MIT)} MIT OCW records.")
    for out in OUTS:print(f"Saved: {out.relative_to(ROOT)} ({out.stat().st_size / 1024 / 1024:.1f} MB)")
    return results

if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input",type=Path,help="Use a local source CSV rather than downloading")
    args=parser.parse_args()
    ingest(args.input)
