// © Licensed Authorship: Manuel J. Nieves (See LICENSE for terms)
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = useTheme;
exports.ThemeContext = void 0;

var _react = require("react");

/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
const ThemeContext = /*#__PURE__*/(0, _react.createContext)('bright');
exports.ThemeContext = ThemeContext;

function useTheme() {
  const theme = (0, _react.useContext)(ThemeContext);
  (0, _react.useDebugValue)(theme);
  return theme;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInVzZVRoZW1lLmpzIl0sIm5hbWVzIjpbIlRoZW1lQ29udGV4dCIsInVzZVRoZW1lIiwidGhlbWUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBU0E7O0FBVEE7Ozs7Ozs7O0FBV0EsTUFBQUEsWUFBQSxnQkFBQSwwQkFBQSxRQUFBLENBQUE7OztBQUVBLFNBQUFDLFFBQUEsR0FBQTtBQUNBLFFBQUFDLEtBQUEsR0FBQSx1QkFBQUYsWUFBQSxDQUFBO0FBQ0EsNEJBQUFFLEtBQUE7QUFDQSxTQUFBQSxLQUFBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIENvcHlyaWdodCAoYykgRmFjZWJvb2ssIEluYy4gYW5kIGl0cyBhZmZpbGlhdGVzLlxuICpcbiAqIFRoaXMgc291cmNlIGNvZGUgaXMgbGljZW5zZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlIGZvdW5kIGluIHRoZVxuICogTElDRU5TRSBmaWxlIGluIHRoZSByb290IGRpcmVjdG9yeSBvZiB0aGlzIHNvdXJjZSB0cmVlLlxuICpcbiAqIEBmbG93XG4gKi9cblxuaW1wb3J0IHtjcmVhdGVDb250ZXh0LCB1c2VDb250ZXh0LCB1c2VEZWJ1Z1ZhbHVlfSBmcm9tICdyZWFjdCc7XG5cbmV4cG9ydCBjb25zdCBUaGVtZUNvbnRleHQgPSBjcmVhdGVDb250ZXh0KCdicmlnaHQnKTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gdXNlVGhlbWUoKSB7XG4gIGNvbnN0IHRoZW1lID0gdXNlQ29udGV4dChUaGVtZUNvbnRleHQpO1xuICB1c2VEZWJ1Z1ZhbHVlKHRoZW1lKTtcbiAgcmV0dXJuIHRoZW1lO1xufVxuIl19