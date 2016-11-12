import { getTestGoFn, addCallbacks, resetTransitionLog, pathFrom } from "./util"
import { UIRouter, StateService } from "ui-router-core";
import { deepStateRedirect } from "../src/deepStateRedirect"

const equalityTester = (first, second) =>
  Object.keys(second).reduce((acc, key) =>
      first[key] == second[key] && acc, true);

function getDSRStates() {
  // This function effectively returns the default DSR state at runtime
  function p7DSRFunction(transition, pendingRedirect) {
    // allow standard DSR behavior by returning pendingRedirect $dsr$.redirect has a state set
    if (pendingRedirect && pendingRedirect.state()) return pendingRedirect;

    // Otherwise, return a redirect object {state: "foo", params: {} }
    let redirectState = (transition.params().param == 2) ? "p7.child2" : "p7.child1";
    return transition.router.stateService.target(redirectState);
  }

  return [
    { name: 'other' },
    { name: 'tabs' },
    { name: 'tabs.tabs1', deepStateRedirect: true },
    { name: 'tabs.tabs1.deep' },
    { name: 'tabs.tabs1.deep.nest' },
    { name: 'tabs.tabs2', deepStateRedirect: true },
    { name: 'tabs.tabs2.deep' },
    { name: 'tabs.tabs2.deep.nest' },
    { name: 'p1', url: '/p1/:param1/:param2', deepStateRedirect: { params: ['param1'] }, params: { param1: null, param2: null } },
    { name: 'p1.child' },
    { name: 'p2', url: '/p2/:param1/:param2', deepStateRedirect: { params: true } },
    { name: 'p2.child' },
    { name: 'p3', url: '/p3/:param1', deepStateRedirect: { params: true } },
    { name: 'p3.child' },
    { name: 'p4', url: '/p4', dsr: { default: "p4.child" } },
    { name: 'p4.child' },
    { name: 'p4.child2' },
    { name: 'p5', url: '/p5', dsr: { default: { state: "p5.child", params: { p5param: "1" } } } },
    { name: 'p5.child', url: '/child/:p5param' },
    { name: 'p6', url: '/p6/:param', dsr: { params: true, default: "p6.child1" }, params: { param: null } },
    { name: 'p6.child1' },
    { name: 'p6.child2' },
    { name: 'p6.child3' },
    { name: 'p7', url: '/p7/:param', dsr: { default: {}, fn: p7DSRFunction }, params: { param: null } },
    { name: 'p7.child1' },
    { name: 'p7.child2' },
    { name: 'p8', dsr: true },
    { name: 'p8child1', parent: 'p8' },
    { name: 'p8child2', parent: 'p8' }
  ];
}

function dsrReset(newStates) {
  addCallbacks(newStates);
  resetTransitionLog();
}

let router: UIRouter = undefined;
let $state: StateService = undefined;
let $deepStateRedirect = undefined;
let testGo = undefined;

describe('deepStateRedirect', function () {
  beforeEach(async function (done) {
    jasmine.addCustomEqualityTester(equalityTester);
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000;

    router = new UIRouter();
    router.urlRouterProvider.otherwise('/');
    $state = router.stateService;
    $deepStateRedirect = deepStateRedirect(router);
    router.stateRegistry.stateQueue.autoFlush($state);

    testGo = getTestGoFn(router);

    let newStates = getDSRStates();
    dsrReset(newStates);
    newStates.forEach(state => router.stateRegistry.register(state));

    done();
  });

  describe(' - ', function () {

    it("should toggle between tab states", async function (done) {
      await testGo("tabs", { entered: 'tabs' });
      await testGo("tabs.tabs2", { entered: 'tabs.tabs2' });
      await testGo("tabs.tabs1", { entered: 'tabs.tabs1', exited: 'tabs.tabs2' });

      done();
    });

    it("should redirect to tabs.tabs1.deep.nest", async function (done) {
      await testGo("tabs", { entered: 'tabs' });
      await testGo("tabs.tabs2.deep.nest", { entered: ['tabs.tabs2', 'tabs.tabs2.deep', 'tabs.tabs2.deep.nest'] });
      await testGo("tabs.tabs1", {
        entered: 'tabs.tabs1',
        exited: ['tabs.tabs2.deep.nest', 'tabs.tabs2.deep', 'tabs.tabs2']
      });
      await testGo("tabs.tabs2", {
        entered: ['tabs.tabs2', 'tabs.tabs2.deep', 'tabs.tabs2.deep.nest'],
        exited: 'tabs.tabs1'
      }, { redirect: 'tabs.tabs2.deep.nest' });

      done();
    });

    it("should forget a previous redirect to tabs.tabs2.deep.nest", async function (done) {
      await testGo("tabs", { entered: 'tabs' });
      await testGo("tabs.tabs2.deep.nest", { entered: ['tabs.tabs2', 'tabs.tabs2.deep', 'tabs.tabs2.deep.nest'] });
      await testGo("tabs.tabs1.deep.nest", {
        entered: ['tabs.tabs1', 'tabs.tabs1.deep', 'tabs.tabs1.deep.nest'],
        exited: ['tabs.tabs2.deep.nest', 'tabs.tabs2.deep', 'tabs.tabs2']
      });
      await testGo("tabs.tabs2", {
        entered: ['tabs.tabs2', 'tabs.tabs2.deep', 'tabs.tabs2.deep.nest'],
        exited: ['tabs.tabs1.deep.nest', 'tabs.tabs1.deep', 'tabs.tabs1']
      }, { redirect: 'tabs.tabs2.deep.nest' });
      await testGo("tabs.tabs1", {
        entered: ['tabs.tabs1', 'tabs.tabs1.deep', 'tabs.tabs1.deep.nest'],
        exited: ['tabs.tabs2.deep.nest', 'tabs.tabs2.deep', 'tabs.tabs2']
      }, { redirect: 'tabs.tabs1.deep.nest' });

      $deepStateRedirect.reset("tabs.tabs2");

      await testGo("tabs.tabs2", {
        entered: ['tabs.tabs2'],
        exited: ['tabs.tabs1.deep.nest', 'tabs.tabs1.deep', 'tabs.tabs1']
      });
      await testGo("tabs.tabs1", {
        entered: ['tabs.tabs1', 'tabs.tabs1.deep', 'tabs.tabs1.deep.nest'],
        exited: ['tabs.tabs2']
      }, { redirect: 'tabs.tabs1.deep.nest' });

      $deepStateRedirect.reset();

      await testGo("tabs.tabs2", {
        entered: 'tabs.tabs2',
        exited: ['tabs.tabs1.deep.nest', 'tabs.tabs1.deep', 'tabs.tabs1']
      });
      await testGo("tabs.tabs1", { entered: 'tabs.tabs1', exited: ['tabs.tabs2'] });

      done();
    });
  });

  describe("with child substates configured using {parent: parentState}", function () {
    it("should remember and redirect to the last deepest state", async function (done) {
      await testGo("p8child1");
      await testGo("other");
      await testGo("p8", undefined, { redirect: 'p8child1' });

      done();
    });
  });

  describe('with configured params', function () {
    it("should redirect only when params match", async function (done) {
      await $state.go("p1", { param1: "foo", param2: "foo2" });
      expect($state.current.name).toEqual("p1");
      expect($state.params).toEqual({ "#": null, param1: "foo", param2: "foo2" });

      await $state.go(".child");
      expect($state.current.name).toEqual("p1.child");

      await $state.go("p1", { param1: "bar" });
      expect($state.current.name).toEqual("p1");

      await $state.go("p1", { param1: "foo", param2: "somethingelse" });
      expect($state.current.name).toEqual("p1.child"); // DSR

      done();
    });

    // Test for issue #184 getRedirect()
    it("should be returned from getRedirect() for matching DSR params", async function (done) {
      await $state.go("p1", { param1: "foo", param2: "foo2" });
      await $state.go(".child");

      expect($deepStateRedirect.getRedirect("p1", { param1: "foo" }).state().name).toBe("p1.child");
      expect($deepStateRedirect.getRedirect("p1", { param1: "bar" })).toBeUndefined();

      done();
    });

    it("should not redirect if a param is resetted", async function (done) {
      await $state.go("p3", { param1: "foo" });
      await $state.go(".child");
      await $state.go("p3", { param1: "bar" });
      await $state.go(".child");

      $deepStateRedirect.reset("p3", { param1: 'foo' });

      await $state.go("p3", { param1: "foo" });
      expect($state.current.name).toEqual("p3"); // DSR

      await $state.go("p3", { param1: "bar" });
      expect($state.current.name).toEqual("p3.child"); // DSR

      done();
    });

    it("should redirect only when all params match if 'params: true'", async function (done) {
      await $state.go("p2", { param1: "foo", param2: "foo2" });

      expect($state.current.name).toEqual("p2");
      expect($state.params).toEqual({ param1: "foo", param2: "foo2" });

      await $state.go(".child");
      expect($state.current.name).toEqual("p2.child");

      await $state.go("p2", { param1: "bar" });
      expect($state.current.name).toEqual("p2");

      await $state.go("p2", { param1: "foo", param2: "somethingelse" });
      expect($state.current.name).toEqual("p2");

      await $state.go("p2", { param1: "foo", param2: "foo2" });
      expect($state.current.name).toEqual("p2.child"); // DSR

      done();
    });
  });

  describe('ignoreDsr option', function () {
    it("should not redirect to tabs.tabs2.deep.nest when options are: { ignoreDsr: true }", async function (done) {
      await testGo("tabs", { entered: 'tabs' });
      await testGo("tabs.tabs2.deep.nest", { entered: pathFrom('tabs.tabs2', 'tabs.tabs2.deep.nest') });
      await testGo("tabs.tabs1.deep.nest", {
        entered: pathFrom('tabs.tabs1', 'tabs.tabs1.deep.nest'),
        exited: pathFrom('tabs.tabs2.deep.nest', 'tabs.tabs2')
      });
      await $state.go("tabs.tabs2", {}, { custom: { ignoreDsr: true } });

      expect($state.current.name).toBe("tabs.tabs2");

      done();
    });

    it("should redirect to tabs.tabs2.deep.nest after a previous ignoreDsr transition", async function (done) {
      await testGo("tabs", { entered: 'tabs' });
      await testGo("tabs.tabs2.deep.nest", { entered: pathFrom('tabs.tabs2', 'tabs.tabs2.deep.nest') });
      await testGo("tabs.tabs1.deep.nest", {
        entered: pathFrom('tabs.tabs1', 'tabs.tabs1.deep.nest'),
        exited: pathFrom('tabs.tabs2.deep.nest', 'tabs.tabs2')
      });

      await $state.go("tabs.tabs2", {}, { custom: { ignoreDsr: true } });

      expect($state.current.name).toBe("tabs.tabs2");

      resetTransitionLog();
      await testGo("tabs.tabs1", {
        exited: 'tabs.tabs2',
        entered: pathFrom('tabs.tabs1', 'tabs.tabs1.deep.nest')
      }, { redirect: 'tabs.tabs1.deep.nest' });

      done();
    });

    it("should remember the DSR state itself when transitioned to using ignoreDsr ", async function (done) {
      await testGo("tabs.tabs1.deep", { entered: pathFrom('tabs', 'tabs.tabs1.deep') });
      await testGo("tabs.tabs2", { entered: 'tabs.tabs2', exited: pathFrom('tabs.tabs1.deep', 'tabs.tabs1') });

      await $state.go("tabs.tabs1", {}, { custom: { ignoreDsr: true } });

      expect($state.current.name).toBe("tabs.tabs1");
      await $state.go("tabs.tabs2", {}, {});

      expect($state.current.name).toBe("tabs.tabs2");
      await $state.go("tabs.tabs1", {}, {});

      expect($state.current.name).toBe("tabs.tabs1");

      done();
    });
  });

  describe("default substates", function () {
    // Test for issue #184 getRedirect()
    it("should be returned by getRedirect", function () {
      expect($deepStateRedirect.getRedirect("p4").state().name).toBe("p4.child");
    });

    it("should affect the first transition to the DSR state", async function (done) {
      await testGo("p4", undefined, { redirect: 'p4.child' });
      await testGo("p4.child2");
      await testGo("p4", undefined, { redirect: 'p4.child2' });

      done()
    });

    it("should provide default parameters", async function (done) {
      await testGo("p5", undefined, { redirect: 'p5.child' });
      expect($state.params).toEqual({ p5param: "1" });

      done();
    });

    it("should redirect to the default state when params: true and transition to DSR with un-seen param values", async function (done) {
      await testGo("p6", undefined, { params: { param: "1" }, redirect: 'p6.child1' });
      await testGo("p6.child2");
      await testGo("p6", undefined, { params: { param: "1" }, redirect: 'p6.child2' });
      // await testGo("p6", undefined, { params: { param: "2" }, redirect: 'p6.child1' });

      done();
    });

    describe("in conjunction with a dsr fn", function () {
      it("should still invoke the dsr fn and use the result", async function (done) {
        // This effectively allows a function to determine DSR default
        await testGo("p7", undefined, { params: { param: "2" }, redirect: 'p7.child2' });
        await testGo("p7.child1");
        await testGo("p7", undefined, { params: { param: "2" }, redirect: 'p7.child1' });

        done();
      });

      it("should still invoke the dsr fn and use the result", async function (done) {
        // This effectively allows the default DSR to be determined by a fn
        await testGo("p7", undefined, { redirect: 'p7.child1' });
        await testGo("p1");
        await testGo("p7", undefined, { params: { param: "2" }, redirect: 'p7.child1' });

        done();
      });

    })
  })
});
