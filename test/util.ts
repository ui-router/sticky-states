import { expect } from 'vitest';
import { TransitionOptions, UIRouter } from '@uirouter/core';
import * as _ from 'lodash';

let tLog: TransitionAudit;
let tExpected: TransitionAudit;

class TransitionAudit {
  entered: string[] = [];
  exited: string[] = [];
  reactivated: string[] = [];
  inactivated: string[] = [];
  views: string[] = [];
}

// Add callbacks to each
export function addCallbacks(basicStates: any[]) {
  basicStates.forEach(function (state) {
    function deregisterView(state: any, cause: string) {
      const views = _.keys(state.$$state().views);
      tLog.views = _.difference(tLog.views, views);
    }
    function registerView(state: any, cause: string) {
      const views = _.keys(state.$$state().views);
      tLog.views = _.union(tLog.views, views);
    }

    state.onInactivate = function () {
      tLog.inactivated.push(state.name);
      registerView(state, 'Inactivate');
    };
    state.onReactivate = function () {
      tLog.reactivated.push(state.name);
      deregisterView(state, 'Reactivate');
    };
    state.onEnter = function () {
      tLog.entered.push(state.name);
      deregisterView(state, 'Enter     ');
    };
    state.onExit = function () {
      tLog.exited.push(state.name);
      deregisterView(state, 'Exit      ');
    };
  });
}

export function pathFrom(start: string, end: string): string[] {
  let startNodes = start.split('.');
  let endNodes = end.split('.');
  let reverse = startNodes.length > endNodes.length;
  if (reverse) {
    const tmp = startNodes;
    startNodes = endNodes;
    endNodes = tmp;
  }

  const common = _.intersection(endNodes, startNodes);
  const difference = _.difference(endNodes, startNodes);
  difference.splice(0, 0, common.pop()!);

  let name = common.join('.');
  const path = _.map(difference, function (segment) {
    name = (name ? name + '.' : '') + segment;
    return name;
  });
  if (reverse) path.reverse();
  return path;
}

export interface TAdditional {
  [key: string]: string | string[];
  inactivated?: string | string[];
  exited?: string | string[];
}

export type TOptions = TransitionOptions & { redirect?: any; params?: any };

export function getTestGoFn($uiRouter: UIRouter | null) {
  if (!$uiRouter) return null as any;
  const $state = $uiRouter.stateService;

  /**
   * This test function does the following:
   * - Go to a state `state`.
   * - Flush transition
   * - Expect the current state to be the target state, or the expected redirect state
   * - analyse the transition log and expect
   *   - The entered states to match tAdditional.entered
   *   - The exited states to match tAdditional.exited
   *   - The inactivated states to match tAdditional.inactivated
   *   - The reactivated states to match tAdditional.reactivated
   * - Expect the active+inactive states to match the active+inactive views
   *
   * @param state - The target state
   * @param tAdditional - An object with the expected transitions
   * @param options - options which modify the expected transition behavior
   */
  async function testGo(state: string, tAdditional?: TAdditional | null, options?: TOptions) {
    if (tAdditional && Array.isArray(tAdditional.inactivated)) tAdditional.inactivated.reverse();
    if (tAdditional && Array.isArray(tAdditional.exited)) tAdditional.exited.reverse();

    const goPromise = $state.go(state, options && options.params, options);
    await goPromise;

    const expectRedirect = options && options.redirect;
    if (!expectRedirect) expect($state.current.name).toBe(state);
    else expect($state.current.name).toBe(expectRedirect);

    if (tExpected && tAdditional) {
      // append all arrays in tAdditional to arrays in tExpected
      Object.keys(tAdditional).forEach((key) => {
        (tExpected as any)[key] = (tExpected as any)[key].concat((tAdditional as any)[key]);
      });

      Object.keys(tLog)
        .filter((x) => x !== 'views')
        .forEach((key) => {
          const left = key + ': ' + JSON.stringify((tLog as any)[key]);
          const right = key + ': ' + JSON.stringify((tExpected as any)[key]);
          expect(left).toBe(right);
        });
    }

    return goPromise.transition;
  }

  return testGo;
}

export function resetTransitionLog() {
  tLog = new TransitionAudit();
  tExpected = new TransitionAudit();
}

export const tlog = () => tLog;
