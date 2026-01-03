import * as React from 'react';
import { UIRouter, useSrefActive, useRouter, UIView } from '@uirouter/react';
import { pushStateLocationPlugin } from '@uirouter/core';
import { Visualizer } from '@uirouter/visualizer';
import { StickyStatesPlugin } from '@uirouter/sticky-states';

import GenericCmp from './Generic';
import './App.css';

const plugins = [pushStateLocationPlugin, Visualizer, StickyStatesPlugin];

const states = [
  {
    name: 'home',
    url: '/home',
    sticky: true,
    views: {
      home: { component: GenericCmp },
    },
  },

  {
    name: 'about',
    url: '/about',
    sticky: true,
    views: {
      about: { component: GenericCmp },
    },
  },
];

function routerConfig(router) {
  router.urlService.rules.initial({ state: 'home' });
}

function AppRoot() {
  return (
    <UIRouter plugins={plugins} states={states} config={routerConfig}>
      <App />
    </UIRouter>
  );
}

function App() {
  const globals = useRouter().globals;

  const currentState = globals.current.name;

  const showHideStyle = (statename) => ({
    display: currentState === statename ? 'block' : 'none',
  });

  const homeSref = useSrefActive('home', null, 'active');
  const aboutSref = useSrefActive('about', null, 'active');

  return (
    <div>
      {currentState}
      <a {...homeSref}>home</a>
      <a {...aboutSref}>about</a>

      <div style={showHideStyle('home')} id="home">
        <UIView name="home" />
      </div>

      <div style={showHideStyle('about')} id="about">
        <UIView name="about" />
      </div>
    </div>
  );
}

export default AppRoot;
