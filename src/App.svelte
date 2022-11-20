<script>
	import Input from "./Input.svelte";
	//import { staticVariables } from "./staticVariableStore";
	import Interest from './Interest.svelte'; 
    import Results from "./Results.svelte";

</script>

<div class=app>
	<div class=parameters>
		<div class=money>
			<Input header=Capital propertyToUpdate=initialCapital/>
			<Input header=Objetivo propertyToUpdate=desiredAmount/>
		</div>
		<Interest/>
	</div>
	<Results/>
	<div class=results>
		<div class=contribution></div>
		<div class=time>
			<div class=months></div>
			<div class=years></div>
		</div>
	</div>
</div>

<style>
	.money {
		width: 100%;
		display: flex;
		flex-direction: column;
	}
	
	.parameters {
		width: 100%;
		display: flex;
		gap: 30px;
	}
</style>
