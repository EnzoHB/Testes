<script>
    import { createEventDispatcher } from "svelte";

    let dispatch = createEventDispatcher();

    export let symbol;

    let pressed = false;

    function handleClick() {
        pressed = !pressed;
        if (pressed)
            return dispatch('press', { symbol})
            return dispatch('unpress', { symbol })
    };

</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->

<div class=parameter class:pressed on:click={handleClick}>
{symbol}    
</div>

<style>
    .parameter {
		border-radius: 50%;
        border: 0;
		width: 100%;
		height: 100%;
		background-color: orange;
        color: white;

		font-weight: 600;
		font-size: 4vh;

		display: grid;
		place-items: center;
        transition: 0.5s;
	}

    .pressed {
        color: orange;
        background-color: white;
    }
</style>