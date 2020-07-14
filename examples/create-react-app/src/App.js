import React, { Component } from 'react';
import { UIRouter, useSrefActive, UIView } from '@uirouter/react';
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

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentState: null,
    };
  }

  routerConfig(router) {
    router.urlService.rules.initial({ state: 'home' });
    this.unsub = router.transitionService.onSuccess({}, (transition) => {
      this.setState({ currentRouterState: transition.to().name });
      console.log(transition);
    });
  }

  componentWillUnmount() {
    this.unsub && this.unsub();
  }

  render() {
    const current = this.state.currentRouterState;
    const showHideStyle = (statename) => ({
      display: current === statename ? 'block' : 'none',
    });

    const homeSref = useSrefActive('home', null, 'active');
    const aboutSref = useSrefActive('about', null, 'active');

    return (
      <UIRouter plugins={plugins} states={states} config={(router) => this.routerConfig(router)}>
        <div>
          <a {...homeSref}>home</a>
          <a {...aboutSref}>about</a>

          <div style={showHideStyle('home')} id="home">
            <UIView name="home" />
          </div>

          <div style={showHideStyle('about')} id="about">
            <UIView name="about" />
          </div>
        </div>
      </UIRouter>
    );
  }
}

export default App;
