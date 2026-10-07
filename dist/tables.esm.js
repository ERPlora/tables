var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __decorateClass = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
  for (var i7 = decorators.length - 1, decorator; i7 >= 0; i7--)
    if (decorator = decorators[i7])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp(target, key, result);
  return result;
};

// @lit-labs/ssr-dom-shim/lib/element-internals.js
var ElementInternalsShim = class ElementInternals {
  get shadowRoot() {
    return this.__host.__shadowRoot;
  }
  constructor(_host) {
    this.ariaActiveDescendantElement = null;
    this.ariaAtomic = "";
    this.ariaAutoComplete = "";
    this.ariaBrailleLabel = "";
    this.ariaBrailleRoleDescription = "";
    this.ariaBusy = "";
    this.ariaChecked = "";
    this.ariaColCount = "";
    this.ariaColIndex = "";
    this.ariaColIndexText = "";
    this.ariaColSpan = "";
    this.ariaControlsElements = null;
    this.ariaCurrent = "";
    this.ariaDescribedByElements = null;
    this.ariaDescription = "";
    this.ariaDetailsElements = null;
    this.ariaDisabled = "";
    this.ariaErrorMessageElements = null;
    this.ariaExpanded = "";
    this.ariaFlowToElements = null;
    this.ariaHasPopup = "";
    this.ariaHidden = "";
    this.ariaInvalid = "";
    this.ariaKeyShortcuts = "";
    this.ariaLabel = "";
    this.ariaLabelledByElements = null;
    this.ariaLevel = "";
    this.ariaLive = "";
    this.ariaModal = "";
    this.ariaMultiLine = "";
    this.ariaMultiSelectable = "";
    this.ariaOrientation = "";
    this.ariaOwnsElements = null;
    this.ariaPlaceholder = "";
    this.ariaPosInSet = "";
    this.ariaPressed = "";
    this.ariaReadOnly = "";
    this.ariaRelevant = "";
    this.ariaRequired = "";
    this.ariaRoleDescription = "";
    this.ariaRowCount = "";
    this.ariaRowIndex = "";
    this.ariaRowIndexText = "";
    this.ariaRowSpan = "";
    this.ariaSelected = "";
    this.ariaSetSize = "";
    this.ariaSort = "";
    this.ariaValueMax = "";
    this.ariaValueMin = "";
    this.ariaValueNow = "";
    this.ariaValueText = "";
    this.role = "";
    this.form = null;
    this.labels = [];
    this.states = /* @__PURE__ */ new Set();
    this.validationMessage = "";
    this.validity = {};
    this.willValidate = true;
    this.__host = _host;
  }
  checkValidity() {
    console.warn("`ElementInternals.checkValidity()` was called on the server.This method always returns true.");
    return true;
  }
  reportValidity() {
    return true;
  }
  setFormValue() {
  }
  setValidity() {
  }
};

// @lit-labs/ssr-dom-shim/lib/events.js
var __classPrivateFieldSet = function(receiver, state, value, kind, f3) {
  if (kind === "m") throw new TypeError("Private method is not writable");
  if (kind === "a" && !f3) throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f3 : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f3.call(receiver, value) : f3 ? f3.value = value : state.set(receiver, value), value;
};
var __classPrivateFieldGet = function(receiver, state, kind, f3) {
  if (kind === "a" && !f3) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f3 : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f3 : kind === "a" ? f3.call(receiver) : f3 ? f3.value : state.get(receiver);
};
var _Event_cancelable;
var _Event_bubbles;
var _Event_composed;
var _Event_defaultPrevented;
var _Event_timestamp;
var _Event_propagationStopped;
var _Event_type;
var _Event_target;
var _Event_isBeingDispatched;
var _a;
var _CustomEvent_detail;
var _b;
var NONE = 0;
var CAPTURING_PHASE = 1;
var AT_TARGET = 2;
var BUBBLING_PHASE = 3;
var enumerableProperty = { __proto__: null };
enumerableProperty.enumerable = true;
Object.freeze(enumerableProperty);
var EventShim = (_a = class Event {
  constructor(type, options = {}) {
    _Event_cancelable.set(this, false);
    _Event_bubbles.set(this, false);
    _Event_composed.set(this, false);
    _Event_defaultPrevented.set(this, false);
    _Event_timestamp.set(this, Date.now());
    _Event_propagationStopped.set(this, false);
    _Event_type.set(this, void 0);
    _Event_target.set(this, void 0);
    _Event_isBeingDispatched.set(this, void 0);
    this.NONE = NONE;
    this.CAPTURING_PHASE = CAPTURING_PHASE;
    this.AT_TARGET = AT_TARGET;
    this.BUBBLING_PHASE = BUBBLING_PHASE;
    if (arguments.length === 0)
      throw new Error(`The type argument must be specified`);
    if (typeof options !== "object" || !options) {
      throw new Error(`The "options" argument must be an object`);
    }
    const { bubbles, cancelable, composed } = options;
    __classPrivateFieldSet(this, _Event_cancelable, !!cancelable, "f");
    __classPrivateFieldSet(this, _Event_bubbles, !!bubbles, "f");
    __classPrivateFieldSet(this, _Event_composed, !!composed, "f");
    __classPrivateFieldSet(this, _Event_type, `${type}`, "f");
    __classPrivateFieldSet(this, _Event_target, null, "f");
    __classPrivateFieldSet(this, _Event_isBeingDispatched, false, "f");
  }
  initEvent(_type, _bubbles, _cancelable) {
    throw new Error("Method not implemented.");
  }
  stopImmediatePropagation() {
    this.stopPropagation();
  }
  preventDefault() {
    __classPrivateFieldSet(this, _Event_defaultPrevented, true, "f");
  }
  get target() {
    return __classPrivateFieldGet(this, _Event_target, "f");
  }
  get currentTarget() {
    return __classPrivateFieldGet(this, _Event_target, "f");
  }
  get srcElement() {
    return __classPrivateFieldGet(this, _Event_target, "f");
  }
  get type() {
    return __classPrivateFieldGet(this, _Event_type, "f");
  }
  get cancelable() {
    return __classPrivateFieldGet(this, _Event_cancelable, "f");
  }
  get defaultPrevented() {
    return __classPrivateFieldGet(this, _Event_cancelable, "f") && __classPrivateFieldGet(this, _Event_defaultPrevented, "f");
  }
  get timeStamp() {
    return __classPrivateFieldGet(this, _Event_timestamp, "f");
  }
  composedPath() {
    return __classPrivateFieldGet(this, _Event_isBeingDispatched, "f") ? [__classPrivateFieldGet(this, _Event_target, "f")] : [];
  }
  get returnValue() {
    return !__classPrivateFieldGet(this, _Event_cancelable, "f") || !__classPrivateFieldGet(this, _Event_defaultPrevented, "f");
  }
  get bubbles() {
    return __classPrivateFieldGet(this, _Event_bubbles, "f");
  }
  get composed() {
    return __classPrivateFieldGet(this, _Event_composed, "f");
  }
  get eventPhase() {
    return __classPrivateFieldGet(this, _Event_isBeingDispatched, "f") ? _a.AT_TARGET : _a.NONE;
  }
  get cancelBubble() {
    return __classPrivateFieldGet(this, _Event_propagationStopped, "f");
  }
  set cancelBubble(value) {
    if (value) {
      __classPrivateFieldSet(this, _Event_propagationStopped, true, "f");
    }
  }
  stopPropagation() {
    __classPrivateFieldSet(this, _Event_propagationStopped, true, "f");
  }
  get isTrusted() {
    return false;
  }
}, _Event_cancelable = /* @__PURE__ */ new WeakMap(), _Event_bubbles = /* @__PURE__ */ new WeakMap(), _Event_composed = /* @__PURE__ */ new WeakMap(), _Event_defaultPrevented = /* @__PURE__ */ new WeakMap(), _Event_timestamp = /* @__PURE__ */ new WeakMap(), _Event_propagationStopped = /* @__PURE__ */ new WeakMap(), _Event_type = /* @__PURE__ */ new WeakMap(), _Event_target = /* @__PURE__ */ new WeakMap(), _Event_isBeingDispatched = /* @__PURE__ */ new WeakMap(), _a.NONE = NONE, _a.CAPTURING_PHASE = CAPTURING_PHASE, _a.AT_TARGET = AT_TARGET, _a.BUBBLING_PHASE = BUBBLING_PHASE, _a);
Object.defineProperties(EventShim.prototype, {
  initEvent: enumerableProperty,
  stopImmediatePropagation: enumerableProperty,
  preventDefault: enumerableProperty,
  target: enumerableProperty,
  currentTarget: enumerableProperty,
  srcElement: enumerableProperty,
  type: enumerableProperty,
  cancelable: enumerableProperty,
  defaultPrevented: enumerableProperty,
  timeStamp: enumerableProperty,
  composedPath: enumerableProperty,
  returnValue: enumerableProperty,
  bubbles: enumerableProperty,
  composed: enumerableProperty,
  eventPhase: enumerableProperty,
  cancelBubble: enumerableProperty,
  stopPropagation: enumerableProperty,
  isTrusted: enumerableProperty
});
var CustomEventShim = (_b = class CustomEvent2 extends EventShim {
  constructor(type, options = {}) {
    super(type, options);
    _CustomEvent_detail.set(this, void 0);
    __classPrivateFieldSet(this, _CustomEvent_detail, options?.detail ?? null, "f");
  }
  initCustomEvent(_type, _bubbles, _cancelable, _detail) {
    throw new Error("Method not implemented.");
  }
  get detail() {
    return __classPrivateFieldGet(this, _CustomEvent_detail, "f");
  }
}, _CustomEvent_detail = /* @__PURE__ */ new WeakMap(), _b);
Object.defineProperties(CustomEventShim.prototype, {
  detail: enumerableProperty
});
var EventShimWithRealType = EventShim;
var CustomEventShimWithRealType = CustomEventShim;

// @lit-labs/ssr-dom-shim/lib/css.js
var _a2;
var CSSRuleShim = (_a2 = class CSSRule {
  constructor() {
    this.STYLE_RULE = 1;
    this.CHARSET_RULE = 2;
    this.IMPORT_RULE = 3;
    this.MEDIA_RULE = 4;
    this.FONT_FACE_RULE = 5;
    this.PAGE_RULE = 6;
    this.NAMESPACE_RULE = 10;
    this.KEYFRAMES_RULE = 7;
    this.KEYFRAME_RULE = 8;
    this.SUPPORTS_RULE = 12;
    this.COUNTER_STYLE_RULE = 11;
    this.FONT_FEATURE_VALUES_RULE = 14;
    this.MARGIN_RULE = 9;
    this.__parentStyleSheet = null;
    this.cssText = "";
  }
  get parentRule() {
    return null;
  }
  get parentStyleSheet() {
    return this.__parentStyleSheet;
  }
  get type() {
    return 0;
  }
}, _a2.STYLE_RULE = 1, _a2.CHARSET_RULE = 2, _a2.IMPORT_RULE = 3, _a2.MEDIA_RULE = 4, _a2.FONT_FACE_RULE = 5, _a2.PAGE_RULE = 6, _a2.NAMESPACE_RULE = 10, _a2.KEYFRAMES_RULE = 7, _a2.KEYFRAME_RULE = 8, _a2.SUPPORTS_RULE = 12, _a2.COUNTER_STYLE_RULE = 11, _a2.FONT_FEATURE_VALUES_RULE = 14, _a2.MARGIN_RULE = 9, _a2);

// @lit-labs/ssr-dom-shim/index.js
globalThis.Event ??= EventShimWithRealType;
globalThis.CustomEvent ??= CustomEventShimWithRealType;
var constructionToken = Symbol();
var isCaptureEventListener = (options) => typeof options === "boolean" ? options : options?.capture ?? false;
var enumerableProperty2 = { __proto__: null };
enumerableProperty2.enumerable = true;
Object.freeze(enumerableProperty2);
var EventTarget = class {
  constructor() {
    this.__eventListeners = /* @__PURE__ */ new Map();
    this.__captureEventListeners = /* @__PURE__ */ new Map();
  }
  addEventListener(type, callback, options) {
    if (callback === void 0 || callback === null) {
      return;
    }
    const eventListenersMap = isCaptureEventListener(options) ? this.__captureEventListeners : this.__eventListeners;
    let eventListeners = eventListenersMap.get(type);
    if (eventListeners === void 0) {
      eventListeners = /* @__PURE__ */ new Map();
      eventListenersMap.set(type, eventListeners);
    } else if (eventListeners.has(callback)) {
      return;
    }
    const normalizedOptions = typeof options === "object" && options ? options : {};
    normalizedOptions.signal?.addEventListener("abort", () => this.removeEventListener(type, callback, options));
    eventListeners.set(callback, normalizedOptions ?? {});
  }
  removeEventListener(type, callback, options) {
    if (callback === void 0 || callback === null) {
      return;
    }
    const eventListenersMap = isCaptureEventListener(options) ? this.__captureEventListeners : this.__eventListeners;
    const eventListeners = eventListenersMap.get(type);
    if (eventListeners !== void 0) {
      eventListeners.delete(callback);
      if (!eventListeners.size) {
        eventListenersMap.delete(type);
      }
    }
  }
  dispatchEvent(event) {
    let composedPath = this.__resolveFullEventPath();
    if (!event.composed && this.__host) {
      composedPath = composedPath.slice(0, composedPath.indexOf(this.__host));
    }
    let stopPropagation = false;
    let stopImmediatePropagation = false;
    let eventPhase = EventShimWithRealType.NONE;
    let target = null;
    let tmpTarget = null;
    let currentTarget = null;
    const originalStopPropagation = event.stopPropagation;
    const originalStopImmediatePropagation = event.stopImmediatePropagation;
    Object.defineProperties(event, {
      target: {
        get() {
          return target ?? tmpTarget;
        },
        ...enumerableProperty2
      },
      srcElement: {
        get() {
          return event.target;
        },
        ...enumerableProperty2
      },
      currentTarget: {
        get() {
          return currentTarget;
        },
        ...enumerableProperty2
      },
      eventPhase: {
        get() {
          return eventPhase;
        },
        ...enumerableProperty2
      },
      composedPath: {
        value: () => composedPath,
        ...enumerableProperty2
      },
      stopPropagation: {
        value: () => {
          stopPropagation = true;
          originalStopPropagation.call(event);
        },
        ...enumerableProperty2
      },
      stopImmediatePropagation: {
        value: () => {
          stopImmediatePropagation = true;
          originalStopImmediatePropagation.call(event);
        },
        ...enumerableProperty2
      }
    });
    const invokeEventListener = (listener, options, eventListenerMap) => {
      if (typeof listener === "function") {
        listener(event);
      } else if (typeof listener?.handleEvent === "function") {
        listener.handleEvent(event);
      }
      if (options.once) {
        eventListenerMap.delete(listener);
      }
    };
    const finishDispatch = () => {
      currentTarget = null;
      eventPhase = EventShimWithRealType.NONE;
      return !event.defaultPrevented;
    };
    const captureEventPath = composedPath.slice().reverse();
    target = !this.__host || !event.composed ? this : null;
    const retarget = (eventTargets) => {
      tmpTarget = this;
      while (tmpTarget.__host && eventTargets.includes(tmpTarget.__host)) {
        tmpTarget = tmpTarget.__host;
      }
    };
    for (const eventTarget of captureEventPath) {
      if (!target && (!tmpTarget || tmpTarget === eventTarget.__host)) {
        retarget(captureEventPath.slice(captureEventPath.indexOf(eventTarget)));
      }
      currentTarget = eventTarget;
      eventPhase = eventTarget === event.target ? EventShimWithRealType.AT_TARGET : EventShimWithRealType.CAPTURING_PHASE;
      const captureEventListeners = eventTarget.__captureEventListeners.get(event.type);
      if (captureEventListeners) {
        for (const [listener, options] of captureEventListeners) {
          invokeEventListener(listener, options, captureEventListeners);
          if (stopImmediatePropagation) {
            return finishDispatch();
          }
        }
      }
      if (stopPropagation) {
        return finishDispatch();
      }
    }
    const bubbleEventPath = event.bubbles ? composedPath : [this];
    tmpTarget = null;
    for (const eventTarget of bubbleEventPath) {
      if (!target && (!tmpTarget || eventTarget === tmpTarget.__host)) {
        retarget(bubbleEventPath.slice(0, bubbleEventPath.indexOf(eventTarget) + 1));
      }
      currentTarget = eventTarget;
      eventPhase = eventTarget === event.target ? EventShimWithRealType.AT_TARGET : EventShimWithRealType.BUBBLING_PHASE;
      const eventListeners = eventTarget.__eventListeners.get(event.type);
      if (eventListeners) {
        for (const [listener, options] of eventListeners) {
          invokeEventListener(listener, options, eventListeners);
          if (stopImmediatePropagation) {
            return finishDispatch();
          }
        }
      }
      if (stopPropagation) {
        return finishDispatch();
      }
    }
    return finishDispatch();
  }
  __resolveFullEventPath() {
    if (this.__eventPathCache) {
      return this.__eventPathCache;
    } else if (!this.__eventTargetParent) {
      return this.__eventPathCache = [this, documentShim, windowShim];
    } else {
      return this.__eventPathCache = [
        this,
        ...this.__eventTargetParent.__resolveFullEventPath()
      ];
    }
  }
};
var attributes = /* @__PURE__ */ new WeakMap();
var attributesForElement = (element) => {
  let attrs = attributes.get(element);
  if (attrs === void 0) {
    attributes.set(element, attrs = /* @__PURE__ */ new Map());
  }
  return attrs;
};
var NodeShim = class Node2 extends EventTarget {
  getRootNode(options) {
    if (options?.composed) {
      return document2;
    }
    const host = this.__host;
    return host?.__shadowRoot ?? document2;
  }
};
var DocumentShim = class Document2 extends NodeShim {
  get adoptedStyleSheets() {
    return [];
  }
  createTreeWalker() {
    return {};
  }
  createTextNode() {
    return {};
  }
  createElement() {
    return {};
  }
};
var documentShim = new DocumentShim();
var document2 = documentShim;
var WindowShim = class Window extends NodeShim {
  constructor(token) {
    super();
    if (token !== constructionToken) {
      throw new TypeError("Illegal constructor");
    }
    Object.assign(this, globalThis, {
      CustomElementRegistry,
      customElements: customElements2,
      document: document2,
      Document: DocumentShim,
      Element: ElementShim,
      EventTarget,
      HTMLElement: HTMLElementShim,
      Node: NodeShim,
      ShadowRoot: ShadowRootShim,
      window: this,
      Window: WindowShim
    });
  }
};
var ElementShim = class Element extends NodeShim {
  constructor() {
    super(...arguments);
    this.__shadowRootMode = null;
    this.__shadowRoot = null;
    this.__internals = null;
  }
  get attributes() {
    return Array.from(attributesForElement(this)).map(([name, value]) => ({
      name,
      value
    }));
  }
  get shadowRoot() {
    if (this.__shadowRootMode === "closed") {
      return null;
    }
    return this.__shadowRoot;
  }
  get localName() {
    return this.constructor.__localName;
  }
  get tagName() {
    return this.localName?.toUpperCase();
  }
  setAttribute(name, value) {
    attributesForElement(this).set(name, String(value));
  }
  removeAttribute(name) {
    attributesForElement(this).delete(name);
  }
  toggleAttribute(name, force) {
    if (this.hasAttribute(name)) {
      if (force === void 0 || !force) {
        this.removeAttribute(name);
        return false;
      }
    } else {
      if (force === void 0 || force) {
        this.setAttribute(name, "");
        return true;
      } else {
        return false;
      }
    }
    return true;
  }
  hasAttribute(name) {
    return attributesForElement(this).has(name);
  }
  attachShadow(init) {
    this.__shadowRootMode = init.mode;
    const shadowRoot = new ShadowRootShim(constructionToken, init);
    shadowRoot.__eventTargetParent = this;
    shadowRoot.__host = this;
    return this.__shadowRoot = shadowRoot;
  }
  attachInternals() {
    if (this.__internals !== null) {
      throw new Error(`Failed to execute 'attachInternals' on 'HTMLElement': ElementInternals for the specified element was already attached.`);
    }
    const internals = new ElementInternalsShim(this);
    this.__internals = internals;
    return internals;
  }
  getAttribute(name) {
    const value = attributesForElement(this).get(name);
    return value ?? null;
  }
};
var HTMLElementShim = class HTMLElement2 extends ElementShim {
};
var HTMLElementShimWithRealType = HTMLElementShim;
var ShadowRootShim = class ShadowRoot extends NodeShim {
  get host() {
    return this.__host;
  }
  constructor(constructionToken2, init) {
    super();
    if (constructionToken2 !== constructionToken2) {
      throw new TypeError("Illegal constructor");
    }
    this.mode = init.mode;
  }
};
globalThis.litServerRoot ??= Object.defineProperty(new HTMLElementShimWithRealType(), "localName", {
  // Patch localName (and tagName) to return a unique name.
  get() {
    return "lit-server-root";
  }
});
function promiseWithResolvers() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
var CustomElementRegistry = class {
  constructor() {
    this.__definitions = /* @__PURE__ */ new Map();
    this.__reverseDefinitions = /* @__PURE__ */ new Map();
    this.__pendingWhenDefineds = /* @__PURE__ */ new Map();
  }
  define(name, ctor) {
    if (this.__definitions.has(name)) {
      if (true) {
        console.warn(`'CustomElementRegistry' already has "${name}" defined. This may have been caused by live reload or hot module replacement in which case it can be safely ignored.
Make sure to test your application with a production build as repeat registrations will throw in production.`);
      } else {
        throw new Error(`Failed to execute 'define' on 'CustomElementRegistry': the name "${name}" has already been used with this registry`);
      }
    }
    if (this.__reverseDefinitions.has(ctor)) {
      throw new Error(`Failed to execute 'define' on 'CustomElementRegistry': the constructor has already been used with this registry for the tag name ${this.__reverseDefinitions.get(ctor)}`);
    }
    ctor.__localName = name;
    this.__definitions.set(name, {
      ctor,
      // Note it's important we read `observedAttributes` in case it is a getter
      // with side-effects, as is the case in Lit, where it triggers class
      // finalization.
      //
      // TODO(aomarks) To be spec compliant, we should also capture the
      // registration-time lifecycle methods like `connectedCallback`. For them
      // to be actually accessible to e.g. the Lit SSR element renderer, though,
      // we'd need to introduce a new API for accessing them (since `get` only
      // returns the constructor).
      observedAttributes: ctor.observedAttributes ?? []
    });
    this.__reverseDefinitions.set(ctor, name);
    this.__pendingWhenDefineds.get(name)?.resolve(ctor);
    this.__pendingWhenDefineds.delete(name);
  }
  get(name) {
    const definition = this.__definitions.get(name);
    return definition?.ctor;
  }
  getName(ctor) {
    return this.__reverseDefinitions.get(ctor) ?? null;
  }
  initialize(_root) {
    throw new Error(`customElements.initialize is not currently supported in SSR. Please file a bug if you need it.`);
  }
  upgrade(_element) {
    throw new Error(`customElements.upgrade is not currently supported in SSR. Please file a bug if you need it.`);
  }
  async whenDefined(name) {
    const definition = this.__definitions.get(name);
    if (definition) {
      return definition.ctor;
    }
    let withResolvers = this.__pendingWhenDefineds.get(name);
    if (!withResolvers) {
      withResolvers = promiseWithResolvers();
      this.__pendingWhenDefineds.set(name, withResolvers);
    }
    return withResolvers.promise;
  }
};
var CustomElementRegistryShimWithRealType = CustomElementRegistry;
var customElements2 = new CustomElementRegistryShimWithRealType();
var windowShim = new WindowShim(constructionToken);

// @lit/reactive-element/node/css-tag.js
var t = globalThis;
var e = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s = Symbol();
var o = /* @__PURE__ */ new WeakMap();
var n = class {
  constructor(t5, e5, o7) {
    if (this._$cssResult$ = true, o7 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t5, this.t = e5;
  }
  get styleSheet() {
    let t5 = this.o;
    const s5 = this.t;
    if (e && void 0 === t5) {
      const e5 = void 0 !== s5 && 1 === s5.length;
      e5 && (t5 = o.get(s5)), void 0 === t5 && ((this.o = t5 = new CSSStyleSheet()).replaceSync(this.cssText), e5 && o.set(s5, t5));
    }
    return t5;
  }
  toString() {
    return this.cssText;
  }
};
var r = (t5) => new n("string" == typeof t5 ? t5 : t5 + "", void 0, s);
var i = (t5, ...e5) => {
  const o7 = 1 === t5.length ? t5[0] : e5.reduce((e6, s5, o8) => e6 + ((t6) => {
    if (true === t6._$cssResult$) return t6.cssText;
    if ("number" == typeof t6) return t6;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t6 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s5) + t5[o8 + 1], t5[0]);
  return new n(o7, t5, s);
};
var S = (s5, o7) => {
  if (e) s5.adoptedStyleSheets = o7.map((t5) => t5 instanceof CSSStyleSheet ? t5 : t5.styleSheet);
  else for (const e5 of o7) {
    const o8 = document.createElement("style"), n6 = t.litNonce;
    void 0 !== n6 && o8.setAttribute("nonce", n6), o8.textContent = e5.cssText, s5.appendChild(o8);
  }
};
var c = e || void 0 === t.CSSStyleSheet ? (t5) => t5 : (t5) => t5 instanceof CSSStyleSheet ? ((t6) => {
  let e5 = "";
  for (const s5 of t6.cssRules) e5 += s5.cssText;
  return r(e5);
})(t5) : t5;

// @lit/reactive-element/node/reactive-element.js
var { is: h, defineProperty: r2, getOwnPropertyDescriptor: o2, getOwnPropertyNames: n2, getOwnPropertySymbols: a, getPrototypeOf: c2 } = Object;
var l = globalThis;
l.customElements ??= customElements2;
var p = l.trustedTypes;
var d = p ? p.emptyScript : "";
var u = l.reactiveElementPolyfillSupport;
var f = (t5, s5) => t5;
var b = { toAttribute(t5, s5) {
  switch (s5) {
    case Boolean:
      t5 = t5 ? d : null;
      break;
    case Object:
    case Array:
      t5 = null == t5 ? t5 : JSON.stringify(t5);
  }
  return t5;
}, fromAttribute(t5, s5) {
  let i7 = t5;
  switch (s5) {
    case Boolean:
      i7 = null !== t5;
      break;
    case Number:
      i7 = null === t5 ? null : Number(t5);
      break;
    case Object:
    case Array:
      try {
        i7 = JSON.parse(t5);
      } catch (t6) {
        i7 = null;
      }
  }
  return i7;
} };
var m = (t5, s5) => !h(t5, s5);
var y = { attribute: true, type: String, converter: b, reflect: false, useDefault: false, hasChanged: m };
Symbol.metadata ??= Symbol("metadata"), l.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var g = class extends (globalThis.HTMLElement ?? HTMLElementShimWithRealType) {
  static addInitializer(t5) {
    this._$Ei(), (this.l ??= []).push(t5);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t5, s5 = y) {
    if (s5.state && (s5.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t5) && ((s5 = Object.create(s5)).wrapped = true), this.elementProperties.set(t5, s5), !s5.noAccessor) {
      const i7 = Symbol(), e5 = this.getPropertyDescriptor(t5, i7, s5);
      void 0 !== e5 && r2(this.prototype, t5, e5);
    }
  }
  static getPropertyDescriptor(t5, s5, i7) {
    const { get: e5, set: h4 } = o2(this.prototype, t5) ?? { get() {
      return this[s5];
    }, set(t6) {
      this[s5] = t6;
    } };
    return { get: e5, set(s6) {
      const r6 = e5?.call(this);
      h4?.call(this, s6), this.requestUpdate(t5, r6, i7);
    }, configurable: true, enumerable: true };
  }
  static getPropertyOptions(t5) {
    return this.elementProperties.get(t5) ?? y;
  }
  static _$Ei() {
    if (this.hasOwnProperty(f("elementProperties"))) return;
    const t5 = c2(this);
    t5.finalize(), void 0 !== t5.l && (this.l = [...t5.l]), this.elementProperties = new Map(t5.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(f("finalized"))) return;
    if (this.finalized = true, this._$Ei(), this.hasOwnProperty(f("properties"))) {
      const t6 = this.properties, s5 = [...n2(t6), ...a(t6)];
      for (const i7 of s5) this.createProperty(i7, t6[i7]);
    }
    const t5 = this[Symbol.metadata];
    if (null !== t5) {
      const s5 = litPropertyMetadata.get(t5);
      if (void 0 !== s5) for (const [t6, i7] of s5) this.elementProperties.set(t6, i7);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t6, s5] of this.elementProperties) {
      const i7 = this._$Eu(t6, s5);
      void 0 !== i7 && this._$Eh.set(i7, t6);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(t5) {
    const s5 = [];
    if (Array.isArray(t5)) {
      const e5 = new Set(t5.flat(1 / 0).reverse());
      for (const t6 of e5) s5.unshift(c(t6));
    } else void 0 !== t5 && s5.push(c(t5));
    return s5;
  }
  static _$Eu(t5, s5) {
    const i7 = s5.attribute;
    return false === i7 ? void 0 : "string" == typeof i7 ? i7 : "string" == typeof t5 ? t5.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = false, this.hasUpdated = false, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((t5) => this.enableUpdating = t5), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t5) => t5(this));
  }
  addController(t5) {
    (this._$EO ??= /* @__PURE__ */ new Set()).add(t5), void 0 !== this.renderRoot && this.isConnected && t5.hostConnected?.();
  }
  removeController(t5) {
    this._$EO?.delete(t5);
  }
  _$E_() {
    const t5 = /* @__PURE__ */ new Map(), s5 = this.constructor.elementProperties;
    for (const i7 of s5.keys()) this.hasOwnProperty(i7) && (t5.set(i7, this[i7]), delete this[i7]);
    t5.size > 0 && (this._$Ep = t5);
  }
  createRenderRoot() {
    const t5 = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return S(t5, this.constructor.elementStyles), t5;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(true), this._$EO?.forEach((t5) => t5.hostConnected?.());
  }
  enableUpdating(t5) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((t5) => t5.hostDisconnected?.());
  }
  attributeChangedCallback(t5, s5, i7) {
    this._$AK(t5, i7);
  }
  _$ET(t5, s5) {
    const i7 = this.constructor.elementProperties.get(t5), e5 = this.constructor._$Eu(t5, i7);
    if (void 0 !== e5 && true === i7.reflect) {
      const h4 = (void 0 !== i7.converter?.toAttribute ? i7.converter : b).toAttribute(s5, i7.type);
      this._$Em = t5, null == h4 ? this.removeAttribute(e5) : this.setAttribute(e5, h4), this._$Em = null;
    }
  }
  _$AK(t5, s5) {
    const i7 = this.constructor, e5 = i7._$Eh.get(t5);
    if (void 0 !== e5 && this._$Em !== e5) {
      const t6 = i7.getPropertyOptions(e5), h4 = "function" == typeof t6.converter ? { fromAttribute: t6.converter } : void 0 !== t6.converter?.fromAttribute ? t6.converter : b;
      this._$Em = e5;
      const r6 = h4.fromAttribute(s5, t6.type);
      this[e5] = r6 ?? this._$Ej?.get(e5) ?? r6, this._$Em = null;
    }
  }
  requestUpdate(t5, s5, i7, e5 = false, h4) {
    if (void 0 !== t5) {
      const r6 = this.constructor;
      if (false === e5 && (h4 = this[t5]), i7 ??= r6.getPropertyOptions(t5), !((i7.hasChanged ?? m)(h4, s5) || i7.useDefault && i7.reflect && h4 === this._$Ej?.get(t5) && !this.hasAttribute(r6._$Eu(t5, i7)))) return;
      this.C(t5, s5, i7);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t5, s5, { useDefault: i7, reflect: e5, wrapped: h4 }, r6) {
    i7 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t5) && (this._$Ej.set(t5, r6 ?? s5 ?? this[t5]), true !== h4 || void 0 !== r6) || (this._$AL.has(t5) || (this.hasUpdated || i7 || (s5 = void 0), this._$AL.set(t5, s5)), true === e5 && this._$Em !== t5 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t5));
  }
  async _$EP() {
    this.isUpdatePending = true;
    try {
      await this._$ES;
    } catch (t6) {
      Promise.reject(t6);
    }
    const t5 = this.scheduleUpdate();
    return null != t5 && await t5, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
        for (const [t7, s6] of this._$Ep) this[t7] = s6;
        this._$Ep = void 0;
      }
      const t6 = this.constructor.elementProperties;
      if (t6.size > 0) for (const [s6, i7] of t6) {
        const { wrapped: t7 } = i7, e5 = this[s6];
        true !== t7 || this._$AL.has(s6) || void 0 === e5 || this.C(s6, void 0, i7, e5);
      }
    }
    let t5 = false;
    const s5 = this._$AL;
    try {
      t5 = this.shouldUpdate(s5), t5 ? (this.willUpdate(s5), this._$EO?.forEach((t6) => t6.hostUpdate?.()), this.update(s5)) : this._$EM();
    } catch (s6) {
      throw t5 = false, this._$EM(), s6;
    }
    t5 && this._$AE(s5);
  }
  willUpdate(t5) {
  }
  _$AE(t5) {
    this._$EO?.forEach((t6) => t6.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t5)), this.updated(t5);
  }
  _$EM() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = false;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(t5) {
    return true;
  }
  update(t5) {
    this._$Eq &&= this._$Eq.forEach((t6) => this._$ET(t6, this[t6])), this._$EM();
  }
  updated(t5) {
  }
  firstUpdated(t5) {
  }
};
g.elementStyles = [], g.shadowRootOptions = { mode: "open" }, g[f("elementProperties")] = /* @__PURE__ */ new Map(), g[f("finalized")] = /* @__PURE__ */ new Map(), u?.({ ReactiveElement: g }), (l.reactiveElementVersions ??= []).push("2.1.2");

// lit-html/lit-html.js
var t2 = globalThis;
var i2 = (t5) => t5;
var s2 = t2.trustedTypes;
var e2 = s2 ? s2.createPolicy("lit-html", { createHTML: (t5) => t5 }) : void 0;
var h2 = "$lit$";
var o3 = `lit$${Math.random().toFixed(9).slice(2)}$`;
var n3 = "?" + o3;
var r3 = `<${n3}>`;
var l2 = document;
var c3 = () => l2.createComment("");
var a2 = (t5) => null === t5 || "object" != typeof t5 && "function" != typeof t5;
var u2 = Array.isArray;
var d2 = (t5) => u2(t5) || "function" == typeof t5?.[Symbol.iterator];
var f2 = "[ 	\n\f\r]";
var v = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
var _ = /-->/g;
var m2 = />/g;
var p2 = RegExp(`>|${f2}(?:([^\\s"'>=/]+)(${f2}*=${f2}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
var g2 = /'/g;
var $ = /"/g;
var y2 = /^(?:script|style|textarea|title)$/i;
var x = (t5) => (i7, ...s5) => ({ _$litType$: t5, strings: i7, values: s5 });
var b2 = x(1);
var w = x(2);
var T = x(3);
var E = Symbol.for("lit-noChange");
var A = Symbol.for("lit-nothing");
var C = /* @__PURE__ */ new WeakMap();
var P = l2.createTreeWalker(l2, 129);
function V(t5, i7) {
  if (!u2(t5) || !t5.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== e2 ? e2.createHTML(i7) : i7;
}
var N = (t5, i7) => {
  const s5 = t5.length - 1, e5 = [];
  let n6, l3 = 2 === i7 ? "<svg>" : 3 === i7 ? "<math>" : "", c5 = v;
  for (let i8 = 0; i8 < s5; i8++) {
    const s6 = t5[i8];
    let a3, u5, d3 = -1, f3 = 0;
    for (; f3 < s6.length && (c5.lastIndex = f3, u5 = c5.exec(s6), null !== u5); ) f3 = c5.lastIndex, c5 === v ? "!--" === u5[1] ? c5 = _ : void 0 !== u5[1] ? c5 = m2 : void 0 !== u5[2] ? (y2.test(u5[2]) && (n6 = RegExp("</" + u5[2], "g")), c5 = p2) : void 0 !== u5[3] && (c5 = p2) : c5 === p2 ? ">" === u5[0] ? (c5 = n6 ?? v, d3 = -1) : void 0 === u5[1] ? d3 = -2 : (d3 = c5.lastIndex - u5[2].length, a3 = u5[1], c5 = void 0 === u5[3] ? p2 : '"' === u5[3] ? $ : g2) : c5 === $ || c5 === g2 ? c5 = p2 : c5 === _ || c5 === m2 ? c5 = v : (c5 = p2, n6 = void 0);
    const x2 = c5 === p2 && t5[i8 + 1].startsWith("/>") ? " " : "";
    l3 += c5 === v ? s6 + r3 : d3 >= 0 ? (e5.push(a3), s6.slice(0, d3) + h2 + s6.slice(d3) + o3 + x2) : s6 + o3 + (-2 === d3 ? i8 : x2);
  }
  return [V(t5, l3 + (t5[s5] || "<?>") + (2 === i7 ? "</svg>" : 3 === i7 ? "</math>" : "")), e5];
};
var S2 = class _S {
  constructor({ strings: t5, _$litType$: i7 }, e5) {
    let r6;
    this.parts = [];
    let l3 = 0, a3 = 0;
    const u5 = t5.length - 1, d3 = this.parts, [f3, v3] = N(t5, i7);
    if (this.el = _S.createElement(f3, e5), P.currentNode = this.el.content, 2 === i7 || 3 === i7) {
      const t6 = this.el.content.firstChild;
      t6.replaceWith(...t6.childNodes);
    }
    for (; null !== (r6 = P.nextNode()) && d3.length < u5; ) {
      if (1 === r6.nodeType) {
        if (r6.hasAttributes()) for (const t6 of r6.getAttributeNames()) if (t6.endsWith(h2)) {
          const i8 = v3[a3++], s5 = r6.getAttribute(t6).split(o3), e6 = /([.?@])?(.*)/.exec(i8);
          d3.push({ type: 1, index: l3, name: e6[2], strings: s5, ctor: "." === e6[1] ? I : "?" === e6[1] ? L : "@" === e6[1] ? z : H }), r6.removeAttribute(t6);
        } else t6.startsWith(o3) && (d3.push({ type: 6, index: l3 }), r6.removeAttribute(t6));
        if (y2.test(r6.tagName)) {
          const t6 = r6.textContent.split(o3), i8 = t6.length - 1;
          if (i8 > 0) {
            r6.textContent = s2 ? s2.emptyScript : "";
            for (let s5 = 0; s5 < i8; s5++) r6.append(t6[s5], c3()), P.nextNode(), d3.push({ type: 2, index: ++l3 });
            r6.append(t6[i8], c3());
          }
        }
      } else if (8 === r6.nodeType) if (r6.data === n3) d3.push({ type: 2, index: l3 });
      else {
        let t6 = -1;
        for (; -1 !== (t6 = r6.data.indexOf(o3, t6 + 1)); ) d3.push({ type: 7, index: l3 }), t6 += o3.length - 1;
      }
      l3++;
    }
  }
  static createElement(t5, i7) {
    const s5 = l2.createElement("template");
    return s5.innerHTML = t5, s5;
  }
};
function M(t5, i7, s5 = t5, e5) {
  if (i7 === E) return i7;
  let h4 = void 0 !== e5 ? s5._$Co?.[e5] : s5._$Cl;
  const o7 = a2(i7) ? void 0 : i7._$litDirective$;
  return h4?.constructor !== o7 && (h4?._$AO?.(false), void 0 === o7 ? h4 = void 0 : (h4 = new o7(t5), h4._$AT(t5, s5, e5)), void 0 !== e5 ? (s5._$Co ??= [])[e5] = h4 : s5._$Cl = h4), void 0 !== h4 && (i7 = M(t5, h4._$AS(t5, i7.values), h4, e5)), i7;
}
var R = class {
  constructor(t5, i7) {
    this._$AV = [], this._$AN = void 0, this._$AD = t5, this._$AM = i7;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t5) {
    const { el: { content: i7 }, parts: s5 } = this._$AD, e5 = (t5?.creationScope ?? l2).importNode(i7, true);
    P.currentNode = e5;
    let h4 = P.nextNode(), o7 = 0, n6 = 0, r6 = s5[0];
    for (; void 0 !== r6; ) {
      if (o7 === r6.index) {
        let i8;
        2 === r6.type ? i8 = new k(h4, h4.nextSibling, this, t5) : 1 === r6.type ? i8 = new r6.ctor(h4, r6.name, r6.strings, this, t5) : 6 === r6.type && (i8 = new Z(h4, this, t5)), this._$AV.push(i8), r6 = s5[++n6];
      }
      o7 !== r6?.index && (h4 = P.nextNode(), o7++);
    }
    return P.currentNode = l2, e5;
  }
  p(t5) {
    let i7 = 0;
    for (const s5 of this._$AV) void 0 !== s5 && (void 0 !== s5.strings ? (s5._$AI(t5, s5, i7), i7 += s5.strings.length - 2) : s5._$AI(t5[i7])), i7++;
  }
};
var k = class _k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t5, i7, s5, e5) {
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t5, this._$AB = i7, this._$AM = s5, this.options = e5, this._$Cv = e5?.isConnected ?? true;
  }
  get parentNode() {
    let t5 = this._$AA.parentNode;
    const i7 = this._$AM;
    return void 0 !== i7 && 11 === t5?.nodeType && (t5 = i7.parentNode), t5;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t5, i7 = this) {
    t5 = M(this, t5, i7), a2(t5) ? t5 === A || null == t5 || "" === t5 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t5 !== this._$AH && t5 !== E && this._(t5) : void 0 !== t5._$litType$ ? this.$(t5) : void 0 !== t5.nodeType ? this.T(t5) : d2(t5) ? this.k(t5) : this._(t5);
  }
  O(t5) {
    return this._$AA.parentNode.insertBefore(t5, this._$AB);
  }
  T(t5) {
    this._$AH !== t5 && (this._$AR(), this._$AH = this.O(t5));
  }
  _(t5) {
    this._$AH !== A && a2(this._$AH) ? this._$AA.nextSibling.data = t5 : this.T(l2.createTextNode(t5)), this._$AH = t5;
  }
  $(t5) {
    const { values: i7, _$litType$: s5 } = t5, e5 = "number" == typeof s5 ? this._$AC(t5) : (void 0 === s5.el && (s5.el = S2.createElement(V(s5.h, s5.h[0]), this.options)), s5);
    if (this._$AH?._$AD === e5) this._$AH.p(i7);
    else {
      const t6 = new R(e5, this), s6 = t6.u(this.options);
      t6.p(i7), this.T(s6), this._$AH = t6;
    }
  }
  _$AC(t5) {
    let i7 = C.get(t5.strings);
    return void 0 === i7 && C.set(t5.strings, i7 = new S2(t5)), i7;
  }
  k(t5) {
    u2(this._$AH) || (this._$AH = [], this._$AR());
    const i7 = this._$AH;
    let s5, e5 = 0;
    for (const h4 of t5) e5 === i7.length ? i7.push(s5 = new _k(this.O(c3()), this.O(c3()), this, this.options)) : s5 = i7[e5], s5._$AI(h4), e5++;
    e5 < i7.length && (this._$AR(s5 && s5._$AB.nextSibling, e5), i7.length = e5);
  }
  _$AR(t5 = this._$AA.nextSibling, s5) {
    for (this._$AP?.(false, true, s5); t5 !== this._$AB; ) {
      const s6 = i2(t5).nextSibling;
      i2(t5).remove(), t5 = s6;
    }
  }
  setConnected(t5) {
    void 0 === this._$AM && (this._$Cv = t5, this._$AP?.(t5));
  }
};
var H = class {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t5, i7, s5, e5, h4) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t5, this.name = i7, this._$AM = e5, this.options = h4, s5.length > 2 || "" !== s5[0] || "" !== s5[1] ? (this._$AH = Array(s5.length - 1).fill(new String()), this.strings = s5) : this._$AH = A;
  }
  _$AI(t5, i7 = this, s5, e5) {
    const h4 = this.strings;
    let o7 = false;
    if (void 0 === h4) t5 = M(this, t5, i7, 0), o7 = !a2(t5) || t5 !== this._$AH && t5 !== E, o7 && (this._$AH = t5);
    else {
      const e6 = t5;
      let n6, r6;
      for (t5 = h4[0], n6 = 0; n6 < h4.length - 1; n6++) r6 = M(this, e6[s5 + n6], i7, n6), r6 === E && (r6 = this._$AH[n6]), o7 ||= !a2(r6) || r6 !== this._$AH[n6], r6 === A ? t5 = A : t5 !== A && (t5 += (r6 ?? "") + h4[n6 + 1]), this._$AH[n6] = r6;
    }
    o7 && !e5 && this.j(t5);
  }
  j(t5) {
    t5 === A ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t5 ?? "");
  }
};
var I = class extends H {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t5) {
    this.element[this.name] = t5 === A ? void 0 : t5;
  }
};
var L = class extends H {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t5) {
    this.element.toggleAttribute(this.name, !!t5 && t5 !== A);
  }
};
var z = class extends H {
  constructor(t5, i7, s5, e5, h4) {
    super(t5, i7, s5, e5, h4), this.type = 5;
  }
  _$AI(t5, i7 = this) {
    if ((t5 = M(this, t5, i7, 0) ?? A) === E) return;
    const s5 = this._$AH, e5 = t5 === A && s5 !== A || t5.capture !== s5.capture || t5.once !== s5.once || t5.passive !== s5.passive, h4 = t5 !== A && (s5 === A || e5);
    e5 && this.element.removeEventListener(this.name, this, s5), h4 && this.element.addEventListener(this.name, this, t5), this._$AH = t5;
  }
  handleEvent(t5) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t5) : this._$AH.handleEvent(t5);
  }
};
var Z = class {
  constructor(t5, i7, s5) {
    this.element = t5, this.type = 6, this._$AN = void 0, this._$AM = i7, this.options = s5;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t5) {
    M(this, t5);
  }
};
var j = { M: h2, P: o3, A: n3, C: 1, L: N, R, D: d2, V: M, I: k, H, N: L, U: z, B: I, F: Z };
var B = t2.litHtmlPolyfillSupport;
B?.(S2, k), (t2.litHtmlVersions ??= []).push("3.3.3");
var D = (t5, i7, s5) => {
  const e5 = s5?.renderBefore ?? i7;
  let h4 = e5._$litPart$;
  if (void 0 === h4) {
    const t6 = s5?.renderBefore ?? null;
    e5._$litPart$ = h4 = new k(i7.insertBefore(c3(), t6), t6, void 0, s5 ?? {});
  }
  return h4._$AI(t5), h4;
};

// lit-element/lit-element.js
var s3 = globalThis;
var i3 = class extends g {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const t5 = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= t5.firstChild, t5;
  }
  update(t5) {
    const r6 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t5), this._$Do = D(r6, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(true);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(false);
  }
  render() {
    return E;
  }
};
i3._$litElement$ = true, i3["finalized"] = true, s3.litElementHydrateSupport?.({ LitElement: i3 });
var o4 = s3.litElementPolyfillSupport;
o4?.({ LitElement: i3 });
(s3.litElementVersions ??= []).push("4.2.2");

// @lit/reactive-element/node/decorators/property.js
var o5 = { attribute: true, type: String, converter: b, reflect: false, hasChanged: m };
var r4 = (t5 = o5, e5, r6) => {
  const { kind: n6, metadata: i7 } = r6;
  let s5 = globalThis.litPropertyMetadata.get(i7);
  if (void 0 === s5 && globalThis.litPropertyMetadata.set(i7, s5 = /* @__PURE__ */ new Map()), "setter" === n6 && ((t5 = Object.create(t5)).wrapped = true), s5.set(r6.name, t5), "accessor" === n6) {
    const { name: o7 } = r6;
    return { set(r7) {
      const n7 = e5.get.call(this);
      e5.set.call(this, r7), this.requestUpdate(o7, n7, t5, true, r7);
    }, init(e6) {
      return void 0 !== e6 && this.C(o7, void 0, t5, e6), e6;
    } };
  }
  if ("setter" === n6) {
    const { name: o7 } = r6;
    return function(r7) {
      const n7 = this[o7];
      e5.call(this, r7), this.requestUpdate(o7, n7, t5, true, r7);
    };
  }
  throw Error("Unsupported decorator location: " + n6);
};
function n4(t5) {
  return (e5, o7) => "object" == typeof o7 ? r4(t5, e5, o7) : ((t6, e6, o8) => {
    const r6 = e6.hasOwnProperty(o8);
    return e6.constructor.createProperty(o8, t6), r6 ? Object.getOwnPropertyDescriptor(e6, o8) : void 0;
  })(t5, e5, o7);
}

// @lit/reactive-element/node/decorators/state.js
function r5(r6) {
  return n4({ ...r6, state: true, attribute: false });
}

// @erplora/outfitkit/dist/define.js
function define(tag, ctor) {
  if (typeof customElements !== "undefined" && !customElements.get(tag)) {
    customElements.define(tag, ctor);
  }
}

// @erplora/outfitkit/dist/shared/icons.js
var rawAdd = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M256 112v288m144-144H112"/></svg>';
var rawAlertCircle = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="currentColor" d="M256 48C141.31 48 48 141.31 48 256s93.31 208 208 208s208-93.31 208-208S370.69 48 256 48m0 319.91a20 20 0 1 1 20-20a20 20 0 0 1-20 20m21.72-201.15l-5.74 122a16 16 0 0 1-32 0l-5.74-121.94v-.05a21.74 21.74 0 1 1 43.44 0Z"/></svg>';
var rawAlertCircleOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" d="M448 256c0-106-86-192-192-192S64 150 64 256s86 192 192 192s192-86 192-192Z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M250.26 166.05L256 288l5.73-121.95a5.74 5.74 0 0 0-5.79-6h0a5.74 5.74 0 0 0-5.68 6"/><path fill="currentColor" d="M256 367.91a20 20 0 1 1 20-20a20 20 0 0 1-20 20"/></svg>';
var rawAppsOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><rect width="80" height="80" x="64" y="64" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/><rect width="80" height="80" x="216" y="64" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/><rect width="80" height="80" x="368" y="64" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/><rect width="80" height="80" x="64" y="216" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/><rect width="80" height="80" x="216" y="216" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/><rect width="80" height="80" x="368" y="216" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/><rect width="80" height="80" x="64" y="368" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/><rect width="80" height="80" x="216" y="368" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/><rect width="80" height="80" x="368" y="368" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/></svg>';
var rawArchiveOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M80 152v256a40.12 40.12 0 0 0 40 40h272a40.12 40.12 0 0 0 40-40V152"/><rect width="416" height="80" x="48" y="64" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" rx="28" ry="28"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m320 304l-64 64l-64-64m64 41.89V224"/></svg>';
var rawArrowRedoOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" d="M448 256L272 88v96C103.57 184 64 304.77 64 424c48.61-62.24 91.6-96 208-96v96Z"/></svg>';
var rawArrowUndoOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" d="M240 424v-96c116.4 0 159.39 33.76 208 96c0-119.23-39.57-240-208-240V88L64 256Z"/></svg>';
var rawBackspaceOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" d="M135.19 390.14a28.8 28.8 0 0 0 21.68 9.86h246.26A29 29 0 0 0 432 371.13V140.87A29 29 0 0 0 403.13 112H156.87a28.84 28.84 0 0 0-21.67 9.84L46.33 256l88.86 134.11Z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M336.67 192.33L206.66 322.34m130.01 0L206.66 192.33m130.01 0L206.66 322.34m130.01 0L206.66 192.33"/></svg>';
var rawCalendarOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><rect width="416" height="384" x="48" y="80" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" rx="48"/><circle cx="296" cy="232" r="24" fill="currentColor"/><circle cx="376" cy="232" r="24" fill="currentColor"/><circle cx="296" cy="312" r="24" fill="currentColor"/><circle cx="376" cy="312" r="24" fill="currentColor"/><circle cx="136" cy="312" r="24" fill="currentColor"/><circle cx="216" cy="312" r="24" fill="currentColor"/><circle cx="136" cy="392" r="24" fill="currentColor"/><circle cx="216" cy="392" r="24" fill="currentColor"/><circle cx="296" cy="392" r="24" fill="currentColor"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M128 48v32m256-32v32"/><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" d="M464 160H48"/></svg>';
var rawCheckmarkCircle = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="currentColor" d="M256 48C141.31 48 48 141.31 48 256s93.31 208 208 208s208-93.31 208-208S370.69 48 256 48m108.25 138.29l-134.4 160a16 16 0 0 1-12 5.71h-.27a16 16 0 0 1-11.89-5.3l-57.6-64a16 16 0 1 1 23.78-21.4l45.29 50.32l122.59-145.91a16 16 0 0 1 24.5 20.58"/></svg>';
var rawCheckmarkOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M416 128L192 384l-96-96"/></svg>';
var rawChevronBack = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M328 112L184 256l144 144"/></svg>';
var rawChevronBackOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M328 112L184 256l144 144"/></svg>';
var rawChevronDownOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="m112 184l144 144l144-144"/></svg>';
var rawChevronForward = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="m184 112l144 144l-144 144"/></svg>';
var rawChevronForwardOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="m184 112l144 144l-144 144"/></svg>';
var rawChevronUpOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="m112 328l144-144l144 144"/></svg>';
var rawClose = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="currentColor" d="m289.94 256l95-95A24 24 0 0 0 351 127l-95 95l-95-95a24 24 0 0 0-34 34l95 95l-95 95a24 24 0 1 0 34 34l95-95l95 95a24 24 0 0 0 34-34Z"/></svg>';
var rawCloseOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M368 368L144 144m224 0L144 368"/></svg>';
var rawCloudUploadOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M320 367.79h76c55 0 100-29.21 100-83.6s-53-81.47-96-83.6c-8.89-85.06-71-136.8-144-136.8c-69 0-113.44 45.79-128 91.2c-60 5.7-112 43.88-112 106.4s54 106.4 120 106.4h56"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m320 255.79l-64-64l-64 64m64 192.42V207.79"/></svg>';
var rawCreateOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M384 224v184a40 40 0 0 1-40 40H104a40 40 0 0 1-40-40V168a40 40 0 0 1 40-40h167.48"/><path fill="currentColor" d="M459.94 53.25a16.06 16.06 0 0 0-23.22-.56L424.35 65a8 8 0 0 0 0 11.31l11.34 11.32a8 8 0 0 0 11.34 0l12.06-12c6.1-6.09 6.67-16.01.85-22.38M399.34 90L218.82 270.2a9 9 0 0 0-2.31 3.93L208.16 299a3.91 3.91 0 0 0 4.86 4.86l24.85-8.35a9 9 0 0 0 3.93-2.31L422 112.66a9 9 0 0 0 0-12.66l-9.95-10a9 9 0 0 0-12.71 0"/></svg>';
var rawContractOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M304 416V304h112m-101.8 10.23L432 432M208 96v112H96m101.8-10.23L80 80m336 128H304V96m10.23 101.8L432 80M96 304h112v112m-10.23-101.8L80 432"/></svg>';
var rawDocumentAttachOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M208 64h66.75a32 32 0 0 1 22.62 9.37l141.26 141.26a32 32 0 0 1 9.37 22.62V432a48 48 0 0 1-48 48H192a48 48 0 0 1-48-48V304"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M288 72v120a32 32 0 0 0 32 32h120"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="M160 80v152a23.69 23.69 0 0 1-24 24c-12 0-24-9.1-24-24V88c0-30.59 16.57-56 48-56s48 24.8 48 55.38v138.75c0 43-27.82 77.87-72 77.87s-72-34.86-72-77.87V144"/></svg>';
var rawDocumentOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" d="M416 221.25V416a48 48 0 0 1-48 48H144a48 48 0 0 1-48-48V96a48 48 0 0 1 48-48h98.75a32 32 0 0 1 22.62 9.37l141.26 141.26a32 32 0 0 1 9.37 22.62Z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M256 56v120a32 32 0 0 0 32 32h120"/></svg>';
var rawDocumentTextOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" d="M416 221.25V416a48 48 0 0 1-48 48H144a48 48 0 0 1-48-48V96a48 48 0 0 1 48-48h98.75a32 32 0 0 1 22.62 9.37l141.26 141.26a32 32 0 0 1 9.37 22.62Z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M256 56v120a32 32 0 0 0 32 32h120m-232 80h160m-160 80h160"/></svg>';
var rawDownloadOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M336 176h40a40 40 0 0 1 40 40v208a40 40 0 0 1-40 40H136a40 40 0 0 1-40-40V216a40 40 0 0 1 40-40h40"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m176 272l80 80l80-80M256 48v288"/></svg>';
var rawEllipsisVertical = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><circle cx="256" cy="256" r="48" fill="currentColor"/><circle cx="256" cy="416" r="48" fill="currentColor"/><circle cx="256" cy="96" r="48" fill="currentColor"/></svg>';
var rawExpandOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M432 320v112H320m101.8-10.23L304 304M80 192V80h112M90.2 90.23L208 208M320 80h112v112M421.77 90.2L304 208M192 432H80V320m10.23 101.8L208 304"/></svg>';
var rawFileTrayOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" d="M384 80H128c-26 0-43 14-48 40L48 272v112a48.14 48.14 0 0 0 48 48h320a48.14 48.14 0 0 0 48-48V272l-32-152c-5-27-23-40-48-40Z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M48 272h144m128 0h144m-272 0a64 64 0 0 0 128 0"/></svg>';
var rawFolderOpenOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M64 192v-72a40 40 0 0 1 40-40h75.89a40 40 0 0 1 22.19 6.72l27.84 18.56a40 40 0 0 0 22.19 6.72H408a40 40 0 0 1 40 40v40"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M479.9 226.55L463.68 392a40 40 0 0 1-39.93 40H88.25a40 40 0 0 1-39.93-40L32.1 226.55A32 32 0 0 1 64 192h384.1a32 32 0 0 1 31.8 34.55"/></svg>';
var rawInformationCircle = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="currentColor" d="M256 56C145.72 56 56 145.72 56 256s89.72 200 200 200s200-89.72 200-200S366.28 56 256 56m0 82a26 26 0 1 1-26 26a26 26 0 0 1 26-26m48 226h-88a16 16 0 0 1 0-32h28v-88h-16a16 16 0 0 1 0-32h32a16 16 0 0 1 16 16v104h28a16 16 0 0 1 0 32"/></svg>';
var rawMenuOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="M80 160h352M80 256h352M80 352h352"/></svg>';
var rawNotificationsOffOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M128.51 204.59q-.37 6.15-.37 12.76C128.14 304 110 320 84.33 351.43C73.69 364.45 83 384 101.62 384H320m94.5-48.7c-18.48-23.45-30.62-47.05-30.62-118c0-79.3-40.52-107.57-73.88-121.3c-4.43-1.82-8.6-6-9.95-10.55C294.21 65.54 277.82 48 256 48s-38.2 17.55-44 37.47c-1.35 4.6-5.52 8.71-10 10.53a150 150 0 0 0-18 8.79M320 384v16a64 64 0 0 1-128 0v-16"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="M448 448L64 64"/></svg>';
var rawOpenOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M384 224v184a40 40 0 0 1-40 40H104a40 40 0 0 1-40-40V168a40 40 0 0 1 40-40h167.48M336 64h112v112M224 288L440 72"/></svg>';
var rawPlayOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" d="M112 111v290c0 17.44 17 28.52 31 20.16l247.9-148.37c12.12-7.25 12.12-26.33 0-33.58L143 90.84c-14-8.36-31 2.72-31 20.16Z"/></svg>';
var rawRemove = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M400 256H112"/></svg>';
var rawSearchOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" d="M221.09 64a157.09 157.09 0 1 0 157.09 157.09A157.1 157.1 0 0 0 221.09 64Z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="M338.29 338.29L448 448"/></svg>';
var rawSend = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="currentColor" d="m476.59 227.05l-.16-.07L49.35 49.84A23.56 23.56 0 0 0 27.14 52A24.65 24.65 0 0 0 16 72.59v113.29a24 24 0 0 0 19.52 23.57l232.93 43.07a4 4 0 0 1 0 7.86L35.53 303.45A24 24 0 0 0 16 327v113.31A23.57 23.57 0 0 0 26.59 460a23.94 23.94 0 0 0 13.22 4a24.55 24.55 0 0 0 9.52-1.93L476.4 285.94l.19-.09a32 32 0 0 0 0-58.8"/></svg>';
var rawSwapVerticalOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M464 208L352 96L240 208m112-94.87V416M48 304l112 112l112-112m-112 94V96"/></svg>';
var rawTrashOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m112 112l20 320c.95 18.49 14.4 32 32 32h184c17.67 0 30.87-13.51 32-32l20-320"/><path fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="M80 112h352"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M192 112V72h0a23.93 23.93 0 0 1 24-24h80a23.93 23.93 0 0 1 24 24h0v40m-64 64v224m-72-224l8 224m136-224l-8 224"/></svg>';
var rawTrendingDown = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M352 368h112V256"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m48 144l121.37 121.37a32 32 0 0 0 45.26 0l50.74-50.74a32 32 0 0 1 45.26 0L448 352"/></svg>';
var rawTrendingUp = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M352 144h112v112"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m48 368l121.37-121.37a32 32 0 0 1 45.26 0l50.74 50.74a32 32 0 0 0 45.26 0L448 160"/></svg>';
var rawVolumeHighOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M126 192H56a8 8 0 0 0-8 8v112a8 8 0 0 0 8 8h69.65a15.93 15.93 0 0 1 10.14 3.54l91.47 74.89A8 8 0 0 0 240 392V120a8 8 0 0 0-12.74-6.43l-91.47 74.89A15 15 0 0 1 126 192m194 128c9.74-19.38 16-40.84 16-64c0-23.48-6-44.42-16-64m48 176c19.48-33.92 32-64.06 32-112s-12-77.74-32-112m48 272c30-46 48-91.43 48-160s-18-113-48-160"/></svg>';
var rawVolumeLowOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M189.65 192H120a8 8 0 0 0-8 8v112a8 8 0 0 0 8 8h69.65a16 16 0 0 1 10.14 3.63l91.47 75a8 8 0 0 0 12.74-6.46V119.83a8 8 0 0 0-12.74-6.44l-91.47 75a16 16 0 0 1-10.14 3.61M384 320c9.74-19.41 16-40.81 16-64c0-23.51-6-44.4-16-64"/></svg>';
var rawVolumeMuteOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="M416 432L64 80"/><path fill="currentColor" d="M224 136.92v33.8a4 4 0 0 0 1.17 2.82l24 24a4 4 0 0 0 6.83-2.82v-74.15a24.53 24.53 0 0 0-12.67-21.72a23.91 23.91 0 0 0-25.55 1.83a8 8 0 0 0-.66.51l-31.94 26.15a4 4 0 0 0-.29 5.92l17.05 17.06a4 4 0 0 0 5.37.26Zm0 238.16l-78.07-63.92a32 32 0 0 0-20.28-7.16H64v-96h50.72a4 4 0 0 0 2.82-6.83l-24-24a4 4 0 0 0-2.82-1.17H56a24 24 0 0 0-24 24v112a24 24 0 0 0 24 24h69.76l91.36 74.8a8 8 0 0 0 .66.51a23.93 23.93 0 0 0 25.85 1.69A24.49 24.49 0 0 0 256 391.45v-50.17a4 4 0 0 0-1.17-2.82l-24-24a4 4 0 0 0-6.83 2.82ZM352 256c0-24.56-5.81-47.88-17.75-71.27a16 16 0 0 0-28.5 14.54C315.34 218.06 320 236.62 320 256q0 4-.31 8.13a8 8 0 0 0 2.32 6.25l19.66 19.67a4 4 0 0 0 6.75-2A147 147 0 0 0 352 256m64 0c0-51.19-13.08-83.89-34.18-120.06a16 16 0 0 0-27.64 16.12C373.07 184.44 384 211.83 384 256c0 23.83-3.29 42.88-9.37 60.65a8 8 0 0 0 1.9 8.26l16.77 16.76a4 4 0 0 0 6.52-1.27C410.09 315.88 416 289.91 416 256"/><path fill="currentColor" d="M480 256c0-74.26-20.19-121.11-50.51-168.61a16 16 0 1 0-27 17.22C429.82 147.38 448 189.5 448 256c0 47.45-8.9 82.12-23.59 113a4 4 0 0 0 .77 4.55L443 391.39a4 4 0 0 0 6.4-1C470.88 348.22 480 307 480 256"/></svg>';
var rawWarning = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="currentColor" d="M449.07 399.08L278.64 82.58c-12.08-22.44-44.26-22.44-56.35 0L51.87 399.08A32 32 0 0 0 80 446.25h340.89a32 32 0 0 0 28.18-47.17m-198.6-1.83a20 20 0 1 1 20-20a20 20 0 0 1-20 20m21.72-201.15l-5.74 122a16 16 0 0 1-32 0l-5.74-121.95a21.73 21.73 0 0 1 21.5-22.69h.21a21.74 21.74 0 0 1 21.73 22.7Z"/></svg>';
function bake(svg) {
  return `data:image/svg+xml;utf8,${svg}`;
}
var iconAdd = bake(rawAdd);
var iconAlertCircle = bake(rawAlertCircle);
var iconAlertCircleOutline = bake(rawAlertCircleOutline);
var iconAppsOutline = bake(rawAppsOutline);
var iconArchiveOutline = bake(rawArchiveOutline);
var iconArrowRedoOutline = bake(rawArrowRedoOutline);
var iconArrowUndoOutline = bake(rawArrowUndoOutline);
var iconBackspaceOutline = bake(rawBackspaceOutline);
var iconCalendarOutline = bake(rawCalendarOutline);
var iconCheckmarkCircle = bake(rawCheckmarkCircle);
var iconCheckmarkOutline = bake(rawCheckmarkOutline);
var iconChevronBack = bake(rawChevronBack);
var iconChevronBackOutline = bake(rawChevronBackOutline);
var iconChevronDownOutline = bake(rawChevronDownOutline);
var iconChevronForward = bake(rawChevronForward);
var iconChevronForwardOutline = bake(rawChevronForwardOutline);
var iconChevronUpOutline = bake(rawChevronUpOutline);
var iconClose = bake(rawClose);
var iconCloseOutline = bake(rawCloseOutline);
var iconCloudUploadOutline = bake(rawCloudUploadOutline);
var iconCreateOutline = bake(rawCreateOutline);
var iconDocumentAttachOutline = bake(rawDocumentAttachOutline);
var iconContractOutline = bake(rawContractOutline);
var iconDocumentOutline = bake(rawDocumentOutline);
var iconDocumentTextOutline = bake(rawDocumentTextOutline);
var iconDownloadOutline = bake(rawDownloadOutline);
var iconEllipsisVertical = bake(rawEllipsisVertical);
var iconExpandOutline = bake(rawExpandOutline);
var iconFileTrayOutline = bake(rawFileTrayOutline);
var iconFolderOpenOutline = bake(rawFolderOpenOutline);
var iconInformationCircle = bake(rawInformationCircle);
var iconMenuOutline = bake(rawMenuOutline);
var iconNotificationsOffOutline = bake(rawNotificationsOffOutline);
var iconOpenOutline = bake(rawOpenOutline);
var iconPlayOutline = bake(rawPlayOutline);
var iconRemove = bake(rawRemove);
var iconSearchOutline = bake(rawSearchOutline);
var iconSend = bake(rawSend);
var iconSwapVerticalOutline = bake(rawSwapVerticalOutline);
var iconTrashOutline = bake(rawTrashOutline);
var iconTrendingDown = bake(rawTrendingDown);
var iconTrendingUp = bake(rawTrendingUp);
var iconVolumeHighOutline = bake(rawVolumeHighOutline);
var iconVolumeLowOutline = bake(rawVolumeLowOutline);
var iconVolumeMuteOutline = bake(rawVolumeMuteOutline);
var iconWarning = bake(rawWarning);
var BY_NAME = {
  "add": iconAdd,
  "alert-circle": iconAlertCircle,
  "alert-circle-outline": iconAlertCircleOutline,
  "apps-outline": iconAppsOutline,
  "archive-outline": iconArchiveOutline,
  "arrow-redo-outline": iconArrowRedoOutline,
  "arrow-undo-outline": iconArrowUndoOutline,
  "backspace-outline": iconBackspaceOutline,
  "calendar-outline": iconCalendarOutline,
  "checkmark-circle": iconCheckmarkCircle,
  "checkmark-outline": iconCheckmarkOutline,
  "chevron-back": iconChevronBack,
  "chevron-back-outline": iconChevronBackOutline,
  "chevron-down-outline": iconChevronDownOutline,
  "chevron-forward": iconChevronForward,
  "chevron-forward-outline": iconChevronForwardOutline,
  "chevron-up-outline": iconChevronUpOutline,
  "close": iconClose,
  "close-outline": iconCloseOutline,
  "cloud-upload-outline": iconCloudUploadOutline,
  "create-outline": iconCreateOutline,
  "document-attach-outline": iconDocumentAttachOutline,
  "contract-outline": iconContractOutline,
  "document-outline": iconDocumentOutline,
  "document-text-outline": iconDocumentTextOutline,
  "download-outline": iconDownloadOutline,
  "ellipsis-vertical": iconEllipsisVertical,
  "expand-outline": iconExpandOutline,
  "file-tray-outline": iconFileTrayOutline,
  "folder-open-outline": iconFolderOpenOutline,
  "information-circle": iconInformationCircle,
  "menu-outline": iconMenuOutline,
  "notifications-off-outline": iconNotificationsOffOutline,
  "open-outline": iconOpenOutline,
  "play-outline": iconPlayOutline,
  "remove": iconRemove,
  "search-outline": iconSearchOutline,
  "send": iconSend,
  "swap-vertical-outline": iconSwapVerticalOutline,
  "trash-outline": iconTrashOutline,
  "trending-down": iconTrendingDown,
  "trending-up": iconTrendingUp,
  "volume-high-outline": iconVolumeHighOutline,
  "volume-low-outline": iconVolumeLowOutline,
  "volume-mute-outline": iconVolumeMuteOutline,
  "warning": iconWarning
};
function okIcon(value) {
  if (!value) return void 0;
  const trimmed = value.trimStart();
  if (trimmed.startsWith("<svg")) return bake(trimmed);
  return BY_NAME[value] ?? value;
}

// @erplora/outfitkit/dist/ok-inline-feedback.js
var __defProp2 = Object.defineProperty;
var __decorateClass2 = (decorators, target, key, kind) => {
  var result = void 0;
  for (var i7 = decorators.length - 1, decorator; i7 >= 0; i7--)
    if (decorator = decorators[i7])
      result = decorator(target, key, result) || result;
  if (result) __defProp2(target, key, result);
  return result;
};
var DEFAULT_LABELS = {
  dismiss: "Dismiss"
};
var OkInlineFeedback = class extends i3 {
  constructor() {
    super(...arguments);
    this.tone = "info";
    this.dismissible = false;
    this.hidden = false;
    this.labels = {};
    this.hasActions = false;
    this.onActionsSlotChange = (e5) => {
      const slot = e5.target;
      this.hasActions = slot.assignedNodes({ flatten: true }).length > 0;
    };
  }
  static {
    this.styles = i`
    :host {
      /* Vars overridable (estilo Ionic), default = cadena --ok-* → --ion-* → hex.
         --tone-color y --tone-icon se reasignan por tone abajo. */
      --tone-color: var(--ok-primary, var(--ion-color-primary, #3880ff));
      --background-opacity: 0.1;
      --color: var(--ok-text, var(--ion-text-color, #1c1b17));
      --border-radius: var(--ok-radius, var(--ion-border-radius, 8px));
      --padding: var(--ok-spacing, var(--ion-padding, 16px));
      --accent-width: 4px;
      --font: var(--ok-font, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif);

      /* Responsive: el banner ocupa el ancho del contenedor. */
      display: block;
      width: 100%;
      font-family: var(--font);
      box-sizing: border-box;
    }
    :host([hidden]) { display: none; }

    /* Mapa de tonos → color Ionic + icono por defecto. */
    :host([tone='success']) { --tone-color: var(--ok-success, var(--ion-color-success, #2dd55b)); }
    :host([tone='warning']) { --tone-color: var(--ok-warning, var(--ion-color-warning, #ffc409)); }
    :host([tone='danger'])  { --tone-color: var(--ok-danger, var(--ion-color-danger, #c5000f)); }
    :host([tone='neutral']) { --tone-color: var(--ok-medium, var(--ion-color-medium, #5f5f5f)); }
    /* info / sin tono → primary (default ya aplicado en :host). */

    .box {
      position: relative;
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: var(--padding);
      border-radius: var(--border-radius);
      border-inline-start: var(--accent-width) solid var(--tone-color);
      /* Fondo tonal: el color del tono con baja opacidad (color-mix con fallback al borde fino). */
      background: color-mix(in srgb, var(--tone-color) calc(var(--background-opacity) * 100%), transparent);
      color: var(--color);
    }

    .icon {
      flex: 0 0 auto;
      font-size: 1.4rem;
      line-height: 1;
      color: var(--tone-color);
      margin-top: 0.05rem;
    }

    .content {
      flex: 1 1 auto;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .row {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
    }
    .text {
      flex: 1 1 auto;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .heading {
      font-weight: 700;
      font-size: 0.98rem;
      line-height: 1.3;
    }
    .body {
      font-size: 0.92rem;
      line-height: 1.45;
    }
    .actions {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    /* Si no hay actions, el slot queda vacío y no ocupa espacio. */
    .actions.empty { display: none; }

    .close {
      flex: 0 0 auto;
      background: none;
      border: 0;
      cursor: pointer;
      padding: 0.15rem;
      margin: -0.15rem -0.15rem 0 0;
      color: inherit;
      opacity: 0.6;
      font-size: 1.2rem;
      line-height: 1;
      border-radius: 4px;
      transition: background-color var(--ok-transition, 150ms ease), color var(--ok-transition, 150ms ease),
        border-color var(--ok-transition, 150ms ease), box-shadow var(--ok-transition, 150ms ease),
        opacity 0.15s ease, transform 120ms ease;
    }
    @media (hover: hover) {
      .close:hover { opacity: 1; background: rgba(var(--ion-text-color-rgb, 24, 24, 27), 0.07); }
    }
    .close:active { transform: scale(var(--ok-press-scale, 0.97)); }

    /* Móvil: las actions bajan bajo el texto (apiladas a ancho completo). */
    @media (max-width: 640px) {
      .row { flex-direction: column; align-items: stretch; }
      .actions { width: 100%; }
    }
    @media (prefers-reduced-motion: reduce) {
      .close:hover,
      .close:active { transform: none; }
    }
  `;
  }
  // Textos efectivos: defaults en inglés + overrides del consumidor.
  get t() {
    return { ...DEFAULT_LABELS, ...this.labels };
  }
  // Icono por defecto según el tono (overridable por la prop `icon`).
  defaultIcon() {
    switch (this.tone) {
      case "success":
        return iconCheckmarkCircle;
      case "warning":
        return iconWarning;
      case "danger":
        return iconAlertCircle;
      case "neutral":
        return iconInformationCircle;
      case "info":
      default:
        return iconInformationCircle;
    }
  }
  // Oculta el banner y avisa al consumidor; éste puede revertir restaurando `hidden=false`.
  dismiss() {
    this.hidden = true;
    this.dispatchEvent(new CustomEvent("ok-dismiss", { bubbles: true, composed: true }));
  }
  render() {
    const iconName = this.icon ?? this.defaultIcon();
    return b2`
      <div class="box" role="status">
        <ion-icon class="icon" .icon=${okIcon(iconName)} aria-hidden="true"></ion-icon>
        <div class="content">
          <div class="row">
            <div class="text">
              ${this.heading ? b2`<div class="heading">${this.heading}</div>` : null}
              <div class="body"><slot></slot></div>
            </div>
            <div class="actions ${this.hasActions ? "" : "empty"}">
              <slot name="actions" @slotchange=${this.onActionsSlotChange}></slot>
            </div>
          </div>
        </div>
        ${this.dismissible ? b2`
              <button class="close" aria-label=${this.t.dismiss} @click=${this.dismiss}>
                <ion-icon .icon=${iconClose} aria-hidden="true"></ion-icon>
              </button>
            ` : null}
      </div>
    `;
  }
};
__decorateClass2([
  n4({ type: String, reflect: true })
], OkInlineFeedback.prototype, "tone");
__decorateClass2([
  n4({ type: String })
], OkInlineFeedback.prototype, "heading");
__decorateClass2([
  n4({ type: String })
], OkInlineFeedback.prototype, "icon");
__decorateClass2([
  n4({ type: Boolean, reflect: true })
], OkInlineFeedback.prototype, "dismissible");
__decorateClass2([
  n4({ type: Boolean, reflect: true })
], OkInlineFeedback.prototype, "hidden");
__decorateClass2([
  n4({ attribute: false })
], OkInlineFeedback.prototype, "labels");
__decorateClass2([
  r5()
], OkInlineFeedback.prototype, "hasActions");
define("ok-inline-feedback", OkInlineFeedback);

// @erplora/outfitkit/dist/ok-empty-state.js
var __defProp3 = Object.defineProperty;
var __decorateClass3 = (decorators, target, key, kind) => {
  var result = void 0;
  for (var i7 = decorators.length - 1, decorator; i7 >= 0; i7--)
    if (decorator = decorators[i7])
      result = decorator(target, key, result) || result;
  if (result) __defProp3(target, key, result);
  return result;
};
var OkEmptyState = class extends i3 {
  constructor() {
    super(...arguments);
    this.icon = "file-tray-outline";
  }
  static {
    this.styles = i`
    /* Ancho máximo del contenedor; bloque a 100%. */
    :host {
      display: block;
      width: 100%;
      /* Tokens propios estilo Ionic (overridables): --ok-* → --ion-* → hex. */
      --icon-color: var(--ok-color-medium, var(--ion-color-medium, #92949c));
      --heading-color: var(--ok-text-color, var(--ion-text-color, #1f2933));
      --message-color: var(--ok-color-medium, var(--ion-color-medium, #92949c));
      --icon-size: 64px;
      --padding: 2.5rem 1.25rem;
    }

    /* Centrado vertical y horizontal del contenido. */
    .wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: 0.5rem;
      padding: var(--padding);
      box-sizing: border-box;
      width: 100%;
    }

    ion-icon {
      font-size: var(--icon-size);
      color: var(--icon-color);
      opacity: 0.5; /* atenuado */
      margin-bottom: 0.25rem;
    }

    .heading {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--heading-color);
    }

    .message {
      margin: 0;
      font-size: 0.9375rem;
      color: var(--message-color);
      max-width: 38ch;
    }

    /* Acción debajo del texto. */
    .action {
      margin-top: 1rem;
    }

    /* Oculta los wrappers si no hay contenido. */
    .heading:empty,
    .message:empty {
      display: none;
    }
  `;
  }
  render() {
    return b2`
      <div class="wrap">
        <ion-icon .icon=${okIcon(this.icon)} aria-hidden="true"></ion-icon>
        ${this.heading ? b2`<h2 class="heading">${this.heading}</h2>` : null}
        ${this.message ? b2`<p class="message">${this.message}</p>` : null}
        <slot></slot>
        <div class="action">
          <slot name="action"></slot>
        </div>
      </div>
    `;
  }
};
__decorateClass3([
  n4()
], OkEmptyState.prototype, "icon");
__decorateClass3([
  n4()
], OkEmptyState.prototype, "heading");
__decorateClass3([
  n4()
], OkEmptyState.prototype, "message");
define("ok-empty-state", OkEmptyState);

// locales/es.json
var es_default = {
  name: "Mesas",
  description: "Plano de sala del restaurante: zonas, mesas y sesiones de mesa.",
  navigation: {
    floor_plan: {
      label: "Plano de sala"
    },
    zones: {
      label: "Zonas"
    },
    tables: {
      label: "Mesas"
    },
    sessions: {
      label: "Sesiones"
    }
  },
  settings: {
    title: "Mesas",
    fields: {
      prompt_guests_on_seat: {
        label: "Preguntar los comensales al sentar una mesa",
        description: "Desactivado: sentar una mesa libre abre la cuenta con el aforo de la mesa en un solo toque."
      },
      timer_warning_minutes: {
        label: "Aviso \xE1mbar (minutos)",
        description: "Una cuenta abierta se pone \xE1mbar en la vista de Sesiones a partir de estos minutos."
      },
      timer_critical_minutes: {
        label: "Aviso rojo (minutos)",
        description: "Una cuenta abierta se pone roja a partir de estos minutos."
      }
    }
  },
  ui: {
    floorPlan: "Plano de sala",
    assignTable: "Asignar mesa",
    chooseTable: "Elegir mesa",
    removeTable: "Quitar mesa",
    tableActions: "Opciones de mesa",
    transfer: "Transferir",
    merge: "Fusionar",
    split: "Dividir cuenta",
    cancel: "Cancelar",
    transferTitle: "Transferir {number} a\u2026",
    mergeTitle: "Fusionar {number} con\u2026",
    pickFreeTable: "Elige una mesa libre",
    pickOccupiedTable: "Elige una mesa ocupada",
    errNoActiveSession: "Esa mesa no tiene comanda abierta",
    errTransfer: "No se pudo transferir la mesa",
    errMerge: "No se pudieron fusionar las mesas",
    errSplit: "No se pudo dividir la cuenta",
    tableLabel: "Mesa {number}",
    paxCount: "{count} pax",
    guests: "Comensales",
    guestsTitle: "Comensales en la mesa {number}",
    seatGuests: "Sentar {count}",
    saveGuests: "Guardar",
    liveGuests: "{count} comensales",
    overCapacity: "Supera el aforo de la mesa ({capacity})",
    back: "Atr\xE1s",
    errSetGuests: "No se pudieron actualizar los comensales",
    noTablesInZone: "Sin mesas en esta zona.",
    noTablesInZonePrompt: "Sin mesas en esta zona. Pulsa \xABA\xF1adir mesa\xBB.",
    createZoneToStart: "Crea una zona para empezar a colocar mesas.",
    loading: "Cargando\u2026",
    saving: "Guardando\u2026",
    save: "Guardar",
    delete: "Borrar",
    deleteZone: "Borrar zona",
    addTable: "A\xF1adir mesa",
    addZone: "A\xF1adir zona",
    addTitle: "A\xF1adir",
    addAction: "A\xF1adir zona o mesa",
    editZone: "Editar zona",
    panelEditZone: "Editar zona \xB7 {name}",
    editTable: "Editar mesa",
    newZonePlaceholder: "Nueva zona\u2026",
    canvasHint: "Arrastra para colocar \xB7 clic en una mesa para editarla o borrarla. Los cambios se guardan al momento.",
    tableTooltip: "{status} \xB7 {count} pax (clic para editar)",
    colNumber: "N\xFAmero",
    colName: "Nombre",
    colZone: "Zona",
    colCapacity: "Aforo",
    colStatus: "Estado",
    fieldNumber: "N\xFAmero",
    fieldTableNumber: "N\xFAmero de mesa",
    fieldCapacity: "Aforo",
    fieldNameOptional: "Nombre (opcional)",
    fieldShape: "Forma",
    fieldStatus: "Estado",
    fieldZone: "Zona",
    fieldDescriptionOptional: "Descripci\xF3n (opcional)",
    noZone: "Sin zona",
    placeholderNumber: "N\xFAmero",
    autoNumberPlaceholder: "Se numera sola",
    placeholderCapacity: "Aforo",
    searchPlaceholder: "Buscar mesa o zona\u2026",
    emptyTables: "Sin mesas.",
    yes: "S\xED",
    no: "No",
    statusAvailable: "Disponible",
    statusOccupied: "Ocupada",
    statusReserved: "Reservada",
    reservedFor: "Reservada para {name}",
    erasedCustomer: "Cliente borrado",
    servedBy: "Atiende {name}",
    statusBlocked: "Bloqueada",
    shapeSquare: "Cuadrada",
    shapeRound: "Redonda",
    shapeRectangle: "Rectangular",
    errLoadTables: "No se pudieron cargar las mesas",
    errLoadFloorPlan: "No se pudo cargar el plano",
    errOccupyTable: "No se pudo ocupar la mesa",
    errCreateTable: "No se pudo crear la mesa",
    errCreateZone: "No se pudo crear la zona",
    errSavePosition: "No se pudo guardar la posici\xF3n",
    errSaveTable: "No se pudo guardar la mesa",
    errDeleteTable: "No se pudo borrar la mesa",
    errSaveZone: "No se pudo guardar la zona",
    errDeleteZone: "No se pudo borrar la zona (\xBFtiene mesas?)",
    errTableNumberTaken: "Ya hay una mesa con ese n\xFAmero en esta zona",
    errTableNumberRequired: "El n\xFAmero de mesa es obligatorio",
    errZoneNameRequired: "El nombre de la zona es obligatorio",
    close: "Cerrar",
    noTablesInZoneHint: "Crea mesas en el m\xF3dulo Mesas.",
    sendPendingBeforeTable: "Env\xEDa primero los {count} productos pendientes de la comanda actual.",
    sendPendingBeforeTableOne: "Env\xEDa primero el producto pendiente de la comanda actual.",
    sendPendingOrder: "Enviar comanda",
    colTables: "Mesas",
    colAvailable: "Libres",
    colOrder: "Orden",
    colColor: "Color",
    availableOfTotal: "{available} / {total}",
    zoneActive: "Activa",
    zoneInactive: "Inactiva",
    actionEdit: "Editar",
    actionDelete: "Borrar",
    saveChanges: "Guardar cambios",
    searchZone: "Buscar zona\u2026",
    emptyZones: "No hay zonas. Pulsa \xAB+\xBB para crear la primera (Sal\xF3n, Terraza, Barra\u2026).",
    deleteZoneTitle: "\xBFBorrar la zona?",
    deleteZoneImpact: "{count} mesas en esta zona. Una zona con mesas no se puede borrar: mueve o borra antes sus mesas.",
    colorPrimary: "Azul",
    colorSecondary: "Cian",
    colorTertiary: "Morado",
    colorSuccess: "Verde",
    colorWarning: "\xC1mbar",
    colorDanger: "Rojo",
    colorMedium: "Gris",
    colTable: "Mesa",
    colWaiter: "Camarero",
    noTable: "Sin mesa (aparcada)",
    colGuests: "Comensales",
    colOpenedAt: "Apertura",
    colClosedAt: "Cierre",
    colDuration: "Tiempo",
    durationMinutes: "{minutes} min",
    colPaidTotal: "Cobrado",
    colNotes: "Notas",
    actionDetail: "Detalle",
    actionCloseSession: "Cerrar sesi\xF3n",
    sessionActive: "Abierta",
    sessionClosed: "Cerrada",
    sessionTransferred: "Trasladada",
    sessionMerged: "Fusionada",
    sessionParked: "Aparcada",
    segmentOpen: "Abiertas",
    segmentClosed: "Cerradas",
    segmentAll: "Todas",
    searchSession: "Buscar mesa\u2026",
    emptySessions: "No hay sesiones. Sienta a un grupo desde el TPV y aparecer\xE1 aqu\xED.",
    errCloseSession: "No se pudo cerrar la sesi\xF3n",
    closeSessionTitle: "\xBFCerrar la sesi\xF3n?",
    closeSessionImpact: "Mesa {number} \xB7 {count} comensales. La mesa queda libre y la sesi\xF3n pasa al hist\xF3rico. Para cobrar la cuenta, usa el TPV.",
    blockedHint: "Mesa fuera de servicio: no se puede sentar hasta que se desbloquee.",
    errTableTaken: "Otro dispositivo acaba de ocupar esa mesa. Se ha actualizado el plano."
  },
  setup: {
    title: "Tus mesas",
    description: "A\xF1ade las mesas de tu sala: sin ellas no hay comanda por mesa, ni dividir ni transferir."
  },
  errors: {
    "tables.zone_unavailable": "Esa zona no est\xE1 disponible: no existe en este negocio o se ha eliminado.",
    "tables.zone_not_found": "Esa zona no existe en este negocio.",
    "tables.table_not_found": "Esa mesa no existe en este negocio.",
    "tables.session_not_active": "Esa cuenta no est\xE1 abierta: no existe en este negocio, o ya se ha cerrado, trasladado, fusionado o aparcado.",
    "tables.session_not_parked": "Esa cuenta no est\xE1 aparcada: no existe en este negocio, o ya est\xE1 sentada en una mesa.",
    "tables.zone_has_tables": "Esta zona todav\xEDa tiene mesas. Mu\xE9velas a otra zona o b\xF3rralas antes.",
    "tables.table_has_active_session": "Esa mesa tiene una cuenta abierta. Ci\xE9rrala o trasl\xE1dala antes de borrar la mesa.",
    "tables.hold_not_found": "Esa retenci\xF3n ya no est\xE1: se solt\xF3, ha vencido, o esa reserva nunca lleg\xF3 a retener una mesa.",
    "tables.table_not_available": "Esa mesa no se puede sentar ahora mismo: est\xE1 ocupada, fuera de servicio o ya no est\xE1 en uso."
  }
};

// locales/en.json
var en_default = {
  name: "Tables",
  navigation: {
    floor_plan: {
      label: "Floor Plan"
    },
    zones: {
      label: "Zones"
    },
    tables: {
      label: "Tables"
    },
    sessions: {
      label: "Sessions"
    }
  },
  settings: {
    title: "Tables",
    fields: {
      prompt_guests_on_seat: {
        label: "Ask for the number of guests when seating a table",
        description: "Off: seating a free table opens the check with the table capacity in one tap."
      },
      timer_warning_minutes: {
        label: "Amber after (minutes)",
        description: "An open check turns amber in the Sessions view after this many minutes."
      },
      timer_critical_minutes: {
        label: "Red after (minutes)",
        description: "An open check turns red after this many minutes."
      }
    }
  },
  ui: {
    floorPlan: "Floor Plan",
    assignTable: "Assign table",
    chooseTable: "Choose table",
    removeTable: "Remove table",
    tableActions: "Table options",
    transfer: "Transfer",
    merge: "Merge",
    split: "Split check",
    cancel: "Cancel",
    transferTitle: "Transfer {number} to\u2026",
    mergeTitle: "Merge {number} with\u2026",
    pickFreeTable: "Pick a free table",
    pickOccupiedTable: "Pick an occupied table",
    errNoActiveSession: "That table has no open order",
    errTransfer: "Could not transfer the table",
    errMerge: "Could not merge the tables",
    errSplit: "Could not split the check",
    tableLabel: "Table {number}",
    paxCount: "{count} pax",
    guests: "Guests",
    guestsTitle: "Guests at table {number}",
    seatGuests: "Seat {count}",
    saveGuests: "Save",
    liveGuests: "{count} guests",
    overCapacity: "Above the table capacity ({capacity})",
    back: "Back",
    errSetGuests: "Could not update the guests",
    noTablesInZone: "No tables in this zone.",
    noTablesInZonePrompt: "No tables in this zone. Tap \u201CAdd table\u201D.",
    createZoneToStart: "Create a zone to start placing tables.",
    loading: "Loading\u2026",
    saving: "Saving\u2026",
    save: "Save",
    delete: "Delete",
    deleteZone: "Delete zone",
    addTable: "Add table",
    addZone: "Add zone",
    addTitle: "Add",
    addAction: "Add zone or table",
    editZone: "Edit zone",
    panelEditZone: "Edit zone \xB7 {name}",
    editTable: "Edit table",
    newZonePlaceholder: "New zone\u2026",
    canvasHint: "Drag to position \xB7 click a table to edit or delete it. Changes are saved instantly.",
    tableTooltip: "{status} \xB7 {count} pax (click to edit)",
    colNumber: "Number",
    colName: "Name",
    colZone: "Zone",
    colCapacity: "Capacity",
    colStatus: "Status",
    fieldNumber: "Number",
    fieldTableNumber: "Table number",
    fieldCapacity: "Capacity",
    fieldNameOptional: "Name (optional)",
    fieldShape: "Shape",
    fieldStatus: "Status",
    fieldZone: "Zone",
    fieldDescriptionOptional: "Description (optional)",
    noZone: "No zone",
    placeholderNumber: "Number",
    autoNumberPlaceholder: "Auto-numbered",
    placeholderCapacity: "Capacity",
    searchPlaceholder: "Search table or zone\u2026",
    emptyTables: "No tables.",
    yes: "Yes",
    no: "No",
    statusAvailable: "Available",
    statusOccupied: "Occupied",
    statusReserved: "Reserved",
    reservedFor: "Reserved for {name}",
    erasedCustomer: "Deleted customer",
    servedBy: "Served by {name}",
    statusBlocked: "Blocked",
    shapeSquare: "Square",
    shapeRound: "Round",
    shapeRectangle: "Rectangular",
    errLoadTables: "Could not load tables",
    errLoadFloorPlan: "Could not load the floor plan",
    errOccupyTable: "Could not occupy the table",
    errCreateTable: "Could not create the table",
    errCreateZone: "Could not create the zone",
    errSavePosition: "Could not save the position",
    errSaveTable: "Could not save the table",
    errDeleteTable: "Could not delete the table",
    errSaveZone: "Could not save the zone",
    errDeleteZone: "Could not delete the zone (does it have tables?)",
    errTableNumberTaken: "A table with that number already exists in this zone",
    errTableNumberRequired: "The table number is required",
    errZoneNameRequired: "The zone name is required",
    close: "Close",
    noTablesInZoneHint: "Create tables in the Tables module.",
    sendPendingBeforeTable: "Send the {count} pending items in the current order first.",
    sendPendingBeforeTableOne: "Send the pending item in the current order first.",
    sendPendingOrder: "Send order",
    colTables: "Tables",
    colAvailable: "Available",
    colOrder: "Order",
    colColor: "Colour",
    availableOfTotal: "{available} / {total}",
    zoneActive: "Active",
    zoneInactive: "Inactive",
    actionEdit: "Edit",
    actionDelete: "Delete",
    saveChanges: "Save changes",
    searchZone: "Search zone\u2026",
    emptyZones: "No zones. Tap \xAB+\xBB to create the first one (Dining room, Terrace, Bar\u2026).",
    deleteZoneTitle: "Delete zone?",
    deleteZoneImpact: "{count} tables in this zone. A zone with tables cannot be deleted: move or delete its tables first.",
    colorPrimary: "Blue",
    colorSecondary: "Cyan",
    colorTertiary: "Purple",
    colorSuccess: "Green",
    colorWarning: "Amber",
    colorDanger: "Red",
    colorMedium: "Grey",
    colTable: "Table",
    colWaiter: "Server",
    noTable: "No table (parked)",
    colGuests: "Guests",
    colOpenedAt: "Opened",
    colClosedAt: "Closed",
    colDuration: "Time",
    durationMinutes: "{minutes} min",
    colPaidTotal: "Charged",
    colNotes: "Notes",
    actionDetail: "Details",
    actionCloseSession: "Close session",
    sessionActive: "Open",
    sessionClosed: "Closed",
    sessionTransferred: "Transferred",
    sessionMerged: "Merged",
    sessionParked: "Parked",
    segmentOpen: "Open",
    segmentClosed: "Closed",
    segmentAll: "All",
    searchSession: "Search table\u2026",
    emptySessions: "No sessions. Seat a party from the POS and it will show up here.",
    errCloseSession: "Could not close the session",
    closeSessionTitle: "Close the session?",
    closeSessionImpact: "Table {number} \xB7 {count} guests. The table is freed and the session moves to the history. To collect the check, use the POS.",
    blockedHint: "Table out of service: it cannot be seated until it is unblocked.",
    errTableTaken: "Another device has just taken that table. The floor plan has been refreshed."
  },
  setup: {
    title: "Your tables",
    description: "Add the tables of your dining room: without them there is no order per table, no split and no transfer."
  },
  errors: {
    "tables.zone_unavailable": "That zone is not available: it does not exist in this business or it has been deleted.",
    "tables.zone_not_found": "That zone does not exist in this business.",
    "tables.table_not_found": "That table does not exist in this business.",
    "tables.session_not_active": "That check is not open: it does not exist in this business, or it has already been closed, transferred, merged or parked.",
    "tables.session_not_parked": "That check is not parked: it does not exist in this business, or it is already seated at a table.",
    "tables.zone_has_tables": "That zone still has tables. Move them to another zone or delete them first.",
    "tables.table_has_active_session": "That table still has an open check. Close or move it before deleting the table.",
    "tables.hold_not_found": "That hold is not there any more: it was already released, it expired, or that booking never held a table.",
    "tables.table_not_available": "That table cannot be seated right now: it is taken, out of service or no longer in use."
  }
};

// ui/lib/domain-error.ts
var ERRORS = {
  es: es_default.errors ?? {},
  en: en_default.errors ?? {}
};
var INTERNALS = ["sqlx", "db:", "bind parameter", "constraint", "at line ", "panicked", "tables__gate"];
function presentable(text) {
  const t5 = text.trim().toLowerCase();
  return t5.length > 0 && !INTERNALS.some((mark) => t5.includes(mark));
}
function errorCode(e5) {
  const code = typeof e5 === "object" && e5 !== null ? e5.code : void 0;
  return typeof code === "string" ? code : void 0;
}
function domainMessage(e5, lang, fallback) {
  const code = errorCode(e5);
  if (code) {
    const translated = ERRORS[lang]?.[code] ?? ERRORS.en[code];
    if (translated) return translated;
  }
  const message = e5 instanceof Error ? e5.message : "";
  return presentable(message) ? message : fallback;
}

// ui/lib/natural-order.ts
var PAD_WIDTH = 12;
function naturalKey(label) {
  return (label ?? "").replace(/[0-9]+/g, (run) => run.padStart(PAD_WIDTH, "0"));
}
var COLLATORS = /* @__PURE__ */ new Map();
function collator(locale) {
  const key = locale ?? "";
  const cached = COLLATORS.get(key);
  if (cached) return cached;
  let made;
  try {
    made = new Intl.Collator(locale || void 0, { numeric: true, sensitivity: "variant" });
  } catch {
    made = new Intl.Collator(void 0, { numeric: true, sensitivity: "variant" });
  }
  COLLATORS.set(key, made);
  return made;
}
function compareNatural(a3, b3, locale) {
  return collator(locale).compare(naturalKey(a3), naturalKey(b3));
}
function sortNaturallyBy(rows3, pick, locale) {
  return [...rows3].sort((a3, b3) => compareNatural(pick(a3), pick(b3), locale));
}

// ui/lib/ion-tone.ts
var PALETTE = {
  danger: { base: "#c5000f", contrast: "#fff", shade: "#ad000d", tint: "#cb1a27" }
};
function ionTone(kind, tone) {
  const p4 = PALETTE[tone];
  const token = (suffix, fallback) => `var(--ion-color-${tone}${suffix}, ${fallback})`;
  if (kind === "outline") {
    return [
      `--color: ${token("", p4.base)}`,
      `--border-color: ${token("", p4.base)}`,
      `--background-activated: ${token("", p4.base)}`,
      `--background-focused: ${token("", p4.base)};`
    ].join("; ");
  }
  return [
    `--background: ${token("", p4.base)}`,
    `--background-activated: ${token("-shade", p4.shade)}`,
    `--background-focused: ${token("-shade", p4.shade)}`,
    `--background-hover: ${token("-tint", p4.tint)}`,
    `--color: ${token("-contrast", p4.contrast)};`
  ].join("; ");
}

// ui/lib/hold-name.ts
function holdName(row, erasedLabel) {
  const name = (row.reserved_for ?? "").trim();
  if (name) return name;
  return row.reserved_customer_id ? erasedLabel : "";
}

// ui/components/erp-tables-canvas/erp-tables-canvas.ts
var CATALOG = { es: es_default, en: en_default };
function hhmm(iso) {
  if (!iso) return "";
  const d3 = new Date(iso);
  if (Number.isNaN(d3.getTime())) return "";
  return `${String(d3.getHours()).padStart(2, "0")}:${String(d3.getMinutes()).padStart(2, "0")}`;
}
function minutesSince(iso, now) {
  if (!iso) return null;
  const from = new Date(iso).getTime();
  if (Number.isNaN(from)) return null;
  return Math.max(0, Math.floor((now.getTime() - from) / 6e4));
}
var BOX = 72;
var DRAG_THRESHOLD = 5;
var KEY_STEP = 8;
var SHAPES = ["square", "round", "rectangle"];
var STATUSES = ["available", "occupied", "reserved", "blocked"];
var STATUS_KEY = {
  available: "ui.statusAvailable",
  occupied: "ui.statusOccupied",
  reserved: "ui.statusReserved",
  blocked: "ui.statusBlocked"
};
var SHAPE_KEY = { square: "ui.shapeSquare", round: "ui.shapeRound", rectangle: "ui.shapeRectangle" };
var STATUS_COLOR = {
  available: "#2f9e44",
  occupied: "#d9480f",
  reserved: "#f08c00",
  blocked: "#868e96"
};
var STATUS_ICON = {
  available: { icon: "checkmark-circle-outline" },
  occupied: { icon: "people-outline" },
  reserved: { icon: "time-outline" },
  blocked: { icon: "ban-outline" }
};
var REFRESH_MS = 3e4;
function erplora() {
  const c5 = globalThis.erplora;
  if (!c5) throw new Error("erplora SDK no inicializado por el shell");
  return c5;
}
function rows(r6) {
  if (Array.isArray(r6)) return r6;
  if (r6 && typeof r6 === "object" && Array.isArray(r6.rows)) return r6.rows;
  return [];
}
var AUTO_GAP = 16;
var AUTO_CELL = BOX + AUTO_GAP;
var AUTO_COLS = 4;
var MIN_BOX = 24;
function boxOf(t5) {
  const w2 = Number(t5.width) || 0;
  const h4 = Number(t5.height) || 0;
  return { w: w2 >= MIN_BOX ? w2 : BOX, h: h4 >= MIN_BOX ? h4 : BOX };
}
function neverPlaced(t5) {
  return !(Number(t5.width) >= MIN_BOX && Number(t5.height) >= MIN_BOX);
}
function seTapan(a3, b3) {
  const ca = boxOf(a3);
  const cb = boxOf(b3);
  return a3.position_x < b3.position_x + cb.w && b3.position_x < a3.position_x + ca.w && a3.position_y < b3.position_y + cb.h && b3.position_y < a3.position_y + ca.h;
}
function autoLayoutTables(tables) {
  const byZone = /* @__PURE__ */ new Map();
  for (const t5 of tables) {
    const key = t5.zone_id ?? "";
    const bucket = byZone.get(key);
    if (bucket) bucket.push(t5);
    else byZone.set(key, [t5]);
  }
  const fixed = /* @__PURE__ */ new Map();
  for (const zoneTables of byZone.values()) {
    const placed = [];
    const pending = [];
    for (const t5 of zoneTables) {
      if (neverPlaced(t5)) pending.push(t5);
      else placed.push(t5);
    }
    let col = 0;
    let row = 0;
    for (const t5 of pending) {
      let candidate;
      for (; ; ) {
        candidate = { ...t5, position_x: AUTO_GAP + col * AUTO_CELL, position_y: AUTO_GAP + row * AUTO_CELL, width: BOX, height: BOX };
        col++;
        if (col >= AUTO_COLS) {
          col = 0;
          row++;
        }
        if (!placed.some((p4) => seTapan(p4, candidate))) break;
      }
      placed.push(candidate);
      fixed.set(candidate.id, candidate);
    }
  }
  return tables.map((t5) => fixed.get(t5.id) ?? t5);
}
var PAIR_START = "padding-inline-end: 6px";
var PAIR_END = "padding-inline-start: 6px";
var ErpTablesCanvas = class extends i3 {
  constructor() {
    super(...arguments);
    this.zones = [];
    this.tables = [];
    this.activeZone = "";
    this.newZoneName = "";
    this.newTableNumber = "";
    this.error = "";
    this.loading = true;
    /** pm#459: every «edit zone» takes a number; a reply that is no longer the last opening is dropped. */
    this.zoneEditSeq = 0;
    this.saving = false;
    this.addOpen = false;
    this.waitersById = /* @__PURE__ */ new Map();
    /** Reloj inyectable (los tests lo clavan): lo lee el «lleva N min sentada». */
    this.now = () => /* @__PURE__ */ new Date();
    this.dragDX = 0;
    this.dragDY = 0;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.dragMoved = false;
    // Re-render al cambiar el idioma del shell (ADR-0055): los textos del template (legend, sheets,
    // tooltips…) se re-evalúan con el nuevo `erplora.locale`.
    this.onLocaleChange = () => this.requestUpdate();
    /** Fades each edge of the zone strip that has zones behind it. The classes go straight on the
     *  element (no Lit class binding): a bound `class` would wipe the ones Ionic sets on its host. */
    this.updateZoneCue = () => {
      const seg = this.renderRoot.querySelector('[data-testid="tables-floor-zones"]');
      if (!seg) return;
      const hidden = seg.scrollWidth - seg.clientWidth;
      const rtl = getComputedStyle(seg).direction === "rtl";
      const left = rtl ? hidden + seg.scrollLeft : seg.scrollLeft;
      seg.classList.toggle("more-left", left > 1);
      seg.classList.toggle("more-right", left < hidden - 1);
    };
  }
  static {
    this.styles = i`
    :host { display:block; font-family: system-ui, sans-serif; color: var(--ion-text-color,#1c1b18); }
    /* tables#16: every own control is a touch target (44px), like the ok-data-table actions. */
    ion-button { min-height:44px; --min-height:44px; }
    /* tables#64: la ÚNICA fila de cabecera — navegación (zonas) + las dos acciones de
       configuración, en iconos. A 390 px el plano empieza justo debajo. */
    .zonebar { display:flex; gap:.25rem; align-items:center; margin-bottom:.4rem; }
    .zonebar ion-segment { flex:1; min-width:0; }
    /* tables#97: on a phone the strip scrolls sideways, and a hard cut at the edge read as «there
       are no more zones». Each edge with zones behind it fades out, like any scrollable tab strip;
       updateZoneCue() sets the classes from the strip's own scroll position. */
    .zonebar ion-segment.more-right {
      -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 2.5rem), transparent);
      mask-image: linear-gradient(to right, #000 calc(100% - 2.5rem), transparent); }
    .zonebar ion-segment.more-left {
      -webkit-mask-image: linear-gradient(to left, #000 calc(100% - 2.5rem), transparent);
      mask-image: linear-gradient(to left, #000 calc(100% - 2.5rem), transparent); }
    .zonebar ion-segment.more-left.more-right {
      -webkit-mask-image: linear-gradient(to right, transparent, #000 2.5rem, #000 calc(100% - 2.5rem), transparent);
      mask-image: linear-gradient(to right, transparent, #000 2.5rem, #000 calc(100% - 2.5rem), transparent); }
    .zonebar .flex { flex:1; }
    /* tables#97: only a TABLE owns the touch gesture (touch-action:none on .mesa, so it drags). The
       empty plan lets a vertical swipe scroll the page: on a phone the plan fills the screen, and
       with touch-action:none everywhere the help line under it could never be scrolled into view. */
    .canvas { position:relative; height:60vh; min-height:22rem; border:1px dashed var(--ion-border-color,#cfcabd); border-radius: var(--ok-radius, 14px); background:
        repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(0,0,0,.04) 40px),
        repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(0,0,0,.04) 40px);
      overflow:hidden; touch-action:pan-y; }
    /* tables#53: el TAMAÑO ya no se clava aquí — lo pinta cada mesa con el suyo (estilo inline),
       porque la fila lo trae y tables.tables.move lo persiste. Se deja como respaldo para una
       mesa que no lo declare. */
    .mesa { position:absolute; width:${BOX}px; height:${BOX}px; border:2px solid; border-radius: var(--ok-radius, 12px);
      display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:grab;
      background:var(--ion-background-color,#fff); user-select:none; box-shadow:0 1px 4px rgba(0,0,0,.12);
      touch-action:none; }
    .mesa.round { border-radius: var(--ok-radius-pill, 50%); }
    .mesa.dragging { cursor:grabbing; opacity:.85; box-shadow:0 6px 18px rgba(0,0,0,.28); z-index:5; }
    /* Keyboard focus is visible: the table is a button (tables#16). */
    .mesa:focus-visible { outline:3px solid var(--ion-color-primary,#0091ce); outline-offset:2px; }
    /* La baldosa por defecto son 72 px: cada línea se acota al ancho o se corta a media palabra
       (medido en navegador a 390 px). Nada de text-transform:uppercase en el estado — ensancha
       ~15 % y «DISPONIBLE» dejaba de caber. */
    .mesa { padding:.1rem .15rem; overflow:hidden; line-height:1.12; text-align:center; }
    .mesa > * { max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .mesa .n { font-weight:700; font-size:1rem; }
    .mesa .c { font-size:.56rem; color:#8b897f; }
    /* tables#74: quién atiende la mesa ocupada. Nombre, nunca el id. */
    .mesa .w { font-size:.56rem; font-weight:600; }
    /* tables#64: el estado ESCRITO + su icono. El color se conserva, pero ya no está solo. */
    .mesa .s { display:inline-flex; align-items:center; justify-content:center; gap:.12rem;
      font-size:.55rem; font-weight:700; }
    .mesa .s ion-icon { font-size:.7rem; flex:none; }
    /* Nombre y hora de la reserva. Es lo que convierte el color ambar en informacion util:
       sin esto el encargado ve «reservada» y no sabe si le da tiempo a sentar a alguien. */
    .mesa .hold { font-size:.62rem; color:var(--ion-color-warning,#f08c00); font-weight:600;
      max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .hint { color:#8b897f; font-size:.85rem; margin:.5rem 0 0; }
    .err { color:#d9480f; font-weight:600; }
    .empty { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:#8b897f; text-align:center; padding:1rem; }
  `;
  }
  async connectedCallback() {
    super.connectedCallback();
    window.addEventListener("erplora:locale-changed", this.onLocaleChange);
    await this.reload();
    try {
      const offs = [
        erplora().on?.("tables.table.created", () => this.reload()),
        erplora().on?.("tables.table.updated", () => this.reload()),
        erplora().on?.("tables.table.deleted", () => this.reload()),
        erplora().on?.("tables.zone.created", () => this.reload()),
        erplora().on?.("tables.zone.updated", () => this.reload()),
        erplora().on?.("tables.zone.deleted", () => this.reload())
      ].filter(Boolean);
      this.unsub = () => offs.forEach((o7) => o7());
    } catch {
    }
    this.timer = setInterval(() => this.requestUpdate(), REFRESH_MS);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("erplora:locale-changed", this.onLocaleChange);
    this.unsub?.();
    if (this.timer) clearInterval(this.timer);
    this.unwatchZoneStrip();
  }
  watchZoneStrip() {
    const seg = this.renderRoot.querySelector('[data-testid="tables-floor-zones"]');
    if (seg !== this.observedStrip || this.zones !== this.observedZones) {
      this.unwatchZoneStrip();
      if (seg && typeof ResizeObserver !== "undefined") {
        this.stripObserver = new ResizeObserver(this.updateZoneCue);
        this.stripObserver.observe(seg);
        seg.querySelectorAll("ion-segment-button").forEach((b3) => this.stripObserver?.observe(b3));
        this.observedStrip = seg;
        this.observedZones = this.zones;
      }
    }
  }
  unwatchZoneStrip() {
    this.stripObserver?.disconnect();
    this.stripObserver = void 0;
    this.observedStrip = void 0;
    this.observedZones = void 0;
  }
  updated() {
    this.watchZoneStrip();
  }
  async reload() {
    this.loading = true;
    try {
      const [z2, t5, people] = await Promise.all([
        erplora().queryAll("tables.zones.list", { sort: "sort_order", dir: "asc" }).catch(() => []),
        erplora().queryAll("tables.tables.list", { sort: "number_sort", dir: "asc" }).catch(() => []),
        // tables#74: the people behind `live_waiter_id`. Same door the KDS card and the printed
        // chit use (`hub.users.list`, ADR-0192) and the same policy on failure — no permission, no
        // SDK, an id the hub no longer lists: the plan paints, the tile just says nothing.
        erplora().query("hub.users.list").catch(() => [])
      ]);
      this.zones = rows(z2);
      this.waitersById = new Map(
        rows(people).filter((u5) => u5 && u5.id && String(u5.name ?? "").trim()).map((u5) => [String(u5.id), String(u5.name).trim()])
      );
      this.tables = autoLayoutTables(sortNaturallyBy(rows(t5), (m4) => m4.number, erplora().locale).map((m4) => ({
        ...m4,
        capacity: Number(m4.capacity) || 1,
        is_active: Number(m4.is_active),
        position_x: Number(m4.position_x) || 0,
        position_y: Number(m4.position_y) || 0,
        // tables#57: the box is kept AS THE ROW HAS IT. Defaulting it to `BOX` here erased the only
        // thing that tells a placed table from a seeded one, and every table looked placed — the
        // fallback for painting is `boxOf()`, which already substitutes `BOX` at the last moment.
        width: Number(m4.width) || 0,
        height: Number(m4.height) || 0
      })));
      if (!this.activeZone || !this.zones.some((zo) => zo.id === this.activeZone)) {
        this.activeZone = this.zones[0]?.id ?? "";
      }
    } catch (e5) {
      this.error = domainMessage(e5, erplora().locale, erplora().t(CATALOG, "ui.errLoadFloorPlan"));
    } finally {
      this.loading = false;
    }
  }
  get tablesInZone() {
    if (!this.activeZone) return this.tables;
    return this.tables.filter((t5) => t5.zone_id === this.activeZone);
  }
  get activeZoneObj() {
    return this.zones.find((z2) => z2.id === this.activeZone);
  }
  canvasEl() {
    return this.renderRoot.querySelector(".canvas");
  }
  // ── Drag + clic-para-editar (pointer events) ────────────────────────────────────────────────
  onPointerDown(t5, e5) {
    const canvas = this.canvasEl();
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    this.dragId = t5.id;
    this.dragDX = e5.clientX - rect.left - t5.position_x;
    this.dragDY = e5.clientY - rect.top - t5.position_y;
    this.dragStartX = e5.clientX;
    this.dragStartY = e5.clientY;
    this.dragMoved = false;
    e5.target.setPointerCapture?.(e5.pointerId);
    e5.preventDefault();
  }
  onPointerMove(e5) {
    if (!this.dragId) return;
    if (Math.abs(e5.clientX - this.dragStartX) > DRAG_THRESHOLD || Math.abs(e5.clientY - this.dragStartY) > DRAG_THRESHOLD) {
      this.dragMoved = true;
    }
    const canvas = this.canvasEl();
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dragged = this.tables.find((t5) => t5.id === this.dragId);
    const box = dragged ? boxOf(dragged) : { w: BOX, h: BOX };
    const maxX = Math.max(0, rect.width - box.w);
    const maxY = Math.max(0, rect.height - box.h);
    const x2 = Math.min(maxX, Math.max(0, e5.clientX - rect.left - this.dragDX));
    const y3 = Math.min(maxY, Math.max(0, e5.clientY - rect.top - this.dragDY));
    this.tables = this.tables.map((t5) => t5.id === this.dragId ? { ...t5, position_x: x2, position_y: y3 } : t5);
  }
  async onPointerUp() {
    const id = this.dragId;
    this.dragId = void 0;
    if (!id) return;
    const t5 = this.tables.find((m4) => m4.id === id);
    if (!t5) return;
    if (!this.dragMoved) {
      this.error = "";
      this.edit = { ...t5 };
      return;
    }
    try {
      await erplora().command("tables.tables.move", {
        table_id: t5.id,
        position_x: Math.round(t5.position_x),
        position_y: Math.round(t5.position_y),
        width: boxOf(t5).w,
        height: boxOf(t5).h
      });
    } catch (e5) {
      this.error = domainMessage(e5, erplora().locale, erplora().t(CATALOG, "ui.errSavePosition"));
    }
  }
  // ── Keyboard (tables#16): Enter/Space edits, arrows move (persisted like a drag) ─────────────
  async onTableKey(t5, e5) {
    if (e5.key === "Enter" || e5.key === " ") {
      e5.preventDefault();
      this.error = "";
      this.edit = { ...t5 };
      return;
    }
    const step = e5.shiftKey ? KEY_STEP * 4 : KEY_STEP;
    const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const d3 = delta[e5.key];
    if (!d3) return;
    e5.preventDefault();
    const rect = this.canvasEl()?.getBoundingClientRect();
    const box = boxOf(t5);
    const maxX = rect && rect.width > 0 ? Math.max(0, rect.width - box.w) : Number.POSITIVE_INFINITY;
    const maxY = rect && rect.height > 0 ? Math.max(0, rect.height - box.h) : Number.POSITIVE_INFINITY;
    const x2 = Math.round(Math.min(maxX, Math.max(0, t5.position_x + d3[0])));
    const y3 = Math.round(Math.min(maxY, Math.max(0, t5.position_y + d3[1])));
    this.tables = this.tables.map((m4) => m4.id === t5.id ? { ...m4, position_x: x2, position_y: y3 } : m4);
    try {
      await erplora().command("tables.tables.move", { table_id: t5.id, position_x: x2, position_y: y3, width: boxOf(t5).w, height: boxOf(t5).h });
    } catch (err) {
      this.error = err instanceof Error ? err.message : erplora().t(CATALOG, "ui.errSavePosition");
    }
  }
  /**
   * tables#74 — the NAME of whoever is serving this table, or '' when there is none to show.
   *
   * '' covers four cases on purpose and all of them paint the same nothing: the table is free, the
   * check carries no waiter (opened before tables#70), the hub does not list that id any more
   * (someone who left the shift), or the list could not be loaded. A raw UUID on a floor plan read
   * from across the room would be worse than a blank — nobody can act on it.
   */
  waiterName(tb) {
    if (tb.status !== "occupied" || !tb.live_waiter_id) return "";
    return this.waitersById.get(String(tb.live_waiter_id)) ?? "";
  }
  /**
   * tables#64 — what an OCCUPIED table says instead of its capacity: the party seated and how long
   * it has been sitting (Square paints the very same two on its floor plan). '' when the table is
   * not serving.
   *
   * Two wordings on purpose. The tile is 72 px wide, and «3 comensales · 35 min» does not fit — it
   * came out clipped mid-word in a real browser at 390 px, which is worse than not painting it. So
   * the TILE says «3 pax · 35 min», the same unit the capacity already uses right there, and the
   * accessible name (and the tooltip) keeps the unambiguous «3 comensales», where there is room.
   */
  liveLine(tb, t5, compact = false) {
    if (tb.status !== "occupied") return "";
    const seated = Number(tb.live_guests) || 0;
    if (!seated) return "";
    const minutes = minutesSince(tb.live_since, this.now());
    return [
      t5(compact ? "ui.paxCount" : "ui.liveGuests", { count: seated }),
      minutes == null ? "" : t5("ui.durationMinutes", { minutes })
    ].filter(Boolean).join(" \xB7 ");
  }
  /** Accessible name of a table tile: «nº · zone · capacity · status» (+ party, waiter, hold). */
  tableName(tb, t5) {
    const zone = this.zones.find((z2) => z2.id === tb.zone_id)?.name;
    const waiter = this.waiterName(tb);
    const holder = holdName(tb, t5("ui.erasedCustomer"));
    return [
      t5("ui.tableLabel", { number: tb.number }),
      zone,
      t5("ui.paxCount", { count: tb.capacity }),
      STATUS_KEY[tb.status] ? t5(STATUS_KEY[tb.status]) : tb.status,
      this.liveLine(tb, t5),
      waiter ? t5("ui.servedBy", { name: waiter }) : "",
      holder ? t5("ui.reservedFor", { name: holder }) : ""
    ].filter(Boolean).join(" \xB7 ");
  }
  /** Primera celda de la rejilla de esta zona que no tapa a ninguna mesa ya colocada. */
  freeSpotInZone() {
    const taken = this.tablesInZone;
    for (let i7 = 0; ; i7++) {
      const candidate = {
        id: "",
        position_x: AUTO_GAP + i7 % AUTO_COLS * AUTO_CELL,
        position_y: AUTO_GAP + Math.floor(i7 / AUTO_COLS) * AUTO_CELL,
        width: BOX,
        height: BOX
      };
      if (!taken.some((t5) => seTapan(t5, candidate))) return { x: candidate.position_x, y: candidate.position_y };
    }
  }
  /** tables#83 (review of tables#85) — the sheets are a modal over the whole view, so a
   *  message painted underneath is a message nobody reads: the refusal of a taken number sat
   *  dimmed behind the overlay while the sheet stayed open as if nothing had happened. The ONE
   *  error slot follows the person: inside the open sheet, in the view when none is open. */
  get sheetOpen() {
    return this.addOpen || !!this.edit || !!this.zoneEdit;
  }
  renderError(inSheet = false) {
    return this.error ? b2`<ok-inline-feedback data-testid="tables-floor-error" class=${inSheet ? "ion-margin-bottom" : ""} tone="danger" icon="alert-circle-outline">${this.error}</ok-inline-feedback>` : A;
  }
  // ── Altas ───────────────────────────────────────────────────────────────────────────────────
  /** tables#83 — a number identifies a table to whoever carries the plates, so a zone cannot hand
   *  the same one out twice. Nothing in the database forbids it (there is no UNIQUE on
   *  `tables_table.number`), so the doors that WRITE a number are the ones that have to refuse:
   *  the «Add» sheet and the rename of «Edit table». Case- and space-insensitive, because «m1» and
   *  «M1 » are the same table on the floor. `exceptId` lets a table keep its own number. */
  numberTaken(number, zoneId, exceptId) {
    const norm = (v3) => String(v3 ?? "").trim().toLocaleLowerCase();
    const zone = (v3) => String(v3 ?? "").trim() || null;
    const wanted = norm(number);
    return this.tables.some((t5) => t5.id !== exceptId && zone(t5.zone_id) === zone(zoneId) && norm(t5.number) === wanted);
  }
  /** tables#83 — the running number is a DEFAULT, and it has to be FREE.
   *  Counting the tables and adding one lands on a number that is already on the plan as soon as
   *  one has been deleted (tables «1» and «3» → «3» again), and the floor shows two tiles reading
   *  the same thing. Nothing in the database forbids it, so the door that hands out the default
   *  is the one that has to skip what is taken. */
  nextTableNumber() {
    const taken = new Set(this.tablesInZone.map((t5) => String(t5.number).trim()));
    let n6 = this.tablesInZone.length + 1;
    while (taken.has(String(n6))) n6++;
    return String(n6);
  }
  async addTable() {
    this.error = "";
    const number = this.newTableNumber.trim() || this.nextTableNumber();
    if (this.numberTaken(number, this.activeZone || null)) {
      this.error = erplora().t(CATALOG, "ui.errTableNumberTaken");
      return;
    }
    const spot = this.freeSpotInZone();
    try {
      await erplora().command("tables.tables.create", {
        zone_id: this.activeZone || null,
        number,
        name: "",
        capacity: 4,
        position_x: spot.x,
        position_y: spot.y,
        width: BOX,
        height: BOX,
        shape: "square"
      });
      this.newTableNumber = "";
      this.addOpen = false;
      await this.reload();
    } catch (e5) {
      this.error = domainMessage(e5, erplora().locale, erplora().t(CATALOG, "ui.errCreateTable"));
    }
  }
  async addZone() {
    const name = this.newZoneName.trim();
    if (!name) return;
    this.error = "";
    try {
      await erplora().command("tables.zones.create", {
        name,
        description: "",
        color: "primary",
        sort_order: this.zones.length
      });
      this.newZoneName = "";
      this.addOpen = false;
      await this.reload();
      const created = this.zones.find((z2) => z2.name === name);
      if (created) this.activeZone = created.id;
    } catch (e5) {
      this.error = domainMessage(e5, erplora().locale, erplora().t(CATALOG, "ui.errCreateZone"));
    }
  }
  // ── Edición / borrado de mesa ────────────────────────────────────────────────────────────────
  patchEdit(p4) {
    if (this.edit) this.edit = { ...this.edit, ...p4 };
  }
  async saveTable() {
    if (!this.edit) return;
    const t5 = this.edit;
    if (!String(t5.number).trim()) {
      this.error = erplora().t(CATALOG, "ui.errTableNumberRequired");
      return;
    }
    if (this.numberTaken(String(t5.number), t5.zone_id ?? null, t5.id)) {
      this.error = erplora().t(CATALOG, "ui.errTableNumberTaken");
      return;
    }
    this.saving = true;
    this.error = "";
    try {
      await erplora().command("tables.tables.update", {
        table_id: t5.id,
        number: String(t5.number).trim(),
        name: t5.name ?? "",
        capacity: Math.max(1, Number(t5.capacity) || 1),
        zone_id: t5.zone_id ?? null,
        shape: t5.shape,
        status: t5.status,
        is_active: Number(t5.is_active) ? 1 : 0
      });
      this.edit = void 0;
      await this.reload();
    } catch (e5) {
      this.error = domainMessage(e5, erplora().locale, erplora().t(CATALOG, "ui.errSaveTable"));
    } finally {
      this.saving = false;
    }
  }
  async deleteTable() {
    if (!this.edit) return;
    this.saving = true;
    this.error = "";
    try {
      await erplora().command("tables.tables.delete", { table_id: this.edit.id });
      this.edit = void 0;
      await this.reload();
    } catch (e5) {
      this.error = domainMessage(e5, erplora().locale, erplora().t(CATALOG, "ui.errDeleteTable"));
    } finally {
      this.saving = false;
    }
  }
  // ── Edición / borrado de zona ────────────────────────────────────────────────────────────────
  async openZoneEdit() {
    const z2 = this.activeZoneObj;
    if (!z2) return;
    this.error = "";
    const seq = ++this.zoneEditSeq;
    const movedOn = () => seq !== this.zoneEditSeq || this.activeZone !== z2.id || this.addOpen || !!this.edit;
    try {
      const full = await erplora().query("tables.zones.get", { zone_id: z2.id });
      if (movedOn()) return;
      const zo = Array.isArray(full) ? full[0] : full;
      this.zoneEdit = { ...z2, ...zo || {} };
    } catch {
      if (movedOn()) return;
      this.zoneEdit = { ...z2 };
    }
  }
  async saveZone() {
    if (!this.zoneEdit) return;
    const z2 = this.zoneEdit;
    if (!z2.name.trim()) {
      this.error = erplora().t(CATALOG, "ui.errZoneNameRequired");
      return;
    }
    this.saving = true;
    this.error = "";
    try {
      await erplora().command("tables.zones.update", {
        zone_id: z2.id,
        name: z2.name.trim(),
        description: z2.description ?? "",
        color: z2.color ?? "primary",
        sort_order: Number(z2.sort_order) || 0,
        is_active: Number(z2.is_active) ? 1 : 0
      });
      this.zoneEdit = void 0;
      await this.reload();
    } catch (e5) {
      this.error = domainMessage(e5, erplora().locale, erplora().t(CATALOG, "ui.errSaveZone"));
    } finally {
      this.saving = false;
    }
  }
  async deleteZone() {
    if (!this.zoneEdit) return;
    this.saving = true;
    this.error = "";
    try {
      await erplora().command("tables.zones.delete", { zone_id: this.zoneEdit.id });
      this.zoneEdit = void 0;
      this.activeZone = "";
      await this.reload();
    } catch (e5) {
      this.error = domainMessage(e5, erplora().locale, erplora().t(CATALOG, "ui.errDeleteZone"));
    } finally {
      this.saving = false;
    }
  }
  render() {
    const t5 = (k2, params) => erplora().t(CATALOG, k2, params);
    return b2`
      <!-- tables#64 — at 390 px there used to be ~340 px of chrome before the first table: the view
           title (the shell topbar already paints it), a stray «Zone» input with «Add zone», «Add
           table», the zone segment and the colour legend, each on its own row. What is left is
           navigation: the zone segment, and behind two icon buttons everything that is
           configuration — the same shape Square gives its mobile floor plan. The legend is gone
           because the status is now written on every tile. -->
      <div class="zonebar">
        ${this.zones.length ? b2`<ion-segment data-testid="tables-floor-zones" scrollable value=${this.activeZone}
              @scroll=${this.updateZoneCue}
              @ionChange=${(e5) => {
      this.activeZone = e5.detail.value;
    }}>
              ${this.zones.map((z2) => b2`<ion-segment-button data-testid=${`tables-floor-zone-tab-${z2.id}`} value=${z2.id}><ion-label>${z2.name}</ion-label></ion-segment-button>`)}
            </ion-segment>` : b2`<span class="flex"></span>`}
        <ion-button data-testid="tables-floor-add" fill="clear" aria-label=${t5("ui.addAction")} title=${t5("ui.addAction")}
          @click=${() => {
      this.error = "";
      this.addOpen = true;
    }}><ion-icon slot="icon-only" name="add-outline"></ion-icon></ion-button>
        <ion-button data-testid="tables-floor-zone-edit" fill="clear" aria-label=${t5("ui.editZone")} title=${t5("ui.editZone")}
          ?disabled=${!this.activeZoneObj} @click=${() => this.openZoneEdit()}><ion-icon slot="icon-only" name="create-outline"></ion-icon></ion-button>
      </div>

      ${this.sheetOpen ? A : this.renderError()}

      <div class="canvas"
        @pointermove=${(e5) => this.onPointerMove(e5)}
        @pointerup=${() => this.onPointerUp()}
        @pointercancel=${() => this.onPointerUp()}>
        ${this.tablesInZone.map((tb) => {
      const statusLabel = STATUS_KEY[tb.status] ? t5(STATUS_KEY[tb.status]) : tb.status;
      const live = this.liveLine(tb, t5, true);
      const waiter = this.waiterName(tb);
      const holder = holdName(tb, t5("ui.erasedCustomer"));
      return b2`
          <div class=${`mesa ${tb.shape === "round" ? "round" : ""} ${tb.id === this.dragId && this.dragMoved ? "dragging" : ""}`}
            data-testid=${`tables-floor-tile-${tb.id}`}
            role="button" tabindex="0"
            aria-label=${this.tableName(tb, t5)}
            @keydown=${(e5) => this.onTableKey(tb, e5)}
            style=${`left:${tb.position_x}px; top:${tb.position_y}px; width:${boxOf(tb).w}px; height:${boxOf(tb).h}px; border-color:${STATUS_COLOR[tb.status] ?? "#d9d6cf"}`}
            title=${[
        t5("ui.tableTooltip", { status: statusLabel, count: tb.capacity }),
        live,
        waiter ? t5("ui.servedBy", { name: waiter }) : "",
        holder ? `${t5("ui.reservedFor", { name: holder })} ${[hhmm(tb.reserved_from), hhmm(tb.reserved_until)].filter(Boolean).join("\u2013")}`.trim() : ""
      ].filter(Boolean).join(" \xB7 ")}
            @pointerdown=${(e5) => this.onPointerDown(tb, e5)}>
            <div class="n">${tb.number}</div>
            <div class="c">${live || t5("ui.paxCount", { count: tb.capacity })}</div>
            ${waiter ? b2`<div class="w">${waiter}</div>` : A}
            ${holder ? b2`<div class="hold">${holder}${tb.reserved_from ? ` \xB7 ${hhmm(tb.reserved_from)}` : ""}</div>` : A}
            <div class="s" style=${`color:${STATUS_COLOR[tb.status] ?? "#868e96"}`}>
              <ion-icon name=${STATUS_ICON[tb.status]?.icon ?? "help-circle-outline"} aria-hidden="true"></ion-icon>${statusLabel}
            </div>
          </div>`;
    })}
        ${!this.loading && !this.zones.length ? b2`<ok-empty-state data-testid="tables-floor-empty-zones" icon="grid-outline" message=${t5("ui.createZoneToStart")}></ok-empty-state>` : A}
        ${!this.loading && this.zones.length && !this.tablesInZone.length ? b2`<ok-empty-state data-testid="tables-floor-empty-tables" icon="square-outline" message=${t5("ui.noTablesInZonePrompt")}></ok-empty-state>` : A}
        ${this.loading ? b2`<div class="empty" data-testid="tables-floor-loading">${t5("ui.loading")}</div>` : A}
      </div>
      <p class="hint">${t5("ui.canvasHint")}</p>

      <!-- tables#107 — the three sheets are the hub's standard window. The shell reparents an open
           ion-modal to ion-app: it covers the whole screen (side menu and module tab bar included)
           and is centred on it, which a position:fixed layer inside this shadow root never was
           (an ancestor with transform/contain makes it relative to its own box). What moves with
           the modal leaves this shadow root, so the sheets use Ionic's layout only: no class of
           the static styles below reaches them. Each sheet sits in its own .ion-page: presenting,
           Ionic MOVES the modal's children into a wrapper of its own, and a sheet moved away from
           Lit's markers is never removed — the next table tapped opened under the previous one. -->
      <ion-modal data-testid="tables-floor-add-modal" .isOpen=${this.addOpen}
        @ionModalDidDismiss=${(e5) => {
      if (e5.target === e5.currentTarget) this.addOpen = false;
    }}>
        <div class="ion-page">${this.addOpen ? this.renderAddSheet() : A}</div>
      </ion-modal>
      <ion-modal data-testid="tables-floor-table-modal" .isOpen=${!!this.edit}
        @ionModalDidDismiss=${(e5) => {
      if (e5.target === e5.currentTarget) this.edit = void 0;
    }}>
        <div class="ion-page">${this.edit ? this.renderTableSheet(this.edit) : A}</div>
      </ion-modal>
      <ion-modal data-testid="tables-floor-zone-modal" .isOpen=${!!this.zoneEdit}
        @ionModalDidDismiss=${(e5) => {
      if (e5.target === e5.currentTarget) this.zoneEdit = void 0;
    }}>
        <div class="ion-page">${this.zoneEdit ? this.renderZoneSheet(this.zoneEdit) : A}</div>
      </ion-modal>
    `;
  }
  /** The title bar of a sheet: its name and its close control (an icon with an accessible name,
   *  written by each sheet so its data-testid stays a literal the QA suite can find — tables#86). */
  renderSheetHeader(title, close) {
    return b2`<ion-header class="ion-no-border"><ion-toolbar>
      <ion-title>${title}</ion-title>
      <ion-buttons slot="end">${close}</ion-buttons>
    </ion-toolbar></ion-header>`;
  }
  /** tables#64 — the two configuration actions, out of the service header and behind the «+».
   *  tables#83 — each action owns its field, so no control can promise something another button
   *  will discard. */
  renderAddSheet() {
    const t5 = (k2, params) => erplora().t(CATALOG, k2, params);
    return b2`${this.renderSheetHeader(t5("ui.addTitle"), b2`<ion-button data-testid="tables-floor-add-close" aria-label=${t5("ui.close")} title=${t5("ui.close")}
        @click=${() => {
      this.addOpen = false;
    }}><ion-icon slot="icon-only" name="close-outline"></ion-icon></ion-button>`)}
      <ion-content class="ion-padding" data-testid="tables-floor-add-sheet">
        ${this.renderError(true)}
        <ion-row>
          <ion-col size="12">
            <ion-input data-testid="tables-floor-new-zone-name" mode="md" fill="outline" label-placement="floating" label=${t5("ui.colZone")} placeholder=${t5("ui.newZonePlaceholder")} .value=${this.newZoneName}
              @ionInput=${(e5) => {
      this.newZoneName = e5.target.value || "";
    }}></ion-input>
          </ion-col>
        </ion-row>
        <ion-row class="ion-justify-content-end ion-margin-top">
          <ion-button data-testid="tables-floor-new-zone-submit" fill="outline" ?disabled=${this.saving || !this.newZoneName.trim()} @click=${() => this.addZone()}>${t5("ui.addZone")}</ion-button>
        </ion-row>
        <ion-row class="ion-margin-top ion-padding-top">
          <ion-col size="12">
            <ion-input data-testid="tables-floor-new-table-number" mode="md" fill="outline" label-placement="floating" label=${t5("ui.fieldTableNumber")} placeholder=${t5("ui.autoNumberPlaceholder")} .value=${this.newTableNumber}
              @ionInput=${(e5) => {
      this.newTableNumber = e5.target.value || "";
    }}></ion-input>
          </ion-col>
        </ion-row>
        <ion-row class="ion-justify-content-end ion-margin-top">
          <ion-button data-testid="tables-floor-new-table-submit" ?disabled=${this.saving || !this.zones.length} @click=${() => this.addTable()}>${t5("ui.addTable")}</ion-button>
        </ion-row>
      </ion-content>`;
  }
  renderTableSheet(table) {
    const t5 = (k2, params) => erplora().t(CATALOG, k2, params);
    return b2`${this.renderSheetHeader(t5("ui.editTable"), b2`<ion-button data-testid="tables-floor-table-close" aria-label=${t5("ui.close")} title=${t5("ui.close")}
        @click=${() => {
      this.edit = void 0;
    }}><ion-icon slot="icon-only" name="close-outline"></ion-icon></ion-button>`)}
      <ion-content class="ion-padding" data-testid="tables-floor-table-sheet">
        ${this.renderError(true)}
        <ion-row class="ion-margin-bottom">
          <ion-col size="6" style=${PAIR_START}>
            <ion-input data-testid="tables-floor-table-number" mode="md" fill="outline" label-placement="floating" label=${t5("ui.fieldNumber")} .value=${table.number} @ionInput=${(e5) => this.patchEdit({ number: e5.target.value || "" })}></ion-input>
          </ion-col>
          <ion-col size="6" style=${PAIR_END}>
            <ion-input data-testid="tables-floor-table-capacity" mode="md" fill="outline" label-placement="floating" label=${t5("ui.fieldCapacity")} type="number" min="1" .value=${String(table.capacity)} @ionInput=${(e5) => this.patchEdit({ capacity: Number(e5.target.value) || 1 })}></ion-input>
          </ion-col>
        </ion-row>
        <ion-row class="ion-margin-bottom">
          <ion-col size="12">
            <ion-input data-testid="tables-floor-table-name" mode="md" fill="outline" label-placement="floating" label=${t5("ui.fieldNameOptional")} .value=${table.name} @ionInput=${(e5) => this.patchEdit({ name: e5.target.value || "" })}></ion-input>
          </ion-col>
        </ion-row>
        <ion-row class="ion-margin-bottom">
          <ion-col size="6" style=${PAIR_START}>
            <ion-select data-testid="tables-floor-table-shape" mode="md" fill="outline" label-placement="floating" label=${t5("ui.fieldShape")} .value=${table.shape} interface="popover" @ionChange=${(e5) => this.patchEdit({ shape: e5.detail.value })}>
              ${SHAPES.map((sh) => b2`<ion-select-option value=${sh}>${t5(SHAPE_KEY[sh] ?? sh)}</ion-select-option>`)}
            </ion-select>
          </ion-col>
          <ion-col size="6" style=${PAIR_END}>
            <ion-select data-testid="tables-floor-table-status" mode="md" fill="outline" label-placement="floating" label=${t5("ui.fieldStatus")} .value=${table.status} interface="popover" @ionChange=${(e5) => this.patchEdit({ status: e5.detail.value })}>
              ${STATUSES.map((st) => b2`<ion-select-option value=${st}>${t5(STATUS_KEY[st] ?? st)}</ion-select-option>`)}
            </ion-select>
          </ion-col>
        </ion-row>
        <ion-row>
          <ion-col size="12">
            <ion-select data-testid="tables-floor-table-zone" mode="md" fill="outline" label-placement="floating" label=${t5("ui.fieldZone")} .value=${table.zone_id ?? ""} interface="popover" @ionChange=${(e5) => this.patchEdit({ zone_id: e5.detail.value || null })}>
              <ion-select-option value="">${t5("ui.noZone")}</ion-select-option>
              ${this.zones.map((z2) => b2`<ion-select-option value=${z2.id}>${z2.name}</ion-select-option>`)}
            </ion-select>
          </ion-col>
        </ion-row>
      </ion-content>
      ${this.renderSheetFoot(
      b2`<ion-button data-testid="tables-floor-table-delete" fill="outline" style=${ionTone("outline", "danger")} ?disabled=${this.saving} @click=${() => this.deleteTable()}>${t5("ui.delete")}</ion-button>`,
      b2`<ion-button data-testid="tables-floor-table-save" fill="solid" ?disabled=${this.saving} @click=${() => this.saveTable()}>${this.saving ? t5("ui.saving") : t5("ui.save")}</ion-button>`
    )}`;
  }
  /** The foot of an edit sheet: the destructive action at the start, the save at the end — always
   *  on screen, however long the sheet (tables#88: SAVE must never fall off the visible box). */
  renderSheetFoot(destructive, save) {
    return b2`<ion-footer><ion-toolbar class="ion-padding-horizontal">
      <ion-row class="ion-justify-content-between">${destructive}${save}</ion-row>
    </ion-toolbar></ion-footer>`;
  }
  renderZoneSheet(z2) {
    const t5 = (k2, params) => erplora().t(CATALOG, k2, params);
    return b2`${this.renderSheetHeader(t5("ui.editZone"), b2`<ion-button data-testid="tables-floor-zone-close" aria-label=${t5("ui.close")} title=${t5("ui.close")}
        @click=${() => {
      this.zoneEdit = void 0;
    }}><ion-icon slot="icon-only" name="close-outline"></ion-icon></ion-button>`)}
      <ion-content class="ion-padding" data-testid="tables-floor-zone-sheet">
        ${this.renderError(true)}
        <ion-row class="ion-margin-bottom">
          <ion-col size="12">
            <ion-input data-testid="tables-floor-zone-name" mode="md" fill="outline" label-placement="floating" label=${t5("ui.colName")} .value=${z2.name} @ionInput=${(e5) => {
      this.zoneEdit = { ...z2, name: e5.target.value || "" };
    }}></ion-input>
          </ion-col>
        </ion-row>
        <ion-row>
          <ion-col size="12">
            <ion-input data-testid="tables-floor-zone-description" mode="md" fill="outline" label-placement="floating" label=${t5("ui.fieldDescriptionOptional")} .value=${z2.description ?? ""} @ionInput=${(e5) => {
      this.zoneEdit = { ...z2, description: e5.target.value || "" };
    }}></ion-input>
          </ion-col>
        </ion-row>
      </ion-content>
      ${this.renderSheetFoot(
      b2`<ion-button data-testid="tables-floor-zone-delete" fill="outline" style=${ionTone("outline", "danger")} ?disabled=${this.saving} @click=${() => this.deleteZone()}>${t5("ui.deleteZone")}</ion-button>`,
      b2`<ion-button data-testid="tables-floor-zone-save" fill="solid" ?disabled=${this.saving} @click=${() => this.saveZone()}>${this.saving ? t5("ui.saving") : t5("ui.save")}</ion-button>`
    )}`;
  }
};
__decorateClass([
  r5()
], ErpTablesCanvas.prototype, "zones", 2);
__decorateClass([
  r5()
], ErpTablesCanvas.prototype, "tables", 2);
__decorateClass([
  r5()
], ErpTablesCanvas.prototype, "activeZone", 2);
__decorateClass([
  r5()
], ErpTablesCanvas.prototype, "newZoneName", 2);
__decorateClass([
  r5()
], ErpTablesCanvas.prototype, "newTableNumber", 2);
__decorateClass([
  r5()
], ErpTablesCanvas.prototype, "error", 2);
__decorateClass([
  r5()
], ErpTablesCanvas.prototype, "loading", 2);
__decorateClass([
  r5()
], ErpTablesCanvas.prototype, "edit", 2);
__decorateClass([
  r5()
], ErpTablesCanvas.prototype, "zoneEdit", 2);
__decorateClass([
  r5()
], ErpTablesCanvas.prototype, "saving", 2);
__decorateClass([
  r5()
], ErpTablesCanvas.prototype, "addOpen", 2);
__decorateClass([
  r5()
], ErpTablesCanvas.prototype, "waitersById", 2);
define("erp-tables-canvas", ErpTablesCanvas);

// lit-html/directive.js
var t3 = { ATTRIBUTE: 1, CHILD: 2, PROPERTY: 3, BOOLEAN_ATTRIBUTE: 4, EVENT: 5, ELEMENT: 6 };
var e4 = (t5) => (...e5) => ({ _$litDirective$: t5, values: e5 });
var i4 = class {
  constructor(t5) {
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AT(t5, e5, i7) {
    this._$Ct = t5, this._$AM = e5, this._$Ci = i7;
  }
  _$AS(t5, e5) {
    return this.update(t5, e5);
  }
  update(t5, e5) {
    return this.render(...e5);
  }
};

// lit-html/directive-helpers.js
var { I: t4 } = j;
var i5 = (o7) => o7;
var s4 = () => document.createComment("");
var v2 = (o7, n6, e5) => {
  const l3 = o7._$AA.parentNode, d3 = void 0 === n6 ? o7._$AB : n6._$AA;
  if (void 0 === e5) {
    const i7 = l3.insertBefore(s4(), d3), n7 = l3.insertBefore(s4(), d3);
    e5 = new t4(i7, n7, o7, o7.options);
  } else {
    const t5 = e5._$AB.nextSibling, n7 = e5._$AM, c5 = n7 !== o7;
    if (c5) {
      let t6;
      e5._$AQ?.(o7), e5._$AM = o7, void 0 !== e5._$AP && (t6 = o7._$AU) !== n7._$AU && e5._$AP(t6);
    }
    if (t5 !== d3 || c5) {
      let o8 = e5._$AA;
      for (; o8 !== t5; ) {
        const t6 = i5(o8).nextSibling;
        i5(l3).insertBefore(o8, d3), o8 = t6;
      }
    }
  }
  return e5;
};
var u3 = (o7, t5, i7 = o7) => (o7._$AI(t5, i7), o7);
var m3 = {};
var p3 = (o7, t5 = m3) => o7._$AH = t5;
var M2 = (o7) => o7._$AH;
var h3 = (o7) => {
  o7._$AR(), o7._$AA.remove();
};

// lit-html/directives/repeat.js
var u4 = (e5, s5, t5) => {
  const r6 = /* @__PURE__ */ new Map();
  for (let l3 = s5; l3 <= t5; l3++) r6.set(e5[l3], l3);
  return r6;
};
var c4 = e4(class extends i4 {
  constructor(e5) {
    if (super(e5), e5.type !== t3.CHILD) throw Error("repeat() can only be used in text expressions");
  }
  dt(e5, s5, t5) {
    let r6;
    void 0 === t5 ? t5 = s5 : void 0 !== s5 && (r6 = s5);
    const l3 = [], o7 = [];
    let i7 = 0;
    for (const s6 of e5) l3[i7] = r6 ? r6(s6, i7) : i7, o7[i7] = t5(s6, i7), i7++;
    return { values: o7, keys: l3 };
  }
  render(e5, s5, t5) {
    return this.dt(e5, s5, t5).values;
  }
  update(s5, [t5, r6, c5]) {
    const d3 = M2(s5), { values: p4, keys: a3 } = this.dt(t5, r6, c5);
    if (!Array.isArray(d3)) return this.ut = a3, p4;
    const h4 = this.ut ??= [], v3 = [];
    let m4, y3, x2 = 0, j2 = d3.length - 1, k2 = 0, w2 = p4.length - 1;
    for (; x2 <= j2 && k2 <= w2; ) if (null === d3[x2]) x2++;
    else if (null === d3[j2]) j2--;
    else if (h4[x2] === a3[k2]) v3[k2] = u3(d3[x2], p4[k2]), x2++, k2++;
    else if (h4[j2] === a3[w2]) v3[w2] = u3(d3[j2], p4[w2]), j2--, w2--;
    else if (h4[x2] === a3[w2]) v3[w2] = u3(d3[x2], p4[w2]), v2(s5, v3[w2 + 1], d3[x2]), x2++, w2--;
    else if (h4[j2] === a3[k2]) v3[k2] = u3(d3[j2], p4[k2]), v2(s5, d3[x2], d3[j2]), j2--, k2++;
    else if (void 0 === m4 && (m4 = u4(a3, k2, w2), y3 = u4(h4, x2, j2)), m4.has(h4[x2])) if (m4.has(h4[j2])) {
      const e5 = y3.get(a3[k2]), t6 = void 0 !== e5 ? d3[e5] : null;
      if (null === t6) {
        const e6 = v2(s5, d3[x2]);
        u3(e6, p4[k2]), v3[k2] = e6;
      } else v3[k2] = u3(t6, p4[k2]), v2(s5, d3[x2], t6), d3[e5] = null;
      k2++;
    } else h3(d3[j2]), j2--;
    else h3(d3[x2]), x2++;
    for (; k2 <= w2; ) {
      const e5 = v2(s5, v3[w2 + 1]);
      u3(e5, p4[k2]), v3[k2++] = e5;
    }
    for (; x2 <= j2; ) {
      const e5 = d3[x2++];
      null !== e5 && h3(e5);
    }
    return this.ut = a3, p3(s5, v3), E;
  }
});

// lit-html/directives/style-map.js
var n5 = "important";
var i6 = " !" + n5;
var o6 = e4(class extends i4 {
  constructor(t5) {
    if (super(t5), t5.type !== t3.ATTRIBUTE || "style" !== t5.name || t5.strings?.length > 2) throw Error("The `styleMap` directive must be used in the `style` attribute and must be the only part in the attribute.");
  }
  render(t5) {
    return Object.keys(t5).reduce((e5, r6) => {
      const s5 = t5[r6];
      return null == s5 ? e5 : e5 + `${r6 = r6.includes("-") ? r6 : r6.replace(/(?:^(webkit|moz|ms|o)|)(?=[A-Z])/g, "-$&").toLowerCase()}:${s5};`;
    }, "");
  }
  update(e5, [r6]) {
    const { style: s5 } = e5.element;
    if (void 0 === this.ft) return this.ft = new Set(Object.keys(r6)), this.render(r6);
    for (const t5 of this.ft) null == r6[t5] && (this.ft.delete(t5), t5.includes("-") ? s5.removeProperty(t5) : s5[t5] = null);
    for (const t5 in r6) {
      const e6 = r6[t5];
      if (null != e6) {
        this.ft.add(t5);
        const r7 = "string" == typeof e6 && e6.endsWith(i6);
        t5.includes("-") || r7 ? s5.setProperty(t5, r7 ? e6.slice(0, -11) : e6, r7 ? n5 : "") : s5[t5] = e6;
      }
    }
    return E;
  }
});

// @erplora/outfitkit/dist/shared/anchor.js
function shadowAnchorEvent(ev) {
  const el = ev.currentTarget ?? ev.target;
  return new CustomEvent("ok-popover-anchor", { detail: { ionShadowTarget: el } });
}

// @erplora/outfitkit/dist/shared/ion-tone.js
var DEFAULT_HEX = {
  primary: "#0054e9",
  secondary: "#0163aa",
  tertiary: "#6030ff",
  success: "#2dd55b",
  warning: "#ffc409",
  danger: "#c5000f",
  light: "#f4f5f8",
  medium: "#636469",
  dark: "#222428"
};
var DEFAULT_CONTRAST = {
  primary: "#fff",
  secondary: "#fff",
  tertiary: "#fff",
  success: "#000",
  warning: "#000",
  danger: "#fff",
  light: "#000",
  medium: "#fff",
  dark: "#fff"
};
var TONE_NAME = /^[a-z][a-z0-9-]*$/;
function tokenChain(okName, ionName, hex) {
  return `var(--ok-${okName}, var(--ion-color-${ionName}${hex ? `, ${hex}` : ""}))`;
}
function ionTone2(tone, variant) {
  if (!tone || !TONE_NAME.test(tone)) return void 0;
  const value = tokenChain(tone, tone, DEFAULT_HEX[tone]);
  switch (variant) {
    case "text":
      return `color: ${value};`;
    case "clear":
      return `--color: ${value};`;
    case "outline":
      return `--color: ${value}; --border-color: ${value}; --background-activated: ${value}; --background-focused: ${value};`;
    case "solid": {
      const contrast = tokenChain(`${tone}-contrast`, `${tone}-contrast`, DEFAULT_CONTRAST[tone]);
      return `--background: ${value}; --color: ${contrast}; --background-hover: var(--ion-color-${tone}-tint, ${value}); --background-activated: var(--ion-color-${tone}-shade, ${value}); --background-focused: var(--ion-color-${tone}-shade, ${value});`;
    }
  }
}

// @erplora/outfitkit/dist/shared/searchbar-single-clear.js
function syncSearchbarInputName(root, name) {
  const bar = root?.querySelector("ion-searchbar");
  if (!bar) return;
  void customElements.whenDefined("ion-searchbar").then(() => bar.getInputElement?.()).then((input) => {
    const n6 = name();
    if (input && input.getAttribute("aria-label") !== n6) {
      input.setAttribute("aria-label", n6);
    }
  }).catch(() => {
  });
}
var searchbarSingleClear = i`
  ion-searchbar input::-webkit-search-cancel-button {
    -webkit-appearance: none;
    appearance: none;
    display: none;
  }
`;

// @erplora/outfitkit/dist/ok-data-table.js
var CSV_BOM = "\uFEFF";
var WINDOWS_1252_C1 = [
  8364,
  129,
  8218,
  402,
  8222,
  8230,
  8224,
  8225,
  710,
  8240,
  352,
  8249,
  338,
  141,
  381,
  143,
  144,
  8216,
  8217,
  8220,
  8221,
  8226,
  8211,
  8212,
  732,
  8482,
  353,
  8250,
  339,
  157,
  382,
  376
];
function decodeWindows1252(bytes) {
  let text = "";
  for (const byte of bytes) {
    text += String.fromCharCode(byte >= 128 && byte <= 159 ? WINDOWS_1252_C1[byte - 128] : byte);
  }
  return text;
}
function decodeCsvBuffer(buf) {
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    text = decodeWindows1252(new Uint8Array(buf));
  }
  return text.charCodeAt(0) === 65279 ? text.slice(1) : text;
}
var __defProp4 = Object.defineProperty;
var __decorateClass4 = (decorators, target, key, kind) => {
  var result = void 0;
  for (var i7 = decorators.length - 1, decorator; i7 >= 0; i7--)
    if (decorator = decorators[i7])
      result = decorator(target, key, result) || result;
  if (result) __defProp4(target, key, result);
  return result;
};
function decideRowActionsFit(input) {
  const { containerWidth, contentWidth, collapsed, decidedAtWidth } = input;
  if (!(containerWidth > 0)) return { collapsed, decidedAtWidth };
  if (containerWidth !== decidedAtWidth) {
    if (collapsed) return { collapsed: false, decidedAtWidth: containerWidth };
    return { collapsed: contentWidth > containerWidth, decidedAtWidth: containerWidth };
  }
  if (!collapsed && contentWidth > containerWidth) return { collapsed: true, decidedAtWidth };
  return { collapsed, decidedAtWidth };
}
function decideCardsForFit(input) {
  const { allowed, hostWidth, folded, fitCards, fitWidth } = input;
  const idle = { fitCards: false, fitWidth: 0 };
  if (!allowed) return idle;
  if (!(hostWidth > 0)) return { fitCards, fitWidth };
  if (fitCards) return hostWidth >= fitWidth ? idle : { fitCards, fitWidth };
  if (folded && folded.containerWidth > 0 && folded.contentWidth > folded.containerWidth) {
    return { fitCards: true, fitWidth: hostWidth + folded.contentWidth - folded.containerWidth };
  }
  return idle;
}
var DEFAULT_LABELS2 = {
  search: "Search\u2026",
  empty: "No results",
  filters: "Filters",
  clear: "Clear",
  apply: "Apply",
  showResults: "Show results",
  selected: "{n} selected",
  importCsv: "Import CSV",
  exportCsv: "Export CSV",
  add: "Add",
  moreActions: "More actions",
  rowsPerPage: "Rows per page",
  perPageShort: "{n} / page",
  viewList: "View as list",
  viewCards: "View as cards",
  columnsVisible: "Visible columns",
  columns: "Columns",
  actions: "Actions",
  close: "Close",
  newRecord: "New",
  editRecord: "Edit",
  form: "Form",
  filterPlaceholder: "Filter\u2026",
  from: "From",
  to: "To",
  fromOf: "{label} from",
  toOf: "{label} to",
  gte: "\u2265",
  lte: "\u2264",
  noValues: "No values",
  selectAll: "Select all",
  selectRow: "Select row",
  select: "Select",
  showing: "Showing {from}\u2013{to} of",
  recordSingular: "record",
  recordPlural: "records",
  loadMore: "Load more",
  noMatches: "No results match your search or filters",
  showAll: "Show all",
  loadError: "Couldn't load the data",
  retry: "Retry",
  loading: "Loading\u2026"
};
var ES_LABELS = {
  search: "Buscar\u2026",
  empty: "Sin resultados",
  filters: "Filtros",
  clear: "Limpiar",
  apply: "Aplicar",
  showResults: "Ver resultados",
  selected: "{n} seleccionados",
  importCsv: "Importar CSV",
  exportCsv: "Exportar CSV",
  add: "A\xF1adir",
  moreActions: "M\xE1s acciones",
  rowsPerPage: "Filas por p\xE1gina",
  perPageShort: "{n} / p\xE1g.",
  viewList: "Vista lista",
  viewCards: "Vista tarjetas",
  columnsVisible: "Columnas visibles",
  columns: "Columnas",
  actions: "Acciones",
  close: "Cerrar",
  newRecord: "Nuevo",
  editRecord: "Editar",
  form: "Formulario",
  filterPlaceholder: "Filtrar\u2026",
  from: "Desde",
  to: "Hasta",
  fromOf: "{label} desde",
  toOf: "{label} hasta",
  gte: "\u2265",
  lte: "\u2264",
  noValues: "Sin valores",
  selectAll: "Seleccionar todo",
  selectRow: "Seleccionar fila",
  select: "Seleccionar",
  showing: "Mostrando {from}\u2013{to} de",
  recordSingular: "registro",
  recordPlural: "registros",
  loadMore: "Cargar m\xE1s",
  noMatches: "Ning\xFAn resultado coincide con la b\xFAsqueda o los filtros",
  showAll: "Mostrar todo",
  loadError: "No se han podido cargar los datos",
  retry: "Reintentar",
  loading: "Cargando\u2026"
};
var NUMERIC_TEXT = /^-?\d+(\.\d+)?$/;
var ISO_DATE_OR_TIME = /^(\d{4}-\d{2}-\d{2}|\d{2}:\d{2})/;
var _OkDataTable = class _OkDataTable2 extends i3 {
  constructor() {
    super(...arguments);
    this.columns = [];
    this.rows = [];
    this.searchKeys = [];
    this.rowKeyField = "id";
    this.pageSize = 10;
    this.loading = false;
    this.labels = {};
    this.actions = [];
    this.addable = false;
    this.pageSizeOptions = [10, 25, 50, 100];
    this.fill = false;
    this.columnPicker = true;
    this.csv = false;
    this.csvName = "export.csv";
    this.serverSide = false;
    this.total = 0;
    this.page = 0;
    this.searchable = false;
    this.sortDir = "asc";
    this.filterValues = {};
    this.title = "";
    this.views = false;
    this.exportable = false;
    this.importable = false;
    this.columnSelector = false;
    this.rowClickable = false;
    this.selectable = false;
    this.inlineFilters = false;
    this.menuActions = [];
    this.q = "";
    this.clientPage = 0;
    this.clientPageSize = 0;
    this.mobileShown = 0;
    this.clientSort = "";
    this.clientSortDir = "asc";
    this.clientFilters = {};
    this.filterDraft = {};
    this.serverFilters = {};
    this.panel = "none";
    this.panelTitle = "";
    this.viewMode = "table";
    this.viewChosenByUser = false;
    this.isMobile = false;
    this.xOverflow = false;
    this.actionsTrackPx = 0;
    this.rowActionsCollapsed = false;
    this.actionsLabelFits = true;
    this.unfoldedCells = /* @__PURE__ */ new Set();
    this.lastPointerType = "";
    this.fitDecidedAtWidth = -1;
    this.fitCards = false;
    this.fitCardsWidth = 0;
    this.fitShape = "";
    this.rowMenuOpen = false;
    this.columnChoice = /* @__PURE__ */ new Map();
    this.internalSelection = /* @__PURE__ */ new Set();
    this.menuOpen = false;
    this.onLocaleChanged = () => this.requestUpdate();
    this.onKeydown = (e5) => {
      if (e5.key !== "Escape" || e5.defaultPrevented || this.panel === "none") return;
      e5.preventDefault();
      e5.stopPropagation();
      this.closePanel("escape");
    };
    this.onWindowResize = () => {
      this.measureXOverflow();
      this.measureRowActionsFit();
      this.syncSheetInsets();
      this.syncContentAfter();
    };
    this.sheetContent = null;
    this.notePointer = (e5) => {
      this.lastPointerType = e5.pointerType;
    };
    this.onSearch = (ev) => {
      const value = ev.target.value ?? "";
      if (this.serverSide) {
        this.q = value;
        this.emit("searchChange", value);
      } else {
        this.q = value;
        this.clientPage = 0;
        this.mobileShown = 0;
      }
    };
    this.gapLabels = /* @__PURE__ */ new Map();
    this.slotActionsCache = null;
  }
  static {
    this.styles = i`
    ${searchbarSingleClear}
    :host {
      /* Vars overridable (estilo Ionic), default = cadena --ok-* → --ion-* → hex */
      --background: var(--ok-surface, var(--ion-card-background, var(--ion-background-color, #ffffff)));
      --color: var(--ok-text, var(--ion-text-color, #1c1b17));
      --color-muted: var(--ok-muted, var(--ion-color-medium, rgba(var(--ion-text-color-rgb, 24, 24, 27), 0.55)));
      --border-color: var(--ok-border, var(--ion-color-step-150, rgba(var(--ion-text-color-rgb, 24, 24, 27), 0.12)));
      --border-color-soft: var(--ok-border-soft, var(--ion-color-step-100, rgba(var(--ion-text-color-rgb, 24, 24, 27), 0.07)));
      /* Borde más marcado para los controles de la toolbar (selects/pastilla de fechas), para que se
       * distingan como controles en claro y oscuro aunque el lienzo y la superficie casi no contrasten. */
      --control-border: color-mix(in srgb, var(--color) 22%, transparent);
      /* Relieve de cabecera/pie: step-100 (definido en claro y oscuro) → contraste con el lienzo. */
      --header-background: var(--ok-surface-2, var(--ion-color-step-100, rgba(var(--ion-text-color-rgb, 24, 24, 27), 0.04)));
      --row-hover: var(--ok-row-hover, var(--ion-color-step-50, rgba(var(--ion-text-color-rgb, 24, 24, 27), 0.03)));
      --primary: var(--ok-primary, var(--ion-color-primary, #3880ff));
      --primary-contrast: var(--ok-primary-contrast, var(--ion-color-primary-contrast, #ffffff));
      --border-radius: var(--ok-radius, 16px);
      --font: var(--ok-font, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif);

      display: block;
      color: var(--color);
      font-family: var(--font);
    }
    * { box-sizing: border-box; }
    .card {
      position: relative;
      display: flex;
      flex-direction: column;
      /* Flat: sin borde ni elevación (directiva 2026-06-09). */
      border: 0;
      border-radius: var(--border-radius);
      overflow: hidden;
      background: var(--background);
      box-shadow: none;
    }

    /* Panel lateral derecho (drawer) DENTRO de la tabla: filtros / alta-edición. Base (sin media):
       overlay absoluto — es lo que había hasta #75 y lo que ve un navegador sin media queries. */
    .tk-scrim { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.18); z-index: 19; }
    .drawer { position: absolute; top: 0; right: 0; height: 100%; width: 340px; max-width: 88%;
      background: var(--background); border-left: 1px solid var(--border-color);
      display: flex; flex-direction: column; z-index: 20;
      animation: tk-slide-in 0.18s ease; }
    @keyframes tk-slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
    /* #75 — El panel EMPUJA en escritorio y es HOJA COMPLETA en móvil; nunca tapa a medias.
       Medido en el hub (Servicios/Citas): a 1440 el overlay de 340px se pintaba ENCIMA de
       «Duración», «Acciones» y el selector de columnas, con el 90% de la tabla vacío a la
       izquierda; a 390 dejaba una tira de 45px de tabla (media lupa, medio «Co…») que hacía
       parecer el formulario un pop-up mal puesto. Square Dashboard reduce la tabla con un panel
       fijo; Fresha/Shopify/Odoo abren una hoja a pantalla completa en móvil.
       ≥ 834px: mientras hay panel, .card pasa a rejilla de DOS columnas (tabla | panel 360px):
       la tabla se estrecha (ya sabe hacer scroll-x, #67) y nada queda tapado. */
    @media (min-width: 834px) {
      .card.has-panel { display: grid; grid-template-columns: minmax(0, 1fr) 360px; grid-template-rows: auto minmax(0, 1fr) auto; }
      .card.has-panel > .bar { grid-column: 1; grid-row: 1; }
      .card.has-panel > .scroll, .card.has-panel > .cards-grid, .card.has-panel > .empty, .card.has-panel > .load-error, .card.has-panel > .loading-state { grid-column: 1; grid-row: 2; min-height: 0; overflow: auto; }
      .card.has-panel > .pager { grid-column: 1; grid-row: 3; }
      .card.has-panel > .drawer { position: static; grid-column: 2; grid-row: 1 / -1; width: auto; max-width: none; height: auto; min-height: 0; animation: none; }
      .card.has-panel > .tk-scrim { display: none; }
    }
    /* < 834px: hoja a pantalla completa con su cabecera (título + Cerrar); sin tira residual.
       position:fixed dentro de ion-content se ancla al área de contenido (contain), que es justo el hueco
       bajo la cabecera de la app: el usuario conserva el título de la página. */
    @media (max-width: 833.98px) {
      .drawer { position: fixed; inset: 0; top: var(--ok-sheet-top, 0px); bottom: var(--ok-sheet-bottom, 0px); width: 100%; max-width: none; height: auto; border-left: 0; z-index: 1000; }
      .tk-scrim { display: none; }
    }
    .drawer .dh { flex: 0 0 auto; display: flex; align-items: center; justify-content: space-between;
      padding: 0.6rem 0.5rem 0.6rem 1rem; border-bottom: 1px solid var(--border-color); font-size: 1rem; }
    .drawer .db { flex: 1 1 auto; min-height: 0; overflow: auto; padding: 1rem; display: flex; flex-direction: column; gap: 0.85rem; }
    .fblock { display: flex; flex-direction: column; gap: 0.45rem; }
    .flabel { font-size: 13px; font-weight: 500; color: var(--color); }
    .frange { display: flex; gap: 0.5rem; }
    /* Filtros cliente: multi-select con ion-select (ventana flotante de Ionic) + rango de fechas. */
    .daterange { display: flex; gap: 0.6rem; }
    .daterange ion-input { flex: 1; }
    /* Pie del drawer de filtros: Limpiar / Aplicar. */
    .df { flex: 0 0 auto; display: flex; align-items: center; justify-content: flex-end; gap: 0.4rem; padding: 0.6rem 0.85rem; border-top: 1px solid var(--border-color); }
    .df .df-clear { margin-right: auto; }
    /* #207 — Server-mode «Show results»: the one button of the footer, as wide as the sheet. */
    .df .df-done { flex: 1 1 auto; }

    /* Modo fill: la tabla ocupa el alto del contenedor; filas con scroll interno; pager fijo. */
    :host([fill]) { display: flex; flex-direction: column; height: 100%; min-height: 0; }
    :host([fill]) .card { flex: 1 1 auto; min-height: 0; }
    :host([fill]) .bar, :host([fill]) .panel, :host([fill]) .pager { flex: 0 0 auto; }
    :host([fill]) .scroll, :host([fill]) .cards-grid { flex: 1 1 auto; min-height: 0; overflow: auto; }
    /* Sin filas, renderTable/renderCards devuelven SOLO el bloque .empty (sin .scroll). En modo
       fill hay que estirarlo para que ocupe el hueco entre toolbar y pager y centre su contenido
       (icono + mensaje) en vertical; si no, queda pegado arriba con el pager a media altura. */
    :host([fill]) .empty, :host([fill]) .load-error, :host([fill]) .loading-state { flex: 1 1 auto; min-height: 0; }
    /* #218 — On a phone (MOBILE_BREAKPOINT, where the table turns into cards and «Load more») the
       module paints other blocks above the table, and rows boxed in between toolbar and footer got
       what was left: a 315px card in a 32-155px window, never readable whole. Phone lists scroll
       WITH the page (Shopify, Square, Odoo): the card is as tall as its content, the rows are not a
       scroller of their own and the shell's ion-content scrolls.
       The host box stays as it was, so the blocks ABOVE keep their size (growing it squeezed an
       ion-segment or ion-card to 0px), and the cards run past it into the page scroll. Only when
       something in flow comes AFTER the table ([content-after], see syncContentAfter) does the box
       grow, pushing that content down instead of painting over it. !important because every
       module ships .page > ok-data-table { flex: 1 1 auto; min-height: 0 }, and only an important
       declaration from inside the shadow wins over the page's own rule. */
    @media (max-width: 640px) {
      :host([fill]) .card { flex: 1 0 auto; }
      :host([fill]) .scroll, :host([fill]) .cards-grid { flex: 0 0 auto; }
      :host([fill]) .cards-grid { overflow: visible; }
      :host([fill][content-after]) { height: auto; flex-shrink: 0 !important; }
    }

    /* ── Topbar / cabecera (relieve) ─────────────────────────────────────────────────────── */
    .bar { display: flex; flex-direction: column; gap: 0.6rem; padding: 0.65rem 1rem; border-bottom: 1px solid var(--border-color); background: var(--header-background); }
    /* Toolbar CONSOLIDADA: TODOS los controles son hijos directos de UNA sola fila flex que
     * envuelve ELEMENTO A ELEMENTO (no por bloques): caben en una línea → una línea; los que no
     * caben bajan a la(s) línea(s) que hagan falta. El cluster derecho se empuja al borde con
     * .tk-spacer (hueco flexible) solo cuando todo cabe en una línea; al envolver, el spacer se
     * oculta y todo se apila a la izquierda.
     * ORDEN CANÓNICO (2026-06-22, izquierda→derecha): [buscador] · [filtros en línea] · ‹spacer› ·
     * [SELECTORES: columnas → filas/página] · [BOTONES: vistas → filtros(funnel) → import → export →
     * alta → ⋮ → acción primaria]. Es decir: buscador al inicio, filtros en medio, y al final los
     * selectores (columnas, luego «N por página») seguidos de los botones de acción. */
    .bar-main { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
    .bar-main > ion-button { --padding-start: 0.5rem; --padding-end: 0.5rem; margin: 0; }
    /* Spacer que absorbe el hueco libre en pantallas anchas (empuja el cluster derecho al borde).
     * Se oculta por debajo de 1024px para que, al envolver, los controles se apilen a la izquierda. */
    .tk-spacer { flex: 1 1 0; min-width: 0; align-self: stretch; }
    @media (max-width: 1024px) { .tk-spacer { display: none; } }
    /* Buscador a ancho completo (línea propia) en móvil; el resto envuelve debajo. */
    @media (max-width: 640px) { .search { flex-basis: 100%; max-width: none; } }
    .title-wrap { display: flex; align-items: baseline; gap: 0.5rem; }
    .title { font-size: 15px; font-weight: 600; line-height: 1; margin: 0; }
    .title-count { font-size: 12px; font-weight: 500; color: var(--color-muted); }

    /* Botón de herramienta cuadrado (filtros/import/export), look del Hub: 36×36, badge contador. */
    .toolbtn { position: relative; --padding-start: 0; --padding-end: 0; --border-radius: 10px; width: 36px; height: 36px; margin: 0; }
    .toolbtn .badge { position: absolute; top: -5px; right: -5px; min-width: 16px; height: 16px; padding: 0 3px; border-radius: 999px; background: var(--primary); color: var(--primary-contrast); font-size: 10px; font-weight: 700; line-height: 16px; text-align: center; pointer-events: none; }

    /* Buscador (caja con icono + limpiar), look del Hub. No crece (el spacer se queda el hueco);
     * puede encoger hasta min-width y, por debajo, envuelve. */
    .search { flex: 0 1 22rem; min-width: 12rem; max-width: 24rem; }
    ion-searchbar { --background: var(--background); --border-radius: 10px; padding: 0; min-height: 36px; }
    /* Flat: el buscador quita borde y elevación vía la clase específica de Ionic 'ion-no-border'.
     * (La regla global de Ionic para .ion-no-border no cruza el Shadow DOM, así que la
     * reimplementamos aquí dentro: --box-shadow controla la elevación; ::part(native) el borde.) */
    ion-searchbar.ion-no-border { --box-shadow: none; }
    ion-searchbar.ion-no-border::part(native) { border: none; box-shadow: none; }

    /* Toggle de vista lista/tarjetas (segmento) */
    .viewseg { display: inline-flex; align-items: center; gap: 2px; padding: 2px; border: 1px solid var(--border-color); border-radius: 10px; background: var(--background); }
    .viewseg ion-button { --border-radius: 7px; }

    /* Botón primario (primaryAction) */
    .primary-btn { --background: var(--primary); --color: var(--primary-contrast); }
    /* #76 — El alta en MÓVIL: botón primario CON etiqueta y área táctil de 44px, en vez del «+»
       icónico de 36px al final de la barra. Fresha/Square/Shopify POS ponen la acción primaria
       de la lista como botón visible con texto (o FAB), nunca como icono anónimo.
       #113 — Y en ESCRITORIO igual: Odoo («New»), Business Central, Shopify («Add product»),
       WooCommerce, Lightspeed y Fresha rotulan y rellenan la acción principal de un listado; NN/g
       reserva el botón sin rótulo para lo universal (buscar, cerrar). Aquí solo cambia la ALTURA:
       36px para alinear con .toolbtn y el buscador, y los 44px táctiles vuelven abajo con el
       resto de objetivos de puntero grueso. */
    .add-btn { min-height: 36px; --border-radius: 10px; --padding-start: 0.9rem; --padding-end: 1rem; margin: 0; font-weight: 600; }
    .add-btn ion-icon { margin-inline-end: 0.35rem; }

    /* Selects de la toolbar: fondo + borde visibles (como el buscador y la pastilla de fechas) para
     * que se distingan como controles en claro y oscuro (sin fondo eran invisibles en dark). */
    .tk-cols { min-width: 6.5rem; max-width: 9rem; min-height: 38px; font-size: 13px; background: var(--background); color: var(--color); border: 1px solid var(--control-border); border-radius: 10px; --padding-start: 0.6rem; --padding-end: 0.4rem; --padding-top: 0.3rem; --padding-bottom: 0.3rem; }
    .vsep { width: 1px; align-self: stretch; background: var(--border-color); margin: 0.3rem 0.25rem; }

    /* Selector de filas/página en la toolbar (consolidado) */
    /* max-width: ion-select es display:block (sin core.css el host estira a la
     * línea entera cuando .bar-end hace wrap) — se capa como .tk-cols. */
    .tk-psize { min-width: 4.25rem; max-width: 5.5rem; min-height: 38px; font-size: 13px; background: var(--background); color: var(--color); border: 1px solid var(--control-border); border-radius: 10px; --padding-start: 0.6rem; --padding-end: 0.4rem; --padding-top: 0.35rem; --padding-bottom: 0.35rem; }

    /* Filtros EN LÍNEA en la toolbar (select / rango de fechas) */
    .tk-filter { min-width: 8.5rem; max-width: 13rem; min-height: 38px; font-size: 13px; background: var(--background); color: var(--color); border: 1px solid var(--control-border); border-radius: 10px; --padding-start: 0.7rem; --padding-end: 0.5rem; --padding-top: 0.35rem; --padding-bottom: 0.35rem; }
    .tk-daterange { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.3rem 0.6rem; min-height: 38px; border: 1px solid var(--control-border); border-radius: 10px; background: var(--background); color: var(--color-muted); font-size: 13px; }
    .tk-daterange ion-icon { font-size: 15px; flex: 0 0 auto; }
    .tk-daterange ion-input { --background: transparent; --padding-start: 0; --padding-end: 0; --padding-top: 2px; --padding-bottom: 2px; --color: var(--color); min-height: 26px; width: 6.8rem; font-size: 13px; }
    .tk-daterange .arr { color: var(--color-muted); }

    /* Barra contextual de selección */
    .selbar { display: flex; align-items: center; gap: 0.6rem; padding: 0.4rem 0.7rem; border-radius: 10px;
      font-size: 13px; color: var(--primary);
      background: color-mix(in srgb, var(--primary) 12%, transparent); }
    .selbar .sel-clear { margin-left: auto; display: inline-flex; align-items: center; gap: 0.25rem; cursor: pointer; font-weight: 500; color: inherit; background: none; border: 0; font: inherit; }
    .selbar .sel-clear:hover { text-decoration: underline; }

    /* Acordeones (alta / filtros en modo tarjetas) */
    .panel { padding: 0.85rem 1rem; border-bottom: 1px solid var(--border-color); background: var(--header-background); }
    .filters-panel { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.6rem; }

    /* ── Vista lista en CSS GRID (no <table>): permite ancho por columna ──────────────────── */
    /* #67 — La barra horizontal es PERMANENTE cuando hay desbordamiento: la overlay de macOS se
       esconde a los pocos ms y deja la tabla sin ninguna pista de que sigue a la derecha. Al
       declarar ::-webkit-scrollbar el navegador pinta la clásica, que ocupa sitio y se ve. */
    .scroll { overflow-x: auto; }
    .scroll::-webkit-scrollbar { height: 10px; }
    .scroll::-webkit-scrollbar-track { background: transparent; }
    .scroll::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--color) 25%, transparent); border-radius: 6px; }
    .scroll::-webkit-scrollbar-thumb:hover { background: color-mix(in srgb, var(--color) 40%, transparent); }
    /* #120 - The grid floor is the SUM OF THE COLUMN MINIMUMS (min-content), not its maximum
       size. With max-content the grid sizes itself to what the widest column asks for and, in
       doing so, every 1fr track ends up as wide AS THAT ONE: at 834px each column measured
       148.86px for content asking between 10px (a "4") and 100px ("Familia Perez"). The table
       always overflowed and the pinned actions column sat on top of Pax and Estado. With
       min-content the grid fits its container as long as the minimums fit, and 1fr shares out the
       leftover space; horizontal scroll shows up only when not even the minimums fit. */
    .grid { min-width: min-content; font-size: 14px; }
    .grow { display: grid; align-items: center; gap: 0.5rem; padding: 0 1rem; }
    .ghead { position: sticky; top: 0; z-index: 2; border-bottom: 1px solid var(--border-color);
      background: var(--header-background); padding-top: 0.55rem; padding-bottom: 0.55rem; }
    .gcell { display: flex; align-items: center; min-width: 0; }
    .gcell > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    /* #217 - A touch screen has no hover to show the cell's title, so in a table whose rows open
       nothing a tap on a clipped cell unfolds it in place (see onCellTap). Only that cell wraps; the rest of the row keeps
       its one line. The grid track does not move: its minimum is the column's fixed floor. */
    .gcell > span.unfolded { white-space: normal; overflow-wrap: anywhere; }
    .gcell.right { justify-content: flex-end; text-align: right; }
    .gcell.center { justify-content: center; text-align: center; }
    /* #67 - PINNED ACTIONS COLUMN. When the grid overflows (since #120 only when not even the
       column minimums fit; before that it happened with six columns and room to spare) the button
       that opens the record went off screen: at 1440px it sat 335px past the edge with nothing to
       give it away. It stays stuck to the right edge, like Zendesk/Freshdesk/Shopify. With
       background:inherit it takes the row background (which is opaque for this very reason), so it
       keeps hover and selection without anything showing through. */
    .gcell.actions-col { position: sticky; right: 0; z-index: 1; background: inherit;
      margin-right: -1rem; padding-right: 1rem; }
    /* La sombra solo aparece cuando de verdad hay algo escondido a la izquierda (clase x-overflow);
       si la tabla cabe entera no se pinta nada. */
    .scroll.x-overflow .gcell.actions-col { box-shadow: -10px 0 10px -10px color-mix(in srgb, var(--color) 45%, transparent); }
    /* #120 - The pinned header has to be OPAQUE. background:inherit took --header-background,
       which is a 4% alpha TINT (measured rgba(24,24,27,0.04)): when the grid overflows the
       "Acciones" header went see-through and "PAX" and "ESTADO" could be read through it - the
       "PAXCIONESTAD" of the issue. It now sits on the opaque table background with the tint laid
       back on top, the same way .grow-data:hover does. */
    .ghead .gcell.actions-col { z-index: 3;
      background: linear-gradient(var(--header-background), var(--header-background)), var(--background); }
    .gh { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-muted); }
    .gh.sortable { cursor: pointer; user-select: none; white-space: nowrap; transition: background-color var(--ok-transition, 150ms ease), color var(--ok-transition, 150ms ease), box-shadow var(--ok-transition, 150ms ease), transform 120ms ease; }
    @media (hover: hover) {
      .gh.sortable:hover { color: var(--color); }
    }
    /* Caret de orden (3 estados, icono Ionic): neutral atenuado / activo en color primario. */
    .caret { display: inline-flex; align-items: center; margin-left: 0.25rem; flex: 0 0 auto; font-size: 13px; opacity: 0.3; }
    .caret.on { opacity: 1; color: var(--primary); }
    .grow-data { background: var(--background); border-bottom: 1px solid var(--border-color-soft); padding-top: 0.6rem; padding-bottom: 0.6rem; transition: background-color var(--ok-transition, 150ms ease), color var(--ok-transition, 150ms ease), box-shadow var(--ok-transition, 150ms ease), transform 120ms ease; }
    .grow-data:last-child { border-bottom: 0; }
    @media (hover: hover) {
      .grow-data:hover { background: linear-gradient(var(--row-hover), var(--row-hover)), var(--background); }
    }
    .grow-data:active { transform: scale(0.995); }
    .grow-data.selected { background: linear-gradient(color-mix(in srgb, var(--primary) 10%, transparent), color-mix(in srgb, var(--primary) 10%, transparent)), var(--background); }
    /* #67 — Fila clicable (opt-in row-clickable): es lo primero que intenta el usuario y lo que
       hacen Odoo, Jira SM, Shopify o Square en sus listados. */
    .grow-data.clickable { cursor: pointer; }
    .grow-data.clickable:focus-visible { outline: 2px solid var(--primary); outline-offset: -2px; }
    .selcb { display: flex; align-items: center; justify-content: center; }
    .filters-grow { padding-top: 0.4rem; padding-bottom: 0.6rem; }
    .filters-grow input, .filters-grow select { width: 100%; box-sizing: border-box; font: inherit; font-size: 13px; padding: 0.3rem 0.4rem; border: 1px solid var(--border-color); border-radius: 6px; background: var(--background); color: var(--color); }
    .range { display: flex; gap: 0.25rem; }

    /* ── Vista tarjetas ──────────────────────────────────────────────────────────────────── */
    /* Cada tarjeta mide SU contenido (no se estira al alto de la fila ni del contenedor):
       - grid-auto-rows: max-content → cada fila implícita = alto de su contenido. CLAVE: sin esto,
         en modo fill (grid de alto fijo + align-content:start) cuando las tarjetas no caben el
         navegador encoge los tracks de fila y las tarjetas se solapan.
       - align-content: start → empaqueta las filas arriba (no reparte el hueco sobrante estirando).
       - align-items: start → en una fila multi-columna cada tarjeta mide su propio contenido.
       En modo fill el grid es flex-child con overflow:auto → cuando las tarjetas no caben aparece el
       scroll DENTRO de la tabla (no crece hacia fuera). */
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 0.75rem; padding: 1rem; grid-auto-rows: max-content; align-content: start; align-items: start; }
    /* Tarjeta = ion-card NATIVO de Ionic: su fondo, radio, elevación y padding son los de Ionic y NO
       se sobrescriben. Aquí solo se ajusta lo que el contexto de rejilla exige (margin) y los huecos
       que Ionic no trae (cabecera en fila, filas clave-valor, barra de acciones, resalte de selección). */
    ion-card.rcard { margin: 0; } /* la rejilla aporta el gap → sin esto el margin por defecto de ion-card lo duplica */
    ion-card.rcard.selected { outline: 2px solid var(--primary); outline-offset: -2px; }
    /* #74 — Tarjeta clicable (opt-in row-clickable): la mitad de #67 que faltaba. La vista de
       tarjetas es la que la tabla elige SOLA en móvil, así que sin esto el registro no se podía
       abrir desde un teléfono (medido con combos 0.1.4: 0 rowClick a 390px). */
    ion-card.rcard.clickable { cursor: pointer; }
    ion-card.rcard.clickable:focus-visible { outline: 2px solid var(--primary); outline-offset: -2px; }
    @media (prefers-reduced-motion: reduce) {
      .gh.sortable:hover, .gh.sortable:active,
      .grow-data:hover, .grow-data:active { transform: none; }
    }
    /* Header: ion-card-header as a single row (icon + title + checkbox), keeping Ionic's padding.
       #79 — flex-direction/flex-wrap are SPELLED OUT on purpose: in ios mode (the mode the Hub
       shell pins, ADR-0143) Ionic's own host CSS gives ion-card-header a column direction, so a
       rule that only sets display:flex inherits it and the three children stack on three lines.
       Under md the same rule looked right, which is why it shipped. */
    ion-card-header.rcard-head { display: flex; flex-direction: row; flex-wrap: nowrap; align-items: center; gap: 0.5rem; }
    .rcard-head .rc-icon { display: inline-flex; color: var(--primary); }
    .rcard-head .rc-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
    /* Cuerpo: ion-card-content (padding Ionic por defecto) con las filas clave-valor apiladas. */
    ion-card-content.rcard-body { display: flex; flex-direction: column; gap: 0.4rem; }
    .rrow { display: flex; justify-content: space-between; gap: 0.5rem; font-size: 13px; }
    .rrow .rk { color: var(--color-muted); }
    .rrow .rv { font-weight: 500; text-align: right; color: var(--color); }
    /* Barra de acciones (Ionic no trae "card actions"): pie alineado a la derecha, fondo transparente. */
    .ractions { display: flex; justify-content: flex-end; gap: 0.25rem; padding: 0 0.5rem 0.5rem; }
    /* ERPlora/appointments#154 - a card's action row must NEVER clip.
       The assumption was that they always fit across the card. With the eight actions an
       appointment carries they do not: on a 411dp phone the card leaves 363px and the buttons ask
       for 380px (8 x 44px of tap floor + 7 gaps of 4px). Without wrapping, justify-content:
       flex-end takes that difference off the START side, so the FIRST button - Cobrar - hung off
       the left edge of the card, clipped, with no scrollbar and nothing to say it was there.
       The wrap is scoped to the card on purpose: the LIST view's row is measured by its
       scrollWidth to pin the column track (#121), and a row that wraps changes width with the
       track it is measured against, which is the loop that measure avoids. */
    .ractions .actions { flex-wrap: wrap; }

    /* ── Estado vacío ────────────────────────────────────────────────────────────────────── */
    .empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem; padding: 3.5rem 1rem; text-align: center; color: var(--color-muted); }
    /* pm#530 — Error state: same frame as the empty state, but its heading reads as text, not muted. */
    .load-error { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; padding: 3.5rem 1rem; text-align: center; color: var(--color-muted); }
    /* #268 — Loading state: same frame as the empty state, a spinner instead of the tray. */
    .loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem; padding: 3.5rem 1rem; text-align: center; color: var(--color-muted); }
    .loading-state ion-spinner { width: 28px; height: 28px; color: var(--ok-primary, var(--ion-color-primary, #3880ff)); }
    .load-error .load-error-title { color: var(--color); font-weight: 600; }
    .load-error .empty-ic { color: var(--ok-danger, var(--ion-color-danger, #c5000f)); }
    .load-error ion-button { margin-top: 0.25rem; }
    .empty .empty-ic, .load-error .empty-ic { display: grid; place-items: center; width: 3.25rem; height: 3.25rem; border-radius: 999px; background: var(--header-background); font-size: 26px; }

    .actions { display: flex; gap: 0.25rem; justify-content: flex-end; }
    /* #121 - The buttons NEVER shrink. Their track is pinned to the width measured here
       (the scrollWidth of .actions); if they could shrink, a narrow track would shrink the
       measurement, which would shrink the track again. flex: 0 0 auto is what makes the
       measurement a property of the CONTENT instead of a property of the current layout. */
    .actions ion-button { flex: 0 0 auto; }
    /* #240 - Stand-in of a row action hidden on this row: it keeps the button's width (so the
       others stay in their column) and paints nothing; aria-hidden + inert keep it out of the
       accessibility tree, the tab order and the click path. */
    .actions .action-gap { visibility: hidden; }
    /* #122 - Header of the actions column while the buttons are folded into the menu. "ACCIONES"
       measures 62.83px and the folded track is 44px: painted, it spills out of its own cell and
       over "Estado" - the very thing the issue is about. The column keeps its name for assistive
       tech and paints nothing. #211 - Same while expanded when the buttons leave no room for the
       label (one icon: 32-44px), instead of painting "ACCI…". */
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden;
      clip-path: inset(50%); white-space: nowrap; border: 0; }
    /* Las acciones de fila son icon-only y de tamaño small en escritorio. En tablet/móvil se
     * amplía el host completo (no solo el icono) para que el área táctil alcance 44×44 px. */
    @media (pointer: coarse), (max-width: 834px) {
      .actions ion-button { min-width: 44px; min-height: 44px; margin: 0; }
      .toolbtn { width: 44px; height: 44px; }
      .add-btn { min-height: 44px; }
      .pager .nav ion-button { min-width: 44px; min-height: 44px; margin: 0; }
      .load-error ion-button { min-height: 44px; --padding-start: 1rem; --padding-end: 1rem; }
    }
    /* Spinner de acción en curso (loading): contenido dentro del ion-button small (Ionic lo fija
     * a 28px en el :host, por eso width/height y no font-size). Cubre tabla y tarjetas: los
     * botones de fila siempre van dentro de .actions. */
    .actions ion-spinner { width: 18px; height: 18px; }

    /* ── Pie: contador + paginación ──────────────────────────────────────────────────────── */
    .pager { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 0.55rem 1rem; border-top: 1px solid var(--border-color); background: var(--header-background); font-size: 12.5px; color: var(--color-muted); }
    .pager .left { display: flex; align-items: center; gap: 0.6rem; }
    .pager .strong { font-weight: 600; color: var(--color); }
    .psize { font: inherit; font-size: 12.5px; padding: 0.2rem 0.35rem; border: 1px solid var(--border-color); border-radius: 6px; background: var(--background); color: var(--color); }
    .pager .nav { display: flex; align-items: center; gap: 0.2rem; }
    /* #78 — Pie en MÓVIL: un solo control «Cargar más» en lugar del pager numerado (Shopify
       IndexTable, Fresha, Square y Material hacen lo mismo: nadie pinta botones de página en un
       teléfono). Sin atributo fill: el sólido por defecto de Ionic es el único que pinta caja en
       modo ios (outfitkit#82 / ADR-0143). Los 44px son el área táctil mínima. */
    .pager .load-more { min-height: 44px; margin: 0; --padding-start: 1rem; --padding-end: 1rem; font-size: 13px; }
    .pager .nav .pp { font-weight: 600; color: var(--color); padding: 0 0.25rem; }
    /* Pager numerado: botón por página + «…» en los saltos (look del Hub). */
    /* #92 — min-width/height at 44px so a numbered page button matches the prev/next ion-button's
       own 44px tap target (line above): before this they were visibly smaller than their neighbors. */
    .pnum { min-width: var(--ok-tap-min, 44px); height: var(--ok-tap-min, 44px); padding: 0 0.4rem; border: 1px solid transparent; border-radius: 8px; background: none; font: inherit; font-size: 12.5px; font-weight: 600; color: var(--color); cursor: pointer; transition: background 0.12s, border-color 0.12s; }
    .pnum:hover { background: var(--row-hover); }
    .pnum.on { background: color-mix(in srgb, var(--primary) 14%, transparent); color: var(--primary); border-color: color-mix(in srgb, var(--primary) 40%, transparent); }
    .pgap { padding: 0 0.15rem; color: var(--color-muted); }
    ion-button { --box-shadow: none; }
  `;
  }
  static {
    this.MOBILE_BREAKPOINT = 640;
  }
  connectedCallback() {
    super.connectedCallback();
    this.addEventListener("keydown", this.onKeydown);
    if (this.hasUpdated) this.observeSiblings();
    if (typeof window !== "undefined") {
      window.addEventListener("erplora:locale-changed", this.onLocaleChanged);
      window.addEventListener("resize", this.onWindowResize);
    }
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      this.mq = window.matchMedia(`(max-width: ${_OkDataTable2.MOBILE_BREAKPOINT}px)`);
      this.isMobile = this.mq.matches;
      const handler = (e5) => {
        const matches = "matches" in e5 ? e5.matches : this.mq?.matches ?? false;
        if (this.isMobile === matches) return;
        this.isMobile = matches;
        if (matches && this.cardViewEnabled) this.viewMode = "cards";
        else if (!matches && this.viewMode === "cards") this.viewMode = "table";
      };
      this.mq.addEventListener("change", handler);
      this._mqHandler = handler;
    }
  }
  /** #67 — Recalcula si la vista lista desborda a lo ancho (`scrollWidth > clientWidth`).
   *
   * Se mide después de renderizar, que es cuando el navegador ya conoce los anchos, y solo se
   * escribe el estado si CAMBIA: asignarlo siempre reprogramaría un render en bucle. */
  measureXOverflow() {
    const scroll = this.renderRoot?.querySelector?.(".scroll");
    const overflow = !!scroll && scroll.scrollWidth > scroll.clientWidth;
    if (this.xOverflow !== overflow) this.xOverflow = overflow;
  }
  /** #121 — Ancho natural de los botones de acción de una fila, para clavar su pista en px.
   *
   * Se lee del `scrollWidth` de `.actions`, que es el ancho de SU CONTENIDO: como los botones
   * llevan `flex: 0 0 auto` nunca se encogen, así que la medida no depende de lo ancha que sea la
   * pista en ese momento. Eso es lo que la hace estable: clavar la pista al ancho natural no
   * cambia el ancho natural, así que la siguiente medida sale igual y no hay bucle. */
  measureActionsTrack() {
    if (!this.actions.length) {
      if (this.actionsTrackPx !== 0) this.actionsTrackPx = 0;
      return;
    }
    const boxes = this.renderRoot?.querySelectorAll?.(".grow-data .gcell.actions-col .actions") ?? [];
    let width = 0;
    for (const el of boxes) width = Math.max(width, Math.ceil(el.scrollWidth));
    if (width > 0 && width !== this.actionsTrackPx) this.actionsTrackPx = width;
  }
  /** #211 - Does the header label fit the actions column, or would it be painted truncated?
   *
   * The label's `scrollWidth` is its natural width both painted and `.sr-only` (it never wraps),
   * and the cell's width is the track the buttons pinned in px: hiding or showing the label
   * changes neither, so the next measurement agrees with this one and nothing loops. Any change
   * of that track is a state change, so it re-renders and lands here through `updated`. */
  measureActionsLabel() {
    const cell = this.renderRoot?.querySelector?.(".ghead .gcell.actions-col");
    const label = cell?.querySelector("span");
    if (!cell || !label) return;
    const need = Math.ceil(label.scrollWidth);
    if (need <= 0 || cell.clientWidth <= 0) return;
    const cs = getComputedStyle(cell);
    const room = cell.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
    const fits = need <= room;
    if (this.actionsLabelFits !== fits) this.actionsLabelFits = fits;
  }
  /** #122 — Decide si los botones de acción de la fila caben o se pliegan en el menú «⋮».
   *  El criterio y la garantía de que no oscila viven en `decideRowActionsFit`. */
  measureRowActionsFit() {
    const scroll = this.renderRoot?.querySelector?.(".scroll");
    if (!scroll) {
      this.measureCardsFit(null);
      return;
    }
    const containerWidth = scroll.clientWidth;
    const contentWidth = scroll.scrollWidth;
    const foldedOnScreen = this.rowActionsCollapsed && this.fitDecidedAtWidth === containerWidth && !this.isUpdatePending && this.pinnedTrackIsHonest();
    const next = decideRowActionsFit({
      containerWidth,
      contentWidth,
      collapsed: this.rowActionsCollapsed,
      decidedAtWidth: this.fitDecidedAtWidth
    });
    this.fitDecidedAtWidth = next.decidedAtWidth;
    if (this.rowActionsCollapsed !== next.collapsed) this.rowActionsCollapsed = next.collapsed;
    this.measureCardsFit(foldedOnScreen && next.collapsed ? { containerWidth, contentWidth } : null);
  }
  /** #267 - Hands the list over to cards when it does not fit even folded, and back when the hole
   *  has room again. The criterion lives in `decideCardsForFit`. */
  measureCardsFit(folded) {
    if (this.panel !== "none") return;
    const allowed = this.cardViewEnabled && !this.viewChosenByUser && !this.isMobile && this.defaultView !== "cards";
    const next = decideCardsForFit({
      allowed,
      hostWidth: this.clientWidth,
      folded,
      fitCards: this.fitCards,
      fitWidth: this.fitCardsWidth
    });
    this.fitCardsWidth = next.fitWidth;
    if (next.fitCards === this.fitCards) return;
    this.fitCards = next.fitCards;
    if (next.fitCards) this.viewMode = "cards";
    else if (allowed) this.viewMode = "table";
  }
  /** #267 - Is there a column pinned over the data, and does its track hold what it shows?
   *
   * Without a pinned actions column an overflow only scrolls sideways and covers nothing: the list
   * stays a list. With one, the measurement only counts once the track has been re-measured for
   * the folded "...": `.actions` stretches to the track, so its `scrollWidth` never drops below a
   * track still pinned to the unfolded buttons, and judging those frames kept the list in cards
   * for good. The buttons themselves (`flex: 0 0 auto`) say the width they really need, margins
   * included (ios paints the icon button 28px with 2px of `margin-inline` in a 32px track). */
  pinnedTrackIsHonest() {
    const boxes = this.renderRoot?.querySelectorAll?.(".grow-data .gcell.actions-col .actions") ?? [];
    if (!boxes.length) return false;
    if (this.actionsTrackPx === 0) return true;
    const outerWidth = (el) => {
      const style = getComputedStyle(el);
      const margins = (parseFloat(style.marginLeft) || 0) + (parseFloat(style.marginRight) || 0);
      return el.getBoundingClientRect().width + margins;
    };
    let natural = 0;
    for (const box of boxes) {
      for (const child of Array.from(box.children)) natural = Math.max(natural, outerWidth(child));
    }
    return natural >= this.actionsTrackPx - 1;
  }
  /** #267 - Columns on screen with their widths, the actions and selection: the list's width. */
  fitShapeOf() {
    return JSON.stringify([
      this.visibleColumns.map((c5) => [c5.key, c5.width ?? ""]),
      this.actions.map((a3) => [a3.id, !!a3.icon]),
      this.selectable
    ]);
  }
  /** #218 — Marks the host `content-after` while an element in flow follows it in its parent (a
   *  heading and a second table, a notice). Out of flow does not count: an inline `ion-modal`
   *  (absolute until it reparents), a hidden block. Written only when it changes. */
  syncContentAfter() {
    let after = false;
    if (this.fill && typeof getComputedStyle === "function") {
      for (let el = this.nextElementSibling; el; el = el.nextElementSibling) {
        const cs = getComputedStyle(el);
        if (cs.display !== "none" && cs.position !== "absolute" && cs.position !== "fixed") {
          after = true;
          break;
        }
      }
    }
    if (this.hasAttribute("content-after") !== after) this.toggleAttribute("content-after", after);
  }
  /** #218 — (Re)starts watching the parent: children added/removed and a sibling shown or hidden
   *  (`hidden`/`style`/`class` on a direct child). Deeper mutations are ignored, and so are the
   *  table's own (the sheet insets write its `style` on every resize). */
  observeSiblings() {
    this.siblingsObserver?.disconnect();
    this.siblingsObserver = void 0;
    const parent = this.parentNode;
    if (this.fill && parent && typeof MutationObserver !== "undefined") {
      this.siblingsObserver = new MutationObserver((records) => {
        if (records.some((r6) => r6.target === parent || r6.target !== this && r6.target.parentNode === parent)) this.syncContentAfter();
      });
      this.siblingsObserver.observe(parent, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "style", "class"] });
    }
    this.syncContentAfter();
  }
  /** Engancha el observador al contenedor de scroll del render actual (cambia entre vistas). */
  observeXOverflow() {
    if (typeof ResizeObserver === "undefined") return;
    const scroll = this.renderRoot?.querySelector?.(".scroll");
    if (!scroll) return;
    this.xObserver ??= new ResizeObserver(() => {
      this.measureXOverflow();
      this.measureActionsTrack();
      this.measureRowActionsFit();
    });
    this.xObserver.disconnect();
    this.xObserver.observe(scroll);
    const grid = scroll.querySelector(".grid");
    if (grid) this.xObserver.observe(grid);
  }
  updated(changed) {
    if (changed.has("fill")) this.observeSiblings();
    if (!this.hostObserver && typeof ResizeObserver !== "undefined") {
      this.hostObserver = new ResizeObserver(() => this.measureRowActionsFit());
      this.hostObserver.observe(this);
    }
    this.observeXOverflow();
    this.measureXOverflow();
    if (changed.has("columns") || changed.has("actions") || changed.has("columnChoice") || changed.has("selectable")) {
      this.fitDecidedAtWidth = -1;
    }
    this.measureActionsTrack();
    this.measureActionsLabel();
    this.measureRowActionsFit();
    if (changed.has("panel")) this.syncSheetInsets();
    syncSearchbarInputName(this.shadowRoot, () => this.effSearchPlaceholder);
  }
  /** #75/#197 — Where the mobile sheet starts and ends. `position: fixed; inset: 0` painted it from
   *  y=0 to the screen edge: the app's `ion-header` (its own stacking context, above the content)
   *  covered the sheet's title and its only Close button — measured at 390×844 in the Appointments
   *  parity page — and the module tab bar (an `ion-footer` OUTSIDE `ion-content`) covered the last
   *  66px (ios) / 72px (md) of the sheet, so its Save button could not be tapped (inventory#105).
   *  CSS inside a shadow root cannot know where the content area begins or ends, so on open the
   *  table measures the closest `ion-content` (walking through shadow hosts) and hands both offsets
   *  over as custom properties, re-measuring them while the sheet stays open whenever the content
   *  resizes (rotation, a tab bar mounted late) or the window resizes; on close both are removed and
   *  the content stops being observed. Without an `ion-content` around, the sheet keeps the screen
   *  edge on both ends. */
  syncSheetInsets() {
    if (this.panel === "none") {
      this.style.removeProperty("--ok-sheet-top");
      this.style.removeProperty("--ok-sheet-bottom");
      this.sheetObserver?.disconnect();
      this.sheetContent = null;
      return;
    }
    let node = this;
    let content = null;
    while (node && !content) {
      const parent = node.parentNode ?? node.getRootNode?.()?.host ?? null;
      if (parent && parent.nodeType === Node.ELEMENT_NODE && parent.tagName === "ION-CONTENT") content = parent;
      node = parent === node ? null : parent;
    }
    const top = content ? Math.max(0, Math.round(content.getBoundingClientRect().top)) : 0;
    const bottom = content ? Math.max(0, Math.round(window.innerHeight - content.getBoundingClientRect().bottom)) : 0;
    this.style.setProperty("--ok-sheet-top", `${top}px`);
    this.style.setProperty("--ok-sheet-bottom", `${bottom}px`);
    if (typeof ResizeObserver !== "undefined") {
      this.sheetObserver ??= new ResizeObserver(() => {
        if (this.panel !== "none") this.syncSheetInsets();
      });
      if (content !== this.sheetContent) {
        this.sheetObserver.disconnect();
        if (content) this.sheetObserver.observe(content);
        this.sheetContent = content;
      }
    }
  }
  disconnectedCallback() {
    this.removeEventListener("keydown", this.onKeydown);
    if (typeof window !== "undefined") {
      window.removeEventListener("erplora:locale-changed", this.onLocaleChanged);
      window.removeEventListener("resize", this.onWindowResize);
    }
    this.xObserver?.disconnect();
    this.xObserver = void 0;
    this.hostObserver?.disconnect();
    this.hostObserver = void 0;
    this.siblingsObserver?.disconnect();
    this.siblingsObserver = void 0;
    this.sheetObserver?.disconnect();
    this.sheetObserver = void 0;
    this.sheetContent = null;
    if (this.mq) {
      const handler = this._mqHandler;
      if (handler) this.mq.removeEventListener("change", handler);
      this.mq = void 0;
    }
    super.disconnectedCallback();
  }
  // ── i18n: idioma del documento ← overrides explícitos de `.labels` ─────────────────────────
  get t() {
    const lang = typeof document === "undefined" ? "en" : document.documentElement.lang.toLowerCase();
    return { ...lang.startsWith("es") ? ES_LABELS : DEFAULT_LABELS2, ...this.labels };
  }
  /** Placeholder efectivo del buscador (prop explícita → label i18n → default inglés). */
  get effSearchPlaceholder() {
    return this.searchPlaceholder ?? this.t.search;
  }
  /** Mensaje efectivo de estado vacío (prop explícita → label i18n → default inglés). */
  get effEmptyMessage() {
    return this.emptyMessage ?? this.t.empty;
  }
  /** pm#530 — The last load failed: rows, «empty» and counts would all be claims about data the
   *  table does not have. */
  get loadFailed() {
    return !!this.error?.trim() && !this.awaitingRows;
  }
  /** #268 — A load is in flight and there is nothing current to show: no rows yet, or only the
   *  failure being retried. Neither «empty» nor a count would be true yet. */
  get awaitingRows() {
    return this.loading && (this.rows.length === 0 || !!this.error?.trim());
  }
  /** #171 — Effective "no matches" message (explicit prop → i18n label → English default). */
  get effNoMatchesMessage() {
    return this.noMatchesMessage ?? this.t.noMatches;
  }
  // ── Resolución de alias (compat + documentados) ──────────────────────────────────────────
  get effPageSizes() {
    return this.pageSizes ?? this.pageSizeOptions;
  }
  get effColumnPicker() {
    return this.columnPicker || this.columnSelector;
  }
  get effExport() {
    return this.csv || this.exportable;
  }
  get effImport() {
    return this.csv || this.importable;
  }
  /** ¿Está habilitado el conmutador de vista lista/tarjetas? */
  get viewToggle() {
    if (Array.isArray(this.views)) return this.views.length > 1;
    return this.views === true;
  }
  /** ¿Está disponible la vista tarjetas? (presente en `views` o `views === true`). */
  get cardViewEnabled() {
    if (Array.isArray(this.views)) return this.views.some((v3) => v3 === "cards" || v3 === "card");
    return this.views === true;
  }
  /** Columns painted now: the person's pick in the column chooser, else the column's own `hidden`.
   *  A hidden column is only not painted — it still filters, sorts and keeps its filter control
   *  (hub#2245), which read `columns`. */
  get visibleColumns() {
    return this.columns.filter((c5) => this.columnChoice.get(c5.key) ?? c5.hidden !== true);
  }
  setVisibleColumns(keys) {
    const visible = new Set(keys);
    this.columnChoice = new Map(this.columns.map((c5) => [c5.key, visible.has(c5.key)]));
    this.emit("columnsChange", { visible: keys });
  }
  // ── Selección ─────────────────────────────────────────────────────────────────────────────
  keyOf(row) {
    if (typeof this.rowKey === "function") return String(this.rowKey(row) ?? "");
    if (typeof this.rowKey === "string") return String(row[this.rowKey] ?? "");
    return String(row[this.rowKeyField] ?? "");
  }
  /** #143 — `<prefix>-<suffix>`, or `nothing` (= the attribute is not painted) when the host gave
   *  no prefix. A blank prefix counts as absent: `" "` would leave dangling `-add` hooks, identical
   *  on every table of the screen, which is exactly what the prefix prevents. */
  tid(suffix) {
    const prefix = this.testid?.trim();
    return prefix ? `${prefix}-${suffix}` : A;
  }
  get selection() {
    return this.selectedKeys ?? this.internalSelection;
  }
  setSelection(next) {
    if (!this.selectedKeys) this.internalSelection = next;
    this.emit("selectionChange", { keys: [...next] });
    this.requestUpdate();
  }
  toggleRow(key) {
    const next = new Set(this.selection);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this.setSelection(next);
  }
  toggleAll(visible) {
    const keys = visible.map((r6) => this.keyOf(r6));
    const allOn = keys.length > 0 && keys.every((k2) => this.selection.has(k2));
    const next = new Set(this.selection);
    if (allOn) keys.forEach((k2) => next.delete(k2));
    else keys.forEach((k2) => next.add(k2));
    this.setSelection(next);
  }
  // ── CSV ─────────────────────────────────────────────────────────────────────────────────────
  csvEscape(v3) {
    const s5 = v3 === null || v3 === void 0 ? "" : String(v3);
    return /[",\n\r]/.test(s5) ? `"${s5.replace(/"/g, '""')}"` : s5;
  }
  /** Exporta las filas a CSV (cabeceras = column.key). Si no hay filas, exporta solo la estructura. */
  exportCsv() {
    const cols = this.columns;
    const head = cols.map((c5) => this.csvEscape(c5.key)).join(",");
    const lines = this.rows.map((r6) => cols.map((c5) => this.csvEscape(r6[c5.key])).join(","));
    const csv = [head, ...lines].join("\r\n");
    const blob = new Blob([CSV_BOM + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a3 = document.createElement("a");
    a3.href = url;
    a3.download = this.csvName;
    a3.click();
    URL.revokeObjectURL(url);
    const count = this.rows.length;
    this.emit("csvExport", { rows: count, count });
    this.emit("export", { rows: count, count });
  }
  parseCsv(text) {
    const out = [];
    let row = [];
    let field = "";
    let q = false;
    for (let i7 = 0; i7 < text.length; i7++) {
      const c5 = text[i7];
      if (q) {
        if (c5 === '"') {
          if (text[i7 + 1] === '"') {
            field += '"';
            i7++;
          } else q = false;
        } else field += c5;
      } else if (c5 === '"') q = true;
      else if (c5 === ",") {
        row.push(field);
        field = "";
      } else if (c5 === "\n" || c5 === "\r") {
        if (c5 === "\r" && text[i7 + 1] === "\n") i7++;
        row.push(field);
        field = "";
        if (row.length > 1 || row[0] !== "") out.push(row);
        row = [];
      } else field += c5;
    }
    if (field !== "" || row.length) {
      row.push(field);
      out.push(row);
    }
    const headers = out.shift() ?? [];
    const rows3 = out.map((r6) => Object.fromEntries(headers.map((h4, i7) => [h4, r6[i7] ?? ""])));
    return { headers, rows: rows3 };
  }
  async onImportFile(ev) {
    const input = ev.target;
    const file = input.files?.[0];
    if (!file) return;
    const text = decodeCsvBuffer(await file.arrayBuffer());
    const { headers, rows: rows3 } = this.parseCsv(text);
    this.emit("csvImport", { headers, rows: rows3, count: rows3.length });
    this.emit("import", { headers, rows: rows3, count: rows3.length });
    input.value = "";
  }
  toggle(p4) {
    this.panelTitle = "";
    if (p4 === "filters" && this.panel !== "filters") {
      this.filterDraft = this.cloneFilters(this.clientFilters);
    }
    if (this.panel === p4) this.closePanel("toggle");
    else this.panel = p4;
  }
  /** Closes the side panel and, if one was actually open, emits `panelClose` with the panel that
   *  was open and the reason it closed. No-op (no event) when the panel is already `'none'`.
   *
   *  outfitkit#195 — modules that load the edit form after an `await` (read the full row, then
   *  fill the form) listen to `panelClose` to discard that pending load if the person closes the
   *  panel meanwhile (X, backdrop, Escape) before the reply arrives. */
  closePanel(reason) {
    if (this.panel === "none") return;
    const panel = this.panel;
    this.panel = "none";
    this.emit("panelClose", { panel, reason });
  }
  // ── Filtros en memoria (modo cliente): borrador → aplicar. ───────────────────────────────────
  cloneFilters(src) {
    const out = {};
    for (const [k2, f3] of Object.entries(src)) {
      out[k2] = { values: f3.values ? new Set(f3.values) : void 0, from: f3.from, to: f3.to };
    }
    return out;
  }
  // Fija el conjunto de valores seleccionados de una columna (multi-select del drawer = ion-select).
  setFilterValues(key, values) {
    const next = this.cloneFilters(this.filterDraft);
    const clean = (values ?? []).filter((v3) => v3 != null && v3 !== "");
    if (clean.length) next[key] = { ...next[key], values: new Set(clean) };
    else next[key] = { ...next[key], values: void 0 };
    this.filterDraft = next;
  }
  setFilterRange(key, edge, value) {
    const next = this.cloneFilters(this.filterDraft);
    next[key] = { ...next[key], [edge]: value };
    this.filterDraft = next;
  }
  applyFilters() {
    const clean = {};
    for (const [k2, f3] of Object.entries(this.filterDraft)) {
      if (f3.values && f3.values.size > 0 || f3.from || f3.to) clean[k2] = f3;
    }
    this.clientFilters = clean;
    this.clientPage = 0;
    this.mobileShown = 0;
    this.closePanel("apply");
    this.emit("filterChange", { filters: this.serializeFilters(clean) });
  }
  clearFilters() {
    this.filterDraft = {};
  }
  /** #171 — "Show all" under the no-matches state: drops the search AND the column filters, so
   *  every row is back in one tap. Consumers listening to `filterChange` hear the reset. */
  resetSearchAndFilters() {
    const hadFilters = Object.keys(this.clientFilters).length > 0;
    this.q = "";
    this.clientFilters = {};
    this.filterDraft = {};
    this.clientPage = 0;
    this.mobileShown = 0;
    if (hadFilters) this.emit("filterChange", { filters: {} });
  }
  serializeFilters(src) {
    const out = {};
    for (const [k2, f3] of Object.entries(src)) {
      if (f3.values && f3.values.size > 0) out[k2] = [...f3.values];
      else if (f3.from || f3.to) out[k2] = { from: f3.from ?? "", to: f3.to ?? "" };
    }
    return out;
  }
  /** Opens the side panel (public API for the module, e.g. "edit" opens the pre-filled form).
   *  `mode` sets the default header («New» / «Edit»); `opts.title` replaces it (e.g. «Editing service — Brushing»). */
  open(panel = "create", opts = {}) {
    this.panelTitle = panel === "filters" ? "" : (opts.title ?? "").trim();
    this.panel = panel;
  }
  /** Closes the side panel (public API for the module). Emits `panelClose` with reason `'api'`
   *  when a panel was actually open (outfitkit#195); no-op when it was already closed. */
  close() {
    this.closePanel("api");
  }
  emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }
  get hasSearch() {
    return this.searchable || this.searchKeys.length > 0;
  }
  /** Columnas filtrables (con control en el panel de filtros). En cliente y en servidor. */
  get filterColumns() {
    return this.columns.filter((c5) => c5.filterable);
  }
  /** ¿Hay que mostrar el botón de Filtros? (cualquier columna filtrable). */
  get hasFilterRow() {
    return this.filterColumns.length > 0;
  }
  /** Nº de filtros activos → badge del botón Filtros. En servidor cuenta `filterValues` (#106): sin
   *  esto el embudo no daba NINGUNA señal de que la lista venía acotada. */
  get activeFilterCount() {
    if (this.serverSide) {
      return Object.keys(this.serverFilters).filter((k2) => this.serverFilterState(k2) !== void 0).length;
    }
    return Object.values(this.clientFilters).filter(
      (f3) => f3.values && f3.values.size > 0 || f3.from || f3.to
    ).length;
  }
  // ── Estado de filtro VISIBLE (#106) ──────────────────────────────────────────────────────────
  /** Traduce un valor de `filterValues` (la forma que emite `filterChange`) a la forma interna que
   *  usan los `render*Filter`. `undefined` = ese filtro no está puesto. */
  serverFilterState(key) {
    const raw = this.serverFilters[key];
    if (raw === void 0 || raw === null || raw === "") return void 0;
    if (Array.isArray(raw)) {
      const values = raw.filter((v3) => v3 !== null && v3 !== void 0 && v3 !== "").map((v3) => String(v3));
      return values.length ? { values: new Set(values) } : void 0;
    }
    if (typeof raw === "object") {
      const range = raw;
      const from = range.from === null || range.from === void 0 || range.from === "" ? void 0 : String(range.from);
      const to = range.to === null || range.to === void 0 || range.to === "" ? void 0 : String(range.to);
      return from !== void 0 || to !== void 0 ? { from, to } : void 0;
    }
    return { values: /* @__PURE__ */ new Set([String(raw)]) };
  }
  /** Estado de filtro efectivo de una columna: servidor → `filterValues`/espejo; cliente → memoria. */
  filterStateOf(key) {
    return this.serverSide ? this.serverFilterState(key) : this.clientFilters[key];
  }
  /** Fija (o borra) el valor visible de un filtro en el espejo de servidor. */
  setServerFilter(key, value) {
    const next = { ...this.serverFilters };
    const empty = value === void 0 || value === null || value === "" || Array.isArray(value) && value.length === 0;
    if (empty) delete next[key];
    else next[key] = value;
    this.serverFilters = next;
  }
  /** Fija UN extremo de un rango en el espejo. Los dos extremos viajan en eventos SEPARADOS
   *  (`{from}` y luego `{to}`), así que aquí se MEZCLA: reemplazar borraría el otro extremo. */
  setServerRangeEdge(key, edge, value) {
    const prev = this.serverFilters[key];
    const base = prev && typeof prev === "object" && !Array.isArray(prev) ? { ...prev } : {};
    base[edge] = value;
    const alive = (v3) => v3 !== void 0 && v3 !== null && v3 !== "";
    this.setServerFilter(key, alive(base.from) || alive(base.to) ? base : void 0);
  }
  /** What a column shows, as the multi-select filter offers and matches it (`format` text if any). */
  shownValue(col, row) {
    if (col.format) return col.format(row);
    return row[col.key];
  }
  /** #256 - What a client-side sort and a date range filter compare: `sortValue`, else the field
   *  itself when it is DATA — a number, boolean, `Date`, ISO date/time or NUMERIC string («100.00»,
   *  how the hub hands over money) — so «15/01/2027» sorts after «31/12/2026» and «9,50 €» before
   *  «100,00 €» (AG Grid, MUI DataGrid, TanStack Table). Any other field (words, a status code, a
   *  stored «Sale <uuid>» the cell prints as a document number), a missing field or an object keeps
   *  sorting by the `format` text the person reads, as before #256. A null field sorts last. */
  sortKey(col, row) {
    if (col.sortValue) return col.sortValue(row);
    const value = row[col.key];
    if (!col.format || value === null) return value;
    if (typeof value === "number" || typeof value === "boolean" || value instanceof Date) return value;
    if (typeof value === "string") {
      if (NUMERIC_TEXT.test(value)) return Number(value);
      if (ISO_DATE_OR_TIME.test(value)) return value;
    }
    return col.format(row);
  }
  /** Valores distintos de una columna (para los chips del filtro multi-select). */
  distinctValues(col) {
    const set = /* @__PURE__ */ new Set();
    for (const row of this.rows) {
      const v3 = this.shownValue(col, row);
      if (v3 != null && v3 !== "") set.add(String(v3));
    }
    return [...set].sort((a3, b3) => a3.localeCompare(b3));
  }
  /** Filas tras buscar + filtrar + ordenar EN MEMORIA (solo modo cliente). */
  get clientFiltered() {
    let result = this.rows;
    const needle = this.q.trim().toLowerCase();
    if (needle && this.searchKeys.length) {
      result = result.filter(
        (r6) => this.searchKeys.some((k2) => String(r6[k2] ?? "").toLowerCase().includes(needle))
      );
    }
    const fkeys = Object.keys(this.clientFilters);
    if (fkeys.length) {
      result = result.filter(
        (row) => fkeys.every((key) => {
          const f3 = this.clientFilters[key];
          const col = this.columns.find((c5) => c5.key === key);
          if (!col) return true;
          if (f3.values && f3.values.size > 0) {
            return f3.values.has(String(this.shownValue(col, row) ?? ""));
          }
          if (f3.from || f3.to) {
            const raw = this.sortKey(col, row);
            const t5 = raw == null ? NaN : new Date(raw).getTime();
            const from = f3.from ? new Date(f3.from).getTime() : -Infinity;
            const to = f3.to ? new Date(f3.to).getTime() + 864e5 - 1 : Infinity;
            return !Number.isNaN(t5) && t5 >= from && t5 <= to;
          }
          return true;
        })
      );
    }
    if (this.clientSort) {
      const col = this.columns.find((c5) => c5.key === this.clientSort);
      if (col) {
        const dir = this.clientSortDir === "asc" ? 1 : -1;
        result = [...result].sort((a3, b3) => {
          const va = this.sortKey(col, a3);
          const vb = this.sortKey(col, b3);
          if (va == null) return 1;
          if (vb == null) return -1;
          if (va < vb) return -1 * dir;
          if (va > vb) return 1 * dir;
          return 0;
        });
      }
    }
    return result;
  }
  /** #217 - The text cell of the list view. It keeps its one-line clip, and the full text rides
   *  along as the native `title` (hover, like MUI DataGrid, Ant Design's `ellipsis.showTitle` and
   *  ok-heatmap). Screen readers already get the whole text: the clip is only paint. */
  textCell(col, row, rowKey) {
    const text = String(this.cell(col, row) ?? "");
    const id = `${rowKey}\u241F${col.key}`;
    return b2`<span
      class=${this.unfoldedCells.has(id) ? "unfolded" : A}
      title=${text === "" ? A : text}
      @pointerdown=${this.notePointer}
      @click=${(e5) => this.onCellTap(e5, id)}
    >${text}</span>`;
  }
  /** #217 - A touch screen has no hover, so the `title` never shows there. A row that opens a
   *  record keeps opening it on the first tap (the record shows the full text; swallowing the tap
   *  would make "open" a two-tap gesture on some rows only). In a table whose rows open nothing, a
   *  tap on a clipped cell unfolds it in place. A cell that fits, and a mouse click, change nothing. */
  onCellTap(e5, id) {
    if (this.rowClickable || this.lastPointerType !== "touch") return;
    const span = e5.currentTarget;
    if (span.scrollWidth <= span.clientWidth) return;
    this.unfoldedCells = new Set(this.unfoldedCells).add(id);
  }
  cell(col, row) {
    if (col.format) return col.format(row);
    const v3 = row[col.key];
    return v3 === null || v3 === void 0 ? "" : String(v3);
  }
  /** ¿Es ordenable la columna? Servidor: opt-in (`sortable`). Cliente: por defecto SÍ (como el Hub),
   *  salvo `sortable: false` explícito. */
  isSortable(col) {
    return this.serverSide ? !!col.sortable : col.sortable !== false;
  }
  onHeaderClick(col) {
    if (!this.isSortable(col)) return;
    if (this.serverSide) {
      const dir = this.sort === col.key && this.sortDir === "asc" ? "desc" : "asc";
      this.emit("sortChange", { sort: col.key, dir });
      return;
    }
    this.mobileShown = 0;
    if (this.clientSort === col.key) {
      this.clientSortDir = this.clientSortDir === "asc" ? "desc" : "asc";
    } else {
      this.clientSort = col.key;
      this.clientSortDir = "asc";
    }
  }
  onFilterInput(col, ev) {
    const value = ev.target.value ?? "";
    this.setServerFilter(col.key, value);
    this.emit("filterChange", { col: col.key, value });
  }
  onRangeInput(col, edge, ev) {
    const raw = ev.target.value ?? "";
    const v3 = raw === "" ? "" : Number(raw);
    this.setServerRangeEdge(col.key, edge, v3);
    this.emit("filterChange", { col: col.key, value: { [edge]: v3 } });
  }
  onDateRangeInput(col, edge, ev) {
    const v3 = ev.target.value ?? "";
    this.setServerRangeEdge(col.key, edge, v3);
    this.emit("filterChange", { col: col.key, value: { [edge]: v3 } });
  }
  // ── Filtros EN LÍNEA (toolbar) ────────────────────────────────────────────────────────────
  // En modo cliente escriben directamente `clientFilters` (filtran en memoria); en servidor solo
  // emiten `filterChange`. Reutilizan la misma forma de filtro que el drawer (values / from / to).
  setClientFilter(key, patch) {
    const next = { ...this.clientFilters };
    const merged = { ...next[key], ...patch };
    const empty = (!merged.values || merged.values.size === 0) && !merged.from && !merged.to;
    if (empty) delete next[key];
    else next[key] = merged;
    this.clientFilters = next;
    this.clientPage = 0;
    this.mobileShown = 0;
  }
  // ion-select (select/multiselect) del panel de filtros (renderFilterControl). En servidor emite
  // `filterChange`; en cliente escribe `clientFilters` (multiselect ⇒ filtra por inclusión).
  onFilterSelect(col, value, multi) {
    if (this.serverSide) {
      const next = value ?? (multi ? [] : "");
      this.setServerFilter(col.key, next);
      this.emit("filterChange", { col: col.key, value: next });
      return;
    }
    if (multi) {
      const arr = Array.isArray(value) ? value.map((v3) => String(v3)) : value != null && value !== "" ? [String(value)] : [];
      this.setClientFilter(col.key, { values: arr.length ? new Set(arr) : void 0 });
    } else {
      const v3 = String(value ?? "");
      this.setClientFilter(col.key, { values: v3 ? /* @__PURE__ */ new Set([v3]) : void 0 });
    }
  }
  onInlineRange(col, edge, ev) {
    const v3 = ev.target.value ?? "";
    if (this.serverSide) {
      this.setServerRangeEdge(col.key, edge, v3);
      this.emit("filterChange", { col: col.key, value: { [edge]: v3 } });
      return;
    }
    this.setClientFilter(col.key, { [edge]: v3 || void 0 });
  }
  // Overflow menu: anchor the popover to the tapped button via Ionic's `ionShadowTarget`
  // (the retargeted `ev.target` after dispatch would be the whole table, since `trigger` does not
  // resolve inside Shadow DOM).
  openMenu(ev) {
    this.menuEv = shadowAnchorEvent(ev);
    this.menuOpen = true;
  }
  /** #122 — Opens the «⋮» menu of ONE row. A single popover for the whole table (one per row would
   *  be as many as there are rows), anchored to the tapped button via Ionic's `ionShadowTarget`
   *  (the retargeted `ev.target` after dispatch would be the whole table). */
  openRowMenu(ev, row) {
    ev.stopPropagation();
    this.rowMenuEv = shadowAnchorEvent(ev);
    this.rowMenuRow = row;
    this.rowMenuOpen = true;
  }
  /** #122 — Las mismas acciones de la fila, como lista. Respeta `disabled`/`loading` por fila: una
   *  acción que no se puede pulsar en su botón tampoco se puede pulsar aquí. */
  renderRowMenu() {
    const kept = this.rowMenuRow;
    if (!this.actions.length || !kept) return A;
    const key = this.keyOf(kept);
    const row = key && this.rows.find((r6) => this.keyOf(r6) === key) || kept;
    const actions = this.visibleActions(row);
    return b2`
      <ion-popover
        class="row-menu"
        .isOpen=${this.rowMenuOpen}
        .event=${this.rowMenuEv}
        dismiss-on-select="true"
        @didDismiss=${() => this.rowMenuOpen = false}
      >
        <ion-content>
          <ion-list lines="none">
            ${actions.map((a3) => {
      const disabled = a3.loading?.(row) === true || a3.disabled?.(row) === true;
      const label = typeof a3.label === "function" ? a3.label(row) : a3.label;
      return b2`
                <!-- #143 — The action is named the SAME collapsed or not, so one spec works at any
                     width. It carries the hook only while the direct buttons are NOT there: the
                     popover survives its dismissal («rowMenuRow» is not cleared), and if the table
                     widened again there would be TWO elements with the hook and «getByTestId»
                     would pick one at random. -->
                <ion-item
                  button
                  data-testid=${this.rowActionsFolded(actions) ? this.tid(`row-${key}-${a3.id}`) : A}
                  ?disabled=${disabled}
                  aria-disabled=${disabled ? "true" : A}
                  .detail=${false}
                  @click=${() => {
        if (disabled) return;
        this.rowMenuOpen = false;
        this.emit("rowAction", { actionId: a3.id, row });
      }}
                >
                  ${a3.icon ? b2`<ion-icon slot="start" .icon=${okIcon(a3.icon)} style=${ionTone2(a3.color, "text") ?? A}></ion-icon>` : A}
                  <ion-label style=${ionTone2(a3.color, "text") ?? A}>${label}</ion-label>
                </ion-item>
              `;
    })}
          </ion-list>
        </ion-content>
      </ion-popover>
    `;
  }
  // Aplica la vista inicial declarada (`default-view`) una sola vez, tras el primer render. Es la
  // forma robusta de arrancar en tarjetas sin depender de fijar `viewMode` por referencia (que
  // falla si la tabla monta detrás de un `v-if`/loading y el ref aún es null).
  firstUpdated() {
    this.applyInitialView();
  }
  /** Re-evalúa la vista inicial cada render mientras el usuario no haya elegido a mano.
   *
   * `firstUpdated` NO basta: decide una sola vez, y los consumidores que asignan las props por JS
   * DESPUÉS de insertar el elemento —lo normal en páginas renderizadas por el servidor— llegan
   * tarde. En ese momento `cardViewEnabled` aún era `false`, así que no se conmutaba; y el
   * listener de `matchMedia` solo dispara al CAMBIAR el viewport, cosa que en un móvil no pasa
   * nunca. La tabla se quedaba con scroll lateral para siempre.
   *
   * Medido en Android contra producción el 2026-08-02 con el bundle ya actualizado:
   *   `views` antes de insertar  → tarjetas
   *   `views` después de insertar → tabla   ← lo que hace la página
   */
  willUpdate(changed) {
    if (changed.has("columns") || changed.has("actions") || changed.has("columnChoice") || changed.has("selectable")) {
      const shape = this.fitShapeOf();
      if (shape !== this.fitShape) {
        this.fitShape = shape;
        if (this.fitCards) {
          this.fitCards = false;
          this.fitCardsWidth = 0;
          if (!this.viewChosenByUser) this.viewMode = "table";
        }
      }
    }
    this.applyInitialView();
    if (changed.has("rows") && this.unfoldedCells.size) this.unfoldedCells = /* @__PURE__ */ new Set();
    if (changed.has("rows") || changed.has("actions")) {
      this.gapLabels.clear();
      this.slotActionsCache = null;
    }
    if (changed.has("filterValues")) this.serverFilters = { ...this.filterValues ?? {} };
    if (changed.has("search") && this.search !== void 0) {
      this.q = this.search;
      if (!this.serverSide) {
        this.clientPage = 0;
        this.mobileShown = 0;
      }
    }
    if (!this.serverSide && changed.has("rows") && this.mobileShown !== 0 && !this.sameRecords(changed.get("rows"), this.rows))
      this.mobileShown = 0;
  }
  /** hub#2245 — Same records, same order, told apart by their key. Rows without a key cannot be
   *  told apart, so they never count as the same (the window starts again, as before). */
  sameRecords(before, after) {
    if (!before || before.length !== after.length) return false;
    return after.every((row, i7) => {
      const key = this.keyOf(row);
      return key !== "" && key === this.keyOf(before[i7]);
    });
  }
  applyInitialView() {
    if (this.viewChosenByUser) return;
    if (this.isMobile && this.cardViewEnabled) {
      this.viewMode = "cards";
    } else if (this.defaultView === "cards" && this.cardViewEnabled) {
      this.viewMode = "cards";
    } else if (this.fitCards && this.cardViewEnabled) {
      this.viewMode = "cards";
    } else if (this.defaultView === "table") {
      this.viewMode = "table";
    }
  }
  setViewMode(mode) {
    this.viewChosenByUser = true;
    if (this.viewMode === mode) return;
    this.viewMode = mode;
    this.emit("viewChange", mode);
  }
  // Control de filtro de una columna, con componentes Ionic (mismos inputs que el form de alta).
  renderFilterControl(col) {
    if (!col.filterable) return A;
    const type = col.filterType ?? "text";
    const f3 = this.filterStateOf(col.key);
    if (type === "select" || type === "multiselect") {
      const multi = type === "multiselect";
      const opts = col.options ?? this.distinctValues(col).map((v3) => ({ value: v3, label: v3 }));
      const current = this.selectValue(f3, multi);
      return b2`
        <ion-select
          label=${col.header}
          label-placement="stacked"
          fill="outline" mode="md"
          ?multiple=${multi}
          interface="modal"
          .interfaceOptions=${{ cssClass: "ok-overlay" }}
          placeholder=${this.t.select}
          .value=${current}
          @ionChange=${(e5) => this.onFilterSelect(col, e5.detail.value, multi)}
        >
          ${multi ? A : b2`<ion-select-option value="">${this.t.select}</ion-select-option>`}
          ${opts.map((o7) => b2`<ion-select-option value=${o7.value}>${o7.label}</ion-select-option>`)}
        </ion-select>
      `;
    }
    if (type === "range" || type === "daterange") {
      const t5 = type === "daterange" ? "date" : "number";
      const onEdge = type === "daterange" ? this.onDateRangeInput.bind(this) : this.onRangeInput.bind(this);
      return b2`
        <div class="fblock">
          <span class="flabel">${col.header}</span>
          <div class="frange">
            <ion-input type=${t5} fill="outline" mode="md" placeholder=${type === "daterange" ? this.t.from : this.t.gte}
              .value=${f3?.from ?? ""}
              @ionInput=${(e5) => onEdge(col, "from", e5)}></ion-input>
            <ion-input type=${t5} fill="outline" mode="md" placeholder=${type === "daterange" ? this.t.to : this.t.lte}
              .value=${f3?.to ?? ""}
              @ionInput=${(e5) => onEdge(col, "to", e5)}></ion-input>
          </div>
        </div>
      `;
    }
    const inputType = type === "number" ? "number" : type === "date" ? "date" : "text";
    return b2`
      <ion-input
        type=${inputType}
        fill="outline" mode="md"
        label=${col.header}
        label-placement="stacked"
        placeholder=${this.t.filterPlaceholder}
        .value=${this.selectValue(f3, false)}
        @ionInput=${(e5) => this.onFilterInput(col, e5)}
      ></ion-input>
    `;
  }
  /** Valor para un control de un solo valor (`ion-select`/`ion-input`) o multi (`ion-select
   *  multiple`) a partir del estado de filtro interno. '' / [] = sin filtro. */
  selectValue(f3, multi) {
    const values = [...f3?.values ?? /* @__PURE__ */ new Set()];
    if (multi) return values;
    return values.length ? values[0] : "";
  }
  // Controles de filtro COMPACTOS para la toolbar (modo `inlineFilters`). Solo select y rango de
  // fechas (los del screenshot); el resto de tipos siguen disponibles vía el drawer si no se activa
  // `inlineFilters`. Look: «Todos los Estados» (placeholder) / «01/10/25 → 18/10/25».
  renderInlineFilters() {
    const cols = this.filterColumns.filter((c5) => {
      const t5 = c5.filterType ?? "text";
      return t5 === "select" || t5 === "multiselect" || t5 === "date" || t5 === "daterange";
    });
    if (!cols.length) return A;
    return b2`${cols.map((c5) => this.renderInlineFilter(c5))}`;
  }
  renderInlineFilter(col) {
    const type = col.filterType ?? "text";
    const f3 = this.filterStateOf(col.key);
    if (type === "select" || type === "multiselect") {
      const multi = type === "multiselect";
      const opts = col.options ?? this.distinctValues(col).map((v3) => ({ value: v3, label: v3 }));
      const current = this.selectValue(f3, multi);
      return b2`
        <ion-select
          class="tk-filter"
          ?multiple=${multi}
          interface="modal"
          .interfaceOptions=${{ cssClass: "ok-overlay" }}
          aria-label=${col.header}
          placeholder=${col.header}
          .value=${current}
          @ionChange=${(e5) => this.onFilterSelect(col, e5.detail.value, multi)}
        >
          ${multi ? A : b2`<ion-select-option value="">${col.header}</ion-select-option>`}
          ${opts.map((o7) => b2`<ion-select-option value=${o7.value}>${o7.label}</ion-select-option>`)}
        </ion-select>
      `;
    }
    return b2`
      <span class="tk-daterange" role="group" aria-label=${col.header}>
        <ion-icon .icon=${iconCalendarOutline}></ion-icon>
        <ion-input type="date" aria-label=${this.t.fromOf.replace("{label}", col.header)} .value=${f3?.from ?? ""} @ionChange=${(e5) => this.onInlineRange(col, "from", e5)}></ion-input>
        <span class="arr">→</span>
        <ion-input type="date" aria-label=${this.t.toOf.replace("{label}", col.header)} .value=${f3?.to ?? ""} @ionChange=${(e5) => this.onInlineRange(col, "to", e5)}></ion-input>
      </span>
    `;
  }
  // Menú overflow («⋮») con ion-popover anclado por evento (Shadow-DOM-safe).
  renderOverflowMenu() {
    if (!this.menuActions.length) return A;
    return b2`
      <ion-button class="toolbtn" fill="clear" aria-label=${this.t.moreActions} @click=${(e5) => this.openMenu(e5)}>
        <ion-icon slot="icon-only" .icon=${iconEllipsisVertical}></ion-icon>
      </ion-button>
      <ion-popover
        .isOpen=${this.menuOpen}
        .event=${this.menuEv}
        dismiss-on-select="true"
        @didDismiss=${() => this.menuOpen = false}
      >
        <ion-content>
          <ion-list lines="none">
            ${this.menuActions.map(
      (a3) => b2`
                <ion-item button .detail=${false} @click=${() => {
        this.menuOpen = false;
        this.emit("menuAction", { actionId: a3.id });
      }}>
                  ${a3.icon ? b2`<ion-icon slot="start" .icon=${okIcon(a3.icon)} style=${ionTone2(a3.color, "text") ?? A}></ion-icon>` : A}
                  <ion-label style=${ionTone2(a3.color, "text") ?? A}>${a3.label}</ion-label>
                </ion-item>
              `
    )}
          </ion-list>
        </ion-content>
      </ion-popover>
    `;
  }
  // Row action buttons, shared by the table and the card views.
  //
  // `collapsible` = the LIST view, the only one that folds its buttons into a "⋮" menu when the
  // columns leave it no width (#122). The CARD view does not fold; it WRAPS instead, see
  // `.ractions .actions` in the stylesheet.
  //
  // This comment used to claim that a card's actions "always fit across the card". They do not,
  // and nobody had measured it (#132 / ERPlora/appointments#154): with the eight actions an
  // appointment carries, the row asks for 380px and the card gives 379px at 411dp, 237px at 768px
  // and 272px at 1440px — so the first button hung off the card at ALL THREE widths, not just on
  // a phone. If you add a view that lays these buttons out, MEASURE it.
  /** hub#2014 — The row actions that exist for THIS row (`hidden` filtered out), in their order. */
  visibleActions(row) {
    return this.actions.filter((a3) => a3.hidden?.(row) !== true);
  }
  /** #213 — Are THESE row actions folded into the "..." menu? Only when the list view folds (#122)
   *  AND there is more than one: an overflow menu groups several actions, it never replaces a
   *  single one (Polaris, MUI DataGrid) — it would take the same width and cost one more tap.
   *  Except a single TEXT-only action (no icon): its button is wider than the "..." one, and left
   *  out it spills over the data columns (measured at 390px), so folding it does free width. */
  rowActionsFolded(actions) {
    return this.rowActionsCollapsed && (actions.length > 1 || actions.length === 1 && !actions[0].icon);
  }
  gapLabel(a3) {
    if (typeof a3.label !== "function") return a3.label;
    let text = this.gapLabels.get(a3);
    if (text === void 0) {
      const shown = this.rows.find((r6) => a3.hidden?.(r6) !== true);
      text = shown ? a3.label(shown) : "";
      this.gapLabels.set(a3, text);
    }
    return text;
  }
  slotActions() {
    return this.slotActionsCache ??= this.actions.filter((a3) => this.rows.some((r6) => a3.hidden?.(r6) !== true));
  }
  actionButtons(row, collapsible = false) {
    if (!this.actions.length) return A;
    const key = this.keyOf(row);
    const actions = this.visibleActions(row);
    if (collapsible && this.rowActionsCollapsed) {
      if (!actions.length) return b2`<div class="actions"></div>`;
      if (this.rowActionsFolded(actions)) return b2`
        <div class="actions">
          <ion-button
            size="small"
            fill="clear"
            style=${ionTone2("medium", "clear")}
            data-testid=${this.tid(`row-${key}-menu`)}
            aria-label=${this.t.moreActions}
            title=${this.t.moreActions}
            aria-haspopup="menu"
            @click=${(e5) => this.openRowMenu(e5, row)}
          >
            <ion-icon slot="icon-only" .icon=${okIcon(iconEllipsisVertical)}></ion-icon>
          </ion-button>
        </div>
      `;
    }
    const slots = collapsible && !this.rowActionsCollapsed ? this.slotActions() : actions;
    return b2`
      <div class="actions">
        ${slots.map(
      (a3) => {
        if (a3.hidden?.(row) === true) {
          return b2`
              <ion-button class="action-gap" size="small" fill="clear" data-slot-for=${a3.id} aria-hidden="true" inert>
                ${a3.icon ? b2`<ion-icon slot="icon-only" .icon=${okIcon(a3.icon)}></ion-icon>` : this.gapLabel(a3)}
              </ion-button>
            `;
        }
        const loading = a3.loading?.(row) === true;
        const disabled = loading || a3.disabled?.(row) === true;
        const label = typeof a3.label === "function" ? a3.label(row) : a3.label;
        return b2`
            <ion-button
              size="small"
              fill="clear"
              style=${ionTone2(a3.color ?? "medium", "clear") ?? A}
              data-testid=${this.tid(`row-${key}-${a3.id}`)}
              ?disabled=${disabled}
              aria-disabled=${disabled ? "true" : A}
              aria-label=${label}
              title=${label}
              @click=${() => this.emit("rowAction", { actionId: a3.id, row })}
            >
              ${loading ? b2`<ion-spinner slot="icon-only" name="dots"></ion-spinner>` : a3.icon ? b2`<ion-icon slot="icon-only" .icon=${okIcon(a3.icon)}></ion-icon>` : label}
            </ion-button>
          `;
      }
    )}
      </div>
    `;
  }
  // Icon-only bar button (filters / create / view switch). `on` = active look.
  // Optional `badge` → counter (e.g. number of active filters), Hub look.
  // #247 - `toggle` makes it a toggle button: `on` is also announced as `aria-pressed`, so a screen
  // reader hears which view is on instead of it living only in the fill. Ionic 8 copies
  // `aria-pressed` to its inner <button> and watches it, so every later switch reaches the AX tree.
  toolButton(icon, on, onClick, label, badge, testid = A, toggle = false) {
    return b2`
      <ion-button class="toolbtn" size="small" fill=${on ? "solid" : "outline"} data-testid=${testid} title=${label} aria-label=${label} aria-pressed=${toggle ? String(on) : A} @click=${onClick}>
        <ion-icon slot="icon-only" .icon=${okIcon(icon)}></ion-icon>
        ${badge && badge > 0 ? b2`<span class="badge">${badge}</span>` : A}
      </ion-button>
    `;
  }
  /** Plantilla de columnas del grid de la vista lista: [checkbox] [columnas…] [acciones]. */
  gridTemplate() {
    return [
      this.selectable ? "2.75rem" : null,
      // #120 - 5.5rem (88px) is the narrowest a data column can be and stay readable: ~11
      // characters at 14px, plus the ellipsis `.gcell > span` already applies. With the previous
      // floor (8rem = 128px) the six columns of a bookings list did not fit the counter tablet
      // (128x6 + 188 for actions + gaps = 1036px against 834) and the pinned column ended up on
      // top of the data. With 5.5rem they fit (796px) and `1fr` stretches them to 94px each.
      ...this.visibleColumns.map((c5) => c5.width ?? "minmax(5.5rem,1fr)"),
      // #121 - a LENGTH, not `max-content`. The header and every row are separate grids that
      // share this string, and a content-sized track is not a length: each grid resolves it
      // against ITS OWN content - the word "ACCIONES" (62.83px) in the header, four buttons
      // (188px) in the row. The leftover the `1fr` columns share then differed between the two,
      // and the header slid right, up to 125px by the last column (measured at 834px).
      // `actionsTrackPx` is the width of the buttons MEASURED on screen, so it also keeps #120's
      // contract: the track never shrinks under its content (an `auto` track collapsed to 16px
      // and the buttons spilled over the neighbouring column). Until the first measurement lands
      // - one frame - `max-content` reserves the same room it always did.
      this.actions.length ? this.actionsTrackPx > 0 ? `${this.actionsTrackPx}px` : "max-content" : null
    ].filter(Boolean).join(" ");
  }
  /** Lista de páginas a mostrar en el pager numerado (1-based): primera, última, vecinas de la
   *  actual y «…» donde haya saltos. P.ej. en página 1 de 52 → [1,2,3,'…',52]. */
  pageList(cur1, total) {
    if (total <= 7) return Array.from({ length: total }, (_2, i7) => i7 + 1);
    const want = /* @__PURE__ */ new Set([1, total, cur1, cur1 - 1, cur1 + 1]);
    if (cur1 <= 3) [2, 3].forEach((p4) => want.add(p4));
    if (cur1 >= total - 2) [total - 1, total - 2].forEach((p4) => want.add(p4));
    const sorted = [...want].filter((p4) => p4 >= 1 && p4 <= total).sort((a3, b3) => a3 - b3);
    const out = [];
    let prev = 0;
    for (const p4 of sorted) {
      if (p4 - prev > 1) out.push("\u2026");
      out.push(p4);
      prev = p4;
    }
    return out;
  }
  render() {
    const ps = this.serverSide ? this.pageSize : this.clientPageSize || this.pageSize;
    let visible;
    let pages;
    let current;
    let count;
    if (this.serverSide) {
      visible = this.rows;
      count = this.total;
      pages = Math.max(1, Math.ceil(this.total / ps));
      current = Math.min(this.page, pages - 1);
    } else {
      const filtered = this.clientFiltered;
      count = filtered.length;
      pages = Math.max(1, Math.ceil(filtered.length / ps));
      current = Math.min(this.clientPage, pages - 1);
      visible = this.isMobile ? filtered.slice(0, Math.min(this.mobileShown || ps, count)) : filtered.slice(current * ps, current * ps + ps);
    }
    const served = this.serverSide ? (current + 1) * ps : Math.min(this.mobileShown || ps, count);
    const canLoadMore = this.isMobile && served < count;
    const rangeTo = this.isMobile && !this.serverSide ? Math.min(served, count) : Math.min((current + 1) * ps, count);
    const rangeFrom = !this.isMobile ? current * ps + 1 : this.serverSide ? this.rows.length ? Math.max(1, rangeTo - this.rows.length + 1) : current * ps + 1 : 1;
    const loadMore = () => {
      if (this.serverSide) this.emit("pageChange", current + 1);
      else this.mobileShown = Math.min((this.mobileShown || ps) + ps, count);
    };
    const goTo = (p4) => {
      if (this.serverSide) this.emit("pageChange", p4);
      else this.clientPage = p4;
    };
    const setPageSize = (n6) => {
      if (this.serverSide) this.emit("pageSizeChange", n6);
      else {
        this.clientPageSize = n6;
        this.clientPage = 0;
        this.mobileShown = 0;
      }
    };
    const searchbar = b2`<ion-searchbar class="ion-no-border" data-testid=${this.tid("search")} .value=${this.q} placeholder=${this.effSearchPlaceholder} debounce="250" @ionInput=${this.onSearch}></ion-searchbar>`;
    const selCount = this.selection.size;
    const showTopbar = !!this.title || this.hasSearch || this.viewToggle || this.effColumnPicker || this.effExport || this.effImport || this.hasFilterRow || this.addable || !!this.primaryAction;
    return b2`
      <div class=${`card${this.panel !== "none" ? " has-panel" : ""}`} aria-busy=${this.loading ? "true" : A}>
        ${showTopbar ? b2`
              <div class="bar">
                <div class="bar-main">
                  ${this.title ? b2`<div class="title-wrap"><h2 class="title">${this.title}</h2>${this.loadFailed || this.awaitingRows ? A : b2`<span class="title-count">${count}</span>`}</div>` : A}
                  ${this.hasSearch ? b2`<div class="search">${searchbar}</div>` : A}
                  ${this.inlineFilters ? this.renderInlineFilters() : A}
                  <span class="tk-spacer"></span>
                    ${this.effColumnPicker && !this.isMobile ? b2`
                          <ion-select
                            class="tk-cols"
                            multiple
                            interface="popover"
                            aria-label=${this.t.columnsVisible}
                            .value=${this.visibleColumns.map((c5) => c5.key)}
                            .selectedText=${this.t.columns}
                            @ionChange=${(e5) => this.setVisibleColumns(e5.detail.value)}
                          >
                            ${this.columns.map((c5) => b2`<ion-select-option value=${c5.key}>${c5.header}</ion-select-option>`)}
                          </ion-select>
                        ` : A}
                    ${this.effPageSizes.length && !this.isMobile ? b2`
                          <ion-select
                            class="tk-psize"
                            interface="popover"
                            aria-label=${this.t.rowsPerPage}
                            .value=${ps}
                            @ionChange=${(e5) => setPageSize(Number(e5.detail.value))}
                          >
                            ${this.effPageSizes.map((n6) => b2`<ion-select-option .value=${n6}>${n6}</ion-select-option>`)}
                          </ion-select>
                        ` : A}
                    ${this.viewToggle ? b2`
                          <span class="viewseg">
                            ${this.toolButton("list-outline", this.viewMode === "table", () => this.setViewMode("table"), this.t.viewList, void 0, A, true)}
                            ${this.toolButton("grid-outline", this.viewMode === "cards", () => this.setViewMode("cards"), this.t.viewCards, void 0, A, true)}
                          </span>
                        ` : A}
                    ${this.hasFilterRow && !this.inlineFilters ? this.toolButton("funnel-outline", this.panel === "filters" || this.activeFilterCount > 0, () => this.toggle("filters"), this.t.filters, this.activeFilterCount) : A}
                    ${this.effImport ? b2`
                          ${this.toolButton("cloud-upload-outline", false, () => this.renderRoot.querySelector(".tk-file")?.click(), this.t.importCsv)}
                          <!-- #143 — The import hook goes on the INPUT, not on the button that
                               triggers it: what a spec drives is «setInputFiles», and nobody opens
                               the button's native dialog from a test. Same criterion as
                               «GrantFilePicker.vue» in the Hub (the hook goes on the control, not
                               on its disguise). -->
                          <input class="tk-file" data-testid=${this.tid("csv-import")} type="file" accept=".csv,text/csv" hidden @change=${(e5) => this.onImportFile(e5)} />
                        ` : A}
                    ${this.effExport ? this.toolButton("download-outline", false, () => this.exportCsv(), this.t.exportCsv, void 0, this.tid("csv-export")) : A}
                    <!-- #113 — Mismo botón en los dos viewports: la acción principal de la pantalla
                         se lee, no se adivina. En escritorio era un «+» de 36px idéntico a los
                         iconos de vista/filtrar/exportar, y era el último de cuatro. -->
                    ${this.addable ? b2`
                          <ion-button class="primary-btn add-btn" data-testid=${this.tid("add")} size="small" @click=${() => this.toggle("create")}>
                            <ion-icon slot="start" .icon=${okIcon("add")}></ion-icon>${this.t.add}
                          </ion-button>
                        ` : A}
                    ${this.renderOverflowMenu()}
                    ${this.primaryAction ? b2`
                          <!-- #143 — Its own hook and NOT «-add»: «addable» and «primaryAction» are
                               two different buttons that may coexist, and both are really used
                               («addable» in the modules, «primaryAction» in the SaaS screens).
                               Sharing the name would give two elements with the same hook as soon
                               as a screen declared both. -->
                          <ion-button class="primary-btn add-btn" data-testid=${this.tid("primary-action")} size="small" @click=${() => this.emit("primaryAction", {})}>
                            <ion-icon slot="start" .icon=${okIcon(this.primaryAction.icon ?? "add")}></ion-icon>${this.primaryAction.label}
                          </ion-button>
                        ` : A}
                    <!-- El módulo proyecta aquí acciones globales adicionales. -->
                    <slot name="toolbar"></slot>
                </div>
                ${this.selectable && selCount > 0 ? b2`
                      <div class="selbar">
                        <strong>${this.t.selected.replace("{n}", String(selCount))}</strong>
                        <button class="sel-clear" @click=${() => this.setSelection(/* @__PURE__ */ new Set())}>
                          <ion-icon .icon=${iconClose} style="font-size:14px"></ion-icon> ${this.t.clear}
                        </button>
                      </div>
                    ` : A}
              </div>
            ` : A}

        ${this.awaitingRows ? this.loadingState() : this.loadFailed ? this.errorState() : this.viewMode === "cards" && this.cardViewEnabled ? this.renderCards(visible) : this.renderTable(visible)}

        ${!this.loadFailed && (this.awaitingRows ? (
      // #268 — Nothing to count or page through yet: the footer only stays to hold its
      // page-size selector (no toolbar), never as an empty strip.
      !showTopbar && this.effPageSizes.length
    ) : pages > 1 || this.effPageSizes.length) ? b2`
              <div class="pager">
                <div class="left">
                  <span>
                    ${pages > 1 && !this.awaitingRows ? b2`${this.t.showing.replace("{from}", String(rangeFrom)).replace("{to}", String(rangeTo))} ` : A}
                    ${this.awaitingRows ? A : b2`<span class="strong">${count}</span> ${count === 1 ? this.t.recordSingular : this.t.recordPlural}`}
                  </span>
                  ${!showTopbar && this.effPageSizes.length ? b2`
                        <select class="psize" @change=${(e5) => setPageSize(Number(e5.target.value))}>
                          ${this.effPageSizes.map((n6) => b2`<option value=${n6} ?selected=${n6 === ps}>${this.t.perPageShort.replace("{n}", String(n6))}</option>`)}
                        </select>
                      ` : A}
                </div>
                ${this.isMobile ? canLoadMore && !this.awaitingRows ? b2`<ion-button class="load-more" data-testid=${this.tid("load-more")} size="small" @click=${loadMore}>${this.t.loadMore}</ion-button>` : A : pages > 1 && !this.awaitingRows ? b2`
                      <div class="nav">
                        <ion-button size="small" fill="clear" data-testid=${this.tid("page-prev")} ?disabled=${current === 0} @click=${() => goTo(current - 1)}><ion-icon slot="icon-only" .icon=${iconChevronBack}></ion-icon></ion-button>
                        ${this.pageList(current + 1, pages).map(
      (p4) => p4 === "\u2026" ? b2`<span class="pgap">…</span>` : b2`<button class=${`pnum${p4 === current + 1 ? " on" : ""}`} @click=${() => goTo(p4 - 1)}>${p4}</button>`
    )}
                        <ion-button size="small" fill="clear" data-testid=${this.tid("page-next")} ?disabled=${current >= pages - 1} @click=${() => goTo(current + 1)}><ion-icon slot="icon-only" .icon=${iconChevronForward}></ion-icon></ion-button>
                      </div>
                    ` : A}
              </div>
            ` : A}

        ${this.panel !== "none" ? this.renderDrawer() : A}
      </div>
    `;
  }
  // Panel lateral derecho DENTRO de la tabla (no empuja contenido; igual en lista y tarjetas).
  renderDrawer() {
    const isFilters = this.panel === "filters";
    const clientFilters = isFilters && !this.serverSide;
    const serverFilters = isFilters && this.serverSide;
    const title = isFilters ? this.t.filters : this.panelTitle || (this.panel === "edit" ? this.t.editRecord : this.t.newRecord);
    return b2`
      <div class="tk-scrim" @click=${() => this.closePanel("backdrop")}></div>
      <aside class="drawer" role="dialog" aria-label=${title}>
        <header class="dh">
          <strong>${title}</strong>
          <ion-button fill="clear" size="small" aria-label=${this.t.close} @click=${() => this.closePanel("close-button")}><ion-icon slot="icon-only" .icon=${iconClose}></ion-icon></ion-button>
        </header>
        <div class="db">
          ${isFilters ? clientFilters ? this.filterColumns.map((c5) => this.renderClientFilter(c5)) : this.filterColumns.map((c5) => b2`<div class="fblock">${this.renderFilterControl(c5)}</div>`) : b2`<slot name="create"></slot>`}
        </div>
        ${clientFilters ? b2`
              <footer class="df">
                <button class="sel-clear df-clear" ?disabled=${Object.keys(this.filterDraft).length === 0} @click=${() => this.clearFilters()}>${this.t.clear}</button>
                <ion-button class="primary-btn" size="small" @click=${() => this.applyFilters()}>${this.t.apply}</ion-button>
              </footer>
            ` : serverFilters ? b2`
                <footer class="df">
                  <ion-button class="primary-btn df-done" expand="block" data-testid=${this.tid("filters-show-results")} @click=${() => this.closePanel("apply")}>${this.t.showResults}</ion-button>
                </footer>
              ` : A}
      </aside>
    `;
  }
  // Control de filtro CLIENTE de una columna: chips multi-select (select) o rango de fechas.
  renderClientFilter(col) {
    const label = col.header;
    if (col.filterType === "daterange" || col.filterType === "date") {
      const f3 = this.filterDraft[col.key] ?? {};
      return b2`
        <div class="fblock">
          <span class="flabel">${label}</span>
          <div class="daterange">
            <ion-input type="date" label=${this.t.from} label-placement="stacked" fill="outline" mode="md" .value=${f3.from ?? ""} @ionChange=${(e5) => this.setFilterRange(col.key, "from", e5.detail.value ?? "")}></ion-input>
            <ion-input type="date" label=${this.t.to} label-placement="stacked" fill="outline" mode="md" .value=${f3.to ?? ""} @ionChange=${(e5) => this.setFilterRange(col.key, "to", e5.detail.value ?? "")}></ion-input>
          </div>
        </div>
      `;
    }
    const opts = col.options ?? this.distinctValues(col).map((v3) => ({ value: v3, label: v3 }));
    const selected = [...this.filterDraft[col.key]?.values ?? /* @__PURE__ */ new Set()];
    return b2`
      <div class="fblock">
        <ion-select
          label=${label}
          label-placement="stacked"
          fill="outline" mode="md"
          multiple
          interface="modal"
          .interfaceOptions=${{ cssClass: "ok-overlay" }}
          placeholder=${this.t.select}
          .value=${selected}
          @ionChange=${(e5) => this.setFilterValues(col.key, e5.detail.value ?? [])}
        >
          ${opts.length === 0 ? b2`<ion-select-option .disabled=${true} value="">${this.t.noValues}</ion-select-option>` : opts.map((o7) => b2`<ion-select-option value=${o7.value}>${o7.label}</ion-select-option>`)}
        </ion-select>
      </div>
    `;
  }
  /** #67 — Enter/Espacio activan la fila clicable (y, desde #74, la tarjeta): si se llega con el
   *  tabulador, el ratón no puede ser el único camino. Espacio además NO debe desplazar la página. */
  onRowKeydown(e5, row) {
    if (e5.key !== "Enter" && e5.key !== " " && e5.key !== "Spacebar") return;
    e5.preventDefault();
    this.emit("rowClick", { row });
  }
  emptyState() {
    const noMatches = this.rows.length > 0;
    return b2`
      <div class="empty">
        <span class="empty-ic"><ion-icon .icon=${iconFileTrayOutline}></ion-icon></span>
        <span>${noMatches ? this.effNoMatchesMessage : this.effEmptyMessage}</span>
        ${noMatches ? b2`<ion-button fill="clear" size="small" data-role="no-matches-reset" data-testid=${this.tid("show-all")} @click=${() => this.resetSearchAndFilters()}>${this.t.showAll}</ion-button>` : A}
      </div>
    `;
  }
  /** #268 — The first rows are on their way. Not the empty state: «0 records» before the hub has
   *  answered told people they had nothing. */
  loadingState() {
    return b2`
      <div class="loading-state" role="status" data-role="loading" data-testid=${this.tid("loading")}>
        <ion-spinner name="crescent" aria-hidden="true"></ion-spinner>
        <span>${this.t.loading}</span>
      </div>
    `;
  }
  /** pm#530 — The load failed. Not the empty state: «No customers» over a hub that did not answer
   *  made people believe their data was gone. Says so, gives the reason and offers to retry. */
  errorState() {
    return b2`
      <div class="load-error" role="alert" data-role="load-error">
        <span class="empty-ic"><ion-icon .icon=${okIcon("alert-circle-outline")}></ion-icon></span>
        <strong class="load-error-title">${this.t.loadError}</strong>
        <span class="load-error-reason">${this.error}</span>
        <ion-button size="small" data-role="load-error-retry" data-testid=${this.tid("retry")} @click=${() => this.emit("retry", {})}>${this.t.retry}</ion-button>
      </div>
    `;
  }
  // Vista LISTA en CSS GRID (no <table>): permite ancho por columna y cabecera sticky.
  renderTable(visible) {
    if (visible.length === 0) return this.emptyState();
    const cols = this.visibleColumns;
    const tpl = { gridTemplateColumns: this.gridTemplate() };
    const allOn = this.selectable && visible.length > 0 && visible.every((r6) => this.selection.has(this.keyOf(r6)));
    const alignCls = (a3) => a3 === "right" ? "right" : a3 === "center" ? "center" : "left";
    return b2`
      <div class=${`scroll${this.xOverflow ? " x-overflow" : ""}`}>
        <div class="grid" role="table">
          <!-- Cabecera -->
          <div class="grow ghead" role="row" style=${o6(tpl)}>
            ${this.selectable ? b2`<span class="selcb"><ion-checkbox .checked=${allOn} aria-label=${this.t.selectAll} @ionChange=${() => this.toggleAll(visible)}></ion-checkbox></span>` : A}
            ${cols.map((c5) => {
      const sortable = this.isSortable(c5);
      const active = sortable && (this.serverSide ? this.sort === c5.key : this.clientSort === c5.key);
      const dir = this.serverSide ? this.sortDir : this.clientSortDir;
      const caretIcon = !active ? iconSwapVerticalOutline : dir === "asc" ? iconChevronUpOutline : iconChevronDownOutline;
      return b2`
                <div
                  class=${`gcell gh ${alignCls(c5.align)}${sortable ? " sortable" : ""}${c5.pinned === "end" ? " actions-col" : ""}`}
                  role="columnheader"
                  @click=${() => this.onHeaderClick(c5)}
                >
                  <span title=${c5.header || A}>${c5.header}</span>
                  ${sortable ? b2`<span class=${`caret${active ? " on" : ""}`}><ion-icon .icon=${okIcon(caretIcon)}></ion-icon></span>` : A}
                </div>
              `;
    })}
            ${this.actions.length ? b2`<div class="gcell gh right actions-col" role="columnheader">
                  <span class=${this.rowActionsCollapsed || !this.actionsLabelFits ? "sr-only" : ""}>${this.t.actions}</span>
                </div>` : A}
          </div>

          <!-- Filas -->
          ${c4(
      visible,
      (row) => this.keyOf(row),
      (row) => {
        const key = this.keyOf(row);
        const selected = this.selectable && this.selection.has(key);
        return b2`
                <div
                  class=${`grow grow-data${selected ? " selected" : ""}${this.rowClickable ? " clickable" : ""}`}
                  role="row"
                  data-testid=${this.tid(`row-${key}`)}
                  style=${o6(tpl)}
                  tabindex=${this.rowClickable ? "0" : A}
                  @click=${this.rowClickable ? () => this.emit("rowClick", { row }) : A}
                  @keydown=${this.rowClickable ? (e5) => this.onRowKeydown(e5, row) : A}
                >
                  ${this.selectable ? b2`<span class="selcb" @click=${(e5) => e5.stopPropagation()}><ion-checkbox .checked=${selected} aria-label=${this.t.selectRow} @ionChange=${() => this.toggleRow(key)}></ion-checkbox></span>` : A}
                  ${cols.map(
          (c5) => b2`<div class=${`gcell ${alignCls(c5.align)}${c5.pinned === "end" ? " actions-col" : ""}`} role="cell">${c5.render ? c5.render(row) : this.textCell(c5, row, key)}</div>`
        )}
                  ${this.actions.length ? b2`<div class="gcell right actions-col" role="cell" @click=${(e5) => e5.stopPropagation()}>${this.actionButtons(row, true)}</div>` : A}
                </div>
              `;
      }
    )}
        </div>
      </div>
      ${this.renderRowMenu()}
    `;
  }
  /** #205 — The column a card's title already shows, so the default body does not repeat it
   *  («Tarifa mayorista 1» as the title and again as «Nombre»). Decided per card: the first visible
   *  column whose cell reads exactly like the title. Only text is compared: a title given as a
   *  template, or a column with its own `render`, is never matched. */
  cardTitleColumn(title, row) {
    if (typeof title !== "string" && typeof title !== "number") return void 0;
    const text = String(title).trim();
    if (!text) return void 0;
    return this.visibleColumns.find((c5) => !c5.render && String(this.cell(c5, row) ?? "").trim() === text);
  }
  renderCards(visible) {
    if (visible.length === 0) return this.emptyState();
    const hasHead = !!this.cardTitle || !!this.cardIcon || this.selectable;
    return b2`
      <div class="cards-grid">
        ${c4(
      visible,
      (row) => this.keyOf(row),
      (row) => {
        const key = this.keyOf(row);
        const selected = this.selectable && this.selection.has(key);
        const icon = this.cardIcon?.(row);
        const title = this.cardTitle?.(row);
        const titleColumn = this.cardTitleColumn(title, row);
        return b2`
              <ion-card
                class=${`rcard${selected ? " selected" : ""}${this.rowClickable ? " clickable" : ""}`}
                data-testid=${this.tid(`row-${key}`)}
                role=${this.rowClickable ? "button" : A}
                tabindex=${this.rowClickable ? "0" : A}
                @click=${this.rowClickable ? () => this.emit("rowClick", { row }) : A}
                @keydown=${this.rowClickable ? (e5) => this.onRowKeydown(e5, row) : A}
              >
                ${hasHead ? b2`
                      <ion-card-header class="rcard-head">
                        ${icon != null && icon !== "" ? b2`<span class="rc-icon">${typeof icon === "string" ? b2`<ion-icon .icon=${okIcon(icon)}></ion-icon>` : icon}</span>` : A}
                        <span class="rc-title">${this.cardTitle ? title : A}</span>
                        ${this.selectable ? b2`<ion-checkbox .checked=${selected} aria-label=${this.t.select} @click=${(e5) => e5.stopPropagation()} @ionChange=${() => this.toggleRow(key)}></ion-checkbox>` : A}
                      </ion-card-header>
                    ` : A}
                <ion-card-content class="rcard-body">
                  ${this.renderCard ? this.renderCard(row) : this.visibleColumns.filter((c5) => c5 !== titleColumn).map(
          (c5) => b2`<div class="rrow"><span class="rk">${c5.header}</span><span class="rv">${c5.render ? c5.render(row) : this.cell(c5, row)}</span></div>`
        )}
                </ion-card-content>
                ${this.actions.length ? b2`<div class="ractions" @click=${(e5) => e5.stopPropagation()}>${this.actionButtons(row)}</div>` : A}
              </ion-card>
            `;
      }
    )}
      </div>
    `;
  }
};
__decorateClass4([
  n4({ attribute: false })
], _OkDataTable.prototype, "columns");
__decorateClass4([
  n4({ attribute: false })
], _OkDataTable.prototype, "rows");
__decorateClass4([
  n4({ attribute: false })
], _OkDataTable.prototype, "searchKeys");
__decorateClass4([
  n4({ attribute: "row-key-field" })
], _OkDataTable.prototype, "rowKeyField");
__decorateClass4([
  n4({ attribute: false })
], _OkDataTable.prototype, "rowKey");
__decorateClass4([
  n4({ type: Number, attribute: "page-size" })
], _OkDataTable.prototype, "pageSize");
__decorateClass4([
  n4({ attribute: "empty-message" })
], _OkDataTable.prototype, "emptyMessage");
__decorateClass4([
  n4({ attribute: "no-matches-message" })
], _OkDataTable.prototype, "noMatchesMessage");
__decorateClass4([
  n4({ type: String })
], _OkDataTable.prototype, "error");
__decorateClass4([
  n4({ type: Boolean })
], _OkDataTable.prototype, "loading");
__decorateClass4([
  n4({ attribute: "search-placeholder" })
], _OkDataTable.prototype, "searchPlaceholder");
__decorateClass4([
  n4({ attribute: false })
], _OkDataTable.prototype, "labels");
__decorateClass4([
  n4({ attribute: false })
], _OkDataTable.prototype, "actions");
__decorateClass4([
  n4({ type: Boolean })
], _OkDataTable.prototype, "addable");
__decorateClass4([
  n4({ attribute: false })
], _OkDataTable.prototype, "pageSizeOptions");
__decorateClass4([
  n4({ type: Boolean, reflect: true })
], _OkDataTable.prototype, "fill");
__decorateClass4([
  n4({ type: Boolean, attribute: "column-picker" })
], _OkDataTable.prototype, "columnPicker");
__decorateClass4([
  n4({ type: Boolean })
], _OkDataTable.prototype, "csv");
__decorateClass4([
  n4({ attribute: "csv-name" })
], _OkDataTable.prototype, "csvName");
__decorateClass4([
  n4({ type: Boolean, attribute: "server-side" })
], _OkDataTable.prototype, "serverSide");
__decorateClass4([
  n4({ type: Number })
], _OkDataTable.prototype, "total");
__decorateClass4([
  n4({ type: Number })
], _OkDataTable.prototype, "page");
__decorateClass4([
  n4({ type: Boolean })
], _OkDataTable.prototype, "searchable");
__decorateClass4([
  n4({ type: String })
], _OkDataTable.prototype, "search");
__decorateClass4([
  n4({ type: String })
], _OkDataTable.prototype, "sort");
__decorateClass4([
  n4({ attribute: "sort-dir" })
], _OkDataTable.prototype, "sortDir");
__decorateClass4([
  n4({ attribute: false })
], _OkDataTable.prototype, "filterValues");
__decorateClass4([
  n4()
], _OkDataTable.prototype, "title");
__decorateClass4([
  n4({ attribute: false })
], _OkDataTable.prototype, "views");
__decorateClass4([
  n4({ attribute: "default-view" })
], _OkDataTable.prototype, "defaultView");
__decorateClass4([
  n4({ type: Boolean })
], _OkDataTable.prototype, "exportable");
__decorateClass4([
  n4({ type: Boolean })
], _OkDataTable.prototype, "importable");
__decorateClass4([
  n4({ type: Boolean, attribute: "column-selector" })
], _OkDataTable.prototype, "columnSelector");
__decorateClass4([
  n4({ attribute: false })
], _OkDataTable.prototype, "pageSizes");
__decorateClass4([
  n4({ type: Boolean, attribute: "row-clickable" })
], _OkDataTable.prototype, "rowClickable");
__decorateClass4([
  n4({ type: Boolean })
], _OkDataTable.prototype, "selectable");
__decorateClass4([
  n4({ attribute: false })
], _OkDataTable.prototype, "selectedKeys");
__decorateClass4([
  n4({ attribute: false })
], _OkDataTable.prototype, "primaryAction");
__decorateClass4([
  n4({ type: Boolean })
], _OkDataTable.prototype, "inlineFilters");
__decorateClass4([
  n4({ attribute: false })
], _OkDataTable.prototype, "menuActions");
__decorateClass4([
  n4({ attribute: false })
], _OkDataTable.prototype, "cardTitle");
__decorateClass4([
  n4({ attribute: false })
], _OkDataTable.prototype, "cardIcon");
__decorateClass4([
  n4({ attribute: false })
], _OkDataTable.prototype, "renderCard");
__decorateClass4([
  n4({ type: String })
], _OkDataTable.prototype, "testid");
__decorateClass4([
  r5()
], _OkDataTable.prototype, "q");
__decorateClass4([
  r5()
], _OkDataTable.prototype, "clientPage");
__decorateClass4([
  r5()
], _OkDataTable.prototype, "clientPageSize");
__decorateClass4([
  r5()
], _OkDataTable.prototype, "mobileShown");
__decorateClass4([
  r5()
], _OkDataTable.prototype, "clientSort");
__decorateClass4([
  r5()
], _OkDataTable.prototype, "clientSortDir");
__decorateClass4([
  r5()
], _OkDataTable.prototype, "clientFilters");
__decorateClass4([
  r5()
], _OkDataTable.prototype, "filterDraft");
__decorateClass4([
  r5()
], _OkDataTable.prototype, "serverFilters");
__decorateClass4([
  r5()
], _OkDataTable.prototype, "panel");
__decorateClass4([
  r5()
], _OkDataTable.prototype, "panelTitle");
__decorateClass4([
  r5()
], _OkDataTable.prototype, "viewMode");
__decorateClass4([
  r5()
], _OkDataTable.prototype, "isMobile");
__decorateClass4([
  r5()
], _OkDataTable.prototype, "xOverflow");
__decorateClass4([
  r5()
], _OkDataTable.prototype, "actionsTrackPx");
__decorateClass4([
  r5()
], _OkDataTable.prototype, "rowActionsCollapsed");
__decorateClass4([
  r5()
], _OkDataTable.prototype, "actionsLabelFits");
__decorateClass4([
  r5()
], _OkDataTable.prototype, "unfoldedCells");
__decorateClass4([
  r5()
], _OkDataTable.prototype, "fitCards");
__decorateClass4([
  r5()
], _OkDataTable.prototype, "rowMenuOpen");
__decorateClass4([
  r5()
], _OkDataTable.prototype, "columnChoice");
__decorateClass4([
  r5()
], _OkDataTable.prototype, "internalSelection");
__decorateClass4([
  r5()
], _OkDataTable.prototype, "menuOpen");
var OkDataTable = _OkDataTable;
define("ok-data-table", OkDataTable);

// @erplora/module-sdk/src/quantity.ts
var QUANTITY_SCALE = 1e6;
function toMicro(quantity) {
  return Math.round(quantity * QUANTITY_SCALE);
}

// @erplora/module-sdk/src/index.ts
var DATA_TABLE_LABELS_ES = {
  search: "Buscar\u2026",
  empty: "Sin resultados",
  filters: "Filtros",
  clear: "Limpiar",
  apply: "Aplicar",
  selected: "{n} seleccionados",
  importCsv: "Importar CSV",
  exportCsv: "Exportar CSV",
  add: "A\xF1adir",
  moreActions: "M\xE1s acciones",
  rowsPerPage: "Filas por p\xE1gina",
  perPageShort: "{n} / p\xE1g.",
  viewList: "Vista lista",
  viewCards: "Vista tarjetas",
  columnsVisible: "Columnas visibles",
  columns: "Columnas",
  actions: "Acciones",
  close: "Cerrar",
  newRecord: "Nuevo",
  form: "Formulario",
  filterPlaceholder: "Filtrar\u2026",
  from: "Desde",
  to: "Hasta",
  fromOf: "{label} desde",
  toOf: "{label} hasta",
  gte: "\u2265",
  lte: "\u2264",
  noValues: "Sin valores",
  selectAll: "Seleccionar todo",
  selectRow: "Seleccionar fila",
  select: "Seleccionar",
  showing: "Mostrando {from}\u2013{to} de",
  recordSingular: "registro",
  recordPlural: "registros",
  loadError: "No se han podido cargar los datos",
  retry: "Reintentar"
};
var DATA_TABLE_LABELS_EN = {
  search: "Search\u2026",
  empty: "No results",
  filters: "Filters",
  clear: "Clear",
  apply: "Apply",
  selected: "{n} selected",
  importCsv: "Import CSV",
  exportCsv: "Export CSV",
  add: "Add",
  moreActions: "More actions",
  rowsPerPage: "Rows per page",
  perPageShort: "{n} / page",
  viewList: "List view",
  viewCards: "Card view",
  columnsVisible: "Visible columns",
  columns: "Columns",
  actions: "Actions",
  close: "Close",
  newRecord: "New",
  form: "Form",
  filterPlaceholder: "Filter\u2026",
  from: "From",
  to: "To",
  fromOf: "{label} from",
  toOf: "{label} to",
  gte: "\u2265",
  lte: "\u2264",
  noValues: "No values",
  selectAll: "Select all",
  selectRow: "Select row",
  select: "Select",
  showing: "Showing {from}\u2013{to} of",
  recordSingular: "record",
  recordPlural: "records",
  loadError: "Couldn't load the data",
  retry: "Retry"
};
function dataTableLabels(locale = "es") {
  return locale.toLowerCase().startsWith("en") ? DATA_TABLE_LABELS_EN : DATA_TABLE_LABELS_ES;
}
function dataTableShowsLoadError() {
  const registry = globalThis.customElements;
  const table = registry?.get("ok-data-table");
  return !!table && "error" in table.prototype;
}
function isEmpty(v3) {
  return v3 === null || v3 === void 0 || v3 === "";
}
var ListController = class {
  constructor(client, queryName, onChange = () => {
  }, opts = {}) {
    this.client = client;
    this.queryName = queryName;
    this.onChange = onChange;
    this.rows = [];
    this.total = 0;
    this.loading = false;
    this.error = "";
    /** Descarta respuestas obsoletas si llegan fuera de orden (race de cargas concurrentes). */
    this.seq = 0;
    this.state = {
      page: 0,
      pageSize: opts.pageSize ?? 50,
      search: "",
      sort: opts.sort,
      dir: opts.dir ?? "asc",
      filters: { ...opts.filters ?? {} },
      context: { ...opts.context ?? {} }
    };
    this.moneyFilters = new Set(opts.moneyFilters ?? []);
    this.quantityFilters = new Set(opts.quantityFilters ?? []);
    if (this.moneyFilters.size > 0 && typeof client.currencyDecimals !== "number") {
      throw new ErploraError(
        "list_money_filters_need_currency_decimals",
        "moneyFilters needs a list client that exposes currencyDecimals"
      );
    }
  }
  /**
   * The filters as the runtime compares them: money and quantity columns scaled from what the
   * person typed to the stored integer. `state.filters` stays as typed, so a table that echoes it
   * back keeps showing «12», not «1200».
   */
  wireFilters() {
    if (this.moneyFilters.size === 0 && this.quantityFilters.size === 0) return this.state.filters;
    const decimals = this.client.currencyDecimals ?? 0;
    const out = {};
    for (const [col, value] of Object.entries(this.state.filters)) {
      const scale = this.moneyFilters.has(col) ? (n6) => majorToMinor(n6, decimals) : this.quantityFilters.has(col) ? toMicro : null;
      out[col] = scale ? scaleFilterValue(value, scale) : value;
    }
    return out;
  }
  /** Nº de páginas según el total del servidor (mínimo 1). */
  get pageCount() {
    return Math.max(1, Math.ceil(this.total / this.state.pageSize));
  }
  /**
   * (Re)loads the current page from the server. On a phone, after «Load more» (hub#2365), the
   * current page is everything shown so far: a refresh brings back pages 0..page in one request.
   */
  async load() {
    const s5 = this.state;
    const mySeq = ++this.seq;
    const paging = mobilePagingOf(this);
    const window2 = nextListWindow(paging, s5);
    this.loading = true;
    this.error = "";
    this.onChange();
    try {
      const page = await this.client.queryPage(this.queryName, {
        limit: window2.limit,
        offset: window2.offset,
        search: s5.search,
        sort: s5.sort,
        dir: s5.dir,
        filters: this.wireFilters(),
        params: s5.context
      });
      if (mySeq !== this.seq) return;
      const rows3 = page.rows ?? [];
      this.rows = window2.append ? [...this.rows, ...rows3] : rows3;
      this.total = page.total ?? this.rows.length;
      if (window2.growsTo !== void 0) {
        s5.page = window2.growsTo;
        keepAccumulating(paging, () => void this.load());
      }
    } catch (e5) {
      if (mySeq !== this.seq) return;
      this.rows = [];
      this.total = 0;
      const reason = e5 instanceof Error ? e5.message.trim() : "";
      this.error = tableReadReason(e5, activeLocale()) || reason || listLoadFailedMessage(activeLocale());
    } finally {
      if (mySeq === this.seq) {
        this.loading = false;
        this.onChange();
      }
    }
  }
  /**
   * Goes to `page`. On a phone `<ok-data-table>` has no pager, only «Load more», which asks for
   * `page + 1`: that one is ADDED under the rows already shown (hub#2365). Any other jump replaces.
   */
  setPage(page) {
    const next = Math.max(0, page);
    const paging = mobilePagingOf(this);
    if (next === this.state.page + 1 && phoneViewport()?.matches) {
      paging.growNext = true;
    } else {
      stopAccumulating(paging);
      this.state.page = next;
    }
    void this.load();
  }
  setSort(sort, dir) {
    this.state.sort = sort;
    this.state.dir = dir;
    this.state.page = 0;
    void this.load();
  }
  setSearch(search) {
    this.state.search = search;
    this.state.page = 0;
    void this.load();
  }
  /** Cambia el nº de filas por página y recarga desde la página 0. */
  setPageSize(pageSize) {
    this.state.pageSize = Math.max(1, pageSize);
    this.state.page = 0;
    void this.load();
  }
  /** Aplica/quita un filtro de columna; valores vacíos lo eliminan. Vuelve a la página 0. */
  setFilter(col, value) {
    if (isEmpty(value)) {
      delete this.state.filters[col];
    } else if (typeof value === "object" && value !== null) {
      const prev = this.state.filters[col] ?? {};
      const merged = { ...prev, ...value };
      const cleaned = Object.fromEntries(Object.entries(merged).filter(([, v3]) => !isEmpty(v3)));
      if (Object.keys(cleaned).length === 0) delete this.state.filters[col];
      else this.state.filters[col] = cleaned;
    } else {
      this.state.filters[col] = value;
    }
    this.state.page = 0;
    void this.load();
  }
  /** Fija/actualiza los params de contexto obligatorios (p.ej. al seleccionar el padre).
   *  Vuelve a la página 0 y recarga. Pasa `{}` o keys con valor vacío para limpiar. */
  setContext(context) {
    this.state.context = { ...context };
    this.state.page = 0;
    void this.load();
  }
  reset() {
    this.state.page = 0;
    this.state.search = "";
    this.state.filters = {};
    void this.load();
  }
};
var PHONE_MEDIA = "(max-width: 640px)";
function phoneViewport() {
  const matchMedia = globalThis.matchMedia;
  return typeof matchMedia === "function" ? matchMedia(PHONE_MEDIA) : null;
}
var mobilePaging = /* @__PURE__ */ new WeakMap();
function mobilePagingOf(ctrl) {
  let paging = mobilePaging.get(ctrl);
  if (!paging) {
    paging = { accumulated: false, growNext: false };
    mobilePaging.set(ctrl, paging);
  }
  return paging;
}
function nextListWindow(paging, s5) {
  const size = s5.pageSize;
  const grow = paging.growNext;
  paging.growNext = false;
  if (grow) {
    const target = s5.page + 1;
    if (paging.accumulated || s5.page === 0) {
      return { offset: target * size, limit: size, append: true, growsTo: target };
    }
    return { offset: 0, limit: (target + 1) * size, append: false, growsTo: target };
  }
  if (s5.page === 0) stopAccumulating(paging);
  if (paging.accumulated) return { offset: 0, limit: (s5.page + 1) * size, append: false };
  return { offset: s5.page * size, limit: size, append: false };
}
function keepAccumulating(paging, reload) {
  paging.accumulated = true;
  if (paging.unwatch) return;
  const viewport = phoneViewport();
  if (!viewport?.addEventListener) return;
  const onChange = (e5) => {
    if (e5.matches) return;
    stopAccumulating(paging);
    reload();
  };
  viewport.addEventListener("change", onChange);
  paging.unwatch = () => viewport.removeEventListener?.("change", onChange);
}
function stopAccumulating(paging) {
  paging.accumulated = false;
  paging.unwatch?.();
  paging.unwatch = void 0;
}
function scaleFilterEdge(edge, scale) {
  const text = typeof edge === "string" ? edge.trim().replace(",", ".") : edge;
  if (text === "" || text === null || text === void 0) return "";
  const n6 = Number(text);
  return Number.isFinite(n6) ? scale(n6) : "";
}
function scaleFilterValue(value, scale) {
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([edge, v3]) => [edge, scaleFilterEdge(v3, scale)])
    );
  }
  return scaleFilterEdge(value, scale);
}
var LIST_LOAD_FAILED_EN = "The hub did not return the data.";
var LIST_LOAD_FAILED_ES = "El hub no ha devuelto los datos.";
function listLoadFailedMessage(locale) {
  return locale.toLowerCase().startsWith("en") ? LIST_LOAD_FAILED_EN : LIST_LOAD_FAILED_ES;
}
function createListController(client, queryName, onChange = () => {
}, opts = {}) {
  return new ListController(client, queryName, onChange, opts);
}
var ErploraError = class extends Error {
  constructor(code, message, permission, fields, retryAfterSecs) {
    super(message);
    this.code = code;
    this.permission = permission;
    this.fields = fields;
    this.retryAfterSecs = retryAfterSecs;
    this.name = "ErploraError";
  }
};
var SERVER_UNAVAILABLE = "server_unavailable";
var READ_UNREACHABLE_UNDER_HEADING_EN = "The hub is not responding. Check the connection and try again.";
var READ_UNREACHABLE_UNDER_HEADING_ES = "El hub no responde. Comprueba la conexi\xF3n e int\xE9ntalo de nuevo.";
function tableReadReason(e5, locale) {
  if (e5?.code !== SERVER_UNAVAILABLE || !dataTableShowsLoadError()) return "";
  return locale.toLowerCase().startsWith("en") ? READ_UNREACHABLE_UNDER_HEADING_EN : READ_UNREACHABLE_UNDER_HEADING_ES;
}
function activeLocale() {
  try {
    return localStorage.getItem("erplora.locale") || "es";
  } catch {
    return "es";
  }
}
function majorToMinor(amount, decimals) {
  const n6 = Number(amount);
  return Number.isFinite(n6) ? Math.round(n6 * 10 ** decimals) : 0;
}

// ui/components/erp-tables-floor-plan/erp-tables-floor-plan.ts
var CATALOG2 = { es: es_default, en: en_default };
var STATUS_KEY2 = {
  available: "ui.statusAvailable",
  occupied: "ui.statusOccupied",
  reserved: "ui.statusReserved",
  blocked: "ui.statusBlocked"
};
var SORT_KEY = { number: "number_sort" };
var toServerSort = (col) => SORT_KEY[col] ?? col;
var toColumnSort = (sort) => Object.keys(SORT_KEY).find((col) => SORT_KEY[col] === sort) ?? sort;
function erplora2() {
  const c5 = globalThis.erplora;
  if (!c5) throw new Error("erplora SDK no inicializado por el shell");
  return c5;
}
var ErpTablesFloorPlan = class extends i3 {
  constructor() {
    super(...arguments);
    this.newNumber = "";
    this.newCapacity = "4";
    this.newZoneId = "";
    this.saving = false;
    this.formError = "";
    this.tick = 0;
    this.zones = [];
    // Re-render al cambiar el idioma del shell (ADR-0055): el getter `columns` y los textos del
    // template se re-evalúan con el nuevo `erplora.locale`.
    this.onLocaleChange = () => this.requestUpdate();
  }
  static {
    this.styles = i`
    :host { display:flex; flex-direction:column; height:100%; min-height:0; font-family: system-ui, sans-serif; color: var(--ion-text-color, #1c1b18); }
    /* La vista llena el alto: el data-table ocupa todo (scroll interno, pie fijo). */
    .page { display:flex; flex-direction:column; min-height:0; flex:1 1 auto; }
    .page > ok-data-table { flex:1 1 auto; min-height:0; }
    /* El alta vive en el panel lateral de la tabla (estrecho) → campos en columna, no en fila. */
    .form { display:flex; flex-direction:column; gap:.7rem; }
    .form ion-button { align-self:flex-end; }
    .err { color:#d9480f; font-weight:600; }
  `;
  }
  // Getter (no campo): se re-evalúa en cada render, así los textos cambian con el idioma activo
  // (ADR-0055). `connectedCallback` re-renderiza al recibir `erplora:locale-changed`.
  get columns() {
    const t5 = (k2, params) => erplora2().t(CATALOG2, k2, params);
    return [
      { key: "number", header: t5("ui.colNumber"), sortable: true, filterable: true, filterType: "text" },
      { key: "name", header: t5("ui.colName"), sortable: true, filterable: true, filterType: "text", format: (r6) => r6.name || "\u2014" },
      {
        key: "zone",
        header: t5("ui.colZone"),
        sortable: true,
        filterable: true,
        // Dominio cerrado: las zonas que existen en el hub. Tecleando el nombre a mano, un acento o
        // una mayúscula de más («salon» por «Salón») dejaba la lista vacía sin decir por qué.
        filterType: "select",
        options: this.zones.map((z2) => ({ value: z2.name, label: z2.name })),
        format: (r6) => r6.zone || "\u2014"
      },
      {
        key: "capacity",
        header: t5("ui.colCapacity"),
        align: "right",
        sortable: true,
        filterable: true,
        // Seats are a NUMBER, and what a floor manager looks for is «tables for 4 or more», not a
        // table whose capacity is written `4`. A text box here would have to be filtered with
        // `like`, and `like` casts (`CAST(sub.capacity AS TEXT) LIKE '%4%'`), so a 4 would drag in
        // the 14s, the 24s and the 40s. Two bounds, and the operator that takes two bounds.
        filterType: "range",
        format: (r6) => t5("ui.paxCount", { count: r6.capacity })
      },
      {
        key: "status",
        header: t5("ui.colStatus"),
        sortable: true,
        filterable: true,
        filterType: "select",
        options: Object.entries(STATUS_KEY2).map(([value, k2]) => ({ value, label: t5(k2) })),
        format: (r6) => STATUS_KEY2[r6.status] ? t5(STATUS_KEY2[r6.status]) : r6.status
      }
    ];
  }
  // TODO-LIT: componentWillLoad → connectedCallback. Recuerda: connectedCallback se dispara
  // en CADA reconexión al DOM (no solo en el primer montaje). Si la init debe correr una
  // sola vez tras el primer render, considera firstUpdated() en su lugar.
  async connectedCallback() {
    super.connectedCallback();
    window.addEventListener("erplora:locale-changed", this.onLocaleChange);
    this.ctrl = createListController(erplora2(), "tables.tables.list", () => this.requestUpdate(), {
      pageSize: 50,
      // tables#182: NATURAL order, the same the POS picker paints — `S2` before `S10`, and a named
      // table (`Terraza A`) alphabetical. The list is paginated by the SERVER, so the order is
      // decided by the key we ask for; reordering the visible page here would sort each page on
      // its own and still cut the pages by the wrong key.
      sort: SORT_KEY.number,
      dir: "asc"
    });
    await this.ctrl.load();
    await this.loadZones();
    try {
      const offs = [
        erplora2().on("tables.table.created", () => this.ctrl.load()),
        erplora2().on("tables.table.updated", () => this.ctrl.load()),
        erplora2().on("tables.table.deleted", () => this.ctrl.load()),
        erplora2().on("tables.session.opened", () => this.ctrl.load()),
        erplora2().on("tables.session.closed", () => this.ctrl.load()),
        erplora2().on("tables.session.transferred", () => this.ctrl.load())
      ];
      this.unsub = () => offs.forEach((o7) => o7());
    } catch {
    }
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("erplora:locale-changed", this.onLocaleChange);
    this.unsub?.();
  }
  // Best-effort: si las zonas no cargan, el filtro de zona queda sin opciones pero la lista de mesas
  // sigue funcionando (una mesa sin zona es válida: `zone_id` es nullable).
  async loadZones() {
    try {
      const rows3 = await erplora2().queryAll("tables.zones.list", { sort: "sort_order", dir: "asc" });
      this.zones = Array.isArray(rows3) ? rows3 : [];
    } catch {
      this.zones = [];
    }
  }
  // Referencia al ok-data-table para cerrar su panel lateral (drawer) tras el alta.
  dataTable() {
    return this.renderRoot.querySelector("ok-data-table");
  }
  async createTable(ev) {
    ev.preventDefault();
    if (!this.newNumber.trim()) return;
    this.saving = true;
    this.formError = "";
    try {
      await erplora2().command("tables.tables.create", {
        number: this.newNumber.trim(),
        name: "",
        capacity: Number(this.newCapacity) || 4,
        zone_id: this.newZoneId || null,
        shape: "square",
        position_x: 0,
        position_y: 0,
        width: 10,
        height: 10
      });
      this.newNumber = "";
      this.newCapacity = "4";
      this.dataTable()?.close();
      await this.ctrl.load();
    } catch (e5) {
      this.formError = domainMessage(e5, erplora2().locale, erplora2().t(CATALOG2, "ui.errCreateTable"));
    } finally {
      this.saving = false;
    }
  }
  /** pm#513: the refusal appears above the button that was pressed — on a phone that can leave it
   *  off the sheet. Bring it into view once it has painted itself: scrolled before, the banner still
   *  measures 0 px and ends up under the tab bar. */
  updated(changed) {
    super.updated(changed);
    if (changed.has("formError") && this.formError) void this.revealFormError();
  }
  async revealFormError() {
    const banner = this.renderRoot.querySelector('[data-testid="tables-list-error"]');
    await banner?.updateComplete;
    banner?.scrollIntoView?.({ block: "center" });
  }
  // The view title is painted by the shell's top bar: repeating it here showed it twice.
  render() {
    const t5 = (k2, params) => erplora2().t(CATALOG2, k2, params);
    return b2`<div class="page">
        ${this.ctrl?.error && !dataTableShowsLoadError() ? b2`<ok-inline-feedback data-testid="tables-list-load-error" tone="danger" icon="alert-circle-outline">${this.ctrl.error}</ok-inline-feedback>` : A}
        <ok-data-table testid="tables-list-table" .error=${this.ctrl?.error ?? ""} @retry=${() => Promise.all([this.ctrl?.load(), this.loadZones()])} .serverSide=${true} .fill=${true} .addable=${true} .columns=${this.columns} .views=${true} .cardTitle=${(r6) => String(r6.name || r6.number || "\u2014")} .cardIcon=${() => "grid-outline"} .rows=${this.ctrl?.rows ?? []} .total=${this.ctrl?.total ?? 0} .page=${this.ctrl?.state.page ?? 0} .pageSize=${this.ctrl?.state.pageSize ?? 50} .sort=${toColumnSort(this.ctrl?.state.sort)} .sortDir=${this.ctrl?.state.dir ?? "asc"} .searchable=${true} .searchPlaceholder=${t5("ui.searchPlaceholder")} .emptyMessage=${this.ctrl?.loading ? t5("ui.loading") : t5("ui.emptyTables")} @pageChange=${(e5) => this.ctrl.setPage(e5.detail)} @pageSizeChange=${(e5) => this.ctrl.setPageSize(e5.detail)} @sortChange=${(e5) => this.ctrl.setSort(toServerSort(e5.detail.sort), e5.detail.dir)} @searchChange=${(e5) => this.ctrl.setSearch(e5.detail)} @filterChange=${(e5) => this.ctrl.setFilter(e5.detail.col, e5.detail.value)}>
          <!-- Create table: ALWAYS projected (even with the panel closed); rendered only while the
               panel is open, the «+» of the bar would open an empty panel. -->
          <form slot="create" class="form" data-testid="tables-list-form" @submit=${(e5) => this.createTable(e5)}>
            <ion-input data-testid="tables-list-number" mode="md" fill="outline" label-placement="floating" label=${t5("ui.colNumber")} .value=${this.newNumber} @ionInput=${(e5) => this.newNumber = e5.target.value}></ion-input>
            <ion-input data-testid="tables-list-capacity" mode="md" fill="outline" label-placement="floating" label=${t5("ui.colCapacity")} type="number" min="1" .value=${this.newCapacity} @ionInput=${(e5) => this.newCapacity = e5.target.value}></ion-input>
            <ion-select data-testid="tables-list-zone" mode="md" fill="outline" label-placement="floating" label=${t5("ui.fieldZone")} interface="popover" .value=${this.newZoneId} @ionChange=${(e5) => this.newZoneId = e5.detail.value || ""}>
              <ion-select-option value="">${t5("ui.noZone")}</ion-select-option>
              ${this.zones.map((z2) => b2`<ion-select-option value=${z2.id}>${z2.name}</ion-select-option>`)}
            </ion-select>
            <!-- pm#513: the refusal travels WITH the form — under 834 px the panel is a full-screen
                 sheet and a banner on the page underneath it is never seen. -->
            ${this.formError ? b2`<ok-inline-feedback data-testid="tables-list-error" tone="danger" icon="alert-circle-outline">${this.formError}</ok-inline-feedback>` : A}
            <ion-button data-testid="tables-list-submit" type="submit" ?disabled=${this.saving || !this.newNumber}>${this.saving ? t5("ui.saving") : t5("ui.addTable")}</ion-button>
          </form>
        </ok-data-table>
      </div>`;
  }
};
__decorateClass([
  r5()
], ErpTablesFloorPlan.prototype, "newNumber", 2);
__decorateClass([
  r5()
], ErpTablesFloorPlan.prototype, "newCapacity", 2);
__decorateClass([
  r5()
], ErpTablesFloorPlan.prototype, "newZoneId", 2);
__decorateClass([
  r5()
], ErpTablesFloorPlan.prototype, "saving", 2);
__decorateClass([
  r5()
], ErpTablesFloorPlan.prototype, "formError", 2);
__decorateClass([
  r5()
], ErpTablesFloorPlan.prototype, "tick", 2);
__decorateClass([
  r5()
], ErpTablesFloorPlan.prototype, "zones", 2);
define("erp-tables-floor-plan", ErpTablesFloorPlan);

// ui/lib/permissions.ts
function can(permission) {
  const shell = globalThis.erplora;
  return typeof shell?.hasPermission === "function" ? shell.hasPermission(permission) : true;
}

// ui/components/erp-tables-pos-zones/erp-tables-pos-zones.ts
var CATALOG3 = { es: es_default, en: en_default };
var STATUS_COLOR2 = {
  available: "var(--ion-color-success, #2f9e44)",
  occupied: "var(--ion-color-danger, #d9480f)",
  reserved: "var(--ion-color-warning, #f08c00)",
  blocked: "var(--ion-color-medium, #868e96)"
};
var STATUS_KEY3 = {
  available: "ui.statusAvailable",
  occupied: "ui.statusOccupied",
  reserved: "ui.statusReserved",
  blocked: "ui.statusBlocked"
};
function erplora3() {
  const c5 = globalThis.erplora;
  if (!c5) throw new Error("erplora SDK no inicializado por el shell");
  return c5;
}
function hhmm2(iso) {
  if (!iso) return "";
  const d3 = new Date(iso);
  if (Number.isNaN(d3.getTime())) return "";
  return `${String(d3.getHours()).padStart(2, "0")}:${String(d3.getMinutes()).padStart(2, "0")}`;
}
function holdTitle(t5, name) {
  if (!name) return "";
  const span = [hhmm2(t5.reserved_from), hhmm2(t5.reserved_until)].filter(Boolean).join("\u2013");
  const pax = t5.reserved_party_size ? ` (${t5.reserved_party_size})` : "";
  return `${name}${pax}${span ? ` \xB7 ${span}` : ""}`;
}
function rows2(r6) {
  if (Array.isArray(r6)) return r6;
  if (r6 && typeof r6 === "object" && Array.isArray(r6.rows)) return r6.rows;
  return [];
}
var ErpTablesPosZones = class extends i3 {
  constructor() {
    super(...arguments);
    this.open = false;
    this.zones = [];
    this.tables = [];
    this.activeZone = "";
    this.selectedLabel = "";
    this.loading = false;
    this.error = "";
    this.pendingCount = 0;
    this.kitchenEnabled = false;
    /** «Send order» was tapped for `heldBack`. Only then does the held action go ahead by itself: an
     *  order sent from «Current order» just lifts the warning, it does not seat a table for anyone. */
    this.sendRequested = false;
    this.mode = "select";
    /** Room setting `prompt_guests_on_seat` (tables#3 c). Off = a bar that never counts covers:
     *  seating a free table opens the check with the capacity in ONE tap (Lightspeed "Cover count
     *  prompt", Square "Track seating" are toggles too). Default on. */
    this.promptGuests = true;
    /** Ventas charged the check in full or deleted it → close the account of THAT order (frees its
     *  table if nothing else sits there). tables#118: never the remembered `sessionId` — after a split
     *  Ventas shows the new check, and with a bar check in front the selection is the table being
     *  opened; closing the remembered one freed a table with people sitting. */
    this.onReset = () => {
      const sid = this.sessionId;
      const orderId = this.frontOrderId;
      this.mode = "select";
      this.actionSource = void 0;
      this.guestsPrompt = void 0;
      if (!orderId) {
        this.dropSelection(sid);
        if (sid) void this.closeSession(sid);
        return;
      }
      void this.releaseOrder(
        orderId,
        sid,
        (sessionId) => erplora3().command("tables.sessions.close", { session_id: sessionId })
      );
    };
    this.onPosState = (e5) => {
      const detail = e5.detail;
      this.frontOrderId = detail?.order_id || void 0;
      const value = Number(detail?.pending_count ?? 0);
      this.pendingCount = Number.isFinite(value) ? Math.max(0, value) : 0;
      this.kitchenEnabled = detail?.kitchen_enabled === true;
      const held = this.heldBack;
      if (!held || this.pendingBlocks) return;
      const goAhead = this.sendRequested && this.open;
      this.heldBack = void 0;
      this.sendRequested = false;
      if (goAhead) void (held.kind === "pick" ? this.pick(held.table) : this.clear());
    };
    // Re-render al cambiar el idioma del shell (ADR-0055): los textos del template se re-evalúan
    // con el nuevo `erplora.locale`.
    this.onLocaleChange = () => this.requestUpdate();
    /** El TPV suelta la cuenta DE LA PANTALLA («Dejar en la mesa»): se limpia SOLO la selección
     *  local — ni park ni close. La mesa sigue ocupada con su cuenta, recuperable tocándola. */
    this.onOrderDetached = () => {
      this.sessionId = void 0;
      this.selectedId = void 0;
      this.selectedLabel = "";
    };
    /** Ventas parked a check → park the account of THAT order (tables#118: not the remembered one;
     *  a parked bar check leaves the table being opened alone). Parking must not break the sale. */
    this.onOrderParked = async (e5) => {
      const orderId = e5.detail?.order_id;
      if (!orderId) return;
      await this.releaseOrder(
        orderId,
        this.sessionId,
        (sessionId) => erplora3().command("tables.sessions.park", { session_id: sessionId })
      );
    };
    /** El TPV reanudó un pedido tras recargar → recupera SU mesa desde la junction (ADR-0144).
     *
     *  `sales` no sabe de mesas, así que no puede restaurar este contexto: lo hace su dueño. Sin
     *  esto, al recargar el TPV la comanda aparecía «sin mesa» aunque la mesa siguiera ocupada, y el
     *  camarero no tenía forma de saber a qué mesa pertenecía lo que estaba viendo. */
    this.onOrderRestored = async (e5) => {
      const orderId = e5.detail?.order_id;
      if (!orderId) return;
      if (this.selectedId) {
        this.emit(this.selectedId, this.selectedLabel, orderId);
        return;
      }
      try {
        const r6 = await erplora3().query("tables.sessions.by_order", { order_id: orderId });
        const s5 = rows2(r6).find((x2) => x2.status === "active");
        if (!s5?.table_id) return;
        this.sessionId = s5.session_id;
        this.selectedId = s5.table_id;
        this.selectedLabel = erplora3().t(CATALOG3, "ui.tableLabel", { number: s5.table_number ?? "" });
        this.emit(s5.table_id, this.selectedLabel, orderId);
      } catch {
      }
    };
    /** The POS opened an order → write the table↔order junction (ADR-0141).
     *
     *  tables#26: the event carries the ACCOUNT (`session_id`) whenever the POS knows it — `sales`
     *  republishes, untouched, the id it got in `erp:order-split`. It has to win over the table:
     *  `link_order` without a session resolves to the OLDEST account of the table (back-compat for
     *  the single-account POS), so on a split table the second order would land on the first half,
     *  leaving two sessions on the same order and both halves charging one ticket.
     *
     *  It also removes the dependency on the SELECTED table: splitting is asked from the ⋮ of any
     *  table in the plan, which need not be the selected one — bailing out there left the new
     *  account with no order. Without a `session_id`, today's path (selected table) stands. */
    this.onOrderLinked = async (e5) => {
      const d3 = e5.detail;
      if (!d3?.order_id) return;
      const target = d3.session_id ? { session_id: d3.session_id, order_id: d3.order_id } : this.selectedId ? { table_id: this.selectedId, order_id: d3.order_id } : null;
      if (!target) return;
      try {
        await erplora3().command("tables.sessions.link_order", target);
      } catch {
      }
    };
  }
  static {
    this.styles = i`
    :host { display:block; font-family: system-ui, sans-serif; color: var(--ion-text-color,#1c1b18); }
    /* tables#16: every Ionic control is a 44px touch target. The table tile (native <button
       aria-pressed>, tables#11 documented canvas exception), the covers stepper (3rem) and the
       quick chips (2.75rem) already are. */
    ion-button { min-height:44px; --min-height:44px; }
    .ctx { display:flex; align-items:center; gap:.15rem; }
    .trigger { --padding-start:.5rem; --padding-end:.5rem; }
    ion-button.trigger ion-icon { font-size: var(--pos-hdr-icon-size, 1.75rem); }
    /* The icon inherits the size the POS sets on the cart header (--pos-hdr-icon-size crosses the
       Shadow DOM); the fallback covers mounting elsewhere. tables#37: the trigger is an ion: icon
       again (grid / grid-outline, the same glyph the POS chip and the module's own Tables entry
       use), so no optical compensation for a foreign set is needed — the toolkit only bakes ion:. */
    .trigger[data-assigned] { --color: var(--ion-color-primary,#0091ce); }
    .name { font-size:.8rem; font-weight:700; color:var(--ion-color-primary,#0091ce); max-width:9rem;
            overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    /* <dialog> nativo: showModal() lo pinta en el TOP LAYER del navegador, inmune al containing
       block del ion-toolbar donde vive el botón (transform/contain atrapan a position:fixed). Y
       sigue en el shadow root → conserva este CSS. */
    dialog.sheet { border:none; border-radius: var(--ok-radius-lg, 16px); padding:1rem; width:min(94vw,32rem); max-height:90vh; overflow:auto;
      background:var(--ion-background-color,#fff); color:var(--ion-text-color,#1c1b18); box-shadow:0 12px 48px rgba(0,0,0,.35); }
    dialog.sheet::backdrop { background:rgba(0,0,0,.45); }
    .sheet-h { display:flex; justify-content:space-between; align-items:center; margin-bottom:.8rem; }
    .sheet-h .t { font-size:1.2rem; font-weight:700; }
    .x { background:none; border:none; font-size:1.3rem; cursor:pointer; color:#8b897f; }
    .grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(5rem, 1fr)); gap:.6rem; margin-top:.8rem; }
    .mesa-wrap { position:relative; }
    .mesa { width:100%; border:2px solid; border-radius: var(--ok-radius, 12px); padding:.6rem .25rem; cursor:pointer; text-align:center; background:var(--ion-background-color,#fff); transition:transform .05s;
      container-type:inline-size; }
    .mesa:active { transform:scale(.96); }
    .mesa[aria-pressed=true] { outline:3px solid var(--ion-color-primary,#0091ce); outline-offset:1px; }
    .mesa[disabled] { opacity:.35; cursor:not-allowed; }
    .mesa.target { outline:2px dashed var(--ion-color-primary,#0091ce); outline-offset:1px; }
    .mesa .n { font-weight:700; font-size:1.05rem; }
    .mesa .c { font-size:.75rem; color:#8b897f; }
    /* tables#98: on a 390 px phone a tile has ~64 px of room and DISPONIBLE/RESERVADA/BLOQUEADA broke
       mid-word. The status stays on one line (Toast/Square): the tile is a size container, the word
       scales with it up to its normal .65rem, and the ellipsis is only the net for a longer locale. */
    .mesa .s { font-size:min(.65rem, 15cqi); text-transform:uppercase; letter-spacing:0; font-weight:600;
      white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    /* Name and time of the live reservation: all the waiter needs at a glance, the rest is in
       the tooltip. tables#126: one row, truncated title + fixed tail (as ok-data-table's card
       head) — a long name shrinks with an ellipsis, the time never does. */
    .mesa .hold { display:flex; justify-content:center; gap:.2em; min-width:0;
      font-size:.65rem; color:var(--ion-color-warning,#f08c00); font-weight:600; white-space:nowrap; }
    .mesa .hold-name { min-width:0; overflow:hidden; text-overflow:ellipsis; }
    .mesa .hold-time { flex:none; }
    /* Botón ⋮ (more-vert) en la esquina de cada mesa OCUPADA: abre transferir/fusionar. */
    /* ion-button (tables#11): 44px target overlapping the tile corner; the tile keeps its own tap. */
    ion-button.kebab { position:absolute; top:-6px; right:-6px; z-index:1; margin:0; --padding-start:0; --padding-end:0;
      width:44px; height:44px; --border-radius: var(--ok-radius-pill, 50%); --color:var(--ion-text-color,#1c1b18); font-size:1rem; }
    /* Menú de acciones (tras ⋮) y banner de "elige destino". */
    .actions { display:flex; gap:.5rem; align-items:center; flex-wrap:wrap; margin:.6rem 0; padding:.6rem .7rem;
      border-radius: var(--ok-radius, 12px); background:var(--ion-color-light,#f4f5f8); }
    .actions .lbl { font-weight:700; margin-right:auto; }
    .hint { margin:.6rem 0; padding:.5rem .7rem; border-radius: var(--ok-radius-sm, 10px); background:var(--ion-color-light,#f4f5f8);
      font-size:.85rem; color:#8b897f; }
    /* Empty-state con aire: icono + qué pasa + qué hacer (antes: texto estrujado en un panel
       encogido — el panel toma un ancho mínimo digno aunque no haya mesas). */
    .empty { color:#8b897f; text-align:center; padding:1.6rem 1rem; min-width:16rem; }
    .empty ion-icon { font-size:2rem; opacity:.5; display:block; margin:0 auto .4rem; }
    .empty p { margin:.15rem 0; }
    .empty .empty-hint { font-size:.82rem; opacity:.75; }
    /* tables#95: the pending-order warning carries its own way out (Toast «Unsent items: Send»). */
    .pending { display:flex; flex-wrap:wrap; align-items:center; gap:.5rem; margin:.6rem 0; padding:.6rem .7rem;
      border-radius: var(--ok-radius, 12px); background:rgba(var(--ion-color-warning-rgb, 255,196,9), .16);
      color:var(--ion-text-color,#1c1b18); font-size:.9rem; }
    .pending .msg { flex:1 1 12rem; }
    .foot { display:flex; justify-content:space-between; align-items:center; margin-top:1rem; }
    /* tables#32: covers prompt. Touch targets >= 44px (tables#16): the stepper and the quick
       chips are what a waiter taps with one hand while standing. */
    .guests { display:flex; flex-direction:column; gap:.8rem; padding:.4rem 0; }
    .guests .stepper { display:flex; align-items:center; justify-content:center; gap:1rem; }
    .guests .stepper button { width:3rem; height:3rem; border-radius: var(--ok-radius-pill, 50%);
      border:2px solid var(--ion-color-primary,#0091ce); background:var(--ion-background-color,#fff);
      color:var(--ion-color-primary,#0091ce); font-size:1.5rem; line-height:1; cursor:pointer; }
    .guests .stepper button:disabled { opacity:.35; cursor:not-allowed; }
    .guests .value { font-size:2.4rem; font-weight:700; min-width:3rem; text-align:center; }
    .guests .quick { display:grid; grid-template-columns: repeat(4, 1fr); gap:.5rem; }
    .guests .quick button { min-height:2.75rem; border-radius: var(--ok-radius, 12px);
      border:1px solid var(--ion-color-medium,#868e96); background:var(--ion-color-light,#f4f5f8);
      color:var(--ion-text-color,#1c1b18); font-size:1.05rem; font-weight:600; cursor:pointer; }
    .guests .quick button[aria-pressed=true] { border-color:var(--ion-color-primary,#0091ce);
      color:var(--ion-color-primary,#0091ce); }
    .guests .over { text-align:center; font-size:.85rem; color:var(--ion-color-warning,#f08c00); }
    .guests .cta { display:flex; justify-content:space-between; align-items:center; gap:.5rem; }
    .guests .cta .seat { flex:1; }
    .mesa .live { font-size:.75rem; font-weight:700; color:var(--ion-color-danger,#d9480f);
      display:flex; align-items:center; justify-content:center; gap:.2rem; }
    /* pm#392 — a danger outline/clear button paints from HERE, never from \`color="danger"\`:
       Ionic resolves \`color=\` through a GLOBAL \`.ion-color-danger\` rule that does not reach
       inside this shadow root, so it fell back to the primary blue. Custom properties do inherit
       through the boundary, so the theme token still applies. */
    ion-button.tone-danger[fill] {
      --border-color: var(--ion-color-danger, #c5000f);
      --color: var(--ion-color-danger, #c5000f);
      --background-activated: var(--ion-color-danger, #c5000f);
      --background-focused: var(--ion-color-danger, #c5000f);
    }
  `;
  }
  /** Applies `release` (close/park) to the active account of `orderId` and drops the selection if
   *  that order was the selected table's. An order with no table account (bar, counter) touches
   *  nothing: the selection is the table Ventas is about to open. `release` is a thunk so the
   *  command name stays a literal at the SDK call (ADR-0127 contracts). */
  async releaseOrder(orderId, selectedSid, release) {
    let accounts = [];
    try {
      accounts = rows2(
        await erplora3().query("tables.sessions.by_order", { order_id: orderId })
      );
    } catch {
    }
    if (!selectedSid || accounts.some((a3) => a3.session_id === selectedSid)) this.dropSelection(selectedSid);
    const live = accounts.find((a3) => a3.status === "active")?.session_id;
    if (!live) return;
    try {
      await release(live);
    } catch {
    }
    void this.refreshTables();
  }
  /** Forgets the selected table, unless another one was selected meanwhile. */
  dropSelection(sid) {
    if (this.sessionId !== sid) return;
    this.sessionId = void 0;
    this.selectedId = void 0;
    this.selectedLabel = "";
  }
  /** With kitchen on, the check cannot change table until its order is sent (sales only shares
   *  the count, never the lines). */
  get pendingBlocks() {
    return this.kitchenEnabled && this.pendingCount > 0;
  }
  /** tables#95: «Send order» from the warning. Same host contract as the kitchen footer button
   *  (`erp:order-fire`, bubbles+composed): sales fires only the pending lines and re-emits
   *  `erp:pos-state`, which is what lets the held action go ahead. */
  sendPending() {
    this.sendRequested = true;
    this.dispatchEvent(new CustomEvent("erp:order-fire", { detail: {}, bubbles: true, composed: true }));
  }
  connectedCallback() {
    super.connectedCallback();
    this.addEventListener("erp:pos-state", this.onPosState);
    this.addEventListener("erp:order-context-reset", this.onReset);
    this.addEventListener("erp:order-linked", this.onOrderLinked);
    this.addEventListener("erp:order-restored", this.onOrderRestored);
    this.addEventListener("erp:order-parked", this.onOrderParked);
    this.addEventListener("erp:order-detached", this.onOrderDetached);
    window.addEventListener("erplora:locale-changed", this.onLocaleChange);
  }
  disconnectedCallback() {
    this.removeEventListener("erp:pos-state", this.onPosState);
    super.disconnectedCallback();
    this.removeEventListener("erp:order-context-reset", this.onReset);
    this.removeEventListener("erp:order-linked", this.onOrderLinked);
    this.removeEventListener("erp:order-restored", this.onOrderRestored);
    this.removeEventListener("erp:order-parked", this.onOrderParked);
    this.removeEventListener("erp:order-detached", this.onOrderDetached);
    window.removeEventListener("erplora:locale-changed", this.onLocaleChange);
  }
  async openPicker() {
    this.open = true;
    this.loading = true;
    this.error = "";
    this.heldBack = void 0;
    this.sendRequested = false;
    try {
      const [z2, t5, s5] = await Promise.all([
        erplora3().queryAll("tables.zones.list", { sort: "sort_order", dir: "asc" }).catch(() => []),
        erplora3().queryAll("tables.tables.list", { sort: "number_sort", dir: "asc" }).catch(() => []),
        // tables#3 (c): room settings — no row (or no permission) → the schema default: prompt ON.
        erplora3().query("tables.settings.get").catch(() => [])
      ]);
      this.zones = rows2(z2);
      this.tables = rows2(t5);
      const settings = rows2(s5)[0];
      this.promptGuests = settings ? Number(settings.prompt_guests_on_seat) !== 0 : true;
      if (!this.activeZone) this.activeZone = this.zones[0]?.id ?? "";
    } catch (e5) {
      this.error = domainMessage(e5, erplora3().locale, erplora3().t(CATALOG3, "ui.errLoadTables"));
    } finally {
      this.loading = false;
    }
  }
  emit(table_id, label, order_id) {
    this.dispatchEvent(new CustomEvent("erp:order-context", {
      detail: { table_id, label, order_id: order_id ?? null },
      bubbles: true,
      composed: true
    }));
  }
  /** Id de la sesión `active` de una mesa (para reanudar/cerrar), o undefined si no hay. */
  async activeSessionFor(tableId) {
    return (await this.activeSessionInfo(tableId))?.id;
  }
  /** Sesión activa de una mesa CON su pedido enlazado (junction ADR-0141). */
  async activeSessionInfo(tableId) {
    try {
      const r6 = await erplora3().query("tables.sessions.list", { f_table_id: tableId, f_status: "active", limit: 1 });
      return rows2(r6)[0];
    } catch {
      return void 0;
    }
  }
  async closeSession(id) {
    try {
      await erplora3().command("tables.sessions.close", { session_id: id });
    } catch {
    }
  }
  /** Recarga el estado de las mesas (colores ocupada/libre) tras abrir/cerrar una sesión. */
  async refreshTables() {
    try {
      const t5 = await erplora3().queryAll("tables.tables.list", { sort: "number_sort", dir: "asc" });
      this.tables = rows2(t5);
    } catch {
    }
  }
  /** ¿Es `t` un destino válido para el modo activo? transfer→mesa libre; merge→mesa ocupada;
   *  nunca la propia mesa origen. */
  isValidTarget(t5) {
    if (t5.id === this.actionSource?.id) return false;
    if (this.mode === "transfer") return t5.status === "available" || t5.status === "reserved";
    if (this.mode === "merge") return t5.status !== "available";
    return true;
  }
  async pick(t5) {
    if (this.mode === "transfer") {
      if (this.isValidTarget(t5)) await this.doTransfer(t5);
      return;
    }
    if (this.mode === "merge") {
      if (this.isValidTarget(t5)) await this.doMerge(t5);
      return;
    }
    if (t5.id === this.selectedId) return;
    this.error = "";
    if (t5.status === "blocked") {
      this.error = erplora3().t(CATALOG3, "ui.blockedHint");
      void this.refreshTables();
      return;
    }
    if (this.pendingBlocks) {
      this.heldBack = { kind: "pick", table: t5 };
      return;
    }
    if (this.sessionId && this.selectedId && this.selectedId !== t5.id) {
      const prev = await this.activeSessionInfo(this.selectedId);
      if (!prev?.order_id) {
        await this.closeSession(this.sessionId);
      }
      this.sessionId = void 0;
    }
    const live = await this.activeSessionInfo(t5.id);
    if (live) {
      this.settle(t5, live.id, live.order_id || void 0);
      return;
    }
    const seed = t5.reserved_party_size && t5.reserved_party_size > 0 ? t5.reserved_party_size : t5.capacity;
    const covers = Math.max(1, Number(seed) || 1);
    if (!this.promptGuests) {
      await this.seat(t5, covers);
      return;
    }
    this.guestsPrompt = { kind: "seat", table: t5, value: covers };
  }
  /** Opens the check of a free table with `guests` covers and hands the table to the POS. */
  async seat(t5, guests) {
    this.guestsPrompt = void 0;
    try {
      await erplora3().command("tables.sessions.open", { table_id: t5.id, guests_count: guests });
    } catch (e5) {
      if (errorCode(e5) && errorCode(e5) !== "tables.table_not_available") {
        this.error = domainMessage(e5, erplora3().locale, erplora3().t(CATALOG3, "ui.errOccupyTable"));
        return;
      }
      this.error = erplora3().t(CATALOG3, "ui.errTableTaken");
      await this.refreshTables();
      return;
    }
    this.settle(t5, await this.activeSessionFor(t5.id), void 0);
  }
  /** The table is the POS context now: remember its live check, tell the POS, close the sheet. */
  settle(t5, sessionId, linkedOrderId) {
    this.sessionId = sessionId;
    this.selectedId = t5.id;
    this.selectedLabel = erplora3().t(CATALOG3, "ui.tableLabel", { number: t5.number });
    this.emit(t5.id, this.selectedLabel, linkedOrderId ?? null);
    this.open = false;
    void this.refreshTables();
  }
  // ── Covers prompt (tables#32) ────────────────────────────────────────────────
  /** +/− reads the CURRENT value (two fast taps must not both apply to the same stale render). */
  bumpGuests(delta) {
    if (!this.guestsPrompt) return;
    this.guestsPrompt = { ...this.guestsPrompt, value: Math.max(1, Math.floor(this.guestsPrompt.value + delta)) };
  }
  /** Confirm the prompt: seat the party (free table) or correct the live check (⋮ → Guests). */
  async confirmGuests(value = this.guestsPrompt?.value) {
    const p4 = this.guestsPrompt;
    if (!p4 || !value) return;
    if (p4.kind === "seat") {
      await this.seat(p4.table, value);
      return;
    }
    const info = await this.activeSessionInfo(p4.table.id);
    if (!info?.id) {
      this.error = erplora3().t(CATALOG3, "ui.errNoActiveSession");
      return;
    }
    try {
      await erplora3().command("tables.sessions.set_guests", { session_id: info.id, guests_count: value });
      this.guestsPrompt = void 0;
      this.actionSource = void 0;
      void this.refreshTables();
    } catch (e5) {
      this.error = e5 instanceof Error ? e5.message : erplora3().t(CATALOG3, "ui.errSetGuests");
    }
  }
  cancelGuests() {
    this.guestsPrompt = void 0;
  }
  /** ⋮ → Guests: correct the covers of the live check, pre-filled with what the plan shows. */
  startEditGuests() {
    const src = this.actionSource;
    const t5 = src && this.tables.find((x2) => x2.id === src.id);
    if (!t5) return;
    this.guestsPrompt = { kind: "edit", table: t5, value: Math.max(1, Number(t5.live_guests) || t5.capacity || 1) };
  }
  async clear() {
    if (this.pendingBlocks) {
      this.heldBack = { kind: "clear" };
      this.open = true;
      return;
    }
    if (this.sessionId) {
      const sid = this.sessionId;
      this.sessionId = void 0;
      try {
        await erplora3().command("tables.sessions.park", { session_id: sid });
      } catch {
      }
    }
    this.selectedId = void 0;
    this.selectedLabel = "";
    this.emit(null, "");
    this.open = false;
    void this.refreshTables();
  }
  // ── Transferir / Fusionar (menú ⋮ de una mesa ocupada) ───────────────────────
  /** Abre el menú de acciones (⋮) sobre una mesa ocupada. Detiene la propagación para no
   *  disparar el `pick` de la celda. */
  openActions(t5, e5) {
    e5.stopPropagation();
    this.error = "";
    this.actionSource = { id: t5.id, number: t5.number };
    this.mode = "select";
  }
  startTransfer() {
    this.mode = "transfer";
  }
  startMerge() {
    this.mode = "merge";
  }
  /** tables#12 — dividir la cuenta. A diferencia de transferir/fusionar NO pide mesa destino: la
   *  segunda cuenta se queda en la misma mesa (dos cuentas, un mantel), que es lo que pide la sala.
   *  `tables` abre la cuenta; las líneas y los importes los reparte `sales` al recibir el evento. */
  async doSplit() {
    const src = this.actionSource;
    if (!src) return;
    const info = await this.activeSessionInfo(src.id);
    if (!info?.id) {
      this.error = erplora3().t(CATALOG3, "ui.errNoActiveSession");
      return;
    }
    try {
      const res = await erplora3().command(
        "tables.sessions.split",
        { session_id: info.id }
      );
      this.dispatchEvent(new CustomEvent("erp:order-split", {
        detail: {
          table_id: src.id,
          from_order_id: info.order_id ?? null,
          session_id: res?.new_ids?.[0] ?? null,
          label: erplora3().t(CATALOG3, "ui.tableLabel", { number: src.number })
        },
        bubbles: true,
        composed: true
      }));
      const newSid = res?.new_ids?.[0];
      if (newSid) {
        this.sessionId = newSid;
        this.selectedId = src.id;
        this.selectedLabel = erplora3().t(CATALOG3, "ui.tableLabel", { number: src.number });
      }
      this.mode = "select";
      this.actionSource = void 0;
      this.open = false;
      void this.refreshTables();
    } catch (e5) {
      this.error = e5 instanceof Error ? e5.message : erplora3().t(CATALOG3, "ui.errSplit");
    }
  }
  cancelAction() {
    this.mode = "select";
    this.actionSource = void 0;
    this.guestsPrompt = void 0;
  }
  /** Emite hacia el POS el movimiento de comanda (mover en transfer, combinar en merge). El POS
   *  (erp-pos-touch/desktop) mueve/fusiona el carrito por `table_id`; contrato por evento DOM. */
  emitCartMove(type, fromId, target, orders = {}) {
    this.dispatchEvent(new CustomEvent(type, {
      detail: {
        from_table_id: fromId,
        to_table_id: target.id,
        from_order_id: orders.from ?? null,
        to_order_id: orders.to ?? null,
        to_label: erplora3().t(CATALOG3, "ui.tableLabel", { number: target.number })
      },
      bubbles: true,
      composed: true
    }));
  }
  async doTransfer(target) {
    const src = this.actionSource;
    if (!src) return;
    const info = await this.activeSessionInfo(src.id);
    const sid = info?.id;
    const srcOrderId = info?.order_id || void 0;
    if (!sid) {
      this.error = erplora3().t(CATALOG3, "ui.errNoActiveSession");
      return;
    }
    try {
      await erplora3().command("tables.sessions.transfer", { session_id: sid, target_table_id: target.id });
      this.emitCartMove("erp:order-transfer", src.id, target, { from: srcOrderId, to: srcOrderId });
      await this.afterMove(src.id, target);
    } catch (e5) {
      this.error = e5 instanceof Error ? e5.message : erplora3().t(CATALOG3, "ui.errTransfer");
    }
  }
  async doMerge(target) {
    const src = this.actionSource;
    if (!src) return;
    const info = await this.activeSessionInfo(src.id);
    const sid = info?.id;
    const srcOrderId = info?.order_id || void 0;
    const dstOrderId = (await this.activeSessionInfo(target.id))?.order_id || void 0;
    if (!sid) {
      this.error = erplora3().t(CATALOG3, "ui.errNoActiveSession");
      return;
    }
    try {
      await erplora3().command("tables.sessions.merge", { session_id: sid, target_table_id: target.id });
      this.emitCartMove("erp:order-merge", src.id, target, { from: srcOrderId, to: dstOrderId });
      await this.afterMove(src.id, target);
    } catch (e5) {
      this.error = e5 instanceof Error ? e5.message : erplora3().t(CATALOG3, "ui.errMerge");
    }
  }
  /** Tras transferir/fusionar: la comanda vive ahora en el DESTINO. Si SEGUÍAMOS en la mesa origen,
   *  la selección pasa a la mesa destino (si no, el POS conserva la mesa que estuviera atendiendo). */
  async afterMove(srcId, target) {
    if (this.selectedId === srcId) {
      this.selectedId = target.id;
      this.sessionId = await this.activeSessionFor(target.id);
      this.selectedLabel = erplora3().t(CATALOG3, "ui.tableLabel", { number: target.number });
    }
    this.mode = "select";
    this.actionSource = void 0;
    this.open = false;
    void this.refreshTables();
  }
  /** Tables of the active zone, in NATURAL order (tables#182): `S2` before `S10`, and a named
   *  table (`Terraza A`) stays alphabetical — the criterion is per row, not per room. Ordering
   *  here and not at the query is deliberate: the picker loads EVERY table once and re-filters by
   *  zone on each tap, so the order the grid paints is this component's, not the caller's `sort`. */
  get tablesInZone() {
    const inZone = this.activeZone ? this.tables.filter((t5) => t5.zone_id === this.activeZone) : this.tables;
    return sortNaturallyBy(inZone, (t5) => t5.number, erplora3().locale);
  }
  render() {
    const t5 = (k2, params) => erplora3().t(CATALOG3, k2, params);
    const inAction = this.mode !== "select";
    const srcNum = this.actionSource?.number ?? "";
    const title = this.mode === "transfer" ? t5("ui.transferTitle", { number: srcNum }) : this.mode === "merge" ? t5("ui.mergeTitle", { number: srcNum }) : t5("ui.chooseTable");
    return b2`
      <ion-button data-testid="tables-pos-trigger" class="trigger" fill="clear" ?data-assigned=${!!this.selectedId}
        aria-label=${this.selectedId ? `${t5("ui.assignTable")}: ${this.selectedLabel}` : t5("ui.assignTable")}
        title=${this.selectedId ? `${t5("ui.assignTable")}: ${this.selectedLabel}` : t5("ui.assignTable")}
        @click=${() => this.openPicker()}>
        <ion-icon slot="icon-only" name=${this.selectedId ? "grid" : "grid-outline"}></ion-icon>
      </ion-button>

      <dialog data-testid="tables-pos-sheet" class="sheet" aria-label=${title}
        @close=${() => {
      this.open = false;
    }}
        @click=${(e5) => {
      if (e5.target === e5.currentTarget) this.open = false;
    }}>
        <div class="sheet-h">
          <span class="t">${title}</span>
          <ion-button data-testid="tables-pos-close" class="close" fill="clear" aria-label=${t5("ui.close")} @click=${() => {
      this.open = false;
    }}>
            <ion-icon slot="icon-only" name="close-outline"></ion-icon>
          </ion-button>
        </div>

        ${this.error ? b2`<p data-testid="tables-pos-error" style="color:#d9480f">${this.error}</p>` : A}

        ${this.heldBack ? b2`<div class="pending" role="alert" data-testid="tables-pos-pending">
              <span class="msg">${this.pendingCount === 1 ? t5("ui.sendPendingBeforeTableOne") : t5("ui.sendPendingBeforeTable", { count: this.pendingCount })}</span>
              <ion-button data-testid="tables-pos-send-pending" @click=${() => this.sendPending()}>${t5("ui.sendPendingOrder")}</ion-button>
            </div>` : A}

        ${this.guestsPrompt ? this.renderGuestsPrompt(t5) : A}

        ${this.actionSource && !inAction && !this.guestsPrompt ? b2`<div class="actions">
              <span class="lbl">${t5("ui.tableLabel", { number: srcNum })}</span>
              ${can("tables.transfer_tablesession") ? b2`<ion-button data-testid="tables-pos-transfer" fill="outline" @click=${() => this.startTransfer()}>
                <ion-icon slot="start" name="swap-horizontal-outline"></ion-icon>${t5("ui.transfer")}
              </ion-button>
              <ion-button data-testid="tables-pos-merge" fill="outline" @click=${() => this.startMerge()}>
                <ion-icon slot="start" name="git-merge-outline"></ion-icon>${t5("ui.merge")}
              </ion-button>` : A}
              <ion-button data-testid="tables-pos-split" fill="outline" @click=${() => void this.doSplit()}>
                <ion-icon slot="start" name="git-branch-outline"></ion-icon>${t5("ui.split")}
              </ion-button>
              <ion-button data-testid="tables-pos-guests" fill="outline" @click=${() => this.startEditGuests()}>
                <ion-icon slot="start" name="people-outline"></ion-icon>${t5("ui.guests")}
              </ion-button>
            </div>` : A}
        ${inAction ? b2`<div class="hint" data-testid="tables-pos-hint">${this.mode === "transfer" ? t5("ui.pickFreeTable") : t5("ui.pickOccupiedTable")}</div>` : A}

        ${this.zones.length && !this.guestsPrompt ? b2`<ion-segment data-testid="tables-pos-zones" scrollable value=${this.activeZone}
              @ionChange=${(e5) => {
      this.activeZone = e5.detail.value;
    }}>
              ${this.zones.map((z2) => b2`<ion-segment-button data-testid=${`tables-pos-zone-tab-${z2.id}`} value=${z2.id}><ion-label>${z2.name}</ion-label></ion-segment-button>`)}
            </ion-segment>` : A}

        ${this.guestsPrompt ? A : b2`<div class="grid">
          ${this.tablesInZone.map((tb) => {
      const validTarget = inAction && this.isValidTarget(tb);
      const showKebab = !inAction && tb.status === "occupied";
      const outOfService = tb.status === "blocked";
      const holder = holdName(tb, t5("ui.erasedCustomer"));
      return b2`
            <div class="mesa-wrap">
              ${showKebab ? b2`<ion-button data-testid=${`tables-pos-actions-${tb.id}`} class="kebab" fill="clear" aria-label=${t5("ui.tableActions")} @click=${(e5) => this.openActions(tb, e5)}>
                    <ion-icon slot="icon-only" name="ellipsis-vertical"></ion-icon>
                  </ion-button>` : A}
              <button data-testid=${`tables-pos-table-${tb.id}`} class="mesa ${validTarget ? "target" : ""}" aria-pressed=${this.selectedId === tb.id}
                ?disabled=${outOfService || inAction && !validTarget}
                title=${(outOfService ? t5("ui.blockedHint") : holdTitle(tb, holder)) || A}
                style=${`border-color:${STATUS_COLOR2[tb.status] ?? "#d9d6cf"}`} @click=${() => this.pick(tb)}>
                <div class="n">${tb.number}</div>
                <div class="c">${t5("ui.paxCount", { count: tb.capacity })}</div>
                ${tb.live_guests ? b2`<div class="live"><ion-icon name="people-outline"></ion-icon>${t5("ui.liveGuests", { count: tb.live_guests })}</div>` : A}
                <div class="s" style=${`color:${STATUS_COLOR2[tb.status] ?? "#868e96"}`}>${t5(STATUS_KEY3[tb.status] ?? tb.status)}</div>
                ${holder ? b2`<div class="hold"><span class="hold-name">${holder}</span>${tb.reserved_from ? b2` <span class="hold-time">· ${hhmm2(tb.reserved_from)}</span>` : A}</div>` : A}
              </button>
            </div>`;
    })}
          ${!this.loading && !this.tablesInZone.length ? b2`
            <div class="empty" data-testid="tables-pos-empty">
              <ion-icon name="grid-outline"></ion-icon>
              <p>${t5("ui.noTablesInZone")}</p>
              <p class="empty-hint">${t5("ui.noTablesInZoneHint")}</p>
            </div>` : A}
          ${this.loading ? b2`<div class="empty" data-testid="tables-pos-loading">${t5("ui.loading")}</div>` : A}
        </div>`}

        <div class="foot">
          ${!inAction && this.selectedId ? b2`<ion-button data-testid="tables-pos-remove" class="tone-danger" fill="clear" @click=${() => void this.clear()}>
                ${t5("ui.removeTable")}
              </ion-button>` : A}
          ${inAction ? b2`<ion-button data-testid="tables-pos-cancel" fill="clear" @click=${() => this.cancelAction()}>${t5("ui.cancel")}</ion-button>` : A}
        </div>
      </dialog>
    `;
  }
  /** tables#32: the covers prompt — big stepper, quick chips 1..8 (one tap seats), CTA. */
  renderGuestsPrompt(t5) {
    const p4 = this.guestsPrompt;
    const over = p4.value > p4.table.capacity;
    const cta = p4.kind === "seat" ? t5("ui.seatGuests", { count: p4.value }) : t5("ui.saveGuests");
    return b2`
      <div class="guests" data-testid="tables-pos-guests-prompt" role="group" aria-label=${t5("ui.guestsTitle", { number: p4.table.number })}>
        <div class="hint">${t5("ui.guestsTitle", { number: p4.table.number })} · ${t5("ui.paxCount", { count: p4.table.capacity })}</div>
        <div class="stepper">
          <button data-testid="tables-pos-guests-minus" class="minus" aria-label="−" ?disabled=${p4.value <= 1} @click=${() => this.bumpGuests(-1)}>−</button>
          <span data-testid="tables-pos-guests-value" class="value" aria-live="polite">${p4.value}</span>
          <button data-testid="tables-pos-guests-plus" class="plus" aria-label="+" @click=${() => this.bumpGuests(1)}>+</button>
        </div>
        <div class="quick">
          ${[1, 2, 3, 4, 5, 6, 7, 8].map((n6) => b2`
            <button data-testid=${`tables-pos-guests-quick-${n6}`} aria-pressed=${p4.value === n6} @click=${() => void this.confirmGuests(n6)}>${n6}</button>`)}
        </div>
        ${over ? b2`<div class="over" data-testid="tables-pos-guests-over">${t5("ui.overCapacity", { capacity: p4.table.capacity })}</div>` : A}
        <div class="cta">
          <ion-button data-testid="tables-pos-guests-back" class="back" fill="clear" @click=${() => this.cancelGuests()}>${t5("ui.back")}</ion-button>
          <ion-button data-testid="tables-pos-guests-confirm" class="seat" size="default" @click=${() => void this.confirmGuests()}>${cta}</ion-button>
        </div>
      </div>`;
  }
  /** Sincroniza `open` ↔ el <dialog> nativo: showModal() usa el top layer y escapa cualquier trap.
   *  try/catch porque happy-dom (tests) no implementa showModal/close. */
  updated() {
    const d3 = this.renderRoot.querySelector("dialog");
    if (!d3) return;
    try {
      if (this.open && !d3.open) d3.showModal();
      else if (!this.open && d3.open) d3.close();
    } catch {
    }
  }
};
__decorateClass([
  r5()
], ErpTablesPosZones.prototype, "open", 2);
__decorateClass([
  r5()
], ErpTablesPosZones.prototype, "zones", 2);
__decorateClass([
  r5()
], ErpTablesPosZones.prototype, "tables", 2);
__decorateClass([
  r5()
], ErpTablesPosZones.prototype, "activeZone", 2);
__decorateClass([
  r5()
], ErpTablesPosZones.prototype, "selectedId", 2);
__decorateClass([
  r5()
], ErpTablesPosZones.prototype, "selectedLabel", 2);
__decorateClass([
  r5()
], ErpTablesPosZones.prototype, "loading", 2);
__decorateClass([
  r5()
], ErpTablesPosZones.prototype, "error", 2);
__decorateClass([
  r5()
], ErpTablesPosZones.prototype, "pendingCount", 2);
__decorateClass([
  r5()
], ErpTablesPosZones.prototype, "kitchenEnabled", 2);
__decorateClass([
  r5()
], ErpTablesPosZones.prototype, "heldBack", 2);
__decorateClass([
  r5()
], ErpTablesPosZones.prototype, "mode", 2);
__decorateClass([
  r5()
], ErpTablesPosZones.prototype, "actionSource", 2);
__decorateClass([
  r5()
], ErpTablesPosZones.prototype, "guestsPrompt", 2);
define("erp-tables-pos-zones", ErpTablesPosZones);

// ui/components/erp-tables-sessions/erp-tables-sessions.ts
var CATALOG4 = { es: es_default, en: en_default };
var STATUSES2 = ["active", "closed", "transferred", "merged", "parked"];
var STATUS_KEY4 = {
  active: "ui.sessionActive",
  closed: "ui.sessionClosed",
  transferred: "ui.sessionTransferred",
  merged: "ui.sessionMerged",
  parked: "ui.sessionParked"
};
var SEGMENTS = [
  { id: "open", status: "active", key: "ui.segmentOpen" },
  { id: "closed", status: "closed", key: "ui.segmentClosed" },
  { id: "all", status: "", key: "ui.segmentAll" }
];
var REFRESH_MS2 = 3e4;
var DEFAULT_SETTINGS = { timer_warning_minutes: 60, timer_critical_minutes: 90 };
function erplora4() {
  const c5 = globalThis.erplora;
  if (!c5) throw new Error("erplora SDK not initialised by the shell");
  return c5;
}
function businessZone() {
  const tz = erplora4().timezone;
  const zone = typeof tz === "string" && tz.trim() ? tz.trim() : "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone });
    return zone;
  } catch {
    return "UTC";
  }
}
function clockTime(iso, now) {
  if (!iso) return "\u2014";
  const d3 = new Date(iso);
  if (Number.isNaN(d3.getTime())) return "\u2014";
  const timeZone = businessZone();
  const dayOf = (x2) => new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(x2);
  const day = dayOf(d3);
  const today = dayOf(now);
  const opts = day === today ? { hour: "numeric", minute: "2-digit" } : { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", ...day.slice(0, 4) !== today.slice(0, 4) ? { year: "numeric" } : {} };
  return new Intl.DateTimeFormat(erplora4().locale || void 0, { ...opts, timeZone }).format(d3);
}
function paidAmount(paid) {
  if (paid == null || paid === "") return "\u2014";
  const minor = Number(paid);
  return Number.isFinite(minor) ? erplora4().formatMoney(minor) : "\u2014";
}
var TIME_WIDTH = "minmax(8.5rem,1fr)";
function durationMinutes(s5, now) {
  const from = new Date(s5.opened_at).getTime();
  const to = s5.closed_at ? new Date(s5.closed_at).getTime() : now.getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.max(0, Math.floor((to - from) / 6e4));
}
var ErpTablesSessions = class extends i3 {
  constructor() {
    super(...arguments);
    /** Injectable clock (tests pin it); the duration column reads it. */
    this.now = () => /* @__PURE__ */ new Date();
    this.segment = "open";
    this.zones = [];
    this.waiters = [];
    this.settings = { ...DEFAULT_SETTINGS };
    this.detail = null;
    this.closeTarget = null;
    this.saving = false;
    this.error = "";
    this.onLocaleChange = () => this.requestUpdate();
  }
  static {
    this.styles = i`
    :host { display:flex; flex-direction:column; height:100%; min-height:0; font-family: system-ui, sans-serif; color: var(--ion-text-color, #1c1b18); }
    .page { display:flex; flex-direction:column; min-height:0; flex:1 1 auto; gap:.6rem; }
    .page > ok-data-table { flex:1 1 auto; min-height:0; }
    ion-segment { max-width: 28rem; }
    /* Segment buttons are touch targets: 44px minimum. */
    ion-segment-button { min-height: 44px; }
    .muted { color: var(--ok-muted, #8b897f); }
    /* Square paints the same two thresholds on its floor plan: amber, then red. */
    .tone-warning { color: var(--ion-color-warning, #f08c00); font-weight: 600; }
    .tone-critical { color: var(--ion-color-danger, #d9480f); font-weight: 700; }
  `;
  }
  get columns() {
    const t5 = (k2, p4) => erplora4().t(CATALOG4, k2, p4);
    return [
      { key: "table_number", header: t5("ui.colTable"), sortable: true, filterable: true, filterType: "text", format: (r6) => r6.table_number || t5("ui.noTable") },
      {
        // tables#96: the check says what it CHARGED, never the order's internal id (a code nobody can
        // act on). Hidden on «Open»: nothing is charged while the party sits; on «Closed» and «All»
        // it is a visible column, so the phone cards carry it too. Right after the table: as the last
        // column it fell past the right edge of a 768 px tablet.
        key: "paid_total",
        header: t5("ui.colPaidTotal"),
        align: "right",
        sortable: true,
        hidden: this.segment === "open",
        format: (r6) => paidAmount(r6.paid_total)
      },
      // tables#101: when the check closed, right after what it charged (Toast «Closed checks»): next
      // to «Opened» it fell under the pinned actions at 768 px. Hidden on «Open» only, where it
      // always reads «—».
      { key: "closed_at", header: t5("ui.colClosedAt"), sortable: true, hidden: this.segment === "open", width: TIME_WIDTH, format: (r6) => clockTime(r6.closed_at, this.now()) },
      {
        key: "zone",
        header: t5("ui.colZone"),
        sortable: true,
        filterable: true,
        // Closed domain: the zones of the hub. The server filters `zone_id` by `eq`; the column
        // shows the name and the select sends the id — see `onFilterChange`.
        filterType: "select",
        options: this.zones.map((z2) => ({ value: z2.id, label: z2.name })),
        format: (r6) => r6.zone || "\u2014"
      },
      {
        // tables#74: whose check this is. `waiter_id` has travelled on the session since tables#70
        // and the screen threw it away, so with several checks open nobody could tell them apart.
        key: "waiter_id",
        header: t5("ui.colWaiter"),
        // Sorting by an opaque id would order the list by nothing a human can read.
        sortable: false,
        filterable: true,
        // Closed domain: the people of the hub. The column shows the name, the select sends the id
        // — the `waiter_id(eq)` filter the manifest already declares («show me my checks»).
        filterType: "select",
        options: this.waiters.map((u5) => ({ value: u5.id, label: u5.name })),
        format: (r6) => this.waiterName(r6.waiter_id) || "\u2014"
      },
      { key: "guests_count", header: t5("ui.colGuests"), align: "right", sortable: true, format: (r6) => t5("ui.paxCount", { count: r6.guests_count ?? 0 }) },
      // tables#101: a time from another day carries its date («27 sept, 20:05»), which the grid's
      // default 5.5rem floor cut at 768 px; TIME_WIDTH is the floor that fits it.
      { key: "opened_at", header: t5("ui.colOpenedAt"), sortable: true, width: TIME_WIDTH, format: (r6) => clockTime(r6.opened_at, this.now()) },
      {
        key: "duration",
        header: t5("ui.colDuration"),
        align: "right",
        format: (r6) => t5("ui.durationMinutes", { minutes: durationMinutes(r6, this.now()) }),
        render: (r6) => b2`<span class=${`tone-${this.durationTone(r6)}`}>${t5("ui.durationMinutes", { minutes: durationMinutes(r6, this.now()) })}</span>`
      },
      {
        key: "status",
        header: t5("ui.colStatus"),
        sortable: true,
        filterable: true,
        filterType: "select",
        options: STATUSES2.map((s5) => ({ value: s5, label: t5(STATUS_KEY4[s5]) })),
        format: (r6) => STATUS_KEY4[r6.status] ? t5(STATUS_KEY4[r6.status]) : r6.status
      }
    ];
  }
  get actions() {
    const t5 = (k2) => erplora4().t(CATALOG4, k2);
    return [
      { id: "detail", label: t5("ui.actionDetail"), icon: "eye-outline" },
      ...can("tables.change_tablesession") ? [{ id: "close", label: t5("ui.actionCloseSession"), icon: "checkmark-done-outline", color: "danger", disabled: (r6) => r6.status !== "active" }] : []
    ];
  }
  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("erplora:locale-changed", this.onLocaleChange);
  }
  async firstUpdated() {
    this.ctrl = createListController(erplora4(), "tables.sessions.list", () => this.requestUpdate(), {
      pageSize: 50,
      sort: "opened_at",
      dir: "desc",
      // Open checks first: that is what the room asks for.
      filters: { status: "active" }
    });
    await Promise.all([this.ctrl.load(), this.loadZones(), this.loadSettings(), this.loadWaiters()]);
    try {
      const offs = [
        erplora4().on("tables.session.opened", () => this.ctrl.load()),
        erplora4().on("tables.session.closed", () => this.ctrl.load()),
        erplora4().on("tables.session.transferred", () => this.ctrl.load()),
        erplora4().on("tables.session.merged", () => this.ctrl.load()),
        erplora4().on("tables.session.split", () => this.ctrl.load()),
        erplora4().on("tables.session.parked", () => this.ctrl.load()),
        erplora4().on("tables.session.restored", () => this.ctrl.load()),
        erplora4().on("tables.session.updated", () => this.ctrl.load()),
        erplora4().on("tables.session.deleted", () => this.ctrl.load()),
        erplora4().on("tables.settings.updated", () => this.loadSettings())
      ];
      this.unsub = () => offs.forEach((o7) => o7());
    } catch {
    }
    this.timer = setInterval(() => this.requestUpdate(), REFRESH_MS2);
  }
  disconnectedCallback() {
    window.removeEventListener("erplora:locale-changed", this.onLocaleChange);
    this.unsub?.();
    if (this.timer) clearInterval(this.timer);
    super.disconnectedCallback();
  }
  async loadZones() {
    try {
      const rows3 = await erplora4().queryAll("tables.zones.list", { sort: "sort_order", dir: "asc" });
      this.zones = Array.isArray(rows3) ? rows3 : [];
    } catch {
      this.zones = [];
    }
  }
  /** tables#74 — the people behind `waiter_id`, through the CORE namespace (ADR-0192): the module
   *  never joins `hub_user`. Best-effort, exactly like kitchen's KDS card and the printed chit: no
   *  permission, no SDK or a failing call leaves the column blank and the list working. */
  async loadWaiters() {
    try {
      const rows3 = await erplora4().query("hub.users.list");
      this.waiters = (Array.isArray(rows3) ? rows3 : []).filter((u5) => u5 && u5.id && String(u5.name ?? "").trim());
    } catch {
      this.waiters = [];
    }
  }
  /**
   * The NAME of a `waiter_id`, or '' when there is none to show.
   *
   * '' covers three cases on purpose and all of them read the same «—»: the check carries no waiter
   * (opened before tables#70), the hub does not list that id any more (someone who left the shift),
   * or the list could not be loaded. A raw UUID in a list of checks is worse than an empty cell —
   * nobody can act on it, and it makes the column look broken.
   */
  waiterName(waiterId) {
    const id = waiterId == null ? "" : String(waiterId);
    if (!id) return "";
    return this.waiters.find((u5) => String(u5.id) === id)?.name ?? "";
  }
  async loadSettings() {
    try {
      const r6 = await erplora4().query("tables.settings.get");
      const row = Array.isArray(r6) ? r6[0] : r6;
      this.settings = {
        timer_warning_minutes: Number(row?.timer_warning_minutes) || DEFAULT_SETTINGS.timer_warning_minutes,
        timer_critical_minutes: Number(row?.timer_critical_minutes) || DEFAULT_SETTINGS.timer_critical_minutes
      };
    } catch {
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }
  /** Tone of the duration cell: only an OPEN check is an alarm; history is never coloured. */
  durationTone(r6) {
    if (r6.status !== "active") return "ok";
    const m4 = durationMinutes(r6, this.now());
    if (m4 >= this.settings.timer_critical_minutes) return "critical";
    if (m4 >= this.settings.timer_warning_minutes) return "warning";
    return "ok";
  }
  onSegment(id) {
    const seg = SEGMENTS.find((s5) => s5.id === id) ?? SEGMENTS[0];
    this.segment = seg.id;
    this.ctrl.setFilter("status", seg.status);
  }
  /** The `zone` column filters by `zone_id` on the server; the rest map 1:1. */
  onFilterChange(detail) {
    if (detail.filters) {
      for (const [col, value] of Object.entries(detail.filters)) this.ctrl.setFilter(col === "zone" ? "zone_id" : col, value);
      return;
    }
    if (!detail.col) return;
    this.ctrl.setFilter(detail.col === "zone" ? "zone_id" : detail.col, detail.value);
  }
  async onRowAction(ev) {
    const { actionId, row } = ev.detail;
    const s5 = row;
    if (actionId === "detail") {
      this.detail = s5;
    } else if (actionId === "close" && s5.status === "active" && can("tables.change_tablesession")) {
      this.closeTarget = s5;
    }
  }
  async confirmClose() {
    if (!this.closeTarget) return;
    const target = this.closeTarget;
    this.saving = true;
    this.error = "";
    try {
      await erplora4().command("tables.sessions.close", { session_id: target.id, notes: null });
      await this.ctrl.load();
    } catch (e5) {
      this.error = domainMessage(e5, erplora4().locale, erplora4().t(CATALOG4, "ui.errCloseSession"));
    } finally {
      this.closeTarget = null;
      this.saving = false;
    }
  }
  render() {
    const t5 = (k2, p4) => erplora4().t(CATALOG4, k2, p4);
    return b2`<div class="page">
      ${this.error ? b2`<ok-inline-feedback data-testid="tables-sessions-error" tone="danger" icon="alert-circle-outline">${this.error}</ok-inline-feedback>` : A}
      ${this.ctrl?.error && !dataTableShowsLoadError() ? b2`<ok-inline-feedback data-testid="tables-sessions-load-error" tone="danger" icon="alert-circle-outline">${this.ctrl.error}</ok-inline-feedback>` : A}

      <ion-segment data-testid="tables-sessions-tabs" value=${this.segment} @ionChange=${(e5) => this.onSegment(String(e5.detail.value))}>
        ${SEGMENTS.map((s5) => b2`<ion-segment-button data-testid=${`tables-sessions-tab-${s5.id}`} value=${s5.id}><ion-label>${t5(s5.key)}</ion-label></ion-segment-button>`)}
      </ion-segment>

      <ok-data-table
        testid="tables-sessions-table"
        .error=${this.ctrl?.error ?? ""}
        @retry=${() => Promise.all([this.ctrl?.load(), this.loadZones(), this.loadSettings(), this.loadWaiters()])}
        .serverSide=${true}
        .fill=${true}
        .labels=${dataTableLabels(erplora4().locale)}
        .columns=${this.columns}
        .actions=${this.actions} .rowClickable=${true}
        .views=${true}
        .columnPicker=${true}
        .cardTitle=${(r6) => r6.table_number ? t5("ui.tableLabel", { number: r6.table_number }) : t5("ui.noTable")}
        .cardIcon=${() => "time-outline"}
        .rows=${this.ctrl?.rows ?? []}
        .total=${this.ctrl?.total ?? 0}
        .page=${this.ctrl?.state.page ?? 0}
        .pageSize=${this.ctrl?.state.pageSize ?? 50}
        .sort=${this.ctrl?.state.sort}
        .sortDir=${this.ctrl?.state.dir ?? "desc"}
        .searchable=${true}
        .searchPlaceholder=${t5("ui.searchSession")}
        .emptyMessage=${this.ctrl?.loading ? t5("ui.loading") : t5("ui.emptySessions")}
        @rowAction=${(e5) => this.onRowAction(e5)} @rowClick=${(e5) => this.onRowAction({ detail: { actionId: "detail", row: e5.detail.row } })}
        @pageChange=${(e5) => this.ctrl.setPage(e5.detail)}
        @pageSizeChange=${(e5) => this.ctrl.setPageSize(e5.detail)}
        @sortChange=${(e5) => this.ctrl.setSort(e5.detail.sort, e5.detail.dir)}
        @searchChange=${(e5) => this.ctrl.setSearch(e5.detail)}
        @filterChange=${(e5) => this.onFilterChange(e5.detail)}
      ></ok-data-table>

      <!-- Detail. ion-modal reparents to <body>: Ionic classes only, no shadow CSS. The detail
           sits in its own .ion-page: presenting, Ionic MOVES the modal's children into a wrapper
           of its own, and a detail moved away from Lit's markers is never removed (tables#111). -->
      <ion-modal data-testid="tables-sessions-detail" .isOpen=${!!this.detail} @ionModalDidDismiss=${() => this.detail = null}>
        <div class="ion-page">${this.detail ? this.renderDetail(this.detail, t5) : A}</div>
      </ion-modal>

      <!-- Close confirmation. -->
      <ion-modal data-testid="tables-sessions-close-modal" .isOpen=${!!this.closeTarget} @ionModalDidDismiss=${() => this.closeTarget = null}>
        <ion-header class="ion-no-border"><ion-toolbar><ion-title>${t5("ui.closeSessionTitle")}</ion-title></ion-toolbar></ion-header>
        <ion-content class="ion-padding">
          <ion-list lines="none">
            <ion-item><ion-label class="ion-text-wrap">
              ${t5("ui.closeSessionImpact", { number: this.closeTarget?.table_number ?? "\u2014", count: this.closeTarget?.guests_count ?? 0 })}
            </ion-label></ion-item>
          </ion-list>
          <ion-button data-testid="tables-sessions-close-confirm" class="ion-margin-top" expand="block" style=${ionTone("solid", "danger")} ?disabled=${this.saving} @click=${() => this.confirmClose()}>${t5("ui.actionCloseSession")}</ion-button>
          <ion-button data-testid="tables-sessions-close-cancel" expand="block" fill="outline" @click=${() => this.closeTarget = null}>${t5("ui.cancel")}</ion-button>
        </ion-content>
      </ion-modal>
    </div>`;
  }
  renderDetail(s5, t5) {
    const row = (label, value) => b2`<ion-item><ion-label class="ion-text-wrap"><p>${label}</p><h3>${value ?? "\u2014"}</h3></ion-label></ion-item>`;
    return b2`
      <ion-header class="ion-no-border"><ion-toolbar>
        <ion-title>${s5.table_number ? t5("ui.tableLabel", { number: s5.table_number }) : t5("ui.noTable")}</ion-title>
        <ion-buttons slot="end"><ion-button data-testid="tables-sessions-detail-close" @click=${() => this.detail = null}>${t5("ui.close")}</ion-button></ion-buttons>
      </ion-toolbar></ion-header>
      <ion-content class="ion-padding">
        <ion-list lines="none">
          ${row(t5("ui.colZone"), s5.zone || "\u2014")}
          ${row(t5("ui.colWaiter"), this.waiterName(s5.waiter_id) || "\u2014")}
          ${row(t5("ui.colStatus"), STATUS_KEY4[s5.status] ? t5(STATUS_KEY4[s5.status]) : s5.status)}
          ${row(t5("ui.colGuests"), t5("ui.paxCount", { count: s5.guests_count ?? 0 }))}
          ${row(t5("ui.colOpenedAt"), clockTime(s5.opened_at, this.now()))}
          ${row(t5("ui.colClosedAt"), clockTime(s5.closed_at, this.now()))}
          ${row(t5("ui.colDuration"), t5("ui.durationMinutes", { minutes: durationMinutes(s5, this.now()) }))}
          ${row(t5("ui.colPaidTotal"), paidAmount(s5.paid_total))}
          ${row(t5("ui.colNotes"), s5.notes || "\u2014")}
        </ion-list>
        ${s5.status === "active" && can("tables.change_tablesession") ? b2`<ion-button data-testid="tables-sessions-detail-close-session" class="ion-margin-top" expand="block" style=${ionTone("solid", "danger")} @click=${() => {
      this.closeTarget = s5;
      this.detail = null;
    }}>${t5("ui.actionCloseSession")}</ion-button>` : A}
      </ion-content>`;
  }
};
__decorateClass([
  r5()
], ErpTablesSessions.prototype, "segment", 2);
__decorateClass([
  r5()
], ErpTablesSessions.prototype, "zones", 2);
__decorateClass([
  r5()
], ErpTablesSessions.prototype, "waiters", 2);
__decorateClass([
  r5()
], ErpTablesSessions.prototype, "settings", 2);
__decorateClass([
  r5()
], ErpTablesSessions.prototype, "detail", 2);
__decorateClass([
  r5()
], ErpTablesSessions.prototype, "closeTarget", 2);
__decorateClass([
  r5()
], ErpTablesSessions.prototype, "saving", 2);
__decorateClass([
  r5()
], ErpTablesSessions.prototype, "error", 2);
define("erp-tables-sessions", ErpTablesSessions);

// ui/components/erp-tables-zones/erp-tables-zones.ts
var CATALOG5 = { es: es_default, en: en_default };
var COLORS = ["primary", "secondary", "tertiary", "success", "warning", "danger", "medium"];
var COLOR_KEY = {
  primary: "ui.colorPrimary",
  secondary: "ui.colorSecondary",
  tertiary: "ui.colorTertiary",
  success: "ui.colorSuccess",
  warning: "ui.colorWarning",
  danger: "ui.colorDanger",
  medium: "ui.colorMedium"
};
function erplora5() {
  const c5 = globalThis.erplora;
  if (!c5) throw new Error("erplora SDK not initialised by the shell");
  return c5;
}
var EMPTY_FORM = { name: "", color: "primary", sortOrder: "0", isActive: true };
var ErpTablesZones = class extends i3 {
  constructor() {
    super(...arguments);
    this.form = { ...EMPTY_FORM };
    this.editingId = null;
    /** Row being edited: keeps the fields the form does not expose (`description`) on update. */
    this.editRow = null;
    this.deleteTarget = null;
    this.saving = false;
    this.formError = "";
    this.pageError = "";
    this.onLocaleChange = () => this.requestUpdate();
  }
  static {
    this.styles = i`
    :host { display:flex; flex-direction:column; height:100%; min-height:0; font-family: system-ui, sans-serif; color: var(--ion-text-color, #1c1b18); }
    .page { display:flex; flex-direction:column; min-height:0; flex:1 1 auto; gap:.75rem; }
    .page > ok-data-table { flex:1 1 auto; min-height:0; }
    .form { display:flex; flex-direction:column; gap:.7rem; }
    .form .foot { display:flex; justify-content:flex-end; gap:.5rem; }
    .swatch { display:inline-block; width:.9rem; height:.9rem; border-radius: var(--ok-radius-pill, 50%); vertical-align:middle; margin-right:.4rem; }
    .off { color: var(--ok-muted, #8b897f); }
  `;
  }
  get columns() {
    const t5 = (k2, p4) => erplora5().t(CATALOG5, k2, p4);
    return [
      {
        key: "name",
        header: t5("ui.colName"),
        sortable: true,
        filterable: true,
        filterType: "text",
        render: (r6) => b2`<span class="swatch" style=${`background:var(--ion-color-${r6.color || "primary"})`}></span>${r6.name}`
      },
      { key: "table_count", header: t5("ui.colTables"), align: "right", sortable: true, format: (r6) => String(r6.table_count ?? 0) },
      {
        key: "available_tables_count",
        header: t5("ui.colAvailable"),
        align: "right",
        sortable: true,
        format: (r6) => t5("ui.availableOfTotal", { available: r6.available_tables_count ?? 0, total: r6.table_count ?? 0 })
      },
      { key: "sort_order", header: t5("ui.colOrder"), align: "right", sortable: true },
      {
        key: "is_active",
        header: t5("ui.colStatus"),
        sortable: true,
        filterable: true,
        filterType: "select",
        options: [
          { value: "1", label: t5("ui.zoneActive") },
          { value: "0", label: t5("ui.zoneInactive") }
        ],
        format: (r6) => Number(r6.is_active) ? t5("ui.zoneActive") : t5("ui.zoneInactive")
      }
    ];
  }
  get actions() {
    const t5 = (k2) => erplora5().t(CATALOG5, k2);
    return [
      ...can("tables.change_zone") ? [{ id: "edit", label: t5("ui.actionEdit"), icon: "create-outline" }] : [],
      ...can("tables.delete_zone") ? [{ id: "delete", label: t5("ui.actionDelete"), icon: "trash-outline", color: "danger" }] : []
    ];
  }
  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("erplora:locale-changed", this.onLocaleChange);
  }
  async firstUpdated() {
    this.renderRoot.querySelector("ok-data-table")?.addEventListener("click", (e5) => this.onTableClick(e5));
    this.ctrl = createListController(erplora5(), "tables.zones.list", () => this.requestUpdate(), {
      pageSize: 50,
      sort: "sort_order",
      dir: "asc"
    });
    await this.ctrl.load();
    this.form = { ...EMPTY_FORM, sortOrder: String(this.nextOrder()) };
    try {
      const offs = [
        erplora5().on("tables.zone.created", () => this.ctrl.load()),
        erplora5().on("tables.zone.updated", () => this.ctrl.load()),
        erplora5().on("tables.zone.deleted", () => this.ctrl.load()),
        erplora5().on("tables.table.created", () => this.ctrl.load()),
        erplora5().on("tables.table.updated", () => this.ctrl.load()),
        erplora5().on("tables.table.deleted", () => this.ctrl.load()),
        erplora5().on("tables.session.opened", () => this.ctrl.load()),
        erplora5().on("tables.session.closed", () => this.ctrl.load())
      ];
      this.unsub = () => offs.forEach((o7) => o7());
    } catch {
    }
  }
  disconnectedCallback() {
    window.removeEventListener("erplora:locale-changed", this.onLocaleChange);
    this.unsub?.();
    super.disconnectedCallback();
  }
  /** A new zone goes to the end: max(sort_order) + 1 over the loaded page, or the total. */
  nextOrder() {
    const rows3 = this.ctrl?.rows ?? [];
    const max = rows3.reduce((m4, z2) => Math.max(m4, Number(z2.sort_order) || 0), -1);
    return Math.max(max + 1, this.ctrl?.total ?? 0);
  }
  dataTable() {
    return this.renderRoot.querySelector("ok-data-table");
  }
  /** Labels of the table. The edit header comes from open('edit', { title }) (pm#450,
   *  outfitkit#150); overriding `newRecord` while editing is the fallback for OutfitKit < 0.1.94,
   *  which ignores the title and paints `newRecord` for the edit panel too. */
  get tableLabels() {
    const base = dataTableLabels(erplora5().locale);
    return this.editingId && this.editRow ? { ...base, newRecord: erplora5().t(CATALOG5, "ui.panelEditZone", { name: this.editRow.name }) } : base;
  }
  async onRowAction(ev) {
    const { actionId, row } = ev.detail;
    const z2 = row;
    if (actionId === "edit" && can("tables.change_zone")) {
      this.editingId = z2.id;
      this.editRow = z2;
      this.form = { name: z2.name, color: z2.color || "primary", sortOrder: String(z2.sort_order ?? 0), isActive: Number(z2.is_active) === 1 };
      this.formError = "";
      this.dataTable()?.open("edit", { title: erplora5().t(CATALOG5, "ui.panelEditZone", { name: z2.name }) });
    } else if (actionId === "delete" && can("tables.delete_zone")) {
      this.deleteTarget = z2;
      this.pageError = "";
    }
  }
  cancelEdit() {
    this.editingId = null;
    this.editRow = null;
    this.form = { ...EMPTY_FORM, sortOrder: String(this.nextOrder()) };
    this.formError = "";
  }
  /** pm#450: the table's «Add» emits no event and keeps our form state; after an edit it would
   *  show the edited zone under a «New» header, and the submit would UPDATE it. Only resets the
   *  form: «Add» has just opened the panel, so it must not be closed. */
  onTableClick(e5) {
    if (!this.editingId) return;
    const addId = "tables-zones-table-add";
    if (e5.composedPath().some((n6) => n6 instanceof HTMLElement && n6.getAttribute("data-testid") === addId)) this.cancelEdit();
  }
  async submit(ev) {
    ev.preventDefault();
    const name = this.form.name.trim();
    if (!name) return;
    if (!can(this.editingId ? "tables.change_zone" : "tables.add_zone")) return;
    this.saving = true;
    this.formError = "";
    this.pageError = "";
    try {
      const sortOrder = Math.max(0, Number(this.form.sortOrder) || 0);
      if (this.editingId) {
        await erplora5().command("tables.zones.update", {
          zone_id: this.editingId,
          name,
          description: this.editRow?.description ?? "",
          color: this.form.color || "primary",
          sort_order: sortOrder,
          is_active: this.form.isActive ? 1 : 0
        });
      } else {
        await erplora5().command("tables.zones.create", {
          name,
          description: "",
          color: this.form.color || "primary",
          sort_order: sortOrder
        });
      }
      this.cancelEdit();
      this.dataTable()?.close();
      await this.ctrl.load();
    } catch (e5) {
      this.formError = domainMessage(e5, erplora5().locale, erplora5().t(CATALOG5, "ui.errSaveZone"));
    } finally {
      this.saving = false;
    }
  }
  async confirmDelete() {
    if (!this.deleteTarget || !can("tables.delete_zone")) return;
    const target = this.deleteTarget;
    this.saving = true;
    this.pageError = "";
    try {
      await erplora5().command("tables.zones.delete", { zone_id: target.id });
      await this.ctrl.load();
    } catch (e5) {
      this.pageError = domainMessage(e5, erplora5().locale, erplora5().t(CATALOG5, "ui.errDeleteZone"));
    } finally {
      this.deleteTarget = null;
      this.saving = false;
    }
  }
  /** pm#513: the refusal appears above the button that was pressed, at the foot of the form — on a
   *  phone that can leave it off the sheet. Bring it into view once it has painted itself: scrolled
   *  before, the banner still measures 0 px and ends up under the tab bar. */
  updated(changed) {
    super.updated(changed);
    if (changed.has("formError") && this.formError) void this.revealFormError();
  }
  async revealFormError() {
    const banner = this.renderRoot.querySelector('[data-testid="tables-zones-form-error"]');
    await banner?.updateComplete;
    banner?.scrollIntoView?.({ block: "center" });
  }
  render() {
    const t5 = (k2, p4) => erplora5().t(CATALOG5, k2, p4);
    return b2`<div class="page">
      ${this.pageError ? b2`<ok-inline-feedback data-testid="tables-zones-error" tone="danger" icon="alert-circle-outline">${this.pageError}</ok-inline-feedback>` : A}
      ${this.ctrl?.error && !dataTableShowsLoadError() ? b2`<ok-inline-feedback data-testid="tables-zones-load-error" tone="danger" icon="alert-circle-outline">${this.ctrl.error}</ok-inline-feedback>` : A}

      <ok-data-table
        testid="tables-zones-table"
        .error=${this.ctrl?.error ?? ""}
        @retry=${() => this.ctrl?.load()}
        .serverSide=${true}
        .fill=${true}
        .labels=${this.tableLabels}
        .columns=${this.columns}
        .actions=${this.actions} .rowClickable=${true}
        .addable=${can("tables.add_zone")}
        .views=${true}
        .cardTitle=${(r6) => String(r6.name ?? "")}
        .cardIcon=${() => "layers-outline"}
        .rows=${this.ctrl?.rows ?? []}
        .total=${this.ctrl?.total ?? 0}
        .page=${this.ctrl?.state.page ?? 0}
        .pageSize=${this.ctrl?.state.pageSize ?? 50}
        .sort=${this.ctrl?.state.sort}
        .sortDir=${this.ctrl?.state.dir ?? "asc"}
        .searchable=${true}
        .searchPlaceholder=${t5("ui.searchZone")}
        .emptyMessage=${this.ctrl?.loading ? t5("ui.loading") : t5("ui.emptyZones")}
        @rowAction=${(e5) => this.onRowAction(e5)} @rowClick=${(e5) => this.onRowAction({ detail: { actionId: "edit", row: e5.detail.row } })}
        @pageChange=${(e5) => this.ctrl.setPage(e5.detail)}
        @pageSizeChange=${(e5) => this.ctrl.setPageSize(e5.detail)}
        @sortChange=${(e5) => this.ctrl.setSort(e5.detail.sort, e5.detail.dir)}
        @searchChange=${(e5) => this.ctrl.setSearch(e5.detail)}
        @filterChange=${(e5) => this.ctrl.setFilter(e5.detail.col, e5.detail.value)}
      >
        <!-- Create / edit: always projected (the «+» must never open an empty panel). -->
        <form slot="create" class="form" data-testid="tables-zones-form" @submit=${(e5) => this.submit(e5)}>
          <ion-input data-testid="tables-zones-name" mode="md" fill="outline" label-placement="floating" label=${t5("ui.colName")} .value=${this.form.name}
            @ionInput=${(e5) => this.form = { ...this.form, name: e5.target.value || "" }}></ion-input>
          <ion-select data-testid="tables-zones-color" mode="md" fill="outline" label-placement="floating" label=${t5("ui.colColor")} interface="popover" .value=${this.form.color}
            @ionChange=${(e5) => this.form = { ...this.form, color: e5.detail.value || "primary" }}>
            ${COLORS.map((c5) => b2`<ion-select-option value=${c5}>${t5(COLOR_KEY[c5])}</ion-select-option>`)}
          </ion-select>
          <ion-input data-testid="tables-zones-order" mode="md" fill="outline" label-placement="floating" label=${t5("ui.colOrder")} type="number" min="0" .value=${this.form.sortOrder}
            @ionInput=${(e5) => this.form = { ...this.form, sortOrder: e5.target.value || "0" }}></ion-input>
          ${this.editingId ? b2`<ion-toggle data-testid="tables-zones-active" .checked=${this.form.isActive} @ionChange=${(e5) => this.form = { ...this.form, isActive: !!e5.detail.checked }}>${t5("ui.zoneActive")}</ion-toggle>` : A}
          <!-- pm#513: the refusal travels WITH the form — under 834 px the panel is a full-screen
               sheet and a banner on the page underneath it is never seen. -->
          ${this.formError ? b2`<ok-inline-feedback data-testid="tables-zones-form-error" tone="danger" icon="alert-circle-outline">${this.formError}</ok-inline-feedback>` : A}
          <div class="foot">
            ${this.editingId ? b2`<ion-button data-testid="tables-zones-cancel" fill="clear" @click=${() => {
      this.cancelEdit();
      this.dataTable()?.close();
    }}>${t5("ui.cancel")}</ion-button>` : A}
            <ion-button data-testid="tables-zones-submit" type="submit" ?disabled=${this.saving || !this.form.name.trim()}>
              ${this.saving ? t5("ui.saving") : this.editingId ? t5("ui.saveChanges") : t5("ui.addZone")}
            </ion-button>
          </div>
        </form>
      </ok-data-table>

      <!-- Delete confirmation. ion-modal reparents to <body>: Ionic classes only, no shadow CSS. -->
      <ion-modal data-testid="tables-zones-delete-modal" .isOpen=${!!this.deleteTarget} @ionModalDidDismiss=${() => this.deleteTarget = null}>
        <ion-header class="ion-no-border"><ion-toolbar><ion-title>${t5("ui.deleteZoneTitle")}</ion-title></ion-toolbar></ion-header>
        <ion-content class="ion-padding">
          <ion-list lines="none">
            <ion-item><ion-label class="ion-text-wrap">
              <b>${this.deleteTarget?.name ?? ""}</b> — ${t5("ui.deleteZoneImpact", { count: this.deleteTarget?.table_count ?? 0 })}
            </ion-label></ion-item>
          </ion-list>
          <!-- tables#55: the dialog already knows the zone has tables — it says so, with the
               number, right above, out of the count tables.zones.list returns. Offering the
               destructive action anyway is what tables#14 fixed for the POS blocked table. -->
          <ion-button data-testid="tables-zones-delete-confirm" class="ion-margin-top" expand="block" style=${ionTone("solid", "danger")}
            ?disabled=${this.saving || (this.deleteTarget?.table_count ?? 0) > 0}
            @click=${() => this.confirmDelete()}>${t5("ui.deleteZone")}</ion-button>
          <ion-button data-testid="tables-zones-delete-cancel" expand="block" fill="outline" @click=${() => this.deleteTarget = null}>${t5("ui.cancel")}</ion-button>
        </ion-content>
      </ion-modal>
    </div>`;
  }
};
__decorateClass([
  r5()
], ErpTablesZones.prototype, "form", 2);
__decorateClass([
  r5()
], ErpTablesZones.prototype, "editingId", 2);
__decorateClass([
  r5()
], ErpTablesZones.prototype, "deleteTarget", 2);
__decorateClass([
  r5()
], ErpTablesZones.prototype, "saving", 2);
__decorateClass([
  r5()
], ErpTablesZones.prototype, "formError", 2);
__decorateClass([
  r5()
], ErpTablesZones.prototype, "pageError", 2);
define("erp-tables-zones", ErpTablesZones);
