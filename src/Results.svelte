<script>
    import { get } from 'svelte/store';
    import { staticVariables } from './staticVariableStore.js';

    let params;
    $: updateMonths();

    staticVariables.subscribe(data => params = data);

    let contribution = 0;
    let months = 0;

    function updateMonths() {
        console.log(get(staticVariables))
        months = getMonths(contribution, params).toFixed(1)
    };

    function updateContribution() {
        contribution = getContribution(months, params).toFixed(1)
    };

    // --------------------------------- //

    function getMonths(monthlyContribution, { initialCapital, monthlyInterest, desiredAmount }) {
        console.log(monthlyContribution, initialCapital, monthlyInterest, desiredAmount)
        return (
            Math.log10(desiredAmount * monthlyInterest + monthlyContribution) -
            Math.log10(initialCapital * monthlyInterest + monthlyContribution ) 
        ) / Math.log10(monthlyInterest + 1);
    };

    function getContribution(months, { initialCapital, monthlyInterest, desiredAmount }) {
        let m = Math.pow((1 + monthlyInterest), months);
        
        return ( initialCapital * m - desiredAmount ) * monthlyInterest / ( 1 - m);
    };

</script>

<div>
    <div class=container>
        <h1>Aporte</h1>
        <input type=number bind:value={contribution} on:input={updateMonths}>
    </div>
    <div class=container>
        <h1>Meses</h1>
        <input type=number bind:value={months} on:input={updateContribution}>
    </div>
</div> 

<style>
    div {
        display: flex;
    }

    .container {
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
</style>

