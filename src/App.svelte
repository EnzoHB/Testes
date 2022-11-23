<script>
    import { onMount } from "svelte";

/**
 * -
 * 00
 * K
 * 
 */

 	let display = "0";
	let parameters = {
		J: null,
		V: null,
		C: null,
		A: null,
		T: null,
	};

	function variable(symbol) {
		return {
			id: symbol,
			symbol: symbol,
			classes: 'key variable',
			callback: () => {

				const entries = Object.entries(parameters);
				const filled = entries.every(([key, value]) => key != symbol && value != null);

				console.log(parameters);
				if (filled) {
					console.log('I am calculating');
					return display = calculate(symbol);
				}
					
				display = parameters[symbol] = Number(display);
				console.log('Now I am storing the parameter');
			},
		};
	};

	function shortcut(symbol, callback) {
		return {
			id: symbol,
			symbol: symbol,
			classes: 'key shortcut',
			callback: callback,
		};
	};

	function digit(symbol) {
		return {
			id: symbol,
			symbol: symbol,
			classes: 'key digit',
			callback: event => display == "0"? display = String(symbol) : display += String(symbol),
		};
	};

	function calculate() {

	};

	let k0 = digit(0);
	let k1 = digit(1);
	let k2 = digit(2);
	let k3 = digit(3);
	let k4 = digit(4);
	let k5 = digit(5);
	let k6 = digit(6);
	let k7 = digit(7);
	let k8 = digit(8);
	let k9 = digit(9);


	let sR = shortcut('R', () => display="0");
	let sP = shortcut("%", () => display=shift(Number(display), 2))
	let sC = shortcut("a%", () => display=convertToMonthlyInterest(Number(display)));

	let sK = shortcut('K', () => display+=`000`);
	let sD = shortcut('.', () => display+=".");

	let vJ = variable('J');
	let vV = variable('V');
	let vC = variable('C');
	let vA = variable('A');
	let vT = variable('T');

	let keyboard = [
		sR, sP, sC, vJ,
		k7, k8, k9, vV,
		k4, k5, k6, vC,
		k1, k2, k3, vA,
		sK, k0, sD, vT
	];

	function shift(number, houses) {
		let [ integer, decimal ] = String(Number(number).toFixed(2)).split('.');

		return Number(integer + decimal) / 10 ** (houses + decimal.length);
	};

	function convertToMonthlyInterest(interest) {
		interest = shift(interest, 2);

		return (Math.pow((1 + interest), 1/12) - 1).toFixed(5);
	};

</script>

<div class=app>
	<div class=screen>{display}</div>
	<div class=keyboard>
		{#each keyboard as key}
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<div on:click={key.callback} class={key.classes} id={key.id}>{key.symbol}</div>
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
		height: 40%;

		font-weight: 600;
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
		height: 60%;
	}

	.key {
		border-radius: 50%;
		width: 100%;
		height: 100%;
		background-color: #333;

		font-weight: 600;
		font-size: 4vh;

		display: grid;
		place-items: center;
	}

	.shortcut {
		color: black;
		background-color: #a5a5a5;

	}

	.variable {
		color: white;
		background-color: orange;
	}

</style>
