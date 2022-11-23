<script>
    import { createEventDispatcher } from "svelte";

    let dispatch = createEventDispatcher();

    export let symbol;
    export let background;
    export let color;

    function handleClick() {
        dispatch('click', { symbol });
    };

</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div style:background-color={background} style:color on:click={handleClick}>
{symbol}
</div>

<style>
    div {
		border-radius: 50%;
		width: 100%;
		height: 100%;
		background-color: #333;

		font-weight: 650;
		font-size: 4vh;

		display: grid;
		place-items: center;
	}

</style>