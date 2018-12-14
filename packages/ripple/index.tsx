// The MIT License
//
// Copyright (c) 2018 Google, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
import * as React from "react";
import * as classnames from "classnames";
// @ts-ignore
import { MDCRippleFoundation, util } from "@material/ripple/dist/mdc.ripple";

const MATCHES = util.getMatchesProperty(HTMLElement.prototype);

interface RippledComponentBaseProps<T> {
  unbounded: boolean,
  disabled: boolean,
  style: React.CSSProperties,
  className: string,
  onMouseDown: React.MouseEventHandler<T>,
  onMouseUp: React.MouseEventHandler<T>,
  onTouchStart: React.TouchEventHandler<T>,
  onTouchEnd: React.TouchEventHandler<T>,
  onKeyDown: React.KeyboardEventHandler<T>,
  onKeyUp: React.KeyboardEventHandler<T>,
  onFocus: React.FocusEventHandler<T>,
  onBlur: React.FocusEventHandler<T>,
}

interface RippledComponentState {
  classList: Set<string>,
  style: React.CSSProperties,
}

type InjectedProps<P, S, A> = RippledComponentBaseProps<P> & {
  initRipple: (surface: S, activator?: A) => void,
};

function isElement(element: any): element is Element {
  return element[MATCHES as 'matches'] !== undefined;
}

const withRipple = <P extends InjectedProps<P, Surface, Activator>, Surface extends Element = Element, Activator extends Element = Element>(
  WrappedComponent: React.ComponentType<P>
) => {
  return class RippledComponent extends React.Component<
    P & RippledComponentBaseProps<Surface>,
    RippledComponentState
  > {
    foundation_: MDCRippleFoundation | null = null;
    isMounted_: boolean = true;

    displayName = `WithRipple(${getDisplayName<P>(WrappedComponent)})`;

    state = {
      classList: new Set(),
      style: {},
    };
    
    static defaultProps = {
      unbounded: false,
      disabled: false,
      style: {},
      className: "",
      onMouseDown: () => {},
      onMouseUp: () => {},
      onTouchStart: () => {},
      onTouchEnd: () => {},
      onKeyDown: () => {},
      onKeyUp: () => {},
      onFocus: () => {},
      onBlur: () => {}
    };

    componentDidMount() {
      if (!this.foundation_) {
        throw new Error(
          "You must call initRipple from the element's " +
            "ref prop to initialize the adapter for withRipple"
        );
      }
    }

    componentWillUnmount() {
      if (this.foundation_) {
        this.isMounted_ = false;
        this.foundation_.destroy();
      }
    }

    // surface: This element receives the visual treatment (classes and style) of the ripple.
    // activator: This element is used to detect whether to activate the ripple. If this is not
    // provided, the ripple surface will be used to detect activation.
    initializeFoundation_ = (surface: Surface, activator?: Activator) => {
      const adapter = this.createAdapter_(surface, activator);
      this.foundation_ = new MDCRippleFoundation(adapter);
      this.foundation_.init();
    };

    createAdapter_ = (surface: Surface, activator?: Activator) => {
      return {
        browserSupportsCssVars: () => util.supportsCssVariables(window),
        isUnbounded: () => this.props.unbounded,
        isSurfaceActive: () => {
          if (activator) {
            if (isElement(activator)) {
              return activator[MATCHES as 'matches'](':active');
            }
            return false;
          }

          if (isElement(surface)) {
            return surface[MATCHES as 'matches'](':active');
          }
          return false;
        },
        isSurfaceDisabled: () => this.props.disabled,
        addClass: (className: string) => {
          if (!this.isMounted_) {
            return;
          }
          this.setState({ classList: this.state.classList.add(className) });
        },
        removeClass: (className: string) => {
          if (!this.isMounted_) {
            return;
          }
          const { classList } = this.state;
          classList.delete(className);
          this.setState({ classList });
        },
        registerDocumentInteractionHandler: (evtType: string, handler: EventListener) =>
          document.documentElement.addEventListener(
            evtType,
            handler,
            util.applyPassive()
          ),
        deregisterDocumentInteractionHandler: (evtType: string, handler: EventListener) =>
          document.documentElement.removeEventListener(
            evtType,
            handler,
            util.applyPassive()
          ),
        registerResizeHandler: (handler: EventListener) =>
          window.addEventListener("resize", handler),
        deregisterResizeHandler: (handler: EventListener) =>
          window.removeEventListener("resize", handler),
        updateCssVariable: this.updateCssVariable,
        computeBoundingRect: () => {
          if (!this.isMounted_) {
            // need to return object since foundation expects it
            return {};
          }
          if (this.props.computeBoundingRect) {
            return this.props.computeBoundingRect(surface);
          }
          return surface.getBoundingClientRect();
        },
        getWindowPageOffset: () => ({
          x: window.pageXOffset,
          y: window.pageYOffset
        })
      };
    };

    handleFocus = (e: React.FocusEvent<Surface>) => {
      this.props.onFocus(e);
      this.foundation_.handleFocus();
    };

    handleBlur = (e: React.FocusEvent<Surface>) => {
      this.props.onBlur(e);
      this.foundation_.handleBlur();
    };

    handleMouseDown = (e: React.MouseEvent<Surface>) => {
      this.props.onMouseDown(e);
      this.activateRipple(e);
    };

    handleMouseUp = (e: React.MouseEvent<Surface>) => {
      this.props.onMouseUp(e);
      this.deactivateRipple(e);
    };

    handleTouchStart = (e: React.TouchEvent<Surface>) => {
      this.props.onTouchStart(e);
      this.activateRipple(e);
    };

    handleTouchEnd = (e: React.TouchEvent<Surface>) => {
      this.props.onTouchEnd(e);
      this.deactivateRipple(e);
    };

    handleKeyDown = (e: React.KeyboardEvent<Surface>) => {
      this.props.onKeyDown(e);
      this.activateRipple(e);
    };

    handleKeyUp = (e: React.KeyboardEvent<Surface>) => {
      this.props.onKeyUp(e);
      this.deactivateRipple(e);
    };

    activateRipple = (e: React.MouseEvent<Surface> | React.TouchEvent<Surface> | React.KeyboardEvent<Surface> | React.FocusEvent<Surface>) => {
      // https://reactjs.org/docs/events.html#event-pooling
      e.persist();
      requestAnimationFrame(() => {
        this.foundation_.activate(e);
      });
    };

    deactivateRipple = (e: React.MouseEvent<Surface> | React.TouchEvent<Surface> | React.KeyboardEvent<Surface> | React.FocusEvent<Surface>) => {
      this.foundation_.deactivate(e);
    };

    updateCssVariable = (varName: keyof React.CSSProperties, value: string | number) => {
      if (!this.isMounted_) {
        return;
      }
      this.setState((prevState) => {
        const updatedStyle = Object.assign({}, this.state.style) as React.CSSProperties;
        updatedStyle[varName] = value;
        return Object.assign(prevState, {
          style: updatedStyle
        });
      });
    };

    get classes() {
      const { className: wrappedComponentClasses } = this.props;
      const { classList } = this.state;
      return classnames(Array.from(classList), wrappedComponentClasses);
    }

    get style() {
      const { style: wrappedStyle } = this.props;
      const { style } = this.state;
      return Object.assign({}, style, wrappedStyle);
    }

    render() {
      const {
        /* start black list of otherprops */
        /* eslint-disable */
        unbounded,
        style,
        className,
        onMouseDown,
        onMouseUp,
        onTouchStart,
        onTouchEnd,
        onKeyDown,
        onKeyUp,
        onFocus,
        onBlur,
        /* eslint-enable */
        /* end black list of otherprops */
        ...otherProps
      } = this.props as RippledComponentBaseProps<Surface>;

      const updatedProps = {
        onMouseDown: this.handleMouseDown,
        // onMouseUp: this.handleMouseUp,
        // onTouchStart: this.handleTouchStart,
        // onTouchEnd: this.handleTouchEnd,
        // onKeyDown: this.handleKeyDown,
        // onKeyUp: this.handleKeyUp,
        // onFocus: this.handleFocus,
        // onBlur: this.handleBlur,
        // call initRipple on ref on root element that needs ripple
        // initRipple: this.initializeFoundation_,
        // className: this.classes,
        // style: this.style,
      };

      return <WrappedComponent {...updatedProps} {...otherProps} />;
    }
  }
};

function getDisplayName<P extends {}>(WrappedComponent: React.ComponentType<P>) {
  return WrappedComponent.displayName || WrappedComponent.name || 'Component';
}

export default withRipple;