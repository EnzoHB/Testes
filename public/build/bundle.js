
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * Creates an event dispatcher that can be used to dispatch [component events](/docs#template-syntax-component-directives-on-eventname).
     * Event dispatchers are functions that can take two arguments: `name` and `detail`.
     *
     * Component events created with `createEventDispatcher` create a
     * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
     * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
     * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
     * property and can contain any type of data.
     *
     * https://svelte.dev/docs#run-time-svelte-createeventdispatcher
     */
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail, { cancelable = false } = {}) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail, { cancelable });
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
                return !event.defaultPrevented;
            }
            return true;
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.53.1' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\Parameter.svelte generated by Svelte v3.53.1 */
    const file$3 = "src\\Parameter.svelte";

    function create_fragment$3(ctx) {
    	let div;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(/*symbol*/ ctx[0]);
    			attr_dev(div, "class", "parameter svelte-uxduvb");
    			toggle_class(div, "pressed", /*pressed*/ ctx[1]);
    			add_location(div, file$3, 20, 0, 431);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);

    			if (!mounted) {
    				dispose = listen_dev(div, "click", /*handleClick*/ ctx[2], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*symbol*/ 1) set_data_dev(t, /*symbol*/ ctx[0]);

    			if (dirty & /*pressed*/ 2) {
    				toggle_class(div, "pressed", /*pressed*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Parameter', slots, []);
    	let dispatch = createEventDispatcher();
    	let { symbol } = $$props;
    	let pressed = false;

    	function handleClick() {
    		$$invalidate(1, pressed = !pressed);
    		if (pressed) return dispatch('press', { symbol });
    		return dispatch('unpress', { symbol });
    	}

    	$$self.$$.on_mount.push(function () {
    		if (symbol === undefined && !('symbol' in $$props || $$self.$$.bound[$$self.$$.props['symbol']])) {
    			console.warn("<Parameter> was created without expected prop 'symbol'");
    		}
    	});

    	const writable_props = ['symbol'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Parameter> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('symbol' in $$props) $$invalidate(0, symbol = $$props.symbol);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		symbol,
    		pressed,
    		handleClick
    	});

    	$$self.$inject_state = $$props => {
    		if ('dispatch' in $$props) dispatch = $$props.dispatch;
    		if ('symbol' in $$props) $$invalidate(0, symbol = $$props.symbol);
    		if ('pressed' in $$props) $$invalidate(1, pressed = $$props.pressed);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [symbol, pressed, handleClick];
    }

    class Parameter extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { symbol: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Parameter",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get symbol() {
    		throw new Error("<Parameter>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set symbol(value) {
    		throw new Error("<Parameter>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Shortcut.svelte generated by Svelte v3.53.1 */
    const file$2 = "src\\Shortcut.svelte";

    function create_fragment$2(ctx) {
    	let div;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(/*symbol*/ ctx[0]);
    			attr_dev(div, "class", "shortcut svelte-177di4y");
    			add_location(div, file$2, 14, 0, 289);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);

    			if (!mounted) {
    				dispose = listen_dev(div, "click", /*handleClick*/ ctx[1], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*symbol*/ 1) set_data_dev(t, /*symbol*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Shortcut', slots, []);
    	let dispatch = createEventDispatcher();
    	let { symbol } = $$props;

    	function handleClick() {
    		dispatch('click', { symbol });
    	}

    	$$self.$$.on_mount.push(function () {
    		if (symbol === undefined && !('symbol' in $$props || $$self.$$.bound[$$self.$$.props['symbol']])) {
    			console.warn("<Shortcut> was created without expected prop 'symbol'");
    		}
    	});

    	const writable_props = ['symbol'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Shortcut> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('symbol' in $$props) $$invalidate(0, symbol = $$props.symbol);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		symbol,
    		handleClick
    	});

    	$$self.$inject_state = $$props => {
    		if ('dispatch' in $$props) dispatch = $$props.dispatch;
    		if ('symbol' in $$props) $$invalidate(0, symbol = $$props.symbol);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [symbol, handleClick];
    }

    class Shortcut extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { symbol: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Shortcut",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get symbol() {
    		throw new Error("<Shortcut>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set symbol(value) {
    		throw new Error("<Shortcut>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Digit.svelte generated by Svelte v3.53.1 */
    const file$1 = "src\\Digit.svelte";

    function create_fragment$1(ctx) {
    	let div;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(/*symbol*/ ctx[0]);
    			attr_dev(div, "class", "digit svelte-dzplju");
    			add_location(div, file$1, 14, 0, 289);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);

    			if (!mounted) {
    				dispose = listen_dev(div, "click", /*handleClick*/ ctx[1], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*symbol*/ 1) set_data_dev(t, /*symbol*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Digit', slots, []);
    	let dispatch = createEventDispatcher();
    	let { symbol } = $$props;

    	function handleClick() {
    		dispatch('click', { symbol });
    	}

    	$$self.$$.on_mount.push(function () {
    		if (symbol === undefined && !('symbol' in $$props || $$self.$$.bound[$$self.$$.props['symbol']])) {
    			console.warn("<Digit> was created without expected prop 'symbol'");
    		}
    	});

    	const writable_props = ['symbol'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Digit> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('symbol' in $$props) $$invalidate(0, symbol = $$props.symbol);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		symbol,
    		handleClick
    	});

    	$$self.$inject_state = $$props => {
    		if ('dispatch' in $$props) dispatch = $$props.dispatch;
    		if ('symbol' in $$props) $$invalidate(0, symbol = $$props.symbol);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [symbol, handleClick];
    }

    class Digit extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { symbol: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Digit",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get symbol() {
    		throw new Error("<Digit>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set symbol(value) {
    		throw new Error("<Digit>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.53.1 */

    const { console: console_1 } = globals;
    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[14] = list[i].type;
    	child_ctx[15] = list[i].symbol;
    	child_ctx[16] = list[i].callback;
    	return child_ctx;
    }

    // (284:32) 
    function create_if_block_2(ctx) {
    	let shortcut_1;
    	let current;

    	shortcut_1 = new Shortcut({
    			props: { symbol: /*symbol*/ ctx[15] },
    			$$inline: true
    		});

    	shortcut_1.$on("click", /*callback*/ ctx[16].click);

    	const block = {
    		c: function create() {
    			create_component(shortcut_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(shortcut_1, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(shortcut_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(shortcut_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(shortcut_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(284:32) ",
    		ctx
    	});

    	return block;
    }

    // (282:29) 
    function create_if_block_1(ctx) {
    	let digit_1;
    	let current;

    	digit_1 = new Digit({
    			props: { symbol: /*symbol*/ ctx[15] },
    			$$inline: true
    		});

    	digit_1.$on("click", /*callback*/ ctx[16].click);

    	const block = {
    		c: function create() {
    			create_component(digit_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(digit_1, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(digit_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(digit_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(digit_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(282:29) ",
    		ctx
    	});

    	return block;
    }

    // (280:3) {#if type =='parameter'}
    function create_if_block(ctx) {
    	let parameter_1;
    	let current;

    	parameter_1 = new Parameter({
    			props: { symbol: /*symbol*/ ctx[15] },
    			$$inline: true
    		});

    	parameter_1.$on("press", /*callback*/ ctx[16].press);
    	parameter_1.$on("unpress", /*callback*/ ctx[16].unpress);

    	const block = {
    		c: function create() {
    			create_component(parameter_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(parameter_1, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(parameter_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(parameter_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(parameter_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(280:3) {#if type =='parameter'}",
    		ctx
    	});

    	return block;
    }

    // (279:2) {#each keyboard as { type, symbol, callback }}
    function create_each_block(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block, create_if_block_1, create_if_block_2];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*type*/ ctx[14] == 'parameter') return 0;
    		if (/*type*/ ctx[14] == 'digit') return 1;
    		if (/*type*/ ctx[14] == 'shortcut') return 2;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(target, anchor);
    			}

    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (if_block) if_block.p(ctx, dirty);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d(detaching);
    			}

    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(279:2) {#each keyboard as { type, symbol, callback }}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div2;
    	let div0;
    	let t0_value = format(/*display*/ ctx[0]) + "";
    	let t0;
    	let t1;
    	let div1;
    	let current;
    	let each_value = /*keyboard*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "class", "screen svelte-cu4rbm");
    			add_location(div0, file, 276, 1, 5129);
    			attr_dev(div1, "class", "keyboard svelte-cu4rbm");
    			add_location(div1, file, 277, 1, 5173);
    			attr_dev(div2, "class", "app svelte-cu4rbm");
    			add_location(div2, file, 275, 0, 5111);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, t0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if ((!current || dirty & /*display*/ 1) && t0_value !== (t0_value = format(/*display*/ ctx[0]) + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*keyboard*/ 2) {
    				each_value = /*keyboard*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div1, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function format(string = '') {
    	let hasDecimalPoint = (/\./).test(string);
    	let isNegative = (/^-/).test(string);
    	let integer = string;
    	let decimal = '';
    	let sign = '';

    	if (hasDecimalPoint) {
    		integer = string.split('.')[0];
    		decimal = string.split('.')[1];
    	}

    	if (isNegative) {
    		sign = '-';
    		integer = integer.replace('-', '');
    	}
    	let classes = /\d{1,3}/g;
    	let pretty = '';
    	pretty = integer.split('').reverse('').join('').match(classes).join('.').split('').reverse().join('');
    	pretty = sign + pretty + (hasDecimalPoint ? ',' : '') + decimal;
    	return pretty;
    }

    function shortcut(symbol, callback) {
    	return {
    		symbol,
    		callback: { click: callback },
    		type: `shortcut`
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let display = "0";

    	let Display = new (class {
    		get value() {
    			return Number(display);
    		}

    		get string() {
    			return String(display);
    		}

    		get length() {
    			return String(display).length;
    		}

    		set(value) {
    			$$invalidate(0, display = String(value).slice(0, 6));
    		}

    		push(digit) {
    			if (display.length >= 6) return;
    			if (Display.string === `0`) return $$invalidate(0, display = String(digit));
    			if (digit === '-') return $$invalidate(0, display = String(digit) + display);
    			return $$invalidate(0, display += String(digit));
    		}

    		pop(length = 1) {
    			$$invalidate(0, display = display.slice(0, display.length - length));
    		}
    	})();

    	function digit(symbol) {
    		return {
    			symbol,
    			callback: { click: push },
    			type: 'digit'
    		};
    	}

    	function parameter(symbol) {
    		return {
    			symbol,
    			callback: { press: store, unpress: null },
    			type: `parameter`
    		};
    	}

    	// --------------- Actions -------------------- //  
    	function push({ detail: { symbol } }) {
    		Display.push(symbol);
    	}

    	function reset() {
    		Display.set('0');
    	}

    	function shift() {
    		let orders = 2;
    		let hasDecimalPoint = (/\./).test(Display.string);
    		let isNegative = (/^-/).test(Display.string);
    		let integer = Display.string;
    		let decimal = '';
    		let sign = '';

    		if (hasDecimalPoint) {
    			integer = Display.string.split('.')[0];
    			decimal = Display.string.split('.')[1];
    		}

    		if (isNegative) {
    			sign = '-';
    			integer = integer.replace('-', '');
    		}
    		let number = Number(integer + decimal) / 10 ** (orders + decimal.length);
    		let pretty = sign + number.toString();
    		Display.set(pretty);
    	}

    	function multiply1000() {
    		Display.set(Display.value * 1000);
    	}

    	function convert() {
    		shift();
    		Display.set(Math.pow(1 + Display.value, 1 / 12) - 1);
    	}

    	function putDecimal() {
    		Display.push('.');
    	}

    	// ----------------- Memory ----------------------- //
    	let Memory = new (class {
    		constructor() {
    			this.memory = new Map();
    		}

    		init(parameter) {
    			this.set(parameter, null);
    		}

    		set(parameter, value) {
    			console.log({ parameter, value });
    			this.memory.set(parameter, { value, filled: value != null });
    		}

    		get(parameter) {
    			return this.memory.get(parameter).value;
    		}

    		[Symbol.iterator]() {
    			return this.memory.entries();
    		}
    	})();

    	Memory.init('J');
    	Memory.init('V');
    	Memory.init('C');
    	Memory.init('A');
    	Memory.init('T');

    	// --------------- Parameter ----------------------- //
    	function store({ detail: { symbol } }) {
    		let ready = true;
    		let parameter;
    		let state;

    		for ([parameter, state] of Memory) {
    			ready = ready && (symbol == parameter || state.filled);
    			if (!ready) break;
    		}
    		if (ready) return calculate(symbol);
    		return Memory.set(symbol, Display.value);
    	}

    	// ---------------- Parameter ------------------ //
    	function calculate(toSolveFor) {
    		let J = Memory.get('J');
    		let V = Memory.get(`V`);
    		let C = Memory.get('C');
    		let A = Memory.get('A');
    		let T = Memory.get('T');

    		let equation = {
    			V: () => {
    				let m = (1 + J) ** T;
    				let v = (C * J * m + A * m - A) / J;
    				return v;
    			},
    			C: () => {
    				let m = (1 + J) ** T;
    				let c = V / m + A / (J * m) - A / J;
    				return c;
    			},
    			A: () => {
    				let m = (1 + J) ** T;
    				let n = J * (C * m - V);
    				let d = 1 - m;
    				let a = n / d;
    				return a;
    			},
    			T: () => {
    				let f = Math.log10(V * J + A);
    				let s = Math.log10(C * J + A);
    				let d = Math.log10(1 + J);
    				let t = (f - s) / d;
    				return t;
    			}
    		};

    		if (toSolveFor === 'J') return Display.set('Error');
    		Display.set(equation[toSolveFor]());
    	}

    	let keyboard = [
    		shortcut('R', reset),
    		shortcut('%', shift),
    		shortcut(`a%`, convert),
    		parameter('J'),
    		digit(7),
    		digit(8),
    		digit(9),
    		parameter('V'),
    		digit(4),
    		digit(5),
    		digit(6),
    		parameter('C'),
    		digit(1),
    		digit(2),
    		digit(3),
    		parameter('A'),
    		shortcut(`K`, multiply1000),
    		digit(0),
    		shortcut(`.`, putDecimal),
    		parameter('T')
    	];

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Parameter,
    		Shortcut,
    		Digit,
    		display,
    		Display,
    		format,
    		digit,
    		shortcut,
    		parameter,
    		push,
    		reset,
    		shift,
    		multiply1000,
    		convert,
    		putDecimal,
    		Memory,
    		store,
    		calculate,
    		keyboard
    	});

    	$$self.$inject_state = $$props => {
    		if ('display' in $$props) $$invalidate(0, display = $$props.display);
    		if ('Display' in $$props) Display = $$props.Display;
    		if ('Memory' in $$props) Memory = $$props.Memory;
    		if ('keyboard' in $$props) $$invalidate(1, keyboard = $$props.keyboard);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [display, keyboard];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
