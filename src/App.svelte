<script>

    import Parameter from "./Parameter.svelte";
    import Shortcut from "./Shortcut.svelte";
	import Digit from './Digit.svelte'

 	let display = "0";
	let Display = new class {

		get value() {
			return Number(display);
		};

		get string() {
			return String(display);
		};

		get length() {
			return String(display).length;
		};

		set(value) {
			display = String(value).slice(0, 6);
		};

		push(digit) {
			if (display.length >= 8)
				return;

			if (digit === '.') 
				return display += String(digit);

			if (digit === '-')
				return display = String(digit) + display;
	
			if (Display.string === `0`)
				return display = String(digit);
				return display += String(digit)
		};

		pop(length = 1) {
			display = display.slice(0, display.length - length);
		};
	};

	function format(string) {

		let hasDecimalPoint = /\./.test(string);    
		let isNegative = /^-/.test(string);
			
		let integer = string; 
		let decimal = '';
		let sign = '';
			
		if (hasDecimalPoint) {
			integer = string.split('.')[0];
			decimal = string.split('.')[1];
		};

		if (isNegative) {
			sign = '-';
			integer = integer.replace('-', '');
		}; 

		let classes = /\d{1,3}/g;
		let pretty = '';

		console.log({string, integer, decimal, sign})

		pretty = integer.split('').reverse('').join('').match(classes).join('.').split('').reverse().join('')
		pretty = sign + pretty + ( hasDecimalPoint? ',' : '' ) + decimal;

		return pretty;
	};

	function digit(symbol) {
		return { symbol: symbol, callback: { click: push }, type:'digit' }
	};
	
	function shortcut(symbol, click, press) {
		return { symbol: symbol, callback: { click, press }, type:`shortcut`}
	};

	function parameter(symbol) {
		return { symbol: symbol, callback: { press: store, unpress: deleteFromMemory }, type: `parameter`, }
	};

	// --------------- Actions -------------------- //  

	function push({ detail: { symbol } }) {
		Display.push(symbol);
	};

	function reset() {
		Display.set('0');
	};

	function shift() {

		let orders = 2;

		let hasDecimalPoint = /\./.test(Display.string);    
		let isNegative = /^-/.test(Display.string);

		let integer = Display.string; 
		let decimal = '';
		let sign = '';

		if (hasDecimalPoint) {
			integer = Display.string.split('.')[0];
			decimal = Display.string.split('.')[1];
		};

		if (isNegative) {
			sign = '-';
			integer = integer.replace('-', '');
		}; 

		let number = Number(integer + decimal) / 10 ** (orders + decimal.length);
		let pretty = sign + number.toString();

		Display.set(pretty);
	};

	function multiply1000() {
		Display.set(Display.value * 1000);
	};

	function convert() {
		shift();

		Display.set(Math.pow((1 + Display.value), 1/12) - 1)
	};

	function putDecimal() {
		Display.push('.')
	};

	function toggleMinus() {
		Display.set(-Display.value);
	};

	// ----------------- Memory ----------------------- //

	let Memory = new class {

		constructor() {
			this.memory = new Map
		};

		init(parameter) {
			this.set(parameter, null)
		};

		set(parameter, value) {
			console.log({ parameter, value })
			this.memory.set(parameter, { value, filled: value != null });
		};

		get(parameter) {
			return this.memory.get(parameter).value;
		}

		[Symbol.iterator]() {
			return this.memory.entries();
		};
	}

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

		for ([ parameter, state ] of Memory) {
			ready = ready && (symbol == parameter || state.filled);

			if (!ready)
				break;
		};

		if (ready)
			return calculate(symbol);
			return Memory.set(symbol, Display.value);
	};

	function deleteFromMemory({ detail: { symbol } }) {
		Memory.set(symbol, null)
	};

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
				let c = (V / m) + A / ( J * m ) - A / J;

				return c;
			},

			A: () => {

				let m = (1 + J) ** T;
				let n = J * ( C * m - V);
				let d = 1 - m;
				let a = n / d;

				return a;
			},	

			T: () => {
				
				let f = Math.log10(V * J + A)
				let s = Math.log10(C * J + A);
				let d = Math.log10(1 + J);

				let t = ( f - s ) / d;
				
				return t;
			}
		};

		if (toSolveFor === 'J')
			return Display.set('Error');
		
		Display.set(equation[toSolveFor]());
	};

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
		
		shortcut(`,`, putDecimal),

		parameter('T')
	];
</script>

<div class=app>
	
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<div on:click={toggleMinus} class=screen>{format(display)}</div>
	<div class=keyboard>
		{#each keyboard as { type, symbol, callback }}
			{#if type =='parameter'}
				<Parameter {symbol} on:press={callback.press} on:unpress={callback.unpress}/>
			{:else if type == 'digit'}
				<Digit {symbol} on:click={callback.click}/>
			{:else if type == 'shortcut'}
				<Shortcut {symbol} on:click={callback.click} on:press={callback.press}/>
			{/if}
		{/each}
	</div>
</div>

<style>
	.app {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;

		width: 100%;
		height: 100%;
		background-color: black;
		color: white;

		padding: 10px;

		display: flex;
		flex-direction: column;
		gap: 10px;
		box-sizing: border-box;
	}

	.screen {
		width: 100%;
		height: 35%;

		font-weight: 400;
		font-size: 10vh;

		display: flex;
		align-items: flex-end;
		justify-content: end;
	}

	.keyboard {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr 1fr;
		grid-template-rows: 1fr 1fr 1fr 1fr 1fr;
		gap: 15px 15px;

		place-items: center;
		height: 65%;
	}

</style>
