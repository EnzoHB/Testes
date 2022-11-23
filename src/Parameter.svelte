<script>
    import { createEventDispatcher } from "svelte";

    let dispatch = createEventDispatcher();

    export let symbol;
    export let background;
    export let color;
    
    let pressed = false;

    function handleClick() {
        pressed = !pressed;
        if (pressed)
            return dispatch('press', { symbol})
            return dispatch('unpress', { symbol })
    };

</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
{#if pressed} 

<div style:background-color={color} style:color={background} on:click={handleClick}>
    {symbol}
</div>

{:else}

<div style:background-color={background} style:color={color} on:click={handleClick}>
    {symbol}
</div>

{/if}

<style>
    div {
		border-radius: 50%;
		width: 100%;
		height: 100%;
		background-color: #333;

		font-weight: 600;
		font-size: 4vh;

		display: grid;
		place-items: center;
        transition: 2s;
	}
</style>