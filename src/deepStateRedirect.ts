import {
    State, StateDeclaration, Param, UIRouter, RawParams, StateOrName, TargetState, Transition
} from "ui-router-core";
export { deepStateRedirect };

declare module "ui-router-core" {
  interface StateDeclaration {
    dsr?: any;
    deepStateRedirect?: any;
  }
}

function deepStateRedirect($uiRouter: UIRouter): any {
  let $transitions = $uiRouter.transitionService;
  let $state = $uiRouter.stateService;

  $transitions.onRetain({ retained: getDsr }, recordDeepState);
  $transitions.onEnter({ entering: getDsr }, recordDeepState);
  $transitions.onBefore({ to: getDsr }, deepStateRedirect);

  function getDsr(state: StateDeclaration) {
    return state.deepStateRedirect || state.dsr;
  }

  function getConfig(state: StateDeclaration) {
    let dsrProp: any = getDsr(state);
    let propType: string = typeof dsrProp;
    if (propType === 'undefined') return;

    let params;
    let defaultTarget = propType === 'string' ? dsrProp : undefined;
    let fn: Function = propType === 'function' ? dsrProp : undefined;

    if (propType === 'object') {
      fn = dsrProp.fn;
      let defaultType = typeof dsrProp.default;
      if (defaultType === 'object') {
        defaultTarget = $state.target(dsrProp.default.state, dsrProp.default.params, dsrProp.default.options);
      } else if (defaultType === 'string') {
        defaultTarget = $state.target(dsrProp.default);
      }
      if (dsrProp.params === true) {
        params = function () {
          return true;
        }
      } else if (Array.isArray(dsrProp.params)) {
        params = function (param: Param) {
          return dsrProp.params.indexOf(param.id) !== -1;
        }
      }
    }

    fn = fn || ((transition, target) => target);

    return { params: params, default: defaultTarget, fn: fn };
  }

  function paramsEqual(state: State, transParams: RawParams, schemaMatchFn?: (param?: Param) => boolean, negate = false) {
    schemaMatchFn = schemaMatchFn || (() => true);
    let schema = state.parameters({ inherit: true }).filter(schemaMatchFn);
    return function (redirect) {
      let equals = Param.equals(schema, redirect.triggerParams, transParams);
      return negate ? !equals : equals;
    }
  }

  function recordDeepState(transition, state) {
    let paramsConfig = getConfig(state).params;

    transition.promise.then(function () {
      let transTo = transition.to();
      let transParams = transition.params();
      let recordedDsrTarget = $state.target(transTo, transParams);

      if (paramsConfig) {
        state.$dsr = (state.$dsr || []).filter(paramsEqual(transTo.$$state(), transParams, undefined, true));
        state.$dsr.push({ triggerParams: transParams, target: recordedDsrTarget });
      } else {
        state.$dsr = recordedDsrTarget;
      }
    });
  }

  function deepStateRedirect(transition: Transition) {
    let opts = transition.options();
    if (opts['ignoreDsr'] || (opts.custom && opts.custom.ignoreDsr)) return;

    let config = getConfig(transition.to());
    let redirect = getDeepStateRedirect(transition.to(), transition.params());
    redirect = config.fn(transition, redirect);
    if (redirect && redirect.state() === transition.to()) return;

    return redirect
  }

  function getDeepStateRedirect(stateOrName: StateOrName, params: RawParams) {
    let state = $state.get(stateOrName);
    let dsrTarget, config = getConfig(state);
    let $$state = state.$$state();

    if (config.params) {
      var predicate = paramsEqual($$state, params, config.params, false);
      let match = $$state['$dsr'] && $$state['$dsr'].filter(predicate)[0];
      dsrTarget = match && match.target;
    } else {
      dsrTarget = $$state['$dsr'];
    }

    dsrTarget = dsrTarget || config.default;

    if (dsrTarget) {
      // merge original params with deep state redirect params
      let targetParams = Object.assign({}, params, dsrTarget.params());
      dsrTarget = $state.target(dsrTarget.state(), targetParams, dsrTarget.options());
    }

    return dsrTarget;
  }

  return {
    reset: function(state: StateOrName, params?: RawParams) {
      if (!state) {
        $state.get().forEach(state => delete state.$$state()['$dsr']);
      } else if (!params) {
        delete $state.get(state).$$state()['$dsr']
      } else {
        var $$state = $state.get(state).$$state();
        $$state['$dsr'] = $$state['$dsr'].filter(paramsEqual($$state, params, null, true));
      }
    },

    getRedirect: function (state: StateOrName, params?: RawParams) {
      return getDeepStateRedirect(state, params);
    }
  }
}
