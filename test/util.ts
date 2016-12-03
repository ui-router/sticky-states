var tLog, tExpected;
import * as _ from "lodash";

var TransitionAudit = function () {
  this.entered = [];
  this.exited = [];
  this.reactivated = [];
  this.inactivated = [];
  this.views = [];

  // this.toString = angular.bind(this,
  //     function toString() {
  //       var copy = {};
  //       angular.forEach(this, function(value, key) {
  //         if (key === 'inactivated' || key === 'reactivated' ||
  //             key === 'entered' || key === 'exited') {
  //           copy[key] = value;
  //         }
  //       });
  //       return angular.toJson(copy);
  //     }
  // );
};

// Add callbacks to each
export function addCallbacks (basicStates) {
  basicStates.forEach(function (state) {
    function deregisterView(state, cause) {
      var views = _.keys(state.$$state().views);
      tLog.views = _.difference(tLog.views, views);
//      console.log(cause + ":Deregistered Inactive view " + views + " for state " + state.name + ": ", tLog.views);
    }
    function registerView(state, cause) {
      var views = _.keys(state.$$state().views);
      tLog.views = _.union(tLog.views, views);
//      console.log(cause  + ":  Registered Inactive view " + views + " for state " + state.name + ": ", tLog.views);
    }

    state.onInactivate = function () {
      tLog.inactivated.push(state.name); registerView(state,  'Inactivate');
    };
    state.onReactivate = function () {
      tLog.reactivated.push(state.name); deregisterView(state,'Reactivate');
    };
    state.onEnter = function () {
      tLog.entered.push(state.name);     deregisterView(state,'Enter     ');
    };
    state.onExit = function () {
      tLog.exited.push(state.name);      deregisterView(state,'Exit      ');
    };
  });
}

export function pathFrom(start, end) {
  var startNodes = start.split(".");
  var endNodes = end.split(".");
  var reverse = startNodes.length > endNodes.length;
  if (reverse) {
    var tmp = startNodes;
    startNodes = endNodes;
    endNodes = tmp;
  }

  var common = _.intersection(endNodes, startNodes);
  var difference = _.difference(endNodes, startNodes);
  difference.splice(0, 0, common.pop());

  var name = common.join(".");
  var path = _.map(difference, function(segment) {
    name = (name ? name + "." : "") + segment;
    return name;
  });
  if (reverse) path.reverse();
  return path;
}

export function getTestGoFn($uiRouter) {
  var $state = $uiRouter.stateService;

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
 * @param state: The target state
 * @param tAdditional: An object with the expected transitions
 *    {
 *      entered:      statename or [ statenamearray ],
 *      exited:       statename or [ statenamearray ],
 *      inactivated:  statename or [ statenamearray ],
 *      reactivated:  statename or [ statenamearray ]
 *    }
 *    note: statenamearray may be built using the pathFrom helper function
 * @param options: options which modify the expected transition behavior
 *    { redirect: redirectstatename }
 */
async function testGo(state, tAdditional, options) {
  await $state.go(state, options && options.params, options);

  var expectRedirect = options && options.redirect;
  if (!expectRedirect)
    expect($state.current.name).toBe(state);
  else
    expect($state.current.name).toBe(expectRedirect);

  // var root = $state.$current.path[0].parent;
  // var __inactives = root.parent;

  // If ct.ui.router.extras.sticky module is included, then root.parent holds the inactive states/views
  // if (__inactives) {
  //   var __inactiveViews = _.keys(__inactives.locals);
  //   var extra = _.difference(__inactiveViews, tLog.views);
  //   var missing = _.difference(tLog.views, __inactiveViews);
  //
  //   expect("Extra Views: " + extra).toEqual("Extra Views: " + []);
  //   expect("Missing Views: " + missing).toEqual("Missing Views: " + []);
  // }

  if (tExpected && tAdditional) {
    // append all arrays in tAdditional to arrays in tExpected
    Object.keys(tAdditional).forEach(key => tExpected[key] = tExpected[key].concat(tAdditional[key]));
    // angular.forEach(tAdditional, function (value, key) {
    //   tExpected[key] = tExpected[key].concat(tAdditional[key]);
    // });

    Object.keys(tLog).filter(x => x !== 'views').forEach(key => {
    // angular.forEach(_.without(_.keys(tLog), 'views'), function(key) {
      var left = key + ": " + JSON.stringify(tLog[key]);
      var right = key + ": " + JSON.stringify(tExpected[key]);
      expect(left).toBe(right);
    });
  }

  return Promise.resolve();
}

return testGo;
}

export function resetTransitionLog() {
  tLog = new TransitionAudit();
  tExpected = new TransitionAudit();
}

export const tlog = () => tLog;

export const equalityTester = (first, second) =>
    Object.keys(second).reduce((acc, key) =>
    first[key] == second[key] && acc, true);