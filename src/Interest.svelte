<script>

    import { staticVariables } from './staticVariableStore.js';

    let annually100 = 15;
    let monthly100;

    let annually;
    let monthly;

    function updateMonthlyInterest(event) {
        annually = annually100 / 100;
        monthly = Math.pow(1 + annually, 1/12) - 1;

        monthly100 = (monthly * 100).toFixed(3);
    };

    function updateAnualInterest(event) {
        monthly = monthly100 / 100;
        annually = Math.pow(1 + monthly, 12) - 1;
        
        annually100 = (annually * 100).toFixed(3);
    };

    updateMonthlyInterest();

    $: {
        staticVariables.update(info => (
            info.monthlyInterest = monthly,
            info
        ))
    }

</script>

<div id=container>
    <h1>Juros</h1>
    <h3>Anuais</h3>
    <input type=number bind:value={annually100} on:input={updateMonthlyInterest}> 
    <h3>Mensais</h3>
    <input type=number bind:value={monthly100} on:input={updateAnualInterest}>
</div>

<style>
    div {
        width: 100%;
        display: flex;
        gap: 10px;
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

    h3 {
        margin: 0;
        padding: 0;
    }
</style>


