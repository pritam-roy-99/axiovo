import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMediaRange} from '../personal/media-range.mjs';
import {readFileSync} from 'node:fs';
test('HTML5 video seeks using ordinary, open-ended and suffix byte ranges',()=>{
 assert.deepEqual(parseMediaRange('bytes=0-1023',5000),{start:0,end:1023,length:1024});
 assert.deepEqual(parseMediaRange('bytes=1200-',5000),{start:1200,end:4999,length:3800});
 assert.deepEqual(parseMediaRange('bytes=-500',5000),{start:4500,end:4999,length:500});
 assert.deepEqual(parseMediaRange('bytes=4999-9999',5000),{start:4999,end:4999,length:1});
 assert.equal(parseMediaRange(null,5000),null);
});
test('reject invalid or unsatisfiable video ranges with 416 semantics',()=>{
 for (const value of ['bytes=6000-','bytes=9-2','bytes=-0','bytes=0-1,4-5','bytes=ab-cd','garbage']){
  assert.ok(parseMediaRange(value,5000)?.error,value);
 }
});
test('Axiovo Windows server supports homepage video and captions',()=>{
 const server=readFileSync(new URL('../personal/server.mjs',import.meta.url),'utf8');
 assert.match(server,/'\.mp4':'video\/mp4'/);
 assert.match(server,/'\.vtt':'text\/vtt/);
 assert.match(server,/createReadStream\(real,\{start,end\}\)/);
 assert.match(server,/res\.writeHead\(range\?206:200,headers\)/);
 assert.match(server,/'Content-Range'/);
 assert.match(server,/u\.pathname==='\/'\?'\/index\.html'/);
});
