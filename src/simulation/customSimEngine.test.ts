import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultCustomLayout, tickCustomLayoutSimulation } from './customSimEngine';

test('createDefaultCustomLayout initializes 6 standard blocks and 5 connections', () => {
  const state = createDefaultCustomLayout();
  assert.equal(state.blocks.length, 6);
  assert.equal(state.connections.length, 5);
  assert.equal(state.entities.length, 0);
  assert.equal(state.isRunning, true);
  assert.equal(state.bottleneckBlockId, 'blk-cnc-1');
  
  const source = state.blocks.find(b => b.category === 'SOURCE');
  assert.ok(source);
  assert.equal(source?.name, 'Raw Material Dock (Inflow)');

  const sink = state.blocks.find(b => b.category === 'SINK');
  assert.ok(sink);
  assert.equal(sink?.name, 'Warehouse & Dispatch Outfeed');
});

test('tickCustomLayoutSimulation emits entities from source and advances them along wires', () => {
  let state = createDefaultCustomLayout();
  const source = state.blocks.find(b => b.category === 'SOURCE')!;
  source.processingTimeRemaining = 0.1; // trigger emit on next small tick

  state = tickCustomLayoutSimulation(state, 0.2);

  // An entity should have been created on the wire out from the source
  assert.ok(state.entities.length >= 1);
  const entity = state.entities[0];
  assert.equal(entity.currentConnectionId, 'conn-1-2');
  assert.ok((entity.wireProgressRatio ?? 0) >= 0);

  // Advance simulation to let entity reach next block
  state = tickCustomLayoutSimulation(state, 2.0);
  // After travel, entity arrives at target block
  assert.ok(state.simulatedSeconds > 0);
});

test('tickCustomLayoutSimulation stops advancing when paused', () => {
  let state = createDefaultCustomLayout();
  state.isRunning = false;
  const initialSimTime = state.simulatedSeconds;
  state = tickCustomLayoutSimulation(state, 1.0);
  assert.equal(state.simulatedSeconds, initialSimTime);
});
