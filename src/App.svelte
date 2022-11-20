<script>
	import Input from './Input.svelte';
	import { writable } from 'svelte/store';
	
	let information = writable
	
	
</script>

<h1>Investment</h1>
<div class=initial>
	<Input header='Capital Inicial'/>
	<Input header='Valor Desejado'/>
	<Input header='Rendimento'/>
</div>
<br>
<div class=interactive>
	<Input header='Aporte'/>
	<Input header='Meses'/>
</div>

<style>
	div {
		width: 100%;
		display: flex;
		gap: 20px;
	}
</style>