import test from 'node:test';
import assert from 'node:assert/strict';
import { makeDepth, blurDepth } from '../js/depth.js';
import { separation, linkRow, renderRows } from '../js/stereogram.js';
const config = { normalise: false, contrast: 1, gamma: 1, invert: false, mapMode: 'relief', threshold: .5, smoothing: 0, palette: 'confetti', grain: 1, strength: .25, spacing: 10, seed: 1979 };
test('luminance endpoints and alpha far plane', () => {
  const pixels = new Uint8ClampedArray([0,0,0,255,255,255,255,255,255,255,255,0]);
  const { depths, preview } = makeDepth(pixels, 3, 1, config);
  assert.deepEqual([...depths], [0,1,0]); assert.equal(preview[7], 255);
});
test('inversion and silhouette are applied before alpha', () => {
  const pixels = new Uint8ClampedArray([40,40,40,255,200,200,200,255,0,0,0,0]);
  const { depths } = makeDepth(pixels, 3, 1, {...config, invert: true, mapMode: 'silhouette'});
  assert.deepEqual([...depths], [1,0,0]);
});
test('normalisation expands visible range; uniform maps remain finite', () => {
  const pixels = new Uint8ClampedArray([80,80,80,255,160,160,160,255]);
  const values = makeDepth(pixels, 2, 1, {...config, normalise: true}).depths;
  assert.ok(Math.abs(values[0]) < 1e-6 && Math.abs(values[1] - 1) < 1e-6);
  assert.ok(makeDepth(pixels.slice(0,4), 1, 1, {...config, normalise: true}).depths.every(Number.isFinite));
});
test('box blur preserves constant fields including corners', () => {
  const output = blurDepth(new Float32Array(35).fill(.4),7,5,3);
  assert.ok(output.every(value => Math.abs(value - .4) < 1e-6));
});
test('near surfaces have smaller stereo separation', () => {
  assert.equal(separation(0,100,.25),100);
  assert.equal(separation(1,100,.25),86);
});
test('flat field repeats exactly; relief constraints preserve paired colours', () => {
  const width = 300, height = 12, z = new Float32Array(width*height);
  const output = new Uint8ClampedArray(width*height*4);
  renderRows(z,width,height,config,0,height,output);
  for(let x=0;x<width-30;x++) assert.deepEqual(output.slice(x*4,x*4+4),output.slice((x+30)*4,(x+30)*4+4));
  for(let y=0;y<height;y++) for(let x=90;x<210;x++) z[y*width+x]=.7;
  renderRows(z,width,height,config,0,height,output);
  for(let y=0;y<height;y++) {
    const links = linkRow(z,y*width,width,30,.25);
    for(let x=0;x<width;x++) { assert.ok(links[x]>=x && links[x]<width); assert.deepEqual(output.slice((y*width+x)*4,(y*width+x)*4+4),output.slice((y*width+links[x])*4,(y*width+links[x])*4+4)); }
  }
});
test('seed changes texture without changing constraints; alpha stays opaque', () => {
  const z = new Float32Array(200), first = new Uint8ClampedArray(800), second = new Uint8ClampedArray(800);
  renderRows(z,200,1,config,0,1,first); renderRows(z,200,1,{...config,seed:11},0,1,second);
  assert.notDeepEqual(first,second); assert.ok(first.filter((_,i)=>i%4===3).every(value=>value===255));
});
