import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import {compareRelativePixels} from "./region-pixels";
const image = (width: number) => sharp(Buffer.from(`<svg width="100" height="30" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="30" fill="white"/><rect width="${width}" height="10" fill="black"/></svg>`)).png().toBuffer();
test("local crops preserve actual dimensions instead of resizing to hide size differences", async () => {
  const result = await compareRelativePixels({referenceImage:await image(10),actualImage:await image(20),viewport:{width:100,height:30},
    pairs:[{designBox:{x:0,y:0,width:10,height:10},actualBox:{x:0,y:0,width:20,height:10}}],exclusions:[],threshold:0.1});
  assert.equal(result.scope.reviewedPixels,200);
  assert.equal(result.scope.changedPixels,100);
  assert.equal(result.similarity,0.5);
});
test("overlapping paired crops are counted once and out-of-frame evidence is unreviewed", async () => {
  const pixels = await image(10), pair={designBox:{x:0,y:0,width:10,height:10},actualBox:{x:0,y:0,width:10,height:10}};
  const result = await compareRelativePixels({referenceImage:pixels,actualImage:pixels,viewport:{width:100,height:30},pairs:[pair,pair,
    {designBox:{x:90,y:0,width:20,height:10},actualBox:{x:0,y:0,width:20,height:10}}],exclusions:[],threshold:0.1});
  assert.equal(result.scope.reviewedPixels,100); assert.equal(result.scope.excludedPixels,2900);
});
