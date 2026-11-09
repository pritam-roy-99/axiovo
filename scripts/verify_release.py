#!/usr/bin/env python3
"""Identify the tested Pages artifact and verify its public bytes after deployment."""
import hashlib
import json
import os
from pathlib import Path
import sys
import time
import urllib.request

ROOT=Path(__file__).resolve().parents[1]
DOCS=ROOT/'docs'
PATHS=('index.html','research-entry.js','topic-explorer.js','archive-data.js',
       'data/announcements.json','data/source-freshness.json')

def digest(raw):
    return hashlib.sha256(raw).hexdigest()

def build():
    manifest={'commit':os.environ['GITHUB_SHA'],
              'files':{path:digest((DOCS/path).read_bytes()) for path in PATHS}}
    (DOCS/'release.json').write_text(json.dumps(manifest,sort_keys=True)+'\n')
    print('Release artifact:',manifest['commit'])

def verify(base, expected):
    request=urllib.request.Request(base+'release.json?revision='+expected['commit'],
                                   headers={'Cache-Control':'no-cache'})
    with urllib.request.urlopen(request,timeout=20) as response:
        actual=json.load(response)
    if actual!=expected:
        raise ValueError('Public release manifest does not match the tested artifact')
    for path, sha in expected['files'].items():
        request=urllib.request.Request(base+path+'?revision='+expected['commit'],
                                       headers={'Cache-Control':'no-cache'})
        with urllib.request.urlopen(request,timeout=20) as response:
            if digest(response.read())!=sha:
                raise ValueError('Public file differs from tested artifact: '+path)
    print('Verified public release and critical asset hashes:',expected['commit'])

if __name__=='__main__':
    if sys.argv[1:] == ['build']:
        build()
    else:
        expected=json.loads((DOCS/'release.json').read_text())
        base=os.environ.get('AXIOVO_BASE_URL','https://pritam-roy-99.github.io/axiovo/').rstrip('/')+'/'
        for attempt in range(4):
            try:
                verify(base,expected)
                break
            except (OSError,ValueError) as exc:
                if attempt==3:
                    raise
                print('Waiting for Pages propagation:',exc,flush=True)
                time.sleep(10)
