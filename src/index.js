import React from 'react';
import PropTypes from 'prop-types';
import hoistStatics from 'hoist-non-react-statics';
import { subspace, namespaced } from 'redux-subspace';
import { addReducer } from 'redux-transient';

export { enhancer } from 'redux-transient';


const ACTION_INITIALIZE_REDUCER_TYPE = '@react-redux-subapp/INIT';

const initializeReducer = () => ({
  type: ACTION_INITIALIZE_REDUCER_TYPE,
});

const subAppCreator = (subAppKey, WrappedComponent, reducer) => {
  const wrappedComponentName = WrappedComponent.displayName
    || WrappedComponent.name
    || 'Component';
  const displayName = `SubApp(${wrappedComponentName}, subAppKey=${subAppKey})`;

  class SubApp extends React.Component {
    getChildContext() {
      return {
        store: subspace((state => state[subAppKey]), subAppKey)(this.getStore()),
      };
    }
    componentWillMount() {
      const store = this.getStore();
      store.dispatch(addReducer(reducer));
      store.dispatch(initializeReducer());
    }
    getStore() {
      let store = this.context.store;
      if (store.rootStore) {
        store = store.rootStore;
      }
      return store;
    }
    render() {
      return <WrappedComponent {...this.props} />;
    }
  }
  SubApp.PropTypes = {};
  SubApp.contextTypes = {
    store: PropTypes.object.isRequired,
  };
  SubApp.childContextTypes = {
    store: PropTypes.object,
  };
  SubApp.WrappedComponent = WrappedComponent;
  SubApp.displayName = displayName;
  return hoistStatics(SubApp, WrappedComponent);
};


const refined = (subAppKey, reducer, initialState) => (state, action) => {
  let subState = state[subAppKey];
  if (subState === undefined) {
    subState = initialState;
  }
  if (subState === undefined) {
    subState = reducer(undefined, ACTION_INITIALIZE_REDUCER_TYPE);
  }
  return {
    ...state,
    [subAppKey]: ((action.type === ACTION_INITIALIZE_REDUCER_TYPE)
      ? subState
      : reducer(subState, action)),
  };
};

const mapping = {};

export const createAppFactory = (WrappedComponent, reducer, initialState) => (subAppKey) => {
  if (subAppKey in mapping) {
    if (mapping[subAppKey].wrapped === WrappedComponent) {
      return mapping[subAppKey].subApp;
    }
    throw new Error(`store's key=${subAppKey} is already mapped with another component ${mapping[subAppKey].wrapped}`);
  }
  const namespacedReducer = namespaced(subAppKey)(reducer);
  const refinedReducer = refined(subAppKey, namespacedReducer, initialState);
  const subApp = subAppCreator(subAppKey, WrappedComponent, refinedReducer);
  mapping[subAppKey] = {
    wrapped: WrappedComponent,
    subApp,
  };
  return subApp;
};
