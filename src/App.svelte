<script>
    import { onMount } from "svelte";
    import Key from "./Key.svelte";
    import Parameter from "./Parameter.svelte";

/**
 * -
 * 00
 * K
 * 
 */


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
		return { symbol: symbol, click: push, parameter: false, background: '#333', color: 'white' }
	};
	
	function shortcut(symbol, callback) {
		return { symbol: symbol, click: callback, parameter: false, background: '#a5a5a5', color: 'black' }
	};

	function parameter(symbol) {
		return { symbol: symbol, click: store, parameter: true, background: 'orange', color: 'white' }
	};

	// --------------- Actions -------------------- //  

	function push({ detail: { symbol } }) {
		
		if (display.length >= 8)
			return;
	
		if (display == 0)
			return display = String(symbol);
			return display += String(symbol);
	};

	function reset(symbol) {
		display = "0";
		return '0'
	};

	function shift(symbol) {
		let [ integer, decimal ] = Number(display).toFixed(2).split('.');
		let number = Number(integer + decimal) / 10 ** (2 + decimal.length);

		display = `${number}`
		return number;
	};

	function multiply1000() {
		'000'.split('').forEach(push)
	};

	function convert(symbol) {
		let number = shift('%');
		let interest = Math.pow((1 + number), 1/12) - 1;

		interest.split('').forEach(push);

		return interest;
	};

	function putDecimal() {
		display += '.';
	};

	// ----------------- Memory ----------------------- //

	let memory = new Map;

	init('J');
	init('V');
	init('C');
	init('A');
	init('T');

	function resetMem(parameter) {
		set(parameter, null);
	};

	function init(param) {
		set(param, null);
	};

	function set(param, value) {
		memory.set(param, { value: value, filled: value != null });
	}

	// --------------- Parameter ----------------------- //

	function store({ detail: { symbol } }) {

		let entries = memory.entries();
		let parameter;

		let ready = true;

		for (parameter of entries) {
			ready = ready && (symbol == parameter[0] || parameter[1].filled);

			if (!ready)
				break;
		};

		if (ready)
			return calculate(symbol);
		
		set(symbol, Number(display));
		console.log({ symbol, memory, ready })
	};

	// ---------------- Parameter ------------------ //

	function calculate(symbol) {

		let J = memory.get('J').value;
		let V = memory.get(`V`).value;
		let C = memory.get('C').value;
		let A = memory.get('A').value;
		let T = memory.get('T').value

		let table = {
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

		if (symbol === 'J')
			return 'Error'.split('').forEach(push);
			
		let result = table[symbol]();
		
		display = result.toFixed(2);
		console.log(result.toFixed)
			//table[symbol]().toString().split('').forEach(digit => push({ detail: { symbol: digit } }))
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
		
		shortcut(`.`, putDecimal),

		parameter('T')
	];

</script>

<div class=app>
	<div class=screen>{display}</div>
	<div class=keyboard>
		{#each keyboard as { parameter, symbol, click, background, color }}
			{#if parameter}
				<Parameter {symbol} {background} {color} on:press={click}/>
			{:else}
				<Key {symbol} {background} {color} on:click={click}/>
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
		font-size: 12vh;

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
