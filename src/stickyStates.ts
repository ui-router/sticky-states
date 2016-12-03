
import { UIRouter, PathFactory, State, PathNode, TreeChanges, Transition } from "ui-router-core";
import { find, tail, curry, inArray, removeFrom, identity, anyTrueR, unnestR, uniqR, isFunction } from "ui-router-core";

declare module "ui-router-core/lib/state/interface" {
  interface StateDeclaration {
    sticky?: boolean;
  }
}

declare module "ui-router-core/lib/state/stateObject" {
  interface State {
    sticky?: boolean;
  }
}

declare module "ui-router-core/lib/transition/interface" {
  interface TreeChanges {
    inactivating?: PathNode[];
    reactivating?: PathNode[];
  }
}

let inactives: PathNode[];
export function stickyStates(router: UIRouter) {
  // Monkey patch the treeChanges function
  PathFactory['_treeChanges'] = PathFactory['_treeChanges'] || PathFactory.treeChanges;
  PathFactory.treeChanges = stickyTreeChanges;

  // Process state.onInactivate callbacks
  const onInactivate = (transition: Transition) =>
      transition.treeChanges('inactivating')
          .filter(node => isFunction(node.state['onInactivate']))
          .forEach(node => node.state['onInactivate'](transition, node.state.self));
  router.transitionService.onStart({}, onInactivate, { priority: -1000 });

  // Process state.onReactivate callbacks
  const onReactivate = (transition: Transition) =>
      transition.treeChanges('reactivating')
          .filter(node => isFunction(node.state['onReactivate']))
          .forEach(node => node.state['onReactivate'](transition, node.state.self));
  router.transitionService.onFinish({}, onReactivate, { priority: 1000 });

  inactives = [];

  return {
    inactives: () => inactives.slice()
  }
}

const getInactive = (node) =>
    node && find(inactives, n => n.state === node.state);

const ancestorPath = (state: State) =>
    state.parent ? ancestorPath(state.parent).concat(state) : [state];

const isDescendantOf = (ancestor: State) =>
    (state: State) =>
        ancestorPath(state).indexOf(ancestor) !== -1;

const isDescendantOfAny = (ancestors: State[]) =>
    (state: State) =>
        ancestors.map(ancestor => isDescendantOf(ancestor)(state)).reduce(anyTrueR, false);


// const isDecendantOf = curry((ancestors: PathNode[], node: PathNode) =>
//     ancestors.map(ancestor => node.state.includes[ancestor.state.name]).reduce(anyTrueR, false));
//
// const isChildOf = curry((ancestors: PathNode[], node: PathNode) =>
//     ancestors.map(ancestor => node.state.parent === ancestor.state).reduce(anyTrueR, false));
//

function findStickyAncestor(state: State) {
  return state.sticky ? state : findStickyAncestor(state.parent);
}

function stickyTreeChanges(fromPath: PathNode[], toPath: PathNode[], reloadState: State): TreeChanges {
  const treeChanges = PathFactory['_treeChanges'];
  // console.log('inactives are currently:', inactives.map(x => x.state.name));
  // console.log('inactives are currently:', inactives.map(x => x.views));

  let inactiveStickies          = inactives.filter(node => node.state.sticky);
  let inactiveNonStickies       = inactives.filter(node => !node.state.sticky);
  let stickyDescendents         = inactiveStickies.map(sticky => {
    let isDescendantOfSticky = isDescendantOf(sticky.state);
    let inactiveChildren = inactives.filter(node => isDescendantOfSticky(node.state));
    return { sticky, inactiveChildren };
  });

  let tc: TreeChanges = treeChanges(fromPath, toPath,  reloadState);
  tc.inactivating = [];
  tc.reactivating = [];

  // TODO: "commit" all changes after transition.promise.then

  /****************
   * Process states that are about to be inactivated
   ****************/

  if (tc.entering.length && tc.exiting[0] && tc.exiting[0].state.sticky) {
    let inactivating = tc.exiting;
    tc.inactivating = inactivating;
    tc.exiting = [];

    inactives = inactives.concat(inactivating);
  }

  /****************
   * Determine which states are about to be reactivated
   ****************/

  // Simulate a transition where the fromPath is a clone of the toPath, but use the inactivated nodes
  // This will calculate which inactive nodes that need to be exited/entered due to param changes
  let inactiveFromPath = tc.retained.concat(tc.entering.map(node => getInactive(node) || null)).filter(identity);
  let simulatedTC = treeChanges(inactiveFromPath, toPath, reloadState);

  // The 'retained' nodes from the simulated transition's TreeChanges are the ones that will be reactivated.
  // (excluding the nodes that are in the original retained path)
  let reactivated = simulatedTC.retained.slice(tc.retained.length);

  if (reactivated.length) {
    tc.reactivating = reactivated;
    // Entering nodes are the same as the simulated transition's entering
    tc.entering = simulatedTC.entering;

    // The simulatedTC 'exiting' nodes are inactives that are being exited because:
    // - The params changed
    // - The inactive is a child of the destination state
    tc.exiting = tc.exiting.concat(simulatedTC.exiting);

    // Rewrite the to path
    tc.to = tc.retained.concat(tc.reactivating).concat(tc.entering);

    // TODO: "commit" all changes after transition.promise.then
    reactivated.forEach(removeFrom(inactives));
    tc.entering.forEach(removeFrom(inactives));
  }

  /****************
   * Determine which additional inactive states should be exited
   ****************/

  const _state = (node: PathNode) => node.state;
  let toNode                    = tail(tc.to);
  let exitingStates             = tc.exiting.map(_state);
  let toStates                  = tc.to.map(_state);

  // Any sticky state whose parent state is exited will be exited
  // Any sticky state whose parent state is exactly activated will be exited
  let exitingStickies           = inactiveStickies.filter(node => {
    return inArray(exitingStates, node.state.parent) || toNode.state === node.state.parent;
  });

  // Any inactive descendant of an exiting state will be exited
  let descendantOfExiting       = inactives.filter(inactive => isDescendantOfAny(exitingStates)(inactive.state));

  // Any inactive descendant of the states being reactivated or entered (that itself isn't being re-activated) will be exited
  let descendantOfReactivating  = inactives.filter(inactive => !inArray(tc.reactivating, inactive))
                                           .filter(inactive => isDescendantOfAny(tc.reactivating.map(_state))(inactive.state));

  let exiting = [exitingStickies, descendantOfExiting, descendantOfReactivating].reduce(unnestR, []).reduce(uniqR, []);
  exiting.forEach(removeFrom(inactives));
  tc.exiting = exiting.concat(tc.exiting);

  // console.log('inactives will be:', inactives.map(x => x.state.name));
  // console.log('inactives will be:', inactives.map(x => x.views));

  console.log('tc', tc);

  if (tc.to.some(node => !node.views)) {
    // console.log("to states views:", tc.to.map(x => x.views));
  }

  return tc;
}


