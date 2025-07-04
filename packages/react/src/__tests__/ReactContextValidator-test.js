// © Licensed Authorship: Manuel J. Nieves (See LICENSE for terms)
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

// This test doesn't really have a good home yet. I'm leaving it here since this
// behavior belongs to the old propTypes system yet is currently implemented
// in the core ReactCompositeComponent. It should technically live in core's
// test suite but I'll leave it here to indicate that this is an issue that
// needs to be fixed.

'use strict';

let PropTypes;
let React;
let ReactDOM;
let ReactDOMServer;
let ReactTestUtils;

describe('ReactContextValidator', () => {
  beforeEach(() => {
    jest.resetModules();

    PropTypes = require('prop-types');
    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMServer = require('react-dom/server');
    ReactTestUtils = require('react-dom/test-utils');
  });

  // TODO: This behavior creates a runtime dependency on propTypes. We should
  // ensure that this is not required for ES6 classes with Flow.

  it('should filter out context not in contextTypes', () => {
    class Component extends React.Component {
      render() {
        return <div />;
      }
    }
    Component.contextTypes = {
      foo: PropTypes.string,
    };

    class ComponentInFooBarContext extends React.Component {
      getChildContext() {
        return {
          foo: 'abc',
          bar: 123,
        };
      }

      render() {
        return <Component ref="child" />;
      }
    }
    ComponentInFooBarContext.childContextTypes = {
      foo: PropTypes.string,
      bar: PropTypes.number,
    };

    const instance = ReactTestUtils.renderIntoDocument(
      <ComponentInFooBarContext />,
    );
    expect(instance.refs.child.context).toEqual({foo: 'abc'});
  });

  it('should pass next context to lifecycles', () => {
    let componentDidMountContext;
    let componentDidUpdateContext;
    let componentWillReceivePropsContext;
    let componentWillReceivePropsNextContext;
    let componentWillUpdateContext;
    let componentWillUpdateNextContext;
    let constructorContext;
    let renderContext;
    let shouldComponentUpdateContext;
    let shouldComponentUpdateNextContext;

    class Parent extends React.Component {
      getChildContext() {
        return {
          foo: this.props.foo,
          bar: 'bar',
        };
      }
      render() {
        return <Component />;
      }
    }
    Parent.childContextTypes = {
      foo: PropTypes.string.isRequired,
      bar: PropTypes.string.isRequired,
    };

    class Component extends React.Component {
      constructor(props, context) {
        super(props, context);
        constructorContext = context;
      }
      UNSAFE_componentWillReceiveProps(nextProps, nextContext) {
        componentWillReceivePropsContext = this.context;
        componentWillReceivePropsNextContext = nextContext;
        return true;
      }
      shouldComponentUpdate(nextProps, nextState, nextContext) {
        shouldComponentUpdateContext = this.context;
        shouldComponentUpdateNextContext = nextContext;
        return true;
      }
      UNSAFE_componentWillUpdate(nextProps, nextState, nextContext) {
        componentWillUpdateContext = this.context;
        componentWillUpdateNextContext = nextContext;
      }
      render() {
        renderContext = this.context;
        return <div />;
      }
      componentDidMount() {
        componentDidMountContext = this.context;
      }
      componentDidUpdate() {
        componentDidUpdateContext = this.context;
      }
    }
    Component.contextTypes = {
      foo: PropTypes.string,
    };

    const container = document.createElement('div');
    ReactDOM.render(<Parent foo="abc" />, container);
    expect(constructorContext).toEqual({foo: 'abc'});
    expect(renderContext).toEqual({foo: 'abc'});
    expect(componentDidMountContext).toEqual({foo: 'abc'});
    ReactDOM.render(<Parent foo="def" />, container);
    expect(componentWillReceivePropsContext).toEqual({foo: 'abc'});
    expect(componentWillReceivePropsNextContext).toEqual({foo: 'def'});
    expect(shouldComponentUpdateContext).toEqual({foo: 'abc'});
    expect(shouldComponentUpdateNextContext).toEqual({foo: 'def'});
    expect(componentWillUpdateContext).toEqual({foo: 'abc'});
    expect(componentWillUpdateNextContext).toEqual({foo: 'def'});
    expect(renderContext).toEqual({foo: 'def'});
    expect(componentDidUpdateContext).toEqual({foo: 'def'});
  });

  it('should check context types', () => {
    class Component extends React.Component {
      render() {
        return <div />;
      }
    }
    Component.contextTypes = {
      foo: PropTypes.string.isRequired,
    };

    expect(() => ReactTestUtils.renderIntoDocument(<Component />)).toErrorDev(
      'Warning: Failed context type: ' +
        'The context `foo` is marked as required in `Component`, but its value ' +
        'is `undefined`.\n' +
        '    in Component (at **)',
    );

    class ComponentInFooStringContext extends React.Component {
      getChildContext() {
        return {
          foo: this.props.fooValue,
        };
      }

      render() {
        return <Component />;
      }
    }
    ComponentInFooStringContext.childContextTypes = {
      foo: PropTypes.string,
    };

    // No additional errors expected
    ReactTestUtils.renderIntoDocument(
      <ComponentInFooStringContext fooValue={'bar'} />,
    );

    class ComponentInFooNumberContext extends React.Component {
      getChildContext() {
        return {
          foo: this.props.fooValue,
        };
      }

      render() {
        return <Component />;
      }
    }
    ComponentInFooNumberContext.childContextTypes = {
      foo: PropTypes.number,
    };

    expect(() =>
      ReactTestUtils.renderIntoDocument(
        <ComponentInFooNumberContext fooValue={123} />,
      ),
    ).toErrorDev(
      'Warning: Failed context type: ' +
        'Invalid context `foo` of type `number` supplied ' +
        'to `Component`, expected `string`.\n' +
        '    in Component (at **)\n' +
        '    in ComponentInFooNumberContext (at **)',
    );
  });

  it('should check child context types', () => {
    class Component extends React.Component {
      getChildContext() {
        return this.props.testContext;
      }

      render() {
        return <div />;
      }
    }
    Component.childContextTypes = {
      foo: PropTypes.string.isRequired,
      bar: PropTypes.number,
    };

    expect(() =>
      ReactTestUtils.renderIntoDocument(<Component testContext={{bar: 123}} />),
    ).toErrorDev(
      'Warning: Failed child context type: ' +
        'The child context `foo` is marked as required in `Component`, but its ' +
        'value is `undefined`.\n' +
        '    in Component (at **)',
    );

    expect(() =>
      ReactTestUtils.renderIntoDocument(<Component testContext={{foo: 123}} />),
    ).toErrorDev(
      'Warning: Failed child context type: ' +
        'Invalid child context `foo` of type `number` ' +
        'supplied to `Component`, expected `string`.\n' +
        '    in Component (at **)',
    );

    // No additional errors expected
    ReactTestUtils.renderIntoDocument(
      <Component testContext={{foo: 'foo', bar: 123}} />,
    );

    ReactTestUtils.renderIntoDocument(<Component testContext={{foo: 'foo'}} />);
  });

  it('warns of incorrect prop types on context provider', () => {
    const TestContext = React.createContext();

    TestContext.Provider.propTypes = {
      value: PropTypes.string.isRequired,
    };

    ReactTestUtils.renderIntoDocument(<TestContext.Provider value="val" />);

    class Component extends React.Component {
      render() {
        return <TestContext.Provider value={undefined} />;
      }
    }

    expect(() => ReactTestUtils.renderIntoDocument(<Component />)).toErrorDev(
      'Warning: Failed prop type: The prop `value` is marked as required in ' +
        '`Context.Provider`, but its value is `undefined`.\n' +
        '    in Component (at **)',
    );
  });

  // TODO (bvaughn) Remove this test and the associated behavior in the future.
  // It has only been added in Fiber to match the (unintentional) behavior in Stack.
  it('should warn (but not error) if getChildContext method is missing', () => {
    class ComponentA extends React.Component {
      static childContextTypes = {
        foo: PropTypes.string.isRequired,
      };
      render() {
        return <div />;
      }
    }
    class ComponentB extends React.Component {
      static childContextTypes = {
        foo: PropTypes.string.isRequired,
      };
      render() {
        return <div />;
      }
    }

    expect(() => ReactTestUtils.renderIntoDocument(<ComponentA />)).toErrorDev(
      'Warning: ComponentA.childContextTypes is specified but there is no ' +
        'getChildContext() method on the instance. You can either define ' +
        'getChildContext() on ComponentA or remove childContextTypes from it.',
    );

    // Warnings should be deduped by component type
    ReactTestUtils.renderIntoDocument(<ComponentA />);

    expect(() => ReactTestUtils.renderIntoDocument(<ComponentB />)).toErrorDev(
      'Warning: ComponentB.childContextTypes is specified but there is no ' +
        'getChildContext() method on the instance. You can either define ' +
        'getChildContext() on ComponentB or remove childContextTypes from it.',
    );
  });

  // TODO (bvaughn) Remove this test and the associated behavior in the future.
  // It has only been added in Fiber to match the (unintentional) behavior in Stack.
  it('should pass parent context if getChildContext method is missing', () => {
    class ParentContextProvider extends React.Component {
      static childContextTypes = {
        foo: PropTypes.string,
      };
      getChildContext() {
        return {
          foo: 'FOO',
        };
      }
      render() {
        return <MiddleMissingContext />;
      }
    }

    class MiddleMissingContext extends React.Component {
      static childContextTypes = {
        bar: PropTypes.string.isRequired,
      };
      render() {
        return <ChildContextConsumer />;
      }
    }

    let childContext;
    class ChildContextConsumer extends React.Component {
      render() {
        childContext = this.context;
        return <div />;
      }
    }
    ChildContextConsumer.contextTypes = {
      bar: PropTypes.string.isRequired,
      foo: PropTypes.string.isRequired,
    };

    expect(() =>
      ReactTestUtils.renderIntoDocument(<ParentContextProvider />),
    ).toErrorDev([
      'Warning: MiddleMissingContext.childContextTypes is specified but there is no ' +
        'getChildContext() method on the instance. You can either define getChildContext() ' +
        'on MiddleMissingContext or remove childContextTypes from it.',
      'Warning: Failed context type: The context `bar` is marked as required ' +
        'in `ChildContextConsumer`, but its value is `undefined`.',
    ]);
    expect(childContext.bar).toBeUndefined();
    expect(childContext.foo).toBe('FOO');
  });

  it('should pass next context to lifecycles', () => {
    let componentDidMountContext;
    let componentDidUpdateContext;
    let componentWillReceivePropsContext;
    let componentWillReceivePropsNextContext;
    let componentWillUpdateContext;
    let componentWillUpdateNextContext;
    let constructorContext;
    let renderContext;
    let shouldComponentUpdateWasCalled = false;

    const Context = React.createContext();

    class Component extends React.Component {
      static contextType = Context;
      constructor(props, context) {
        super(props, context);
        constructorContext = context;
      }
      UNSAFE_componentWillReceiveProps(nextProps, nextContext) {
        componentWillReceivePropsContext = this.context;
        componentWillReceivePropsNextContext = nextContext;
        return true;
      }
      shouldComponentUpdate(nextProps, nextState, nextContext) {
        shouldComponentUpdateWasCalled = true;
        return true;
      }
      UNSAFE_componentWillUpdate(nextProps, nextState, nextContext) {
        componentWillUpdateContext = this.context;
        componentWillUpdateNextContext = nextContext;
      }
      render() {
        renderContext = this.context;
        return <div />;
      }
      componentDidMount() {
        componentDidMountContext = this.context;
      }
      componentDidUpdate() {
        componentDidUpdateContext = this.context;
      }
    }

    const firstContext = {foo: 123};
    const secondContext = {bar: 456};

    const container = document.createElement('div');
    ReactDOM.render(
      <Context.Provider value={firstContext}>
        <Component />
      </Context.Provider>,
      container,
    );
    expect(constructorContext).toBe(firstContext);
    expect(renderContext).toBe(firstContext);
    expect(componentDidMountContext).toBe(firstContext);
    ReactDOM.render(
      <Context.Provider value={secondContext}>
        <Component />
      </Context.Provider>,
      container,
    );
    expect(componentWillReceivePropsContext).toBe(firstContext);
    expect(componentWillReceivePropsNextContext).toBe(secondContext);
    expect(componentWillUpdateContext).toBe(firstContext);
    expect(componentWillUpdateNextContext).toBe(secondContext);
    expect(renderContext).toBe(secondContext);
    expect(componentDidUpdateContext).toBe(secondContext);

    if (gate(flags => flags.enableLazyContextPropagation)) {
      expect(shouldComponentUpdateWasCalled).toBe(true);
    } else {
      // sCU is not called in this case because React force updates when a provider re-renders
      expect(shouldComponentUpdateWasCalled).toBe(false);
    }
  });

  it('should re-render PureComponents when context Provider updates', () => {
    let renderedContext;

    const Context = React.createContext();

    class Component extends React.PureComponent {
      static contextType = Context;
      render() {
        renderedContext = this.context;
        return <div />;
      }
    }

    const firstContext = {foo: 123};
    const secondContext = {bar: 456};

    const container = document.createElement('div');
    ReactDOM.render(
      <Context.Provider value={firstContext}>
        <Component />
      </Context.Provider>,
      container,
    );
    expect(renderedContext).toBe(firstContext);
    ReactDOM.render(
      <Context.Provider value={secondContext}>
        <Component />
      </Context.Provider>,
      container,
    );
    expect(renderedContext).toBe(secondContext);
  });

  it('should warn if both contextType and contextTypes are defined', () => {
    const Context = React.createContext();

    class ParentContextProvider extends React.Component {
      static childContextTypes = {
        foo: PropTypes.string,
      };
      getChildContext() {
        return {
          foo: 'FOO',
        };
      }
      render() {
        return this.props.children;
      }
    }

    class ComponentA extends React.Component {
      static contextTypes = {
        foo: PropTypes.string.isRequired,
      };
      static contextType = Context;
      render() {
        return <div />;
      }
    }
    class ComponentB extends React.Component {
      static contextTypes = {
        foo: PropTypes.string.isRequired,
      };
      static contextType = Context;
      render() {
        return <div />;
      }
    }

    expect(() =>
      ReactTestUtils.renderIntoDocument(
        <ParentContextProvider>
          <ComponentA />
        </ParentContextProvider>,
      ),
    ).toErrorDev(
      'Warning: ComponentA declares both contextTypes and contextType static properties. ' +
        'The legacy contextTypes property will be ignored.',
    );

    // Warnings should be deduped by component type
    ReactTestUtils.renderIntoDocument(
      <ParentContextProvider>
        <ComponentA />
      </ParentContextProvider>,
    );

    expect(() =>
      ReactTestUtils.renderIntoDocument(
        <ParentContextProvider>
          <ComponentB />
        </ParentContextProvider>,
      ),
    ).toErrorDev(
      'Warning: ComponentB declares both contextTypes and contextType static properties. ' +
        'The legacy contextTypes property will be ignored.',
    );
  });

  it('should warn if an invalid contextType is defined', () => {
    const Context = React.createContext();
    // This tests that both Context.Consumer and Context.Provider
    // warn about invalid contextType.
    class ComponentA extends React.Component {
      static contextType = Context.Consumer;
      render() {
        return <div />;
      }
    }
    class ComponentB extends React.Component {
      static contextType = Context.Provider;
      render() {
        return <div />;
      }
    }

    expect(() => {
      ReactTestUtils.renderIntoDocument(<ComponentA />);
    }).toErrorDev(
      'Warning: ComponentA defines an invalid contextType. ' +
        'contextType should point to the Context object returned by React.createContext(). ' +
        'Did you accidentally pass the Context.Consumer instead?',
    );

    // Warnings should be deduped by component type
    ReactTestUtils.renderIntoDocument(<ComponentA />);

    expect(() => {
      ReactTestUtils.renderIntoDocument(<ComponentB />);
    }).toErrorDev(
      'Warning: ComponentB defines an invalid contextType. ' +
        'contextType should point to the Context object returned by React.createContext(). ' +
        'Did you accidentally pass the Context.Provider instead?',
    );
  });

  it('should not warn when class contextType is null', () => {
    class Foo extends React.Component {
      static contextType = null; // Handy for conditional declaration
      render() {
        return this.context.hello.world;
      }
    }
    expect(() => {
      ReactTestUtils.renderIntoDocument(<Foo />);
    }).toThrow("Cannot read property 'world' of undefined");
  });

  it('should warn when class contextType is undefined', () => {
    class Foo extends React.Component {
      // This commonly happens with circular deps
      // https://github.com/facebook/react/issues/13969
      static contextType = undefined;
      render() {
        return this.context.hello.world;
      }
    }

    expect(() => {
      expect(() => {
        ReactTestUtils.renderIntoDocument(<Foo />);
      }).toThrow("Cannot read property 'world' of undefined");
    }).toErrorDev(
      'Foo defines an invalid contextType. ' +
        'contextType should point to the Context object returned by React.createContext(). ' +
        'However, it is set to undefined. ' +
        'This can be caused by a typo or by mixing up named and default imports. ' +
        'This can also happen due to a circular dependency, ' +
        'so try moving the createContext() call to a separate file.',
    );
  });

  it('should warn when class contextType is an object', () => {
    class Foo extends React.Component {
      // Can happen due to a typo
      static contextType = {
        x: 42,
        y: 'hello',
      };
      render() {
        return this.context.hello.world;
      }
    }

    expect(() => {
      expect(() => {
        ReactTestUtils.renderIntoDocument(<Foo />);
      }).toThrow("Cannot read property 'hello' of undefined");
    }).toErrorDev(
      'Foo defines an invalid contextType. ' +
        'contextType should point to the Context object returned by React.createContext(). ' +
        'However, it is set to an object with keys {x, y}.',
    );
  });

  it('should warn when class contextType is a primitive', () => {
    class Foo extends React.Component {
      static contextType = 'foo';
      render() {
        return this.context.hello.world;
      }
    }

    expect(() => {
      expect(() => {
        ReactTestUtils.renderIntoDocument(<Foo />);
      }).toThrow("Cannot read property 'world' of undefined");
    }).toErrorDev(
      'Foo defines an invalid contextType. ' +
        'contextType should point to the Context object returned by React.createContext(). ' +
        'However, it is set to a string.',
    );
  });

  it('should warn if you define contextType on a function component', () => {
    const Context = React.createContext();

    function ComponentA() {
      return <div />;
    }
    ComponentA.contextType = Context;

    function ComponentB() {
      return <div />;
    }
    ComponentB.contextType = Context;

    expect(() => ReactTestUtils.renderIntoDocument(<ComponentA />)).toErrorDev(
      'Warning: ComponentA: Function components do not support contextType.',
    );

    // Warnings should be deduped by component type
    ReactTestUtils.renderIntoDocument(<ComponentA />);

    expect(() => ReactTestUtils.renderIntoDocument(<ComponentB />)).toErrorDev(
      'Warning: ComponentB: Function components do not support contextType.',
    );
  });

  it('should honor a displayName if set on the context type', () => {
    const Context = React.createContext(null);
    Context.displayName = 'MyContextType';
    function Validator() {
      return null;
    }
    Validator.propTypes = {dontPassToSeeErrorStack: PropTypes.bool.isRequired};

    expect(() => {
      ReactDOMServer.renderToStaticMarkup(
        <Context.Provider>
          <Context.Consumer>{() => <Validator />}</Context.Consumer>
        </Context.Provider>,
      );
    }).toErrorDev(
      'Warning: Failed prop type: The prop `dontPassToSeeErrorStack` is marked as required in `Validator`, but its value is `undefined`.\n' +
        '    in Validator (at **)',
    );
  });

  it('warns if displayName is set on the consumer type', () => {
    const Context = React.createContext(null);

    expect(() => {
      Context.Consumer.displayName = 'IgnoredName';
    }).toWarnDev(
      'Warning: Setting `displayName` on Context.Consumer has no effect. ' +
        "You should set it directly on the context with Context.displayName = 'IgnoredName'.",
      {withoutStack: true},
    );

    // warning is deduped by Context so subsequent setting is fine
    Context.Consumer.displayName = 'ADifferentName';
  });
});
