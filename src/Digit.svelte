<script>
    import { createEventDispatcher } from "svelte";

    let dispatch = createEventDispatcher();

    export let symbol;

    function handleClick() {
        dispatch('click', { symbol });
    };

</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class=digit on:click={handleClick}>
{symbol}
</div>

<style>
    .digit {
		border-radius: 50%;
        border: 0;
		width: 100%;
		height: 100%;

        background-color: #333;
        color: white;

		font-weight: 650;
		font-size: 4vh;

		display: grid;
		place-items: center;
        transition: 2s ease-out
	}

    .digit:active {
        background-color: rgb(122, 122, 122)
    }

</style>