import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MIN_PERFORMANCE_ROUTE_DWELL_MS,
  buildRouteProbeTargets,
  createRouteSelectionState,
  reduceRouteProbeCycle,
  type RouteProbeCycle,
} from '../route-selection';

const NOW = 1_000_000;
type PeriodicCycle = Extract<RouteProbeCycle, { trigger: 'PERIODIC' }>;

const periodicCycle = (overrides: Partial<PeriodicCycle> = {}): PeriodicCycle => ({
  activeUrl: 'current',
  activeResult: 300,
  candidateResults: new Map([['candidate', 200]]),
  connectionState: 'CONNECTED',
  now: NOW,
  trigger: 'PERIODIC',
  allowPerformanceSwitch: true,
  selectedAt: NOW,
  ...overrides,
});

const createEvaluator = () => {
  let state = createRouteSelectionState();
  return (cycle: RouteProbeCycle) => {
    const transition = reduceRouteProbeCycle(state, cycle);
    state = transition.state;
    return transition.decision;
  };
};

test('route probe targets always include an active URL absent from discovery', () => {
  assert.deepStrictEqual(buildRouteProbeTargets('removed', ['first', 'second']), [
    'removed',
    'first',
    'second',
  ]);
});

test('a disconnected active route fails over after one fresh failed probe', () => {
  const evaluate = createEvaluator();
  assert.deepStrictEqual(
    evaluate(
      periodicCycle({
        activeUrl: 'removed',
        activeResult: 'FAILED',
        connectionState: 'DISCONNECTED',
      }),
    ),
    { url: 'candidate', reason: 'FAILOVER' },
  );
});

test('an active route in an error state fails over after one fresh failed probe', () => {
  const evaluate = createEvaluator();
  assert.deepStrictEqual(
    evaluate(periodicCycle({ activeResult: 'ERROR', connectionState: 'ERROR' })),
    { url: 'candidate', reason: 'FAILOVER' },
  );
});

test('a connected route tolerates one failed probe but not two', () => {
  const evaluate = createEvaluator();
  const cycle = periodicCycle({ activeResult: 'FAILED' });

  assert.strictEqual(evaluate(cycle), null);
  assert.deepStrictEqual(evaluate({ ...cycle, now: NOW + 1 }), {
    url: 'candidate',
    reason: 'FAILOVER',
  });
});

test('manual mode keeps a healthy active route', () => {
  const evaluate = createEvaluator();
  assert.strictEqual(
    evaluate(
      periodicCycle({
        candidateResults: new Map([['candidate', 100]]),
        allowPerformanceSwitch: false,
        selectedAt: 0,
      }),
    ),
    null,
  );
});

test('performance switching requires stable relative improvement', () => {
  const evaluate = createEvaluator();
  const cycle = periodicCycle({
    activeResult: 2000,
    candidateResults: new Map([['candidate', 1300]]),
    selectedAt: NOW - MIN_PERFORMANCE_ROUTE_DWELL_MS,
  });

  assert.strictEqual(evaluate(cycle), null);
  assert.strictEqual(evaluate({ ...cycle, now: NOW + 1 }), null);
  assert.deepStrictEqual(evaluate({ ...cycle, now: NOW + 2 }), {
    url: 'candidate',
    reason: 'PERFORMANCE',
  });
});

test('initial routing skips dwell time but still requires stable samples', () => {
  const evaluate = createEvaluator();
  const cycle: RouteProbeCycle = {
    activeUrl: 'current',
    activeResult: 2000,
    candidateResults: new Map([['candidate', 1300]]),
    connectionState: 'CONNECTED',
    now: NOW,
    trigger: 'INITIAL',
  };

  assert.strictEqual(evaluate(cycle), null);
  assert.strictEqual(evaluate({ ...cycle, now: NOW + 1 }), null);
  assert.deepStrictEqual(evaluate({ ...cycle, now: NOW + 2 }), {
    url: 'candidate',
    reason: 'PERFORMANCE',
  });
});
