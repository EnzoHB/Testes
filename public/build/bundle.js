
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
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function get_store_value(store) {
        let value;
        subscribe(store, _ => value = _)();
        return value;
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
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
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
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
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

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const staticVariables = writable({
        desiredAmount: 0,
        initialCapital: 0,
        monthlyInterest: 0,
    });

    /* src\Input.svelte generated by Svelte v3.53.1 */
    const file$3 = "src\\Input.svelte";

    function create_fragment$3(ctx) {
    	let div;
    	let h1;
    	let t0;
    	let t1;
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			t0 = text(/*header*/ ctx[0]);
    			t1 = space();
    			input = element("input");
    			add_location(h1, file$3, 18, 4, 315);
    			attr_dev(input, "type", "number");
    			attr_dev(input, "class", "svelte-15jk9xa");
    			add_location(input, file$3, 19, 4, 338);
    			attr_dev(div, "class", "svelte-15jk9xa");
    			add_location(div, file$3, 17, 0, 304);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(h1, t0);
    			append_dev(div, t1);
    			append_dev(div, input);
    			set_input_value(input, /*value*/ ctx[1]);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[4]),
    					listen_dev(input, "input", /*handleInput*/ ctx[2], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*header*/ 1) set_data_dev(t0, /*header*/ ctx[0]);

    			if (dirty & /*value*/ 2 && to_number(input.value) !== /*value*/ ctx[1]) {
    				set_input_value(input, /*value*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
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
    	validate_slots('Input', slots, []);
    	let { propertyToUpdate } = $$props;
    	let { header } = $$props;
    	let value;

    	function handleInput(event) {
    		staticVariables.update(information => (information[propertyToUpdate] = value, information));
    	}

    	$$self.$$.on_mount.push(function () {
    		if (propertyToUpdate === undefined && !('propertyToUpdate' in $$props || $$self.$$.bound[$$self.$$.props['propertyToUpdate']])) {
    			console.warn("<Input> was created without expected prop 'propertyToUpdate'");
    		}

    		if (header === undefined && !('header' in $$props || $$self.$$.bound[$$self.$$.props['header']])) {
    			console.warn("<Input> was created without expected prop 'header'");
    		}
    	});

    	const writable_props = ['propertyToUpdate', 'header'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Input> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		value = to_number(this.value);
    		$$invalidate(1, value);
    	}

    	$$self.$$set = $$props => {
    		if ('propertyToUpdate' in $$props) $$invalidate(3, propertyToUpdate = $$props.propertyToUpdate);
    		if ('header' in $$props) $$invalidate(0, header = $$props.header);
    	};

    	$$self.$capture_state = () => ({
    		staticVariables,
    		propertyToUpdate,
    		header,
    		value,
    		handleInput
    	});

    	$$self.$inject_state = $$props => {
    		if ('propertyToUpdate' in $$props) $$invalidate(3, propertyToUpdate = $$props.propertyToUpdate);
    		if ('header' in $$props) $$invalidate(0, header = $$props.header);
    		if ('value' in $$props) $$invalidate(1, value = $$props.value);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [header, value, handleInput, propertyToUpdate, input_input_handler];
    }

    class Input extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { propertyToUpdate: 3, header: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Input",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get propertyToUpdate() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set propertyToUpdate(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get header() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set header(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Interest.svelte generated by Svelte v3.53.1 */
    const file$2 = "src\\Interest.svelte";

    function create_fragment$2(ctx) {
    	let div;
    	let h1;
    	let t1;
    	let h30;
    	let t3;
    	let input0;
    	let t4;
    	let h31;
    	let t6;
    	let input1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "Juros";
    			t1 = space();
    			h30 = element("h3");
    			h30.textContent = "Anuais";
    			t3 = space();
    			input0 = element("input");
    			t4 = space();
    			h31 = element("h3");
    			h31.textContent = "Mensais";
    			t6 = space();
    			input1 = element("input");
    			add_location(h1, file$2, 36, 4, 775);
    			attr_dev(h30, "class", "svelte-r8s7fi");
    			add_location(h30, file$2, 37, 4, 795);
    			attr_dev(input0, "type", "number");
    			attr_dev(input0, "class", "svelte-r8s7fi");
    			add_location(input0, file$2, 38, 4, 816);
    			attr_dev(h31, "class", "svelte-r8s7fi");
    			add_location(h31, file$2, 39, 4, 900);
    			attr_dev(input1, "type", "number");
    			attr_dev(input1, "class", "svelte-r8s7fi");
    			add_location(input1, file$2, 40, 4, 922);
    			attr_dev(div, "id", "container");
    			attr_dev(div, "class", "svelte-r8s7fi");
    			add_location(div, file$2, 35, 0, 751);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(div, t1);
    			append_dev(div, h30);
    			append_dev(div, t3);
    			append_dev(div, input0);
    			set_input_value(input0, /*annually100*/ ctx[0]);
    			append_dev(div, t4);
    			append_dev(div, h31);
    			append_dev(div, t6);
    			append_dev(div, input1);
    			set_input_value(input1, /*monthly100*/ ctx[1]);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[5]),
    					listen_dev(input0, "input", /*updateMonthlyInterest*/ ctx[2], false, false, false),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[6]),
    					listen_dev(input1, "input", /*updateAnualInterest*/ ctx[3], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*annually100*/ 1 && to_number(input0.value) !== /*annually100*/ ctx[0]) {
    				set_input_value(input0, /*annually100*/ ctx[0]);
    			}

    			if (dirty & /*monthly100*/ 2 && to_number(input1.value) !== /*monthly100*/ ctx[1]) {
    				set_input_value(input1, /*monthly100*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
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
    	validate_slots('Interest', slots, []);
    	let annually100 = 15;
    	let monthly100;
    	let annually;
    	let monthly;

    	function updateMonthlyInterest(event) {
    		annually = annually100 / 100;
    		$$invalidate(4, monthly = Math.pow(1 + annually, 1 / 12) - 1);
    		$$invalidate(1, monthly100 = (monthly * 100).toFixed(3));
    	}

    	function updateAnualInterest(event) {
    		$$invalidate(4, monthly = monthly100 / 100);
    		annually = Math.pow(1 + monthly, 12) - 1;
    		$$invalidate(0, annually100 = (annually * 100).toFixed(3));
    	}
    	updateMonthlyInterest();
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Interest> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		annually100 = to_number(this.value);
    		$$invalidate(0, annually100);
    	}

    	function input1_input_handler() {
    		monthly100 = to_number(this.value);
    		$$invalidate(1, monthly100);
    	}

    	$$self.$capture_state = () => ({
    		staticVariables,
    		annually100,
    		monthly100,
    		annually,
    		monthly,
    		updateMonthlyInterest,
    		updateAnualInterest
    	});

    	$$self.$inject_state = $$props => {
    		if ('annually100' in $$props) $$invalidate(0, annually100 = $$props.annually100);
    		if ('monthly100' in $$props) $$invalidate(1, monthly100 = $$props.monthly100);
    		if ('annually' in $$props) annually = $$props.annually;
    		if ('monthly' in $$props) $$invalidate(4, monthly = $$props.monthly);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*monthly*/ 16) {
    			{
    				staticVariables.update(info => (info.monthlyInterest = monthly, info));
    			}
    		}
    	};

    	return [
    		annually100,
    		monthly100,
    		updateMonthlyInterest,
    		updateAnualInterest,
    		monthly,
    		input0_input_handler,
    		input1_input_handler
    	];
    }

    class Interest extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Interest",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\Results.svelte generated by Svelte v3.53.1 */

    const { console: console_1 } = globals;
    const file$1 = "src\\Results.svelte";

    function create_fragment$1(ctx) {
    	let div2;
    	let div0;
    	let h10;
    	let t1;
    	let input0;
    	let t2;
    	let div1;
    	let h11;
    	let t4;
    	let input1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			h10 = element("h1");
    			h10.textContent = "Aporte";
    			t1 = space();
    			input0 = element("input");
    			t2 = space();
    			div1 = element("div");
    			h11 = element("h1");
    			h11.textContent = "Meses";
    			t4 = space();
    			input1 = element("input");
    			add_location(h10, file$1, 41, 8, 1310);
    			attr_dev(input0, "type", "number");
    			attr_dev(input0, "class", "svelte-su8jbf");
    			add_location(input0, file$1, 42, 8, 1335);
    			attr_dev(div0, "class", "container svelte-su8jbf");
    			add_location(div0, file$1, 40, 4, 1279);
    			add_location(h11, file$1, 45, 8, 1453);
    			attr_dev(input1, "type", "number");
    			attr_dev(input1, "class", "svelte-su8jbf");
    			add_location(input1, file$1, 46, 8, 1477);
    			attr_dev(div1, "class", "container svelte-su8jbf");
    			add_location(div1, file$1, 44, 4, 1422);
    			attr_dev(div2, "class", "svelte-su8jbf");
    			add_location(div2, file$1, 39, 0, 1268);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, h10);
    			append_dev(div0, t1);
    			append_dev(div0, input0);
    			set_input_value(input0, /*contribution*/ ctx[0]);
    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			append_dev(div1, h11);
    			append_dev(div1, t4);
    			append_dev(div1, input1);
    			set_input_value(input1, /*months*/ ctx[1]);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[4]),
    					listen_dev(input0, "input", /*updateMonths*/ ctx[2], false, false, false),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[5]),
    					listen_dev(input1, "input", /*updateContribution*/ ctx[3], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*contribution*/ 1 && to_number(input0.value) !== /*contribution*/ ctx[0]) {
    				set_input_value(input0, /*contribution*/ ctx[0]);
    			}

    			if (dirty & /*months*/ 2 && to_number(input1.value) !== /*months*/ ctx[1]) {
    				set_input_value(input1, /*months*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			mounted = false;
    			run_all(dispose);
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

    function getMonths(monthlyContribution, { initialCapital, monthlyInterest, desiredAmount }) {
    	console.log(monthlyContribution, initialCapital, monthlyInterest, desiredAmount);
    	return (Math.log10(desiredAmount * monthlyInterest + monthlyContribution) - Math.log10(initialCapital * monthlyInterest + monthlyContribution)) / Math.log10(monthlyInterest + 1);
    }

    function getContribution(months, { initialCapital, monthlyInterest, desiredAmount }) {
    	let m = Math.pow(1 + monthlyInterest, months);
    	return (initialCapital * m - desiredAmount) * monthlyInterest / (1 - m);
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Results', slots, []);
    	let params;
    	staticVariables.subscribe(data => params = data);
    	let contribution = 0;
    	let months = 0;

    	function updateMonths() {
    		console.log(get_store_value(staticVariables));
    		$$invalidate(1, months = getMonths(contribution, params).toFixed(1));
    	}

    	function updateContribution() {
    		$$invalidate(0, contribution = getContribution(months, params).toFixed(1));
    	}
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<Results> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		contribution = to_number(this.value);
    		$$invalidate(0, contribution);
    	}

    	function input1_input_handler() {
    		months = to_number(this.value);
    		$$invalidate(1, months);
    	}

    	$$self.$capture_state = () => ({
    		get: get_store_value,
    		staticVariables,
    		params,
    		contribution,
    		months,
    		updateMonths,
    		updateContribution,
    		getMonths,
    		getContribution
    	});

    	$$self.$inject_state = $$props => {
    		if ('params' in $$props) params = $$props.params;
    		if ('contribution' in $$props) $$invalidate(0, contribution = $$props.contribution);
    		if ('months' in $$props) $$invalidate(1, months = $$props.months);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	updateMonths();

    	return [
    		contribution,
    		months,
    		updateMonths,
    		updateContribution,
    		input0_input_handler,
    		input1_input_handler
    	];
    }

    class Results extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Results",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.53.1 */
    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let div7;
    	let div1;
    	let div0;
    	let input0;
    	let t0;
    	let input1;
    	let t1;
    	let interest;
    	let t2;
    	let results;
    	let t3;
    	let div6;
    	let div2;
    	let t4;
    	let div5;
    	let div3;
    	let t5;
    	let div4;
    	let current;

    	input0 = new Input({
    			props: {
    				header: "Capital",
    				propertyToUpdate: "initialCapital"
    			},
    			$$inline: true
    		});

    	input1 = new Input({
    			props: {
    				header: "Objetivo",
    				propertyToUpdate: "desiredAmount"
    			},
    			$$inline: true
    		});

    	interest = new Interest({ $$inline: true });
    	results = new Results({ $$inline: true });

    	const block = {
    		c: function create() {
    			div7 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			create_component(input0.$$.fragment);
    			t0 = space();
    			create_component(input1.$$.fragment);
    			t1 = space();
    			create_component(interest.$$.fragment);
    			t2 = space();
    			create_component(results.$$.fragment);
    			t3 = space();
    			div6 = element("div");
    			div2 = element("div");
    			t4 = space();
    			div5 = element("div");
    			div3 = element("div");
    			t5 = space();
    			div4 = element("div");
    			attr_dev(div0, "class", "money svelte-drvore");
    			add_location(div0, file, 10, 2, 258);
    			attr_dev(div1, "class", "parameters svelte-drvore");
    			add_location(div1, file, 9, 1, 232);
    			attr_dev(div2, "class", "contribution");
    			add_location(div2, file, 18, 2, 468);
    			attr_dev(div3, "class", "months");
    			add_location(div3, file, 20, 3, 523);
    			attr_dev(div4, "class", "years");
    			add_location(div4, file, 21, 3, 552);
    			attr_dev(div5, "class", "time");
    			add_location(div5, file, 19, 2, 502);
    			attr_dev(div6, "class", "results");
    			add_location(div6, file, 17, 1, 445);
    			attr_dev(div7, "class", "app");
    			add_location(div7, file, 8, 0, 214);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div7, anchor);
    			append_dev(div7, div1);
    			append_dev(div1, div0);
    			mount_component(input0, div0, null);
    			append_dev(div0, t0);
    			mount_component(input1, div0, null);
    			append_dev(div1, t1);
    			mount_component(interest, div1, null);
    			append_dev(div7, t2);
    			mount_component(results, div7, null);
    			append_dev(div7, t3);
    			append_dev(div7, div6);
    			append_dev(div6, div2);
    			append_dev(div6, t4);
    			append_dev(div6, div5);
    			append_dev(div5, div3);
    			append_dev(div5, t5);
    			append_dev(div5, div4);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(input0.$$.fragment, local);
    			transition_in(input1.$$.fragment, local);
    			transition_in(interest.$$.fragment, local);
    			transition_in(results.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(input0.$$.fragment, local);
    			transition_out(input1.$$.fragment, local);
    			transition_out(interest.$$.fragment, local);
    			transition_out(results.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div7);
    			destroy_component(input0);
    			destroy_component(input1);
    			destroy_component(interest);
    			destroy_component(results);
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

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Input, Interest, Results });
    	return [];
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
