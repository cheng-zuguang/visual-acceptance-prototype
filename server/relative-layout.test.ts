import assert from "node:assert/strict";
import test from "node:test";
import { relativeLayoutMeasurements, visualTextAlignment, type LayoutBinding } from "./relative-layout";
const binding = (id: string, y: number, actualY: number, parentId = "card", parentSelector = ".card"): LayoutBinding => ({
  design: { id, box: {x: 10, y, width: 40, height: 10}, node: {parentId} },
  actual: {selector: `.${id}`, parentSelector, box: {x: 10, y: actualY, width: 40, height: 10}, style: {}}, method: "exact-id", confidence: 0.99
});
test("neighbor measurements ignore shared page displacement and detect local spacing", () => {
  const a = binding("a", 20, 120), b = binding("b", 40, 140);
  assert.deepEqual(relativeLayoutMeasurements(b, [a,b]).filter(m => m.axis === "y").map(m => [m.expected,m.actual]), [[10,10]]);
  b.actual.box.y += 6;
  assert.deepEqual(relativeLayoutMeasurements(b, [a,b]).filter(m => m.axis === "y").map(m => [m.expected,m.actual]), [[10,16]]);
});
test("reference requires both design and actual adjacency, parent identity and verified binding", () => {
  const a = binding("a",20,120), b = binding("b",40,140), c = binding("c",60,130);
  assert.equal(relativeLayoutMeasurements(b,[a,b,c]).length,0);
  a.method = "structure-geometry";
  assert.equal(relativeLayoutMeasurements(b,[a,b]).length,0);
  a.method = "exact-id"; a.actual.parentSelector = ".other";
  assert.equal(relativeLayoutMeasurements(b,[a,b]).length,0);
});
test("parent offsets use matched local container, never the root page", () => {
  const parent = binding("card",10,110,"page",".page"), child = binding("a",20,120);
  assert.deepEqual(relativeLayoutMeasurements(child,[parent,child]).map(m => [m.expected,m.actual]),[[0,0],[10,10]]);
  delete parent.design.node.parentId;
  assert.equal(relativeLayoutMeasurements(child,[parent,child]).length,0);
});
test("flex text alignment follows rendered bounds rather than text-align spelling", () => {
  const box = {x:0,y:0,width:100,height:30};
  assert.equal(visualTextAlignment("right",{display:"flex",justifyContent:"flex-end",textAlign:"start",textBounds:{x:70,y:0,width:30,height:15}},box,2).differs,false);
  assert.equal(visualTextAlignment("right",{display:"flex",justifyContent:"flex-end",textAlign:"right",textBounds:{x:0,y:0,width:30,height:15}},box,2).differs,true);
  assert.match(visualTextAlignment("right",{display:"flex",justifyContent:"flex-end"},box,2).pendingReason!,/bounds/);
});
test("alignment uses RTL start/end and inner padding", () => {
  assert.equal(visualTextAlignment("right",{textAlign:"start",direction:"rtl"},{x:0,y:0,width:100,height:30},2).differs,false);
  assert.equal(visualTextAlignment("right",{display:"grid",paddingRight:10,textBounds:{x:60,y:0,width:30,height:10}},{x:0,y:0,width:100,height:30},2).differs,false);
});

test("unmatched design or actual siblings block false adjacency across omitted blocks", () => {
  const a = binding("a",20,20), b = binding("b",60,40), extra = binding("extra",40,30);
  const inventory = { design: [a,extra,b].map(item => ({id:item.design.id,parentId:item.design.node.parentId,box:item.design.box})),
    actual: [a,b].map(item => item.actual) };
  assert.equal(relativeLayoutMeasurements(b,[a,b],inventory).length,0);
  inventory.design = [a,b].map(item => ({id:item.design.id,parentId:item.design.node.parentId,box:item.design.box}));
  inventory.actual = [a,extra,b].map(item => item.actual);
  assert.equal(relativeLayoutMeasurements(b,[a,b],inventory).length,0);
});

test("vertical neighboring blocks verify relative horizontal edge alignment without a matched parent", () => {
  const a=binding("a",20,120), b=binding("b",40,140); b.actual.box.x += 8;
  const measurements=relativeLayoutMeasurements(b,[a,b]);
  assert.ok(measurements.some(item => item.axis === "x" && item.reference === "neighbor" && item.expected === 0 && item.actual === 8));
  assert.ok(measurements.some(item => item.axis === "y" && item.expected === item.actual));
});
