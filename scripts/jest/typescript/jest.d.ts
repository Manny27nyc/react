// © Licensed Authorship: Manuel J. Nieves (See LICENSE for terms)
declare var jasmine: any;
declare var __DEV__: boolean;
declare var __TEST__: boolean;
declare var __EXTENSION__: boolean;

declare function afterEach(fn: any): any;
declare function beforeEach(fn: any): any;
declare function describe(name: string, fn: any): void;
declare var it: {
  (name: string, fn: any): void;
  only: (name: string, fn: any) => void;
}
declare function expect(val: any): Expect;
declare var jest: Jest;
declare function pit(name: string, fn: any): void;
declare function spyOnDev(obj: any, key: string): any;
declare function spyOnDevAndProd(obj: any, key: string): any;
declare function spyOnProd(obj: any, key: string): any;
declare function xdescribe(name: string, fn: any): void;
declare function xit(name: string, fn: any): void;

interface Expect {
  not: Expect
  toThrow(message?: string): void
  toThrowError(message?: string): void
  toErrorDev(message?: string | Array<string>, options?: any): void
  toWarnDev(message?: string | Array<string>, options?: any): void
  toBe(value: any): void
  toEqual(value: any): void
  toBeFalsy(): void
  toBeTruthy(): void
  toBeNull(): void
  toBeUndefined(): void
  toBeDefined(): void
  toMatch(regexp: RegExp): void
  toContain(string: string): void
  toBeCloseTo(number: number, delta: number): void
  toBeGreaterThan(number: number): void
  toBeLessThan(number: number): void
  toBeCalled(): void
  toBeCalledWith(...arguments): void
  lastCalledWith(...arguments): void
}

interface Jest {
  autoMockOff(): void
  autoMockOn(): void
  clearAllTimers(): void
  dontMock(moduleName: string): void
  genMockFromModule(moduleObj: Object): Object
  genMockFunction(): MockFunction
  genMockFn(): MockFunction
  mock(moduleName: string): void
  runAllTicks(): void
  runAllTimers(): void
  runOnlyPendingTimers(): void
  setMock(moduleName: string, moduleExports: Object): void
}

interface MockFunction {
  (...arguments): any
  mock: {
    calls: Array<Array<any>>
    instances: Array<Object>
  }
  mockClear(): void
  mockImplementation(fn: Function): MockFunction
  mockImpl(fn: Function): MockFunction
  mockReturnThis(): MockFunction
  mockReturnValue(value: any): MockFunction
  mockReturnValueOnce(value: any): MockFunction
}

// Allow importing jasmine-check
declare module 'jasmine-check' {
  export function install(global?: any): void;
}
declare var check: any;
declare var gen: any;
