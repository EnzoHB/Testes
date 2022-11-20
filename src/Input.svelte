<script>
	import { staticVariables } from "./staticVariableStore.js";

	export let propertyToUpdate;
	export let header;

	let value;

	function handleInput(event) {
		staticVariables.update(information => (
			information[propertyToUpdate] = value,
			information
		));
	};

</script>

<div>
    <h1>{header}</h1>
    <input type=number bind:value on:input={handleInput}>    
</div>

<style>
    div {
        width: 100%;
        display: flex;
        flex-direction: column;
    }

     input {
        outline: none;
        border: 0;
        border-bottom: 1px solid grey;

        width: 100%;
        padding: 3px 0;
        margin: 0;
    }

</style>