<script>
	import { onMount } from 'svelte';
	export let header;
	
</script>

<div>
	<h3>{header}</h3>
	<input>
</div>

<style>
	h3 {
		margin: 0;
	}
	
	input {
		outline: none;
		border: 0;
		border-bottom: 1px solid grey;
		
		margin: 0;
		padding: 2px 0;
		width: 100%;
	}
</style>

