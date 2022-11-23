
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
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
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
     * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
     * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
     * it can be called from an external module).
     *
     * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
     *
     * https://svelte.dev/docs#run-time-svelte-onmount
     */
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
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

    /* src\Key.svelte generated by Svelte v3.53.1 */
    const file$2 = "src\\Key.svelte";

    function create_fragment$2(ctx) {
    	let div;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(/*symbol*/ ctx[0]);
    			attr_dev(div, "class", "svelte-1lx02lk");
    			set_style(div, "background-color", /*background*/ ctx[1]);
    			set_style(div, "color", /*color*/ ctx[2]);
    			add_location(div, file$2, 16, 0, 340);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);

    			if (!mounted) {
    				dispose = listen_dev(div, "click", /*handleClick*/ ctx[3], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*symbol*/ 1) set_data_dev(t, /*symbol*/ ctx[0]);

    			if (dirty & /*background*/ 2) {
    				set_style(div, "background-color", /*background*/ ctx[1]);
    			}

    			if (dirty & /*color*/ 4) {
    				set_style(div, "color", /*color*/ ctx[2]);
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
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Key', slots, []);
    	let dispatch = createEventDispatcher();
    	let { symbol } = $$props;
    	let { background } = $$props;
    	let { color } = $$props;

    	function handleClick() {
    		dispatch('click', { symbol });
    	}

    	$$self.$$.on_mount.push(function () {
    		if (symbol === undefined && !('symbol' in $$props || $$self.$$.bound[$$self.$$.props['symbol']])) {
    			console.warn("<Key> was created without expected prop 'symbol'");
    		}

    		if (background === undefined && !('background' in $$props || $$self.$$.bound[$$self.$$.props['background']])) {
    			console.warn("<Key> was created without expected prop 'background'");
    		}

    		if (color === undefined && !('color' in $$props || $$self.$$.bound[$$self.$$.props['color']])) {
    			console.warn("<Key> was created without expected prop 'color'");
    		}
    	});

    	const writable_props = ['symbol', 'background', 'color'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Key> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('symbol' in $$props) $$invalidate(0, symbol = $$props.symbol);
    		if ('background' in $$props) $$invalidate(1, background = $$props.background);
    		if ('color' in $$props) $$invalidate(2, color = $$props.color);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		symbol,
    		background,
    		color,
    		handleClick
    	});

    	$$self.$inject_state = $$props => {
    		if ('dispatch' in $$props) dispatch = $$props.dispatch;
    		if ('symbol' in $$props) $$invalidate(0, symbol = $$props.symbol);
    		if ('background' in $$props) $$invalidate(1, background = $$props.background);
    		if ('color' in $$props) $$invalidate(2, color = $$props.color);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [symbol, background, color, handleClick];
    }

    class Key extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { symbol: 0, background: 1, color: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Key",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get symbol() {
    		throw new Error("<Key>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set symbol(value) {
    		throw new Error("<Key>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get background() {
    		throw new Error("<Key>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set background(value) {
    		throw new Error("<Key>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get color() {
    		throw new Error("<Key>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set color(value) {
    		throw new Error("<Key>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Parameter.svelte generated by Svelte v3.53.1 */
    const file$1 = "src\\Parameter.svelte";

    // (28:0) {:else}
    function create_else_block$1(ctx) {
    	let div;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(/*symbol*/ ctx[0]);
    			attr_dev(div, "class", "svelte-1aokyd4");
    			set_style(div, "background-color", /*background*/ ctx[1]);
    			set_style(div, "color", /*color*/ ctx[2]);
    			add_location(div, file$1, 29, 0, 623);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);

    			if (!mounted) {
    				dispose = listen_dev(div, "click", /*handleClick*/ ctx[4], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*symbol*/ 1) set_data_dev(t, /*symbol*/ ctx[0]);

    			if (dirty & /*background*/ 2) {
    				set_style(div, "background-color", /*background*/ ctx[1]);
    			}

    			if (dirty & /*color*/ 4) {
    				set_style(div, "color", /*color*/ ctx[2]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(28:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (22:0) {#if pressed}
    function create_if_block$1(ctx) {
    	let div;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(/*symbol*/ ctx[0]);
    			attr_dev(div, "class", "svelte-1aokyd4");
    			set_style(div, "background-color", /*color*/ ctx[2]);
    			set_style(div, "color", /*background*/ ctx[1]);
    			add_location(div, file$1, 23, 0, 502);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);

    			if (!mounted) {
    				dispose = listen_dev(div, "click", /*handleClick*/ ctx[4], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*symbol*/ 1) set_data_dev(t, /*symbol*/ ctx[0]);

    			if (dirty & /*color*/ 4) {
    				set_style(div, "background-color", /*color*/ ctx[2]);
    			}

    			if (dirty & /*background*/ 2) {
    				set_style(div, "color", /*background*/ ctx[1]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(22:0) {#if pressed}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*pressed*/ ctx[3]) return create_if_block$1;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
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
    	validate_slots('Parameter', slots, []);
    	let dispatch = createEventDispatcher();
    	let { symbol } = $$props;
    	let { background } = $$props;
    	let { color } = $$props;
    	let pressed = false;

    	function handleClick() {
    		$$invalidate(3, pressed = !pressed);
    		if (pressed) return dispatch('press', { symbol });
    		return dispatch('unpress', { symbol });
    	}

    	$$self.$$.on_mount.push(function () {
    		if (symbol === undefined && !('symbol' in $$props || $$self.$$.bound[$$self.$$.props['symbol']])) {
    			console.warn("<Parameter> was created without expected prop 'symbol'");
    		}

    		if (background === undefined && !('background' in $$props || $$self.$$.bound[$$self.$$.props['background']])) {
    			console.warn("<Parameter> was created without expected prop 'background'");
    		}

    		if (color === undefined && !('color' in $$props || $$self.$$.bound[$$self.$$.props['color']])) {
    			console.warn("<Parameter> was created without expected prop 'color'");
    		}
    	});

    	const writable_props = ['symbol', 'background', 'color'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Parameter> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('symbol' in $$props) $$invalidate(0, symbol = $$props.symbol);
    		if ('background' in $$props) $$invalidate(1, background = $$props.background);
    		if ('color' in $$props) $$invalidate(2, color = $$props.color);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		symbol,
    		background,
    		color,
    		pressed,
    		handleClick
    	});

    	$$self.$inject_state = $$props => {
    		if ('dispatch' in $$props) dispatch = $$props.dispatch;
    		if ('symbol' in $$props) $$invalidate(0, symbol = $$props.symbol);
    		if ('background' in $$props) $$invalidate(1, background = $$props.background);
    		if ('color' in $$props) $$invalidate(2, color = $$props.color);
    		if ('pressed' in $$props) $$invalidate(3, pressed = $$props.pressed);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [symbol, background, color, pressed, handleClick];
    }

    class Parameter extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { symbol: 0, background: 1, color: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Parameter",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get symbol() {
    		throw new Error("<Parameter>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set symbol(value) {
    		throw new Error("<Parameter>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get background() {
    		throw new Error("<Parameter>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set background(value) {
    		throw new Error("<Parameter>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get color() {
    		throw new Error("<Parameter>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set color(value) {
    		throw new Error("<Parameter>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.53.1 */

    const { console: console_1 } = globals;
    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i].parameter;
    	child_ctx[16] = list[i].symbol;
    	child_ctx[17] = list[i].click;
    	child_ctx[18] = list[i].background;
    	child_ctx[19] = list[i].color;
    	return child_ctx;
    }

    // (262:3) {:else}
    function create_else_block(ctx) {
    	let key;
    	let current;

    	key = new Key({
    			props: {
    				symbol: /*symbol*/ ctx[16],
    				background: /*background*/ ctx[18],
    				color: /*color*/ ctx[19]
    			},
    			$$inline: true
    		});

    	key.$on("click", /*click*/ ctx[17]);

    	const block = {
    		c: function create() {
    			create_component(key.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(key, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(key.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(key.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(key, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(262:3) {:else}",
    		ctx
    	});

    	return block;
    }

    // (260:3) {#if parameter}
    function create_if_block(ctx) {
    	let parameter_1;
    	let current;

    	parameter_1 = new Parameter({
    			props: {
    				symbol: /*symbol*/ ctx[16],
    				background: /*background*/ ctx[18],
    				color: /*color*/ ctx[19]
    			},
    			$$inline: true
    		});

    	parameter_1.$on("press", /*click*/ ctx[17]);

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
    		source: "(260:3) {#if parameter}",
    		ctx
    	});

    	return block;
    }

    // (259:2) {#each keyboard as { parameter, symbol, click, background, color }}
    function create_each_block(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*parameter*/ ctx[2]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if_block.p(ctx, dirty);
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
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(259:2) {#each keyboard as { parameter, symbol, click, background, color }}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div2;
    	let div0;
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
    			t0 = text(/*display*/ ctx[0]);
    			t1 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "class", "screen svelte-cu4rbm");
    			add_location(div0, file, 256, 1, 4795);
    			attr_dev(div1, "class", "keyboard svelte-cu4rbm");
    			add_location(div1, file, 257, 1, 4831);
    			attr_dev(div2, "class", "app svelte-cu4rbm");
    			add_location(div2, file, 255, 0, 4777);
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
    			if (!current || dirty & /*display*/ 1) set_data_dev(t0, /*display*/ ctx[0]);

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

    function shortcut(symbol, callback) {
    	return {
    		symbol,
    		click: callback,
    		parameter: false,
    		background: '#a5a5a5',
    		color: 'black'
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let display = "0";

    	/*
    function variable(symbol) {
    	return {
    		id: symbol,
    		symbol: symbol,
    		classes: 'key variable',
    		callback: () => {

    			const entries = Object.entries(parameters);
    			const filled = entries.every(([key, value]) => key == symbol || value != null);

    			console.log(filled);
    			if (filled) {
    				console.log('I am calculating');
    				return display = calculate(symbol);
    			}
    				
    			display = parameters[symbol] = Number(display);
    			console.log(parameters);
    			console.log('Now I am storing the parameter');
    		},
    	};
    };

    /*
    function shortcut(symbol, callback) {
    	return {
    		id: symbol,
    		symbol: symbol,
    		classes: 'key shortcut',
    		callback: callback,
    	};
    };*/
    	/*
    function digit(symbol) {
    	return {
    		id: symbol,
    		symbol: symbol,
    		classes: 'key digit',
    		callback: event => display == "0"? display = String(symbol) : display += String(symbol),
    	};
    };
    */
    	function digit(symbol) {
    		return {
    			symbol,
    			click: push,
    			parameter: false,
    			background: '#333',
    			color: 'white'
    		};
    	}

    	function parameter(symbol) {
    		return {
    			symbol,
    			click: store,
    			parameter: true,
    			background: 'orange',
    			color: 'white'
    		};
    	}

    	// --------------- Actions -------------------- //  
    	function push({ detail: { symbol } }) {
    		if (display.length >= 8) return;
    		if (display == 0) return $$invalidate(0, display = String(symbol));
    		return $$invalidate(0, display += String(symbol));
    	}

    	function reset(symbol) {
    		$$invalidate(0, display = "0");
    		return '0';
    	}

    	function shift(symbol) {
    		let [integer, decimal] = Number(display).toFixed(2).split('.');
    		let number = Number(integer + decimal) / 10 ** (2 + decimal.length);
    		$$invalidate(0, display = `${number}`);
    		return number;
    	}

    	function multiply1000() {
    		('000').split('').forEach(push);
    	}

    	function convert(symbol) {
    		let number = shift();
    		let interest = Math.pow(1 + number, 1 / 12) - 1;
    		interest.split('').forEach(push);
    		return interest;
    	}

    	function putDecimal() {
    		$$invalidate(0, display += '.');
    	}

    	// ----------------- Memory ----------------------- //
    	let memory = new Map();

    	init('J');
    	init('V');
    	init('C');
    	init('A');
    	init('T');

    	function resetMem(parameter) {
    		set(parameter, null);
    	}

    	function init(param) {
    		set(param, null);
    	}

    	function set(param, value) {
    		memory.set(param, { value, filled: value != null });
    	}

    	// --------------- Parameter ----------------------- //
    	function store({ detail: { symbol } }) {
    		let entries = memory.entries();
    		let parameter;
    		let ready = true;

    		for (parameter of entries) {
    			ready = ready && (symbol == parameter[0] || parameter[1].filled);
    			if (!ready) break;
    		}
    		if (ready) return calculate(symbol);
    		set(symbol, Number(display));
    		console.log({ symbol, memory, ready });
    	}

    	// ---------------- Parameter ------------------ //
    	function calculate(symbol) {
    		let J = memory.get('J').value;
    		let V = memory.get(`V`).value;
    		let C = memory.get('C').value;
    		let A = memory.get('A').value;
    		let T = memory.get('T').value;

    		let table = {
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

    		if (symbol === 'J') return ('Error').split('').forEach(push);
    		let result = table[symbol]();
    		$$invalidate(0, display = result.toFixed(2));
    		console.log(result.toFixed);
    	} //table[symbol]().toString().split('').forEach(digit => push({ detail: { symbol: digit } }))

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
    		onMount,
    		Key,
    		Parameter,
    		display,
    		digit,
    		shortcut,
    		parameter,
    		push,
    		reset,
    		shift,
    		multiply1000,
    		convert,
    		putDecimal,
    		memory,
    		resetMem,
    		init,
    		set,
    		store,
    		calculate,
    		keyboard
    	});

    	$$self.$inject_state = $$props => {
    		if ('display' in $$props) $$invalidate(0, display = $$props.display);
    		if ('memory' in $$props) memory = $$props.memory;
    		if ('keyboard' in $$props) $$invalidate(1, keyboard = $$props.keyboard);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [display, keyboard, parameter];
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
