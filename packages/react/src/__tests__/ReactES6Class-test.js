// © Licensed Authorship: Manuel J. Nieves (See LICENSE for terms)
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

let PropTypes;
let React;
let ReactDOM;
let act;

describe('ReactES6Class', () => {
  let container;
  let root;
  const freeze = function(expectation) {
    Object.freeze(expectation);
    return expectation;
  };
  let Inner;
  let attachedListener = null;
  let renderedName = null;

  beforeEach(() => {
    PropTypes = require('prop-types');
    React = require('react');
    ReactDOM = require('react-dom');
    act = require('jest-react').act;
    container = document.createElement('div');
    root = ReactDOM.createRoot(container);
    attachedListener = null;
    renderedName = null;
    Inner = class extends React.Component {
      getName() {
        return this.props.name;
      }
      render() {
        attachedListener = this.props.onClick;
        renderedName = this.props.name;
        return <div className={this.props.name} />;
      }
    };
  });

  function test(element, expectedTag, expectedClassName) {
    act(() => root.render(element));
    expect(container.firstChild).not.toBeNull();
    expect(container.firstChild.tagName).toBe(expectedTag);
    expect(container.firstChild.className).toBe(expectedClassName);
  }

  it('preserves the name of the class for use in error messages', () => {
    class Foo extends React.Component {}
    expect(Foo.name).toBe('Foo');
  });

  it('throws if no render function is defined', () => {
    class Foo extends React.Component {}
    expect(() => {
      expect(() => act(() => root.render(<Foo />))).toThrow();
    }).toErrorDev([
      // A failed component renders four times in DEV in concurrent mode
      'Warning: Foo(...): No `render` method found on the returned component ' +
        'instance: you may have forgotten to define `render`.',
      'Warning: Foo(...): No `render` method found on the returned component ' +
        'instance: you may have forgotten to define `render`.',
      'Warning: Foo(...): No `render` method found on the returned component ' +
        'instance: you may have forgotten to define `render`.',
      'Warning: Foo(...): No `render` method found on the returned component ' +
        'instance: you may have forgotten to define `render`.',
    ]);
  });

  it('renders a simple stateless component with prop', () => {
    class Foo extends React.Component {
      render() {
        return <Inner name={this.props.bar} />;
      }
    }
    test(<Foo bar="foo" />, 'DIV', 'foo');
    test(<Foo bar="bar" />, 'DIV', 'bar');
  });

  it('renders based on state using initial values in this.props', () => {
    class Foo extends React.Component {
      constructor(props) {
        super(props);
        this.state = {bar: this.props.initialValue};
      }
      render() {
        return <span className={this.state.bar} />;
      }
    }
    test(<Foo initialValue="foo" />, 'SPAN', 'foo');
  });

  it('renders based on state using props in the constructor', () => {
    class Foo extends React.Component {
      constructor(props) {
        super(props);
        this.state = {bar: props.initialValue};
      }
      changeState() {
        this.setState({bar: 'bar'});
      }
      render() {
        if (this.state.bar === 'foo') {
          return <div className="foo" />;
        }
        return <span className={this.state.bar} />;
      }
    }
    const ref = React.createRef();
    test(<Foo initialValue="foo" ref={ref} />, 'DIV', 'foo');
    act(() => ref.current.changeState());
    test(<Foo />, 'SPAN', 'bar');
  });

  it('sets initial state with value returned by static getDerivedStateFromProps', () => {
    class Foo extends React.Component {
      state = {};
      static getDerivedStateFromProps(nextProps, prevState) {
        return {
          foo: nextProps.foo,
          bar: 'bar',
        };
      }
      render() {
        return <div className={`${this.state.foo} ${this.state.bar}`} />;
      }
    }
    test(<Foo foo="foo" />, 'DIV', 'foo bar');
  });

  it('warns if getDerivedStateFromProps is not static', () => {
    class Foo extends React.Component {
      getDerivedStateFromProps() {
        return {};
      }
      render() {
        return <div />;
      }
    }
    expect(() => act(() => root.render(<Foo foo="foo" />))).toErrorDev(
      'Foo: getDerivedStateFromProps() is defined as an instance method ' +
        'and will be ignored. Instead, declare it as a static method.',
    );
  });

  it('warns if getDerivedStateFromError is not static', () => {
    class Foo extends React.Component {
      getDerivedStateFromError() {
        return {};
      }
      render() {
        return <div />;
      }
    }
    expect(() => act(() => root.render(<Foo foo="foo" />))).toErrorDev(
      'Foo: getDerivedStateFromError() is defined as an instance method ' +
        'and will be ignored. Instead, declare it as a static method.',
    );
  });

  it('warns if getSnapshotBeforeUpdate is static', () => {
    class Foo extends React.Component {
      static getSnapshotBeforeUpdate() {}
      render() {
        return <div />;
      }
    }
    expect(() => act(() => root.render(<Foo foo="foo" />))).toErrorDev(
      'Foo: getSnapshotBeforeUpdate() is defined as a static method ' +
        'and will be ignored. Instead, declare it as an instance method.',
    );
  });

  it('warns if state not initialized before static getDerivedStateFromProps', () => {
    class Foo extends React.Component {
      static getDerivedStateFromProps(nextProps, prevState) {
        return {
          foo: nextProps.foo,
          bar: 'bar',
        };
      }
      render() {
        return <div className={`${this.state.foo} ${this.state.bar}`} />;
      }
    }
    expect(() => act(() => root.render(<Foo foo="foo" />))).toErrorDev(
      '`Foo` uses `getDerivedStateFromProps` but its initial state is ' +
        'undefined. This is not recommended. Instead, define the initial state by ' +
        'assigning an object to `this.state` in the constructor of `Foo`. ' +
        'This ensures that `getDerivedStateFromProps` arguments have a consistent shape.',
    );
  });

  it('updates initial state with values returned by static getDerivedStateFromProps', () => {
    class Foo extends React.Component {
      state = {
        foo: 'foo',
        bar: 'bar',
      };
      static getDerivedStateFromProps(nextProps, prevState) {
        return {
          foo: `not-${prevState.foo}`,
        };
      }
      render() {
        return <div className={`${this.state.foo} ${this.state.bar}`} />;
      }
    }
    test(<Foo />, 'DIV', 'not-foo bar');
  });

  it('renders updated state with values returned by static getDerivedStateFromProps', () => {
    class Foo extends React.Component {
      state = {
        value: 'initial',
      };
      static getDerivedStateFromProps(nextProps, prevState) {
        if (nextProps.update) {
          return {
            value: 'updated',
          };
        }
        return null;
      }
      render() {
        return <div className={this.state.value} />;
      }
    }
    test(<Foo update={false} />, 'DIV', 'initial');
    test(<Foo update={true} />, 'DIV', 'updated');
  });

  it('renders based on context in the constructor', () => {
    class Foo extends React.Component {
      constructor(props, context) {
        super(props, context);
        this.state = {tag: context.tag, className: this.context.className};
      }
      render() {
        const Tag = this.state.tag;
        return <Tag className={this.state.className} />;
      }
    }
    Foo.contextTypes = {
      tag: PropTypes.string,
      className: PropTypes.string,
    };

    class Outer extends React.Component {
      getChildContext() {
        return {tag: 'span', className: 'foo'};
      }
      render() {
        return <Foo />;
      }
    }
    Outer.childContextTypes = {
      tag: PropTypes.string,
      className: PropTypes.string,
    };
    test(<Outer />, 'SPAN', 'foo');
  });

  it('renders only once when setting state in componentWillMount', () => {
    let renderCount = 0;
    class Foo extends React.Component {
      constructor(props) {
        super(props);
        this.state = {bar: props.initialValue};
      }
      UNSAFE_componentWillMount() {
        this.setState({bar: 'bar'});
      }
      render() {
        renderCount++;
        return <span className={this.state.bar} />;
      }
    }
    test(<Foo initialValue="foo" />, 'SPAN', 'bar');
    // This is broken with deferRenderPhaseUpdateToNextBatch flag on.
    // We can't use the gate feature here because this test is also in CoffeeScript and TypeScript.
    expect(renderCount).toBe(global.__WWW__ && !global.__VARIANT__ ? 2 : 1);
  });

  it('should warn with non-object in the initial state property', () => {
    [['an array'], 'a string', 1234].forEach(function(state) {
      class Foo extends React.Component {
        constructor() {
          super();
          this.state = state;
        }
        render() {
          return <span />;
        }
      }
      expect(() => test(<Foo />, 'SPAN', '')).toErrorDev(
        'Foo.state: must be set to an object or null',
      );
    });
  });

  it('should render with null in the initial state property', () => {
    class Foo extends React.Component {
      constructor() {
        super();
        this.state = null;
      }
      render() {
        return <span />;
      }
    }
    test(<Foo />, 'SPAN', '');
  });

  it('setState through an event handler', () => {
    class Foo extends React.Component {
      constructor(props) {
        super(props);
        this.state = {bar: props.initialValue};
      }
      handleClick() {
        this.setState({bar: 'bar'});
      }
      render() {
        return (
          <Inner name={this.state.bar} onClick={this.handleClick.bind(this)} />
        );
      }
    }
    test(<Foo initialValue="foo" />, 'DIV', 'foo');

    act(() => attachedListener());
    expect(renderedName).toBe('bar');
  });

  it('should not implicitly bind event handlers', () => {
    class Foo extends React.Component {
      constructor(props) {
        super(props);
        this.state = {bar: props.initialValue};
      }
      handleClick() {
        this.setState({bar: 'bar'});
      }
      render() {
        return <Inner name={this.state.bar} onClick={this.handleClick} />;
      }
    }
    test(<Foo initialValue="foo" />, 'DIV', 'foo');
    expect(attachedListener).toThrow();
  });

  it('renders using forceUpdate even when there is no state', () => {
    class Foo extends React.Component {
      constructor(props) {
        super(props);
        this.mutativeValue = props.initialValue;
      }
      handleClick() {
        this.mutativeValue = 'bar';
        this.forceUpdate();
      }
      render() {
        return (
          <Inner
            name={this.mutativeValue}
            onClick={this.handleClick.bind(this)}
          />
        );
      }
    }
    test(<Foo initialValue="foo" />, 'DIV', 'foo');
    act(() => attachedListener());
    expect(renderedName).toBe('bar');
  });

  it('will call all the normal life cycle methods', () => {
    let lifeCycles = [];
    class Foo extends React.Component {
      constructor() {
        super();
        this.state = {};
      }
      UNSAFE_componentWillMount() {
        lifeCycles.push('will-mount');
      }
      componentDidMount() {
        lifeCycles.push('did-mount');
      }
      UNSAFE_componentWillReceiveProps(nextProps) {
        lifeCycles.push('receive-props', nextProps);
      }
      shouldComponentUpdate(nextProps, nextState) {
        lifeCycles.push('should-update', nextProps, nextState);
        return true;
      }
      UNSAFE_componentWillUpdate(nextProps, nextState) {
        lifeCycles.push('will-update', nextProps, nextState);
      }
      componentDidUpdate(prevProps, prevState) {
        lifeCycles.push('did-update', prevProps, prevState);
      }
      componentWillUnmount() {
        lifeCycles.push('will-unmount');
      }
      render() {
        return <span className={this.props.value} />;
      }
    }
    test(<Foo value="foo" />, 'SPAN', 'foo');
    expect(lifeCycles).toEqual(['will-mount', 'did-mount']);
    lifeCycles = []; // reset
    test(<Foo value="bar" />, 'SPAN', 'bar');
    // prettier-ignore
    expect(lifeCycles).toEqual([
      'receive-props', freeze({value: 'bar'}),
      'should-update', freeze({value: 'bar'}), {},
      'will-update', freeze({value: 'bar'}), {},
      'did-update', freeze({value: 'foo'}), {},
    ]);
    lifeCycles = []; // reset
    act(() => root.unmount());
    expect(lifeCycles).toEqual(['will-unmount']);
  });

  it('warns when classic properties are defined on the instance, but does not invoke them.', () => {
    let getDefaultPropsWasCalled = false;
    let getInitialStateWasCalled = false;
    class Foo extends React.Component {
      constructor() {
        super();
        this.contextTypes = {};
        this.contextType = {};
        this.propTypes = {};
      }
      getInitialState() {
        getInitialStateWasCalled = true;
        return {};
      }
      getDefaultProps() {
        getDefaultPropsWasCalled = true;
        return {};
      }
      render() {
        return <span className="foo" />;
      }
    }

    expect(() => test(<Foo />, 'SPAN', 'foo')).toErrorDev([
      'getInitialState was defined on Foo, a plain JavaScript class.',
      'getDefaultProps was defined on Foo, a plain JavaScript class.',
      'propTypes was defined as an instance property on Foo.',
      'contextType was defined as an instance property on Foo.',
      'contextTypes was defined as an instance property on Foo.',
    ]);
    expect(getInitialStateWasCalled).toBe(false);
    expect(getDefaultPropsWasCalled).toBe(false);
  });

  it('does not warn about getInitialState() on class components if state is also defined.', () => {
    class Foo extends React.Component {
      state = this.getInitialState();
      getInitialState() {
        return {};
      }
      render() {
        return <span className="foo" />;
      }
    }
    test(<Foo />, 'SPAN', 'foo');
  });

  it('should warn when misspelling shouldComponentUpdate', () => {
    class NamedComponent extends React.Component {
      componentShouldUpdate() {
        return false;
      }
      render() {
        return <span className="foo" />;
      }
    }

    expect(() => test(<NamedComponent />, 'SPAN', 'foo')).toErrorDev(
      'Warning: ' +
        'NamedComponent has a method called componentShouldUpdate(). Did you ' +
        'mean shouldComponentUpdate()? The name is phrased as a question ' +
        'because the function is expected to return a value.',
    );
  });

  it('should warn when misspelling componentWillReceiveProps', () => {
    class NamedComponent extends React.Component {
      componentWillRecieveProps() {
        return false;
      }
      render() {
        return <span className="foo" />;
      }
    }

    expect(() => test(<NamedComponent />, 'SPAN', 'foo')).toErrorDev(
      'Warning: ' +
        'NamedComponent has a method called componentWillRecieveProps(). Did ' +
        'you mean componentWillReceiveProps()?',
    );
  });

  it('should warn when misspelling UNSAFE_componentWillReceiveProps', () => {
    class NamedComponent extends React.Component {
      UNSAFE_componentWillRecieveProps() {
        return false;
      }
      render() {
        return <span className="foo" />;
      }
    }

    expect(() => test(<NamedComponent />, 'SPAN', 'foo')).toErrorDev(
      'Warning: ' +
        'NamedComponent has a method called UNSAFE_componentWillRecieveProps(). ' +
        'Did you mean UNSAFE_componentWillReceiveProps()?',
    );
  });

  it('should throw AND warn when trying to access classic APIs', () => {
    const ref = React.createRef();
    test(<Inner name="foo" ref={ref} />, 'DIV', 'foo');
    expect(() =>
      expect(() => ref.current.replaceState({})).toThrow(),
    ).toWarnDev(
      'replaceState(...) is deprecated in plain JavaScript React classes',
      {withoutStack: true},
    );
    expect(() =>
      expect(() => ref.current.isMounted()).toThrow(),
    ).toWarnDev(
      'isMounted(...) is deprecated in plain JavaScript React classes',
      {withoutStack: true},
    );
  });

  it('supports this.context passed via getChildContext', () => {
    class Bar extends React.Component {
      render() {
        return <div className={this.context.bar} />;
      }
    }
    Bar.contextTypes = {bar: PropTypes.string};
    class Foo extends React.Component {
      getChildContext() {
        return {bar: 'bar-through-context'};
      }
      render() {
        return <Bar />;
      }
    }
    Foo.childContextTypes = {bar: PropTypes.string};
    test(<Foo />, 'DIV', 'bar-through-context');
  });

  it('supports classic refs', () => {
    class Foo extends React.Component {
      render() {
        return <Inner name="foo" ref="inner" />;
      }
    }
    const ref = React.createRef();
    test(<Foo ref={ref} />, 'DIV', 'foo');
    expect(ref.current.refs.inner.getName()).toBe('foo');
  });

  it('supports drilling through to the DOM using findDOMNode', () => {
    const ref = React.createRef();
    test(<Inner name="foo" ref={ref} />, 'DIV', 'foo');
    const node = ReactDOM.findDOMNode(ref.current);
    expect(node).toBe(container.firstChild);
  });
});
