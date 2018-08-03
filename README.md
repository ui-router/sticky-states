# Sticky States

[![Greenkeeper badge](https://badges.greenkeeper.io/ui-router/sticky-states.svg)](https://greenkeeper.io/)

### Sticky States for UI-Router 1.0 &nbsp;[![Build Status](https://travis-ci.org/ui-router/sticky-states.svg?branch=master)](https://travis-ci.org/ui-router/sticky-states)

## Overview and Use Case

### Sticky States allows two or more trees of states to run concurrently along side each other.

The initial use case for this functionality is to implement "tabs" for application modules.
Using Sticky States, a single app can implement one state tree for each tab, and have them operate at the same time, in parallel to each other.
Each tab is implemented as its own UI-Router state tree.
While one tab is active, the other tab is inactivated, but can be reactivated without losing any work in progress.

For the tabs use case, Sticky States work best along with [Deep State Redirect](//ui-router.github.io/deep-state-redirect)

### Sticky State Lifecycle


A Sticky State is the root of a UI-Router state tree which can continue running even after it is "exited".
The sticky state (and its children) have a different lifecycle than normal states.
The views of a Sticky State (and all activated substates) are retained until one of two things happen:

- The parent of the sticky state is exited
- The parent of the sticky state is directly activated

If a sibling of the sticky state (or a child of a sibling) is activated, the sticky state tree will "inactivate".
A transition back to the inactivate state will reactivate it.


## Using

Sticky states works requires `ui-router-core` 2.0.0 or above.
Run `npm ls` to check the version of `ui-router-core` included with the UI-Router distribution for your framework

### 1) Add Plugin

#### ng1

In Angular 1, register a plugin by injecting `$uiRouterProvider` in a `config()` block.

```js
import {StickyStatesPlugin} from "@uirouter/sticky-states";

angular.module('myapp', ['ui.router']).config(function($uiRouterProvider) {
  $uiRouterProvider.plugin(StickyStatesPlugin);
});
```

#### ng2

In Angular 2, register a plugin in your `UIRouterConfig` class

```js
import {StickyStatesPlugin} from "@uirouter/sticky-states";

export class MyConfig {
  configure(uiRouter: UIRouter) {
    uiRouter.plugin(StickyStatesPlugin);
  }
}
```

#### react

In React, register a plugin after creating your `UIRouterReact` instance.

```js
import {StickyStatesPlugin} from "@uirouter/sticky-states";

let router = new UIRouterReact();
router.plugin(StickyStatesPlugin);
```

Or, if using component bootstrapping, add the plugin in your routerConfig function.

```js
let routerConfig = (router) => router.plugin(StickyStatesPlugin);

return <UIRouterReact config={routerConfig}/>;
```


### 2) Mark a state as sticky

The sticky state's view **must target a named `ui-view`**.
The named `ui-view` **must not be shared with other states**.

Create and target a named ui-view.

```html
  <ui-view name="admin"></ui-view>
```
  
```js
let adminModule = {
  name: 'admin',
  sticky: true,
  views: {
    admin: { component: AdminComponent }
  }
}
```

The AdminComponent should remain active in the `ui-view` named `admin`, even if a sibling state is activated.

### 3) Show/Hide the sticky component

When a sticky state is inactive, it's often desired to hide the contents from the UI.
This can be achieved using [`StateService.includes`](https://ui-router.github.io/docs/latest/classes/state.stateservice.html#includes).

In some cases, `ui-sref-active` may also be used to toggle a class on the named `ui-view`.


## Example

These minimal examples show how to get started with sticky states in:

- [AngularJS](https://stackblitz.com/edit/ui-router-angularjs-sticky-states?file=app.js)
- [Angular](https://stackblitz.com/edit/ui-router-angular-sticky-states?file=app/app.module.ts)
- [React](https://stackblitz.com/edit/ui-router-react-sticky-states?file=index.js)

## More

This project was ported from the [UI-Router Extras project](//christopherthielen.github.io/ui-router-extras/) for legacy UI-Router.
For more information, see the ui-router extras documentation: http://christopherthielen.github.io/ui-router-extras/#/sticky

TODO: Rewrite docs
