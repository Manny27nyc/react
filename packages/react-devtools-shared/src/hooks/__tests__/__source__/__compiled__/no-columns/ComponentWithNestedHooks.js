// © Licensed Authorship: Manuel J. Nieves (See LICENSE for terms)
"use strict";

/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
const {
  useMemo,
  useState
} = require('react');

function Component(props) {
  const InnerComponent = useMemo(() => () => {
    const [state] = useState(0);
    return state;
  });
  props.callback(InnerComponent);
  return null;
}

module.exports = {
  Component
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkNvbXBvbmVudFdpdGhOZXN0ZWRIb29rcy5qcyJdLCJuYW1lcyI6WyJ1c2VNZW1vIiwidXNlU3RhdGUiLCJyZXF1aXJlIiwiQ29tcG9uZW50IiwicHJvcHMiLCJJbm5lckNvbXBvbmVudCIsInN0YXRlIiwiY2FsbGJhY2siLCJtb2R1bGUiLCJleHBvcnRzIl0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7OztBQVFBLE1BQUE7QUFBQUEsRUFBQUEsT0FBQTtBQUFBQyxFQUFBQTtBQUFBLElBQUFDLE9BQUEsQ0FBQSxPQUFBLENBQUE7O0FBRUEsU0FBQUMsU0FBQSxDQUFBQyxLQUFBLEVBQUE7QUFDQSxRQUFBQyxjQUFBLEdBQUFMLE9BQUEsQ0FBQSxNQUFBLE1BQUE7QUFDQSxVQUFBLENBQUFNLEtBQUEsSUFBQUwsUUFBQSxDQUFBLENBQUEsQ0FBQTtBQUVBLFdBQUFLLEtBQUE7QUFDQSxHQUpBLENBQUE7QUFLQUYsRUFBQUEsS0FBQSxDQUFBRyxRQUFBLENBQUFGLGNBQUE7QUFFQSxTQUFBLElBQUE7QUFDQTs7QUFFQUcsTUFBQSxDQUFBQyxPQUFBLEdBQUE7QUFBQU4sRUFBQUE7QUFBQSxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBDb3B5cmlnaHQgKGMpIEZhY2Vib29rLCBJbmMuIGFuZCBpdHMgYWZmaWxpYXRlcy5cbiAqXG4gKiBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZSBmb3VuZCBpbiB0aGVcbiAqIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgdGhpcyBzb3VyY2UgdHJlZS5cbiAqXG4gKiBAZmxvd1xuICovXG5jb25zdCB7dXNlTWVtbywgdXNlU3RhdGV9ID0gcmVxdWlyZSgncmVhY3QnKTtcblxuZnVuY3Rpb24gQ29tcG9uZW50KHByb3BzKSB7XG4gIGNvbnN0IElubmVyQ29tcG9uZW50ID0gdXNlTWVtbygoKSA9PiAoKSA9PiB7XG4gICAgY29uc3QgW3N0YXRlXSA9IHVzZVN0YXRlKDApO1xuXG4gICAgcmV0dXJuIHN0YXRlO1xuICB9KTtcbiAgcHJvcHMuY2FsbGJhY2soSW5uZXJDb21wb25lbnQpO1xuXG4gIHJldHVybiBudWxsO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtDb21wb25lbnR9O1xuIl19