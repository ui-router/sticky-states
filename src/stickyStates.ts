import {
  UIRouter, PathUtils, StateOrName, StateObject, StateDeclaration, PathNode, TreeChanges, Transition, UIRouterPluginBase,
  TransitionHookPhase, TransitionHookScope, TransitionServicePluginAPI, HookMatchCriteria, TransitionStateHookFn,
  HookRegOptions, PathType, find, tail, isString, isArray, inArray, removeFrom, pushTo, identity, anyTrueR, assertMap,
  uniqR, defaultTransOpts, HookMatchCriterion,
} from '@uirouter/core';

declare module '@uirouter/core/lib/state/interface' {
  interface StateDeclaration { // tslint:disable-line:no-shadowed-variable
    sticky?: boolean;
    onInactivate?: TransitionStateHookFn;
    onReactivate?: TransitionStateHookFn;
  }
}

declare module '@uirouter/core/lib/state/stateObject' {
  interface StateObject { // tslint:disable-line:no-shadowed-variable
    sticky?: boolean;
    onInactivate?: TransitionStateHookFn;
    onReactivate?: TransitionStateHookFn;
  }
}

declare module '@uirouter/core/lib/transition/transitionService' {
  interface TransitionService {
    onInactivate: (criteria: HookMatchCriteria, callback: TransitionStateHookFn, options?: HookRegOptions) => Function;
    onReactivate: (criteria: HookMatchCriteria, callback: TransitionStateHookFn, options?: HookRegOptions) => Function;
  }
}

declare module '@uirouter/core/lib/transition/interface' {
  interface TransitionOptions {
    exitSticky?: StateOrName[]|StateOrName;
  }

  interface TreeChanges { // tslint:disable-line:no-shadowed-variable
    inactivating?: PathNode[];
    reactivating?: PathNode[];
  }

  export interface IMatchingNodes {
    inactivating: PathNode[];
    reactivating: PathNode[];
  }

  export interface PathTypes {
    inactivating: PathType;
    reactivating: PathType;
  }

  export interface HookMatchCriteria { // tslint:disable-line:no-shadowed-variable
    /** A [[HookMatchCriterion]] to match any state that would be inactivating */
    inactivating?: HookMatchCriterion;
    /** A [[HookMatchCriterion]] to match any state that would be reactivating */
    reactivating?: HookMatchCriterion;
  }
}

const notInArray = (arr: any[]) => (item) => !inArray(arr, item);

const isChildOf = (parent: PathNode) =>
    (node: PathNode) =>
    node.state.parent === parent.state;

const isChildOfAny = (_parents: PathNode[]) => {
  return (node: PathNode) =>
      _parents.map(parent => isChildOf(parent)(node)).reduce(anyTrueR, false);
};

const ancestorPath = (state: StateObject) =>
    state.parent ? ancestorPath(state.parent).concat(state) : [state];

const isDescendantOf = (_ancestor: PathNode) => {
  const ancestor = _ancestor.state;
  return (node: PathNode) =>
  ancestorPath(node.state).indexOf(ancestor) !== -1;
};

const isDescendantOfAny = (ancestors: PathNode[]) =>
    (node: PathNode) =>
        ancestors.map(ancestor => isDescendantOf(ancestor)(node))
            .reduce(anyTrueR, false);

// function findStickyAncestor(state: StateObject) {
//   return state.sticky ? state : findStickyAncestor(state.parent);
// }



/**
 * Sorts fn that sorts by:
 * 1) node depth (how deep a state is nested)
 * 2) the order in which the state was inactivated (later in wins)
 */
function nodeDepthThenInactivateOrder(inactives: PathNode[]) {
  return function(l: PathNode, r: PathNode): number {
    const depthDelta = (l.state.path.length - r.state.path.length);
    return depthDelta !== 0 ? depthDelta : inactives.indexOf(r) - inactives.indexOf(l);
  };
}
export class StickyStatesPlugin extends UIRouterPluginBase {
  name = 'sticky-states';
  private _inactives: PathNode[] = [];
  private pluginAPI: TransitionServicePluginAPI;

  constructor(public router: UIRouter) {
    super();

    this.pluginAPI = router.transitionService._pluginapi;

    this._defineStickyPaths();
    this._defineStickyEvents();
    this._addCreateHook();
    this._addStateCallbacks();
    this._addDefaultTransitionOption();
  }

  inactives(): StateDeclaration[] {
    return this._inactives.map(node => node.state.self);
  }

  private _addCreateHook() {
    this.router.transitionService.onCreate({}, (trans) => {
      trans['_treeChanges'] = this._calculateStickyTreeChanges(trans);
    }, { priority: 100 });
  }

  private _defineStickyPaths() {
    // let paths = this.pluginAPI._getPathTypes();
    this.pluginAPI._definePathType('inactivating', TransitionHookScope.STATE);
    this.pluginAPI._definePathType('reactivating', TransitionHookScope.STATE);
  }

  private _defineStickyEvents() {
    const paths = this.pluginAPI._getPathTypes();
    this.pluginAPI._defineEvent('onInactivate', TransitionHookPhase.RUN, 5, paths.inactivating, true);
    this.pluginAPI._defineEvent('onReactivate', TransitionHookPhase.RUN, 35, paths.reactivating);
  }

  // Process state.onInactivate or state.onReactivate callbacks
  private _addStateCallbacks() {
    const inactivateCriteria = { inactivating: state => !!state.onInactivate };
    this.router.transitionService.onInactivate(inactivateCriteria, (trans: Transition, state: StateDeclaration) =>
        state.onInactivate(trans, state));

    const reactivateCriteria = { reactivating: state => !!state.onReactivate };
    this.router.transitionService.onReactivate(reactivateCriteria, (trans: Transition, state: StateDeclaration) =>
        state.onReactivate(trans, state));
  }


  private _calculateExitSticky(tc: TreeChanges, trans: Transition) {
    // Process the inactive states that are going to exit due to $stickyState.reset()
    let exitSticky = trans.options().exitSticky || [];
    if (!isArray(exitSticky)) exitSticky = [exitSticky];

    const $state = trans.router.stateService;

    const states: StateObject[] = (exitSticky as any[])
        .map(assertMap((stateOrName) => $state.get(stateOrName), (state) => 'State not found: ' + state))
        .map(state => state.$$state());

    const potentialExitingStickies = this._inactives.concat(tc.inactivating).reduce(uniqR, []) as PathNode[];

    const findInactive = state => potentialExitingStickies.find(node => node.state === state);
    const notInactiveMsg = (state) => 'State not inactive: ' + state;
    const exitingInactives = states.map(assertMap(findInactive, notInactiveMsg));
    const exiting = potentialExitingStickies.filter(isDescendantOfAny(exitingInactives));

    const inToPathMsg = (node) => 'Can not exit a sticky state that is currently active/activating: ' + node.state.name;
    exiting.map(assertMap(node => !inArray(tc.to, node), inToPathMsg));

    return exiting;
  }

  private _calculateStickyTreeChanges(trans: Transition): TreeChanges {
    const tc: TreeChanges = trans.treeChanges();
    tc.inactivating = [];
    tc.reactivating = [];

    /****************
     * Process states that are about to be inactivated
     ****************/

    if (tc.entering.length && tc.exiting[0] && tc.exiting[0].state.sticky) {
      tc.inactivating = tc.exiting;
      tc.exiting = [];
    }

    /****************
     * Determine which states are about to be reactivated
     ****************/

    // Simulate a transition where the fromPath is a clone of the toPath, but use the inactivated nodes
    // This will calculate which inactive nodes that need to be exited/entered due to param changes
    const inactiveFromPath = tc.retained.concat(tc.entering.map(node => this._getInactive(node) || null)).filter(identity);
    const simulatedTC = PathUtils.treeChanges(inactiveFromPath, tc.to, trans.options().reloadState);

    const shouldRewritePaths = ['retained', 'entering', 'exiting'].some(path => !!simulatedTC[path].length);

    if (shouldRewritePaths) {
      // The 'retained' nodes from the simulated transition's TreeChanges are the ones that will be reactivated.
      // (excluding the nodes that are in the original retained path)
      tc.reactivating = simulatedTC.retained.slice(tc.retained.length);

      // Entering nodes are the same as the simulated transition's entering
      tc.entering = simulatedTC.entering;

      // The simulatedTC 'exiting' nodes are inactives that are being exited because:
      // - The inactive state's params changed
      // - The inactive state is being reloaded
      // - The inactive state is a child of the to state
      tc.exiting = tc.exiting.concat(simulatedTC.exiting);

      // Rewrite the to path
      tc.to = tc.retained.concat(tc.reactivating).concat(tc.entering);
    }

    /****************
     * Determine which additional inactive states should be exited
     ****************/

    const inactives = this._inactives;

    // Any inactive state whose parent state is exactly activated will be exited
    const childrenOfToState = inactives.filter(isChildOf(tail(tc.to)));

    // Any inactive non-sticky state whose parent state is activated (and is itself not activated) will be exited
    const childrenOfToPath = inactives.filter(isChildOfAny(tc.to))
        .filter(notInArray(tc.to))
        .filter(node => !node.state.sticky);

    const exitingChildren = childrenOfToState.concat(childrenOfToPath).filter(notInArray(tc.exiting));

    const exitingRoots = tc.exiting.concat(exitingChildren);

    // Any inactive descendant of an exiting state will be exited
    const orphans = inactives.filter(isDescendantOfAny(exitingRoots))
        .filter(notInArray(exitingRoots))
        .concat(exitingChildren)
        .reduce<PathNode[]>(uniqR, [])
        .sort(nodeDepthThenInactivateOrder(inactives));

    tc.exiting = orphans.concat(tc.exiting);

    // commit all changes to inactives after transition is successful
    trans.onSuccess({}, () => {
      tc.exiting.forEach(removeFrom(this._inactives));
      tc.entering.forEach(removeFrom(this._inactives));
      tc.reactivating.forEach(removeFrom(this._inactives));
      tc.inactivating.forEach(pushTo(this._inactives));
    });

    // console.log('inactives will be:', inactives.map(x => x.state.name));

    // let tcCopy: any = Object.assign({}, tc);
    // Object.keys(tcCopy).forEach(key => tcCopy[key] = tcCopy[key].map(x => x.state.name));
    // console.table(tcCopy);

    // Process the inactive sticky states that should be exited
    const exitSticky = this._calculateExitSticky(tc, trans);
    exitSticky.filter(notInArray(tc.exiting)).forEach(pushTo(tc.exiting));

    // Also process the active sticky states that are about to be inactivated, but should be exited
    exitSticky.filter(inArray(tc.inactivating)).forEach(removeFrom(tc.inactivating));

    return tc;
  }


  private _addDefaultTransitionOption() {
    defaultTransOpts.exitSticky = [];
  }

  /**
   * Exits inactive sticky state(s)
   *
   * #### Example:
   * ```js
   * $stickyState.exitSticky('inactivestate');
   * ```
   *
   * ```js
   * $stickyState.exitSticky([ 'inactivestate1', 'inactivestate2' ]);
   * ```
   *
   * ```js
   * // exit all inactive stickies
   * $stickyState.exitSticky();
   * ```
   *
   * ```js
   * // exit all inactive stickies
   * $stickyState.exitSticky($stickyState.inactives());
   * ```
   * @param states The state name, or an array of state names
   */
  exitSticky();
  exitSticky(states: StateOrName);
  exitSticky(states: StateOrName[]);
  exitSticky(states?: any) {
    const $state = this.router.stateService;
    if (states === undefined) states = this._inactives.map(node => node.state.name);
    if (isString(states)) states = [states];

    return $state.go($state.current, {}, {
      inherit: true,
      exitSticky: states,
    });
  }

  _getInactive = (node) =>
    node && find(this._inactives, n => n.state === node.state);
}


