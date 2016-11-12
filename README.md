# Deep State Redirect

### DSR for UI-Router 1.0 &nbsp;[![Build Status](https://travis-ci.org/christopherthielen/deep-state-redirect.svg?branch=master)](https://travis-ci.org/christopherthielen/deep-state-redirect)

With Deep State Redirect, a parent state remembers whatever child state was last activated.
When the user directly reactivates the parent state, they are redirected to the nested state (which was previously activated).


## Overview and Use Case

Deep State Redirect (DSR) is a marker you can add to a state definition.

When a child state of the DSR marked state is activated, UI-Router Extras remembers the child and its parameters.
The most-recently-activate child is remembered no matter where the user navigates in the state tree.
When the DSR marked state is directly activated, UI-Router Extras will redirect to the remembered child state and parameters.

One use case for DSR is a tabbed application.
Each tab might contain an application module.
Each tabs' state is marked as deepStateRedirect.
When the user navigates into the tab, and drills down to a substate, DSR will remember the substate.
The user can then navigate to other tabs (or somewhere else completely).
When they click the original tab again, it will transition to the remembered ehild state and parameters of that tab, making it appear that the tab was never destructed.

Deep State Redirect can be used with StickyStates, or on its own.
If used with a Sticky State, the states will be reactivated, and the DOM will be unchanged (as opposed to the states being re-entered and controllers re-initialized)

## Using

See: http://christopherthielen.github.io/ui-router-extras/#/dsr

TODO: Move docs here
