<script>
    import {onMount} from "svelte";
    import Spinner from "$lib/components/Spinner.svelte";
    import Button from "$lib/components/Button.svelte";
    import {goto} from "$app/navigation";
</script>

<div class="w-full h-screen p-20 backdrop-blur-3xl bg-neutral-900/50 text-white flex flex-col justify-center gap-5">
    <div class="text-6xl/20 font-bold max-w-4xl">
        Break free of the clutches of standardized exam prep.
    </div>
    <div class="text-2xl max-w-4xl">
        When it comes to standardised exams, don't let the system dictate your worth, don't let the prep centers take
        your money, and most importantly, don't allow the stress to consume your life. Practice and preparation is all
        you need to succeed. QuestionableSAT allows you to use CollegeBoard's own materials to exercise the best method
        of studying for the (P)SAT: practice.
    </div>
    <div>
        <Button onclick={() => goto("/topics")}>Get started</Button>
    </div>
</div>