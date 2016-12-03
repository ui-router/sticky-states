import { getTestGoFn, addCallbacks, resetTransitionLog, pathFrom, equalityTester, tlog } from "./util"
import {
    UIRouter, StateService, StateRegistry, StateDeclaration, ViewService,
    PathNode, _ViewDeclaration, isObject, unnestR, ViewConfigFactory, ViewConfig
} from "ui-router-core";

import "../src/stickyStates";
import { stickyStates } from "../src/stickyStates";

let router: UIRouter;
let $state: StateService;
let $view: ViewService;
let $registry: StateRegistry;
let $stickyState: { inactives: () => any[] };
let inactiveViews = () => $stickyState.inactives()
    .map((node: PathNode) => node.views)
    .map(vcs => vcs.map(vc => vc.viewDecl.$name))
    .reduce(unnestR, []);

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
    router.urlRouterProvider.otherwise('/');

    router.stateRegistry.decorator("views", function (state, parentFn) {
      if (isObject(state.views)) {
        return Object.keys(state.views).map(key => (
          { $name: key, $uiViewName: key, $uiViewContextAnchor: state.name, $type: "core", $context: state }
        ), [])
      }

      return [
        { $name: "$default", $uiViewName: "$default", $uiViewContextAnchor: state.name, $type: "core", $context: state }
      ]
    });

    const factory: ViewConfigFactory = (path: PathNode[], decl: _ViewDeclaration) => {
      return { $id: _id++, viewDecl: decl, load: () => {}, path: path } as ViewConfig;
    };
    router.viewService.viewConfigFactory("core", factory);

    $stickyState = stickyStates(router);
    $state = router.stateService;
    $view = router.viewService;
    $registry = router.stateRegistry;
    router.stateRegistry.stateQueue.autoFlush($state);

    testGo = getTestGoFn(router);
  });

  var controllerInvokeCount = 0, resolveCount = 0, Xvalue = undefined;
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
      expect(Array.isArray($stickyState.inactives())).toBeTruthy()
    });

    it('$stickyState.inactives() should hold inactive PathNodes', async function(done) {
      let root = $registry.root();
      await testGo("A._1", { entered: [ "A", "A._1" ]});
      await testGo("A._2", { inactivated: "A._1", entered: "A._2" });

      expect($stickyState.inactives().length).toBe(1);
      expect($stickyState.inactives()[0] instanceof PathNode).toBeTruthy();

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

    it ('should reactivate sticky state A._1 when transitioning back from sibling-to-sticky A._2', async function (done) {
      await testGo('A', {entered: ['A']});
      await testGo('A._1', {entered: ['A._1']});
      await testGo('A._2', {inactivated: ['A._1'], entered: 'A._2'});
      await testGo('A._1', {inactivated: ['A._2'], reactivated: 'A._1'});

      done();
    });

    it ('should inactivate and reactivate A._1 and A._2 when transitioning back and forth', async function (done) {
      await testGo('A', {entered: ['A']});
      await testGo('A._1', {entered: ['A._1']});
      await testGo('A._2', {inactivated: ['A._1'], entered: ['A._2']});
      await testGo('A._1', {inactivated: ['A._2'], reactivated: ['A._1']});
      await testGo('A._2', {inactivated: ['A._1'], reactivated: ['A._2']});

      done();
    });

    it ('should inactivate and reactivate A._1 and A._2 and A._3 when transitioning back and forth', async function (done) {
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

    it ('should exit children A._1 and A._2 and A._3 when transitioning up to parent A', async function (done) {
      await testGo('A', {entered: ['A']});
      await testGo('A._1', {entered: ['A._1']});
      await testGo('A._2', {inactivated: ['A._1'], entered: ['A._2']});
      await testGo('A._3', {inactivated: ['A._2'], entered: ['A._3']});
      // orphans exited first; from state exited last
      await testGo('A', {exited: ['A._1', 'A._2', 'A._3']});

      done();
    });

    it ('should exit children A._1 and A._2 and A._3 when transitioning back from sibling to parent A', async function (done) {
      await testGo('A', {entered: ['A']});
      await testGo('A._1', {entered: ['A._1']});
      await testGo('A._2', {inactivated: ['A._1'], entered: ['A._2']});
      await testGo('A._3', {inactivated: ['A._2'], entered: ['A._3']});
      // orphans exited first; from state exited last
      await testGo('A', {exited: ['A._1', 'A._2', 'A._3']});
      await testGo('main', { entered: ['main'], exited: ['A']});

      done();
    });

    it('should allow empty transitionTo options', function() {
      expect(function() {
        $state.transitionTo('A')
      }).not.toThrow()
    })
  });

  describe('resolve/controller function', function () {
    beforeEach(function () {
      resetXResolve();
      ssReset(getSimpleStates());
    });

    // beforeEach(inject(function($compile, $rootScope) {
    //   var el = angular.element('<div ui-view></div>');
    //   $compile(el)($rootScope);
    //   $rootScope.$digest();
    // }));

    it('should resolve when the sticky state is entered', async function (done) {
      await testGo('main');
      await testGo('A._3');
      // expect(Xvalue).toBe(1);
      expect(resolveCount).toBe(1);

      done();
    });

    // Test for issue #22
    it('should not re-resolve when the sticky state is reactivated', async function (done) {
      await testGo('main', { entered: 'main' });
      await testGo('A._3', { exited: 'main', entered: [ 'A', 'A._3' ]});
      await testGo('A._1', { inactivated: 'A._3', entered: 'A._1' });
      await testGo('A._3', { reactivated: 'A._3', inactivated: 'A._1'});
      // expect(Xvalue).toBe(1);
      expect(resolveCount).toBe(1);

      done();
    });

    it('(controller) should be called when the sticky state is entered', async function (done) {
      await testGo('main');
      await testGo('A._3');
      expect(controllerInvokeCount).toBe(1);

      done();
    });

    it('(controller) should not be called when the sticky state is reactivated', async function (done) {
      await testGo('main', { entered: 'main' });
      await testGo('A._3', { exited: 'main', entered: [ 'A', 'A._3' ]});
      expect(controllerInvokeCount).toBe(1);
      await testGo('A._1', { inactivated: 'A._3', entered: 'A._1' });
      await testGo('A._3', { reactivated: 'A._3', inactivated: 'A._1'});
      expect(controllerInvokeCount).toBe(1);

      done();
    });

    it('should re-resolve when the sticky state is exited/reentered', async function (done) {
      await testGo('main', { entered: 'main' });
      await testGo('A._3', { exited: 'main', entered: [ 'A', 'A._3' ]});
      await testGo('A._1', { inactivated: 'A._3', entered: 'A._1' });
      await testGo('A._3', { reactivated: 'A._3', inactivated: 'A._1'});
      expect(Xvalue).toBe(1);
      expect(resolveCount).toBe(1);
      await testGo('main', { entered: 'main', exited: [ 'A._3', 'A._1', 'A' ] });
      await testGo('A._3', { entered: [ 'A', 'A._3' ], exited: 'main'});
      expect(Xvalue).toBe(2);
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
      expect(location.hash).toBe("#/typedparam/1");
      resetTransitionLog();
      await testGo('typedparam', {inactivated: 'A', reactivated: 'typedparam'}, { params: { boolparam: true } });

      done();
    });

    // Test 2 for issue #239
    it('should reactivate properly with equivalent json', async function (done) {
      var objparam = { foo: "bar" };
      await testGo('typedparam2', undefined, { params: { jsonparam: objparam } });
      await testGo('A');
      expect(location.hash).toBe("#/typedparam2/%7B%22foo%22:%22bar%22%7D");
      resetTransitionLog();
      await testGo('typedparam2', {inactivated: 'A', reactivated: 'typedparam2'}, { params: { jsonparam: { foo: "bar" } } });

      done()
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
      await testGo('main');
      var options = { params: { 'product_id': 12345 } };
      await testGo('main.product.something', { entered: pathFrom('main', 'main.product.something') }, options);
      await testGo('main.other', { entered: 'main.other', inactivated: [ 'main.product.something', 'main.product'] });
      await testGo('main.product.something', { reactivated: ['main.product', 'main.product.something'], inactivated: 'main.other' }, options);

      await testGo('main.other', { reactivated: 'main.other', inactivated: [ 'main.product.something', 'main.product'] });
      options.params.product_id = 54321;
      resetTransitionLog();
      await testGo('main.product.something', {
        exited: ['main.product.something', 'main.product'],
        entered: ['main.product', 'main.product.something'],
        inactivated: 'main.other' }, options);

      done();
    });
  });

  describe('nested sticky .go() transitions', function () {
    beforeEach(function() {
      ssReset(getNestedStickyStates());
    });

    it ('should inactivate sticky state tabs_tab1 when transitioning back to A', async function (done) {
      await testGo('aside', { entered: ['aside'] });
      await testGo('A._1.__1.B.___1', { exited: ['aside'],                entered: pathFrom('A', 'A._1.__1.B.___1') });
      await testGo('A._1.__1.B.___2', { inactivated: ['A._1.__1.B.___1'], entered:     ['A._1.__1.B.___2'] });

      done();
    });

    it ('should reactivate child-of-sticky state ___1 when transitioning back to A._1.__1', async function (done) {
      await testGo('aside', { entered: ['aside']});
      await testGo('A._1.__1', { exited: ['aside'],                         entered: pathFrom('A', 'A._1.__1') });
      await testGo('A._2.__2', { inactivated: pathFrom('A._1.__1', 'A._1'), entered: pathFrom('A._2', 'A._2.__2') });
      await testGo('aside',    { inactivated: pathFrom('A._2.__2', 'A') ,   entered: ['aside'] });
      await testGo('A._2.__2', { exited: ['aside'],                         reactivated: pathFrom('A', 'A._2.__2') }, { redirect: 'A._2.__2' });
      resetTransitionLog();
      await testGo('A._1.__1', { inactivated: pathFrom('A._2.__2', 'A._2'), reactivated: pathFrom('A._1', 'A._1.__1') }, { redirect: 'A._1.__1' });

      done();
    });


    describe("to an inactive state with inactive children", function() {
      it("should exit inactive child states", async function (done) {
        await testGo('A._3.__1', { entered: pathFrom('A', 'A._3.__1') });
        await testGo('A._2', { inactivated: pathFrom('A._3.__1', 'A._3'), entered: "A._2" });
        await testGo('A._3', { reactivated: "A._3", inactivated: "A._2", exited: "A._3.__1" });

        done();
      });
    });

    describe("to an exited substate of an inactive state with inactive children", function() {
      // Test for issue #131
      it("should not exit inactive child states", async function(done) {
        await testGo('A._3.__1', { entered: pathFrom('A', 'A._3.__1') });
        await testGo('A._2', { inactivated: pathFrom('A._3.__1', 'A._3'), entered: "A._2" });
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
      })
    });

    describe("directly to a parent of an inactive sticky state", function() {
      it("should exit the inactive sticky", async function(done) {
        await testGo('A._1.__1.B.___1');
        await testGo('A._2');
        resetTransitionLog();
        await testGo('A._1.__1.B', { exited: 'A._1.__1.B.___1', inactivated: 'A._2', reactivated: ['A._1', 'A._1.__1', 'A._1.__1.B'] });

        done();
      })
    })
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

    it ('should have states attributes correctly set', function() {
      var A = $state.get('A');
      var A_1 = $state.get('A._1');
      var A_1__1 = $state.get('A._1.__1');
      var A_2 = $state.get('_2');
      var A_2__2 = $state.get('__2');

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

    it ('should set transition attributes correctly', async function(done) {
      // Test some transitions
      await testGo('aside', { entered: ['aside'] });
      await testGo('_2', { exited: ['aside'],  entered: ['A', '_2'] });
      await testGo('__2', { entered: ['__2'] });
      await testGo('A._1.__1', { inactivated: ['__2', '_2'], entered: ['A._1', 'A._1.__1'] });
      await testGo('_2', { reactivated: ['_2'], inactivated: ['A._1.__1', 'A._1'], exited: '__2' });
      //resetTransitionLog();
      await testGo('A', { exited: ['A._1.__1', 'A._1', '_2'] });
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
//      resetTransitionLog();
      await testGo('A._2', { exited: [ 'A._1', 'A._2', 'A' ], entered: [ 'A', 'A._2' ] }, { reload: true });

      done();
    });
  });

  describe('ui-router option reload: [state ref]', function() {
    var bStates: StateDeclaration[] = [
      { name: 'B', sticky: true },
      { name: 'B._1', sticky: true },
      { name: 'B._1.__1', sticky: true }
    ];

    beforeEach(function() {
      var simpleStates = getSimpleStates();
      ssReset(bStates.concat(simpleStates));
    });

    it('should reload a partial tree of sticky states', async function(done) {
      await testGo('A._1', { entered: ['A', 'A._1' ] });
      await testGo('A._2', { inactivated: [ 'A._1' ],  entered: 'A._2' });
      await testGo('A._1', { reactivated: 'A._1', inactivated: 'A._2' });
//      resetTransitionLog();
      await testGo('A._2', { inactivated: 'A._1', exited: 'A._2', entered: 'A._2' }, { reload: "A._2" });

      done();
    });

    it('should reload a partial tree of non-sticky states', async function(done) {
      await testGo('A._1', { entered: ['A', 'A._1' ] });
      await testGo('A._2.__1', { inactivated: 'A._1', entered: [ 'A._2', 'A._2.__1' ] });
      await testGo('A._1', { reactivated: 'A._1', inactivated: [ 'A._2.__1', 'A._2' ] });
      await testGo('A._2.__1', {
        inactivated: 'A._1', reactivated: 'A._2',
        exited: [ 'A._2.__1' ], entered: [ 'A._2.__1' ]
      }, { reload: "A._2.__1" });
      await testGo('A._2.__1', { exited: [ 'A._2.__1' ], entered: [ 'A._2.__1' ] }, { reload: "A._2.__1" });

      done();
    });

    // Test case for #258
    it('should reload full partial tree of sticky states', async function(done) {
      await testGo('B._1.__1', { entered: [ 'B', 'B._1', 'B._1.__1' ] });
      await testGo('B._1.__1', { exited : ['B._1.__1', 'B._1', 'B'], entered: ['B', 'B._1', 'B._1.__1'] }, {reload: true});

      done();
    });
  });

  describe("reset()", function() {
    beforeEach(async function(done) {
      ssReset(getSimpleStates());
      await testGo('A._1');
      await testGo('A._2');

      done();
    });

    it("should exit the states being reset()", function() {
      $stickyState.reset("A._1");
      expect(tlog().exited).toEqual(['A._1']);
    });

    it("should remove the reset state from the inactive list", function() {
      expect($stickyState.getInactiveStates().length).toBe(1);
      $stickyState.reset("A._1");
      expect($stickyState.getInactiveStates().length).toBe(0);
    });

    it("should return false for an unknown state", function() {
      var result = $stickyState.reset("A.DOESNTEXIST");
      expect(result).toBe(false);
      expect($stickyState.getInactiveStates().length).toBe(1);
    });

    it("should reset all inactive states if passed '*'", async function(done) {
      expect($stickyState.getInactiveStates().length).toBe(1);

      await testGo('A._3');
      expect($stickyState.getInactiveStates().length).toBe(2);

      $stickyState.reset("*");
      expect($stickyState.getInactiveStates().length).toBe(0);

      done();
    });
  });

  describe("transitions to sibling of non-sticky inactive state", function() {
    // Tests for issue #217

    beforeEach(function() {
      ssReset(getNestedStickyStates());
    });

    it("should exit the inactive state", async function(done) {
      await testGo('A._1.__1', { entered: ['A', 'A._1', 'A._1.__1']});
      await testGo('A._2.__1', { entered: ['A._2', 'A._2.__1'], inactivated: ['A._1.__1', 'A._1']});
      await testGo('A._1.__2', {
        entered: ['A._1.__2'],
        exited: ['A._1.__1'],
        reactivated: ['A._1'],
        inactivated: ['A._2.__1', 'A._2']
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

// describe('stickyState+ui-sref-active', function () {
//   var document;
//
//   beforeEach(module('ct.ui.router.extras.sticky', function($stickyStateProvider, $stateProvider) {
//     // Load and capture $stickyStateProvider and $stateProvider
//     _stickyStateProvider = $stickyStateProvider;
//     _stateProvider = $stateProvider;
//   }));
//
//   beforeEach(inject(function($document) {
//     document = $document[0];
//   }));
//
//   // Capture $injector.get, $state, and $q
//   beforeEach(inject(function($injector) {
//     $get = $injector.get;
//     $state = $get('$state');
//     $stickyState = $get('$stickyState');
//     $q = $get('$q');
//   }));
//   var el, template;
//
//   describe('ui-sref-active', function () {
//     beforeEach(function () {
//       ssReset(getStatesForUiSref());
//     });
//
//     // Set up base state heirarchy
//     function getStatesForUiSref() {
//       var newStates = {};
//       newStates['main'] = { };
//       newStates['A'] = { };
//       newStates['A._1'] = {sticky: true, views: { '_1@A': {} } };
//
//       return newStates;
//     }
//
//     it('should transition normally between non-sticky states', function () {
//       testGo('main');
//       testGo('A');
//     });
//
//     it('should have "active" class on div when state A._1 is active', inject(function ($rootScope, $q, $compile, $timeout) {
//       el = angular.element('' +
//           '<div>' +
//           '  <a class="" id="foo" ui-sref="A._1" ui-sref-active="active">Go to A._1</a>' +
//           '  <a class="" id="bar" ui-sref="main" ui-sref-active="active">Go to main</a>' +
//           '</div>');
//       template = $compile(el)($rootScope);
//       $rootScope.$digest();
//
//       expect(el.find("#foo").length).toBe(1);
//       expect(el.find("#bar").length).toBe(1);
//       expect(el.find("#baz").length).toBe(0);
//
//       expect(el.find("#bar").attr('class')).toBe('');
//       expect(el.find("#foo").attr('class')).toBe('');
//
//       testGo('main');
//       $timeout.flush();
//       expect(el.find("#bar").attr('class')).toBe('active');
//       expect(el.find("#foo").attr('class')).toBe('');
//
//       testGo('A');
//       $timeout.flush();
//       expect(el.find("#bar").attr('class')).toBe('');
//       expect(el.find("#foo").attr('class')).toBe('');
//
//       testGo('A._1');
//       $timeout.flush();
//       expect(el.find("#bar").attr('class')).toBe('');
//       expect(el.find("#foo").attr('class')).toBe('active');
//     }));
//   });
// });