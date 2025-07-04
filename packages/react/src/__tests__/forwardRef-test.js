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

describe('forwardRef', () => {
  let PropTypes;
  let React;
  let ReactNoop;
  let Scheduler;

  beforeEach(() => {
    jest.resetModules();
    PropTypes = require('prop-types');
    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');
  });

  it('should update refs when switching between children', () => {
    function FunctionComponent({forwardedRef, setRefOnDiv}) {
      return (
        <section>
          <div ref={setRefOnDiv ? forwardedRef : null}>First</div>
          <span ref={setRefOnDiv ? null : forwardedRef}>Second</span>
        </section>
      );
    }

    const RefForwardingComponent = React.forwardRef((props, ref) => (
      <FunctionComponent {...props} forwardedRef={ref} />
    ));

    const ref = React.createRef();

    ReactNoop.render(<RefForwardingComponent ref={ref} setRefOnDiv={true} />);
    expect(Scheduler).toFlushWithoutYielding();
    expect(ref.current.type).toBe('div');

    ReactNoop.render(<RefForwardingComponent ref={ref} setRefOnDiv={false} />);
    expect(Scheduler).toFlushWithoutYielding();
    expect(ref.current.type).toBe('span');
  });

  it('should support rendering null', () => {
    const RefForwardingComponent = React.forwardRef((props, ref) => null);

    const ref = React.createRef();

    ReactNoop.render(<RefForwardingComponent ref={ref} />);
    expect(Scheduler).toFlushWithoutYielding();
    expect(ref.current).toBe(null);
  });

  it('should support rendering null for multiple children', () => {
    const RefForwardingComponent = React.forwardRef((props, ref) => null);

    const ref = React.createRef();

    ReactNoop.render(
      <div>
        <div />
        <RefForwardingComponent ref={ref} />
        <div />
      </div>,
    );
    expect(Scheduler).toFlushWithoutYielding();
    expect(ref.current).toBe(null);
  });

  it('should support propTypes and defaultProps', () => {
    function FunctionComponent({forwardedRef, optional, required}) {
      return (
        <div ref={forwardedRef}>
          {optional}
          {required}
        </div>
      );
    }

    const RefForwardingComponent = React.forwardRef(function NamedFunction(
      props,
      ref,
    ) {
      return <FunctionComponent {...props} forwardedRef={ref} />;
    });
    RefForwardingComponent.propTypes = {
      optional: PropTypes.string,
      required: PropTypes.string.isRequired,
    };
    RefForwardingComponent.defaultProps = {
      optional: 'default',
    };

    const ref = React.createRef();

    ReactNoop.render(
      <RefForwardingComponent ref={ref} optional="foo" required="bar" />,
    );
    expect(Scheduler).toFlushWithoutYielding();
    expect(ref.current.children).toEqual([
      {text: 'foo', hidden: false},
      {text: 'bar', hidden: false},
    ]);

    ReactNoop.render(<RefForwardingComponent ref={ref} required="foo" />);
    expect(Scheduler).toFlushWithoutYielding();
    expect(ref.current.children).toEqual([
      {text: 'default', hidden: false},
      {text: 'foo', hidden: false},
    ]);

    expect(() =>
      ReactNoop.render(<RefForwardingComponent ref={ref} optional="foo" />),
    ).toErrorDev(
      'Warning: Failed prop type: The prop `required` is marked as required in ' +
        '`ForwardRef(NamedFunction)`, but its value is `undefined`.\n' +
        '    in NamedFunction (at **)',
    );
  });

  it('should warn if not provided a callback during creation', () => {
    expect(() =>
      React.forwardRef(undefined),
    ).toErrorDev(
      'forwardRef requires a render function but was given undefined.',
      {withoutStack: true},
    );
    expect(() => React.forwardRef(null)).toErrorDev(
      'forwardRef requires a render function but was given null.',
      {
        withoutStack: true,
      },
    );
    expect(() =>
      React.forwardRef('foo'),
    ).toErrorDev(
      'forwardRef requires a render function but was given string.',
      {withoutStack: true},
    );
  });

  it('should warn if no render function is provided', () => {
    expect(
      React.forwardRef,
    ).toErrorDev(
      'forwardRef requires a render function but was given undefined.',
      {withoutStack: true},
    );
  });

  it('should warn if the render function provided has propTypes or defaultProps attributes', () => {
    function renderWithPropTypes(props, ref) {
      return null;
    }
    renderWithPropTypes.propTypes = {};

    function renderWithDefaultProps(props, ref) {
      return null;
    }
    renderWithDefaultProps.defaultProps = {};

    expect(() =>
      React.forwardRef(renderWithPropTypes),
    ).toErrorDev(
      'forwardRef render functions do not support propTypes or defaultProps. ' +
        'Did you accidentally pass a React component?',
      {withoutStack: true},
    );
    expect(() =>
      React.forwardRef(renderWithDefaultProps),
    ).toErrorDev(
      'forwardRef render functions do not support propTypes or defaultProps. ' +
        'Did you accidentally pass a React component?',
      {withoutStack: true},
    );
  });

  it('should not warn if the render function provided does not use any parameter', () => {
    React.forwardRef(function arityOfZero() {
      return <div ref={arguments[1]} />;
    });
  });

  it('should warn if the render function provided does not use the forwarded ref parameter', () => {
    const arityOfOne = props => <div {...props} />;

    expect(() =>
      React.forwardRef(arityOfOne),
    ).toErrorDev(
      'forwardRef render functions accept exactly two parameters: props and ref. ' +
        'Did you forget to use the ref parameter?',
      {withoutStack: true},
    );
  });

  it('should not warn if the render function provided use exactly two parameters', () => {
    const arityOfTwo = (props, ref) => <div {...props} ref={ref} />;
    React.forwardRef(arityOfTwo);
  });

  it('should warn if the render function provided expects to use more than two parameters', () => {
    const arityOfThree = (props, ref, x) => <div {...props} ref={ref} x={x} />;

    expect(() =>
      React.forwardRef(arityOfThree),
    ).toErrorDev(
      'forwardRef render functions accept exactly two parameters: props and ref. ' +
        'Any additional parameter will be undefined.',
      {withoutStack: true},
    );
  });

  it('should fall back to showing something meaningful if no displayName or name are present', () => {
    const Component = props => <div {...props} />;

    const RefForwardingComponent = React.forwardRef((props, ref) => (
      <Component {...props} forwardedRef={ref} />
    ));

    RefForwardingComponent.propTypes = {
      optional: PropTypes.string,
      required: PropTypes.string.isRequired,
    };

    RefForwardingComponent.defaultProps = {
      optional: 'default',
    };

    const ref = React.createRef();

    expect(() =>
      ReactNoop.render(<RefForwardingComponent ref={ref} optional="foo" />),
    ).toErrorDev(
      'Warning: Failed prop type: The prop `required` is marked as required in ' +
        '`ForwardRef`, but its value is `undefined`.',
      // There's no component stack in this warning because the inner function is anonymous.
      // If we wanted to support this (for the Error frames / source location)
      // we could do this by updating ReactComponentStackFrame.
      {withoutStack: true},
    );
  });

  it('should honor a displayName if set on the forwardRef wrapper in warnings', () => {
    const Component = props => <div {...props} />;

    const RefForwardingComponent = React.forwardRef(function Inner(props, ref) {
      <Component {...props} forwardedRef={ref} />;
    });
    RefForwardingComponent.displayName = 'Custom';

    RefForwardingComponent.propTypes = {
      optional: PropTypes.string,
      required: PropTypes.string.isRequired,
    };

    RefForwardingComponent.defaultProps = {
      optional: 'default',
    };

    const ref = React.createRef();

    expect(() =>
      ReactNoop.render(<RefForwardingComponent ref={ref} optional="foo" />),
    ).toErrorDev(
      'Warning: Failed prop type: The prop `required` is marked as required in ' +
        '`Custom`, but its value is `undefined`.\n' +
        '    in Inner (at **)',
    );
  });

  it('should pass displayName to an anonymous inner component so it shows up in component stacks', () => {
    const Component = props => <div {...props} />;

    const RefForwardingComponent = React.forwardRef((props, ref) => (
      <Component {...props} forwardedRef={ref} />
    ));
    RefForwardingComponent.displayName = 'Custom';

    RefForwardingComponent.propTypes = {
      optional: PropTypes.string,
      required: PropTypes.string.isRequired,
    };

    RefForwardingComponent.defaultProps = {
      optional: 'default',
    };

    const ref = React.createRef();

    expect(() =>
      ReactNoop.render(<RefForwardingComponent ref={ref} optional="foo" />),
    ).toErrorDev(
      'Warning: Failed prop type: The prop `required` is marked as required in ' +
        '`Custom`, but its value is `undefined`.\n' +
        '    in Custom (at **)',
    );
  });

  it('should honor a displayName in stacks if set on the inner function', () => {
    const Component = props => <div {...props} />;

    const inner = (props, ref) => <Component {...props} forwardedRef={ref} />;
    inner.displayName = 'Inner';
    const RefForwardingComponent = React.forwardRef(inner);

    RefForwardingComponent.propTypes = {
      optional: PropTypes.string,
      required: PropTypes.string.isRequired,
    };

    RefForwardingComponent.defaultProps = {
      optional: 'default',
    };

    const ref = React.createRef();

    expect(() =>
      ReactNoop.render(<RefForwardingComponent ref={ref} optional="foo" />),
    ).toErrorDev(
      'Warning: Failed prop type: The prop `required` is marked as required in ' +
        '`ForwardRef(Inner)`, but its value is `undefined`.\n' +
        '    in Inner (at **)',
    );
  });

  it('should honor a outer displayName when wrapped component and memo component set displayName at the same time.', () => {
    const Component = props => <div {...props} />;

    const inner = (props, ref) => <Component {...props} forwardedRef={ref} />;
    inner.displayName = 'Inner';
    const RefForwardingComponent = React.forwardRef(inner);
    RefForwardingComponent.displayName = 'Outer';

    RefForwardingComponent.propTypes = {
      optional: PropTypes.string,
      required: PropTypes.string.isRequired,
    };

    RefForwardingComponent.defaultProps = {
      optional: 'default',
    };

    const ref = React.createRef();

    expect(() =>
      ReactNoop.render(<RefForwardingComponent ref={ref} optional="foo" />),
    ).toErrorDev(
      'Warning: Failed prop type: The prop `required` is marked as required in ' +
        '`Outer`, but its value is `undefined`.\n' +
        '    in Inner (at **)',
    );
  });

  it('should not bailout if forwardRef is not wrapped in memo', () => {
    const Component = props => <div {...props} />;

    let renderCount = 0;

    const RefForwardingComponent = React.forwardRef((props, ref) => {
      renderCount++;
      return <Component {...props} forwardedRef={ref} />;
    });

    const ref = React.createRef();

    ReactNoop.render(<RefForwardingComponent ref={ref} optional="foo" />);
    expect(Scheduler).toFlushWithoutYielding();
    expect(renderCount).toBe(1);

    ReactNoop.render(<RefForwardingComponent ref={ref} optional="foo" />);
    expect(Scheduler).toFlushWithoutYielding();
    expect(renderCount).toBe(2);
  });

  it('should bailout if forwardRef is wrapped in memo', () => {
    const Component = props => <div ref={props.forwardedRef} />;

    let renderCount = 0;

    const RefForwardingComponent = React.memo(
      React.forwardRef((props, ref) => {
        renderCount++;
        return <Component {...props} forwardedRef={ref} />;
      }),
    );

    const ref = React.createRef();

    ReactNoop.render(<RefForwardingComponent ref={ref} optional="foo" />);
    expect(Scheduler).toFlushWithoutYielding();
    expect(renderCount).toBe(1);

    expect(ref.current.type).toBe('div');

    ReactNoop.render(<RefForwardingComponent ref={ref} optional="foo" />);
    expect(Scheduler).toFlushWithoutYielding();
    expect(renderCount).toBe(1);

    const differentRef = React.createRef();

    ReactNoop.render(
      <RefForwardingComponent ref={differentRef} optional="foo" />,
    );
    expect(Scheduler).toFlushWithoutYielding();
    expect(renderCount).toBe(2);

    expect(ref.current).toBe(null);
    expect(differentRef.current.type).toBe('div');

    ReactNoop.render(<RefForwardingComponent ref={ref} optional="bar" />);
    expect(Scheduler).toFlushWithoutYielding();
    expect(renderCount).toBe(3);
  });

  it('should custom memo comparisons to compose', () => {
    const Component = props => <div ref={props.forwardedRef} />;

    let renderCount = 0;

    const RefForwardingComponent = React.memo(
      React.forwardRef((props, ref) => {
        renderCount++;
        return <Component {...props} forwardedRef={ref} />;
      }),
      (o, p) => o.a === p.a && o.b === p.b,
    );

    const ref = React.createRef();

    ReactNoop.render(<RefForwardingComponent ref={ref} a="0" b="0" c="1" />);
    expect(Scheduler).toFlushWithoutYielding();
    expect(renderCount).toBe(1);

    expect(ref.current.type).toBe('div');

    // Changing either a or b rerenders
    ReactNoop.render(<RefForwardingComponent ref={ref} a="0" b="1" c="1" />);
    expect(Scheduler).toFlushWithoutYielding();
    expect(renderCount).toBe(2);

    // Changing c doesn't rerender
    ReactNoop.render(<RefForwardingComponent ref={ref} a="0" b="1" c="2" />);
    expect(Scheduler).toFlushWithoutYielding();
    expect(renderCount).toBe(2);

    const ComposedMemo = React.memo(
      RefForwardingComponent,
      (o, p) => o.a === p.a && o.c === p.c,
    );

    ReactNoop.render(<ComposedMemo ref={ref} a="0" b="0" c="0" />);
    expect(Scheduler).toFlushWithoutYielding();
    expect(renderCount).toBe(3);

    // Changing just b no longer updates
    ReactNoop.render(<ComposedMemo ref={ref} a="0" b="1" c="0" />);
    expect(Scheduler).toFlushWithoutYielding();
    expect(renderCount).toBe(3);

    // Changing just a and c updates
    ReactNoop.render(<ComposedMemo ref={ref} a="2" b="2" c="2" />);
    expect(Scheduler).toFlushWithoutYielding();
    expect(renderCount).toBe(4);

    // Changing just c does not update
    ReactNoop.render(<ComposedMemo ref={ref} a="2" b="2" c="3" />);
    expect(Scheduler).toFlushWithoutYielding();
    expect(renderCount).toBe(4);

    // Changing ref still rerenders
    const differentRef = React.createRef();

    ReactNoop.render(<ComposedMemo ref={differentRef} a="2" b="2" c="3" />);
    expect(Scheduler).toFlushWithoutYielding();
    expect(renderCount).toBe(5);

    expect(ref.current).toBe(null);
    expect(differentRef.current.type).toBe('div');
  });

  it('warns on forwardRef(memo(...))', () => {
    expect(() => {
      React.forwardRef(
        React.memo((props, ref) => {
          return null;
        }),
      );
    }).toErrorDev(
      [
        'Warning: forwardRef requires a render function but received a `memo` ' +
          'component. Instead of forwardRef(memo(...)), use ' +
          'memo(forwardRef(...)).',
      ],
      {withoutStack: true},
    );
  });
});
