<script>
    import { createEventDispatcher } from "svelte";

    let dispatch = createEventDispatcher();

    export let symbol;

    function handleClick() {
        dispatch('click', { symbol });
    };
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class=shortcut on:click={handleClick}>
{symbol}
</div>

<style>
    .shortcut {
		border-radius: 50%;
        border: 0;
		width: 100%;
		height: 100%;

        background-color: #a5a5a5;
        color: black;

		font-weight: 650;
		font-size: 4vh;

		display: grid;
		place-items: center;
        transition: 1s cubic-bezier(0.075, 0.82, 0.165, 1);
	}

    .shortcut:active {
        background-color: white;
    }

</style>