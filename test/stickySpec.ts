import { getTestGoFn, addCallbacks, resetTransitionLog, pathFrom, equalityTester, tlog } from "./util";
import {
  UIRouter, StateService, StateRegistry, StateDeclaration, ViewService, TransitionService, PathNode, _ViewDeclaration,
  isObject, ViewConfigFactory, ViewConfig
} from "ui-router-core";
import "../src/stickyStates";
import { StickyStatesPlugin } from "../src/stickyStates";
import { memoryLocationPlugin, servicesPlugin } from 'ui-router-core/lib/vanilla';

let router: UIRouter;
let $state: StateService;
let $transitions: TransitionService;
let $view: ViewService;
let $registry: StateRegistry;
let $stickyState: StickyStatesPlugin;
let testGo: Function;

function ssReset(newStates: StateDeclaration[]) {
  resetTransitionLog();
  addCallbacks(newStates);
  newStates.forEach(state => $registry.register(state));
}

let _id = 0;

describe('stickyState', function () {
  beforeEach(function () {
    jasmine.addCustomEqualityTester(equalityTester);
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000;

    router = new UIRouter();
    router.plugin(servicesPlugin);
    router.plugin(memoryLocationPlugin);
    $stickyState = router.plugin(StickyStatesPlugin);
    router.urlService.rules.otherwise('/');

    // ui-router-core doesn't have a default views builder
    router.stateRegistry.decorator("views", function (state, parentFn) {
      if (isObject(state.views)) {
        return Object.keys(state.views).map(key => (
          { $name: key, $uiViewName: key, $uiViewContextAnchor: state.name, $type: "core", $context: state }
        ), []);
      }

      return [
        { $name: "$default", $uiViewName: "$default", $uiViewContextAnchor: state.name, $type: "core", $context: state }
      ];
    });

    // ui-router-core doesn't have a default ViewConfigFactory
    const factory: ViewConfigFactory = (path: PathNode[], decl: _ViewDeclaration) => {
      return { $id: _id++, viewDecl: decl, load: () => {}, path: path } as ViewConfig;
    };
    router.viewService._pluginapi._viewConfigFactory("core", factory);

    $state = router.stateService;
    $transitions = router.transitionService;
    $view = router.viewService;
    $registry = router.stateRegistry;

    testGo = getTestGoFn(router);
  });

  let controllerInvokeCount = 0, resolveCount = 0, Xvalue = undefined;
  function resetXResolve() {
    controllerInvokeCount = resolveCount = 0; Xvalue = undefined;
  }

  // Set up base state heirarchy
  function getSimpleStates(): StateDeclaration[] {
    return [
      { name: 'main', },
      { name: 'A' },
      { name: 'A._1', sticky: true, views: { '_1@A': {} } },
      { name: 'A._2', sticky: true, views: { '_2@A': {} } },
      { name: 'A._2.__1',  },
      { name: 'A._3',
        sticky: true,
        views: { '_3@A': { } },
        resolve: { X: function () { return Promise.resolve(++resolveCount); }}
      }
    ];
  }

  function getNestedStickyStates() {
    return [
      { name: 'aside', },
      { name: 'A', sticky: true, deepStateRedirect: true, views: { 'A@': {} }},

      { name: 'A._1', sticky: true, deepStateRedirect: true, views: { '_1@A': {} }},
      { name: 'A._2', sticky: true, deepStateRedirect: true, views: { '_2@A': {} }},
      { name: 'A._3', sticky: true, views: { '_3@A': {} }},

      { name: 'A._1.__1', },
      { name: 'A._1.__2', },
      { name: 'A._1.__3', sticky: true},
      { name: 'A._2.__1', },
      { name: 'A._2.__2', },
      { name: 'A._3.__1',  views: { '__1@A._3': {} } },
      { name: 'A._3.__2',  views: { '__2@A._3': {} } },

      { name: 'A._1.__1.B', },
      { name: 'A._1.__1.B.___1', sticky: true, views: { '___1@A._1.__1.B': {} }},
      { name: 'A._1.__1.B.___2', sticky: true, views: { '___2@A._1.__1.B': {} }},
      { name: 'A._1.__1.B.___3', sticky: true, views: { '___3@A._1.__1.B': {} }},

      { name: 'typedparam',  sticky: true, url: '/typedparam/{boolparam:bool}' },
      { name: 'typedparam2',  sticky: true, url: '/typedparam2/{jsonparam:json}' },

      { name: 'inherit',  url: '/inherit/:id' },
      { name: 'inherit.one',  sticky: true, url: '/one', views: { 'one@inherit': {} } },
      { name: 'inherit.two',  sticky: true, url: '/two', views: { 'two@inherit': {} } },
    ];
  }

  describe('setup: ', function() {
    beforeEach(function() {
      ssReset(getSimpleStates());
    });

    it('parent state of "main" should be called ""', function() {
      let root = $state.get("main").$$state().parent;
      expect(root.name).toBe("");
      expect(root).toBe($registry.root());
    });

    it('$stickyState.$inactives should be an array', function() {
      expect(Array.isArray($stickyState.inactives())).toBeTruthy();
    });

    it('$stickyState.inactives() should hold inactive State Declarations', async function(done) {
      await testGo("A._1", { entered: [ "A", "A._1" ]});
      await testGo("A._2", { inactivated: "A._1", entered: "A._2" });

      expect($stickyState.inactives().length).toBe(1);
      expect(typeof $stickyState.inactives()[0].$$state).toBe('function');

      done();
    });
  });

  describe('simple sticky .go() transitions', function () {
    beforeEach(function() {
      resetXResolve();
      ssReset(getSimpleStates());
    });

    it('should transition normally between non-sticky states', async function (done) {
      await testGo('main');
      await testGo('A');

      done();
    });

    it('should transition normally between non-sticky and sticky states', async function (done) {
      await testGo('A', { entered: ['A'] });
      await testGo('A._1', { entered: ['A._1'] });

      done();
    });

    it('should inactivate sticky state A._1 when transitioning to sibling-to-sticky A._2', async function (done) {
      await testGo('A', {entered: ['A']});
      await testGo('A._1', {entered: ['A._1']});
      await testGo('A._2', {entered: 'A._2', inactivated: ['A._1']});

      done();
    });

    it('should inactivate sticky state A._1 when transitioning to child-of-sibling-to-sticky A._2.__1', async function (done) {
      await testGo('A', {entered: ['A']});
      await testGo('A._1', {entered: ['A._1']});
      await testGo('A._2.__1', {entered: ['A._2', 'A._2.__1'], inactivated: ['A._1']});

      done();
    });

    it('should reactivate sticky state A._1 when transitioning back from sibling-to-sticky A._2', async function (done) {
      await testGo('A', {entered: ['A']});
      await testGo('A._1', {entered: ['A._1']});
      await testGo('A._2', {inactivated: ['A._1'], entered: 'A._2'});
      await testGo('A._1', {inactivated: ['A._2'], reactivated: 'A._1'});

      done();
    });

    it('should inactivate and reactivate A._1 and A._2 when transitioning back and forth', async function (done) {
      await testGo('A', {entered: ['A']});
      await testGo('A._1', {entered: ['A._1']});
      await testGo('A._2', {inactivated: ['A._1'], entered: ['A._2']});
      await testGo('A._1', {inactivated: ['A._2'], reactivated: ['A._1']});
      await testGo('A._2', {inactivated: ['A._1'], reactivated: ['A._2']});

      done();
    });

    it('should inactivate and reactivate A._1 and A._2 and A._3 when transitioning back and forth', async function (done) {
      await testGo('A', {entered: ['A']});
      await testGo('A._1', {entered: ['A._1']});
      await testGo('A._2', {inactivated: ['A._1'], entered: ['A._2']});
      await testGo('A._3', {inactivated: ['A._2'], entered: ['A._3']});
      await testGo('A._1', {inactivated: ['A._3'], reactivated: ['A._1']});
      await testGo('A._2', {inactivated: ['A._1'], reactivated: ['A._2']});
      await testGo('A._3', {inactivated: ['A._2'], reactivated: ['A._3']});

      done();
    });

    it('should exit sticky state A._1 when transitioning up to parent A', async function (done) {
      await testGo('A', {entered: ['A']});
      await testGo('A._1', {entered: ['A._1']});
      await testGo('A', {exited: ['A._1']});

      done();
    });

    it('should exit children A._1 and A._2 and A._3 when transitioning up to parent A', async function (done) {
      await testGo('A', {entered: ['A']});
      await testGo('A._1', {entered: ['A._1']});
      await testGo('A._2', {inactivated: ['A._1'], entered: ['A._2']});
      await testGo('A._3', {inactivated: ['A._2'], entered: ['A._3']});

      // orphans exited first in reverse order of when they were inactivated; from state exited last
      await testGo('A', {exited: ['A._3', 'A._1', 'A._2']});

      done();
    });

    it('should exit children A._1 and A._2 and A._3 when transitioning back from sibling to parent A', async function (done) {
      await testGo('A', {entered: ['A']});
      await testGo('A._1', {entered: ['A._1']});
      await testGo('A._2', {inactivated: ['A._1'], entered: ['A._2']});
      await testGo('A._3', {inactivated: ['A._2'], entered: ['A._3']});

      // orphans exited first in reverse order of when they were inactivated; from state exited last
      await testGo('A', {exited: ['A._3', 'A._1', 'A._2']});
      await testGo('main', { entered: ['main'], exited: ['A']});

      done();
    });

    it('should allow empty transitionTo options', function() {
      expect(() => $state.transitionTo('A')).not.toThrow();
    });
  });

  describe('resolve/controller function', function () {
    beforeEach(function () {
      resetXResolve();
      ssReset(getSimpleStates());
    });

    it('should resolve when the sticky state is entered', async function (done) {
      await testGo('main');
      await testGo('A._3');
      expect(resolveCount).toBe(1);

      done();
    });

    // Test for issue #22
    it('should not re-resolve when the sticky state is reactivated', async function (done) {
      await testGo('main', { entered: 'main' });
      await testGo('A._3', { exited: 'main', entered: [ 'A', 'A._3' ]});
      await testGo('A._1', { inactivated: 'A._3', entered: 'A._1' });
      await testGo('A._3', { reactivated: 'A._3', inactivated: 'A._1'});
      expect(resolveCount).toBe(1);

      done();
    });

    it('should re-resolve when the sticky state is exited/reentered', async function (done) {
      await testGo('main', { entered: 'main' });
      await testGo('A._3', { exited: 'main', entered: [ 'A', 'A._3' ]});
      await testGo('A._1', { inactivated: 'A._3', entered: 'A._1' });
      await testGo('A._3', { reactivated: 'A._3', inactivated: 'A._1'});
      expect(resolveCount).toBe(1);

      // orphans exited first in reverse order of when they were inactivated; from path exited last
      await testGo('main', { entered: 'main', exited: [ 'A', 'A._3', 'A._1' ] });
      await testGo('A._3', { entered: [ 'A', 'A._3' ], exited: 'main'});
      expect(resolveCount).toBe(2);

      done();
    });
  });

  describe('with params in parent', function() {
    function getIssue24States() {
      return [
        { name: 'main' },
        { name: 'main.product', url: '/products/:product_id' },
        { name: 'main.product.something' },
        { name: 'main.product.something.tab1', sticky: true, views: { 'tab1@main.product.something': {} } },
        { name: 'main.product.something.tab2', sticky: true, views: { 'tab2@main.product.something': {} } }
      ];
    }

    beforeEach(function() {
      ssReset(getIssue24States());
    });

    it("should reactivate", async function(done) {
      await testGo('main');
      await $state.go('main.product', { 'product_id': 12345 });

      resetTransitionLog();
      await testGo('main.product.something.tab1', { entered: ['main.product.something', 'main.product.something.tab1' ]} );
      await testGo('main.product.something.tab2', { entered: 'main.product.something.tab2', inactivated: 'main.product.something.tab1' });
      await testGo('main.product.something.tab1', { reactivated: 'main.product.something.tab1', inactivated: 'main.product.something.tab2' });

      done();
    });
  });

  describe('with typed params', function() {
    beforeEach(function() {
      ssReset(getNestedStickyStates());
    });

    // Test for issue #239
    it('should reactivate properly', async function (done) {
      await testGo('typedparam', undefined, { params: { boolparam: true } });
      await testGo('A');
      expect(router.urlService.url()).toBe("/typedparam/1");
      resetTransitionLog();
      await testGo('typedparam', {inactivated: 'A', reactivated: 'typedparam'}, { params: { boolparam: true } });

      done();
    });

    // Test 2 for issue #239
    it('should reactivate properly with equivalent json', async function (done) {
      let objparam = { foo: "bar" };
      await testGo('typedparam2', undefined, { params: { jsonparam: objparam } });
      await testGo('A');
      expect(router.urlService.url()).toBe("/typedparam2/%7B%22foo%22%3A%22bar%22%7D");
      resetTransitionLog();
      await testGo('typedparam2', {inactivated: 'A', reactivated: 'typedparam2'}, { params: { jsonparam: { foo: "bar" } } });

      done();
    });
  });

  function getParameterizedStates() {
    return [
      { name: 'main' },
      { name: 'main.other', sticky: true, views: { 'other@main': {} } },
      { name: 'main.product', sticky: true, views: { 'product@main': {} }, url: '/:product_id' },
      { name: 'main.product.something' }
    ];
  }

  describe('with params in sticky state', function() {
    beforeEach(function() {
      ssReset(getParameterizedStates());
    });

    it("should reload when params change", async function(done) {
      await testGo('main', { entered: 'main' });

      let options = { params: { 'product_id': 12345 } };
      await testGo('main.product.something', { entered: pathFrom('main.product', 'main.product.something') }, options);
      await testGo('main.other', { entered: 'main.other', inactivated: [ 'main.product', 'main.product.something' ] });
      await testGo('main.product.something', { reactivated: ['main.product', 'main.product.something'], inactivated: 'main.other' }, options);
      await testGo('main.other', { reactivated: 'main.other', inactivated: [ 'main.product', 'main.product.something' ] });
      resetTransitionLog();

      // Change param value on main.product
      options.params.product_id = 54321;
      await testGo('main.product.something', {
        exited: ['main.product', 'main.product.something'],
        entered: ['main.product', 'main.product.something'],
        inactivated: 'main.other' }, options);

      done();
    });
  });

  describe('nested sticky .go() transitions', function () {
    beforeEach(function() {
      ssReset(getNestedStickyStates());
    });

    it('should inactivate sticky state tabs_tab1 when transitioning back to A', async function (done) {
      await testGo('aside', { entered: ['aside'] });
      await testGo('A._1.__1.B.___1', { exited: ['aside'],                entered: pathFrom('A', 'A._1.__1.B.___1') });
      await testGo('A._1.__1.B.___2', { inactivated: ['A._1.__1.B.___1'], entered:     ['A._1.__1.B.___2'] });

      done();
    });

    it('should reactivate child-of-sticky state ___1 when transitioning back to A._1.__1', async function (done) {
      await testGo('aside', { entered: ['aside']});
      await testGo('A._1.__1', { exited: ['aside'],                         entered: pathFrom('A', 'A._1.__1') });
      await testGo('A._2.__2', { inactivated: pathFrom('A._1', 'A._1.__1'), entered: pathFrom('A._2', 'A._2.__2') });
      await testGo('aside',    { inactivated: pathFrom('A', 'A._2.__2') ,   entered: ['aside'] });
      await testGo('A._2.__2', { exited: ['aside'],                         reactivated: pathFrom('A', 'A._2.__2') }, { redirect: 'A._2.__2' });
      await testGo('A._1.__1', { inactivated: pathFrom('A._2', 'A._2.__2'), reactivated: pathFrom('A._1', 'A._1.__1') }, { redirect: 'A._1.__1' });

      done();
    });


    describe("to an inactive state with inactive children", function() {
      it("should exit inactive child states", async function (done) {
        await testGo('A._3.__1', { entered: pathFrom('A', 'A._3.__1') });
        await testGo('A._2', { inactivated: pathFrom('A._3', 'A._3.__1'), entered: "A._2" });
        await testGo('A._3', { reactivated: "A._3", inactivated: "A._2", exited: "A._3.__1" });

        done();
      });
    });

    describe("to an exited substate of an inactive state with inactive children", function() {
      // Test for issue https://github.com/christopherthielen/ui-router-extras/issues/131
      it("should not exit inactive child states", async function(done) {
        await testGo('A._3.__1', { entered: pathFrom('A', 'A._3.__1') });
        await testGo('A._2', { inactivated: pathFrom('A._3', 'A._3.__1'), entered: "A._2" });
        await testGo('A._3.__2', { reactivated: "A._3", inactivated: "A._2", entered: "A._3.__2", exited: "A._3.__1" });

        done();
      });
    });

    describe("from a sticky state directly to a parent", function() {
      it("should exit the sticky state", async function(done) {
        await testGo('A._1.__1.B.___1');
        resetTransitionLog();
        await testGo('A._1.__1.B', { exited: 'A._1.__1.B.___1' });

        done();
      });
    });

    describe("directly to a parent of an inactive sticky state", function() {
      it("should exit the inactive sticky", async function(done) {
        await testGo('A._1.__1.B.___1');
        await testGo('A._2');
        resetTransitionLog();
        await testGo('A._1.__1.B', { exited: 'A._1.__1.B.___1', inactivated: 'A._2', reactivated: ['A._1', 'A._1.__1', 'A._1.__1.B'] });

        done();
      });
    });
  });

  describe('nested .go() transitions with parent attributes', function () {
    beforeEach(function() {
      ssReset(getNestedStickyStates());
    });

    function getNestedStickyStates() {
      /*
               aside
             /    (sticky)
      (root)-- A -- A._1 -- A._1.__1
                \
                 -- _2 -- __2
                 (sticky)
       */

      return [
        { name: 'aside' },
        { name: 'A', views: { 'A@': {} } },

        { name: 'A._1', sticky: true, views: { '_1@A': {} } },
        { name: '_2', sticky: true, views: { '_2@A': {} }, parent: 'A' },

        { name: 'A._1.__1' },
        { name: '__2', parent: '_2' },
      ];
    }

    it('should have states attributes correctly set', function() {
      let A = $state.get('A');
      let A_1 = $state.get('A._1');
      let A_1__1 = $state.get('A._1.__1');
      let A_2 = $state.get('_2');
      let A_2__2 = $state.get('__2');

      // Check includes
      expect(A.$$state().includes).toEqual({'' : true, 'A': true});
      expect(A_1.$$state().includes).toEqual({'' : true, 'A': true, 'A._1': true});

      expect(A_2.$$state().includes).toEqual({'' : true, 'A': true, '_2': true});
      expect(A_2__2.$$state().includes).toEqual({'' : true, 'A': true, '_2': true, '__2': true});

      // Check name attribute
      expect(A.$$state().name).toEqual('A');
      expect(A_1.$$state().name).toEqual('A._1');
      expect(A_1__1.$$state().name).toEqual('A._1.__1');

      expect(A_2.$$state().name).toEqual('_2');
      expect(A_2__2.$$state().name).toEqual('__2');

      // Check parent attribute
      expect(A.$$state().parent.name).toBe('');
      expect(A_1.$$state().parent.self).toBe(A);
      expect(A_1__1.$$state().parent.self).toBe(A_1);

      expect(A_2.$$state().parent.self).toBe(A);
      expect(A_2__2.$$state().parent.self).toBe(A_2);
    });

    it('should set transition attributes correctly', async function(done) {
      // Test some transitions
      await testGo('aside', { entered: ['aside'] });
      await testGo('_2', { exited: ['aside'],  entered: ['A', '_2'] });
      await testGo('__2', { entered: ['__2'] });
      await testGo('A._1.__1', { inactivated: ['_2', '__2'], entered: ['A._1', 'A._1.__1'] });
      await testGo('_2', { reactivated: ['_2'], inactivated: ['A._1', 'A._1.__1'], exited: '__2' });
      resetTransitionLog();
      await testGo('A', { exited: ['_2', 'A._1', 'A._1.__1'] });
      await testGo('aside', { exited: ['A'], entered: ['aside'] });

      done();
    });
  });

  // test cases for issue #139
  describe('ui-router option reload: true', function() {
    beforeEach(function() {
      ssReset(getSimpleStates());
    });

    it('should be respected', async function(done) {
      await testGo('A._1', { entered: ['A', 'A._1' ] });
      await testGo('A._2', { inactivated: [ 'A._1' ],  entered: 'A._2' });
      await testGo('A._1', { reactivated: 'A._1', inactivated: 'A._2' });
      await testGo('A._2', { exited: [ 'A', 'A._2', 'A._1' ], entered: [ 'A', 'A._2' ] }, { reload: true });

      done();
    });
  });

  describe('ui-router option reload: [state ref]', function() {
    let bStates: StateDeclaration[] = [
      { name: 'B', sticky: true },
      { name: 'B._1', sticky: true },
      { name: 'B._1.__1', sticky: true }
    ];

    beforeEach(function() {
      let simpleStates = getSimpleStates();
      ssReset(bStates.concat(simpleStates));
    });

    it('should reload a partial tree of sticky states', async function(done) {
      await testGo('A._1', { entered: ['A', 'A._1' ] });
      await testGo('A._2', { inactivated: [ 'A._1' ],  entered: 'A._2' });
      await testGo('A._1', { reactivated: 'A._1', inactivated: 'A._2' });
      await testGo('A._2', { inactivated: 'A._1', exited: 'A._2', entered: 'A._2' }, { reload: "A._2" });

      done();
    });

    it('should reload a partial tree of non-sticky states', async function(done) {
      await testGo('A._1', { entered: ['A', 'A._1' ] });
      await testGo('A._2.__1', { inactivated: 'A._1', entered: [ 'A._2', 'A._2.__1' ] });
      await testGo('A._1', { reactivated: 'A._1', inactivated: [ 'A._2', 'A._2.__1' ] });
      await testGo('A._2.__1', {
        inactivated: 'A._1', reactivated: 'A._2',
        exited: [ 'A._2.__1' ], entered: [ 'A._2.__1' ]
      }, { reload: "A._2.__1" });
      await testGo('A._2.__1', { exited: [ 'A._2.__1' ], entered: [ 'A._2.__1' ] }, { reload: "A._2.__1" });

      done();
    });

    // Test case for #258
    it('should reload full tree of sticky states', async function(done) {
      await testGo('B._1.__1', { entered: [ 'B', 'B._1', 'B._1.__1' ] });
      await testGo('B._1.__1', { exited : ['B', 'B._1', 'B._1.__1'], entered: ['B', 'B._1', 'B._1.__1'] }, {reload: true});

      done();
    });
  });

  describe("$stickyStates.exitSticky()", function() {
    beforeEach(async function(done) {
      ssReset(getSimpleStates());
      await testGo('A._1');
      await testGo('A._2');

      done();
    });

    it("should exit the states being exitSticky()", (done) => {
      resetTransitionLog();
      $stickyState.exitSticky("A._1").then(() => {
        let tLog = tlog();
        expect(tLog.exited).toEqual(['A._1']);

        done();
      });
    });

    it("should remove the state from the inactive list", async (done) => {
      expect($stickyState.inactives().length).toBe(1);
      await $stickyState.exitSticky("A._1");
      expect($stickyState.inactives().length).toBe(0);

      done();
    });

    it("should throw if an unknown state is passed", () => {
      let caught = null;
      try {
        $stickyState.exitSticky("A.DOESNTEXIST");
      } catch (error) { caught = error; }
      expect(caught.detail).toEqual(Error("State not found: A.DOESNTEXIST"));
      expect($stickyState.inactives().length).toBe(1);
      expect($stickyState.inactives()[0].name).toBe('A._1');
    });

    it("should throw if an non-inactive state is passed", () => {
      let caught = null;
      try {
        $stickyState.exitSticky("A._2");
      } catch (error) { caught = error; }
      expect(caught).toEqual(Error("State not inactive: A._2"));
      expect($stickyState.inactives().length).toBe(1);
      expect($stickyState.inactives()[0].name).toBe('A._1');
    });

    it("should reset all inactive states if passed no arguments", async (done) => {
      expect($stickyState.inactives().length).toBe(1);

      await testGo('A._3');
      expect($stickyState.inactives().length).toBe(2);

      await $stickyState.exitSticky();
      expect($stickyState.inactives().length).toBe(0);

      done();
    });
  });

  describe("$state.go `exitSticky` option", function() {
    beforeEach(async function(done) {
      ssReset(getSimpleStates());
      await testGo('A._1');
      await testGo('A._2');

      done();
    });

    it("should exit an inactive state via `exitSticky` option", async (done) => {
      await $state.go($state.current, {}, { exitSticky: 'A._1' });
      expect($stickyState.inactives().length).toBe(0);

      done();
    });

    it("should exit the currently active sticky via `exitSticky` option after transitioning elsewhere", async (done) => {
      await $state.go("A._1");
      expect($stickyState.inactives().length).toBe(1);

      await $state.go("A._2", {}, { exitSticky: 'A._1' });
      expect($stickyState.inactives().length).toBe(0);

      done();
    });

    it("should reset an inactive state via `exitSticky` option, while activating a different state", async (done) => {
      await $state.go("A._3", {}, { exitSticky: 'A._1' });
      expect($stickyState.inactives().length).toBe(1);
      expect($stickyState.inactives()[0].name).toBe('A._2');

      done();
    });

    it("should throw if the `exitSticky` option is part of the to path", () => {
      let caught = null;
      try {
        $state.go("A._1", {}, { exitSticky: 'A._1' });
      } catch (error) { caught = error; }
      expect(caught).toEqual(Error("Can not exit a sticky state that is currently active/activating: A._1"));
      expect($stickyState.inactives().length).toBe(1);
      expect($stickyState.inactives()[0].name).toBe('A._1');
    });
  });

  describe('TransitionService', () => {

    describe('onInactivate hook', () => {
      beforeEach(() => ssReset(getSimpleStates()));

      it('should be a function on TransitionService', () => {
        expect($transitions.onInactivate).toBeDefined();
        expect(typeof $transitions.onInactivate).toBe('function');
      });

      it('should accept a criteria obj with `inactivate` property, and a state hook fn', () => {
        expect(() => $transitions.onInactivate({ inactivating: 'A._1' }, (trans, state) => { })).not.toThrow();
      });

      it('should fire a hook function when a state is inactivated', async (done) => {
        let log = [];

        $transitions.onInactivate({ inactivating: 'A._1' }, (trans, state) => {
          log.push(state.name);
        });

        await testGo('A._1', { entered: ['A', 'A._1']});
        expect(log).toEqual([]);

        await testGo('A._2', { entered: 'A._2', inactivated: 'A._1' });
        expect(log).toEqual(['A._1']);

        done();
      });
    });

    describe('onInactive function defined on a state', () => {
      it('should fire when the state is inactivated', async (done) => {
        let log = [], states = getSimpleStates();
        states.find(state => state.name === 'A._1').onInactivate = (trans, state) => { log.push(state.name); };
        states.forEach(state => $registry.register(state));
        
        await $state.go('A._1');
        expect(log).toEqual([]);
  
        await $state.go('A._2');
        expect(log).toEqual(['A._1']);
  
        done();
      });
    });

    describe('onReactivate hook', () => {
      beforeEach(() => ssReset(getSimpleStates()));

      it('should be a function on TransitionService', () => {
        expect($transitions.onReactivate).toBeDefined();
        expect(typeof $transitions.onReactivate).toBe('function');
      });

      it('should accept a criteria obj with `reactivate` property, and a state hook fn', () => {
        expect(() => $transitions.onReactivate({ reactivating: 'A._1' }, (trans, state) => { })).not.toThrow();
      });

      it('should fire a hook function when a state is reactivated', async (done) => {
        let log = [];

        $transitions.onReactivate({ reactivating: 'A._1' }, (trans, state) => {
          log.push(state.name);
        });

        await testGo('A._1', { entered: ['A', 'A._1']});
        expect(log).toEqual([]);

        await testGo('A._2', { entered: 'A._2', inactivated: 'A._1' });
        expect(log).toEqual([]);

        await testGo('A._1', { inactivated: 'A._2', reactivated: 'A._1' });
        expect(log).toEqual(['A._1']);

        done();
      });
    });

    describe('onReactivate function defined on a state', () => {
      it('should fire when the state is reactivated', async (done) => {
        let log = [], states = getSimpleStates();
        states.find(state => state.name === 'A._1').onReactivate = (trans, state) => { log.push(state.name); };
        states.forEach(state => $registry.register(state));

        await $state.go('A._1');
        expect(log).toEqual([]);

        await $state.go('A._2');
        expect(log).toEqual([]);

        await $state.go('A._1');
        expect(log).toEqual(['A._1']);

        done();
      });
    });

  });

  describe("transitions to sibling of non-sticky inactive state", () => {
    // Tests for issue #217

    beforeEach(function() {
      ssReset(getNestedStickyStates());
    });

    it("should exit the inactive state", async function(done) {
      await testGo('A._1.__1', { entered: ['A', 'A._1', 'A._1.__1']});
      await testGo('A._2.__1', { entered: ['A._2', 'A._2.__1'], inactivated: ['A._1', 'A._1.__1']});
      await testGo('A._1.__2', {
        entered: ['A._1.__2'],
        exited: ['A._1.__1'],
        reactivated: ['A._1'],
        inactivated: ['A._2', 'A._2.__1']
      });

      done();
    });

    it("should exit the inactive state tree", async function(done) {
      await testGo('A._1.__1.B', { entered: ['A', 'A._1', 'A._1.__1', 'A._1.__1.B']});
      await testGo('A._2.__1', { entered: ['A._2', 'A._2.__1'], inactivated: ['A._1', 'A._1.__1', 'A._1.__1.B']});
      await testGo('A._1.__2', {
        entered: ['A._1.__2'],
        exited: ['A._1.__1', 'A._1.__1.B'],
        reactivated: ['A._1'],
        inactivated: ['A._2', 'A._2.__1']
      });

      done();
    });
  });

  describe("transitions between sticky states, where params should be inherited", function() {
    beforeEach(function() {
      ssReset(getNestedStickyStates());
    });

    it("should reactivate the sticky state", async function(done) {
      await testGo('inherit.one', { entered: ['inherit', 'inherit.one'] }, { params: { id: "1" } } );
      expect($state.params['id']).toBe("1");

      await testGo('inherit.two', { entered: 'inherit.two', inactivated: 'inherit.one' }, { inherit: true } );
      expect($state.params['id']).toBe("1");

      await testGo('inherit.one', { reactivated: 'inherit.one', inactivated: 'inherit.two' }, { inherit: true } );
      expect($state.params['id']).toBe("1");

      done();
    });

  });
});
