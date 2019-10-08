## 1.5.1 (2019-10-08)

[Compare `@uirouter/sticky-states` versions 1.5.0 and 1.5.1](https://github.com/ui-router/sticky-states/compare/1.5.0...1.5.1)

### Bug Fixes

- **examples:** update angular-cli example to uirouter/angular 4.x ([a411f29](https://github.com/ui-router/sticky-states/commit/a411f29))
- **package:** Change peerDependency on uirouter/core from '^5.0.1' to '>=5.0.1' ([80cb726](https://github.com/ui-router/sticky-states/commit/80cb726))
- **prettier:** switch to trailing commas: es5 ([dfb6bde](https://github.com/ui-router/sticky-states/commit/dfb6bde))
- **travis:** use service: xvfb instead of launching it manually. install libgconf debian package to fix cypress ([07c9b17](https://github.com/ui-router/sticky-states/commit/07c9b17))

# 1.5.0 (2018-01-28)

[Compare `@uirouter/sticky-states` versions 1.4.1 and 1.5.0](https://github.com/ui-router/sticky-states/compare/1.4.1...1.5.0)

### Bug Fixes

- **sticky:** Update dynamic parameters when calculating treeChanges (i.e., for `reactivating` and `to` paths) ([3696bf9](https://github.com/ui-router/sticky-states/commit/3696bf9))

<a name="1.4.1"></a>

[Compare `@uirouter/sticky-states` versions 1.4.0 and 1.4.1](https://github.com/ui-router/sticky-states/compare/1.4.0...1.4.1)

<a name="1.4.0"></a>

[Compare `@uirouter/sticky-states` versions 1.3.0 and 1.4.0](https://github.com/ui-router/sticky-states/compare/1.3.0...1.4.0)

<a name="1.3.0"></a>

[Compare `@uirouter/sticky-states` versions 1.2.0 and 1.3.0](https://github.com/ui-router/sticky-states/compare/1.2.0...1.3.0)

### Bug Fixes

- **exitSticky:** Allow exitingSticky of the current sticky state, when transitioning to a different state ([154de09](https://github.com/ui-router/sticky-states/commit/154de09))

<a name="1.2.0"></a>
[Compare `@uirouter/sticky-states` versions 1.0.0 and 1.2.0](https://github.com/ui-router/sticky-states/compare/1.0.0...1.2.0)

### Bug Fixes

- **build:** Add missing index.ts file to match package.json `main:` entry ([bfe70b5](https://github.com/ui-router/sticky-states/commit/bfe70b5))
- **sticky:** Move sticky states hook to hither priority (100), so it is invoked before the transition is processed by ui-router-core `coreResolcables` onCreate hook ([b61a22b](https://github.com/ui-router/sticky-states/commit/b61a22b))

<a name="1.0.0"></a>
This is the first release of Sticky States for UI-Router 1.0+

This is a port of [UI-Router Extras - Sticky States](http://christopherthielen.github.io/ui-router-extras/#/sticky)

This port is mostly compatible with the ui-router extras project of the same name, so use those docs for now.

### Features

- Update for ui-router-core 3.0.0+ ([cad6e31](https://github.com/ui-router/dsr/commit/cad6e31))
- **\$stickyState:** Add TransitionService.onInactivate and onReactivate hooks ([02969b7](https://github.com/ui-router/dsr/commit/02969b7))
- **DSR:** Port DSR to ui-router 1.0 ([3c56dfa](https://github.com/ui-router/dsr/commit/3c56dfa))
- **exitSticky:** Add ui-router transition option `exitSticky` to exit inactive states. ([43af4b2](https://github.com/ui-router/dsr/commit/43af4b2))
