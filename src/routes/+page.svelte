<script>
    import Button from "$lib/components/Button.svelte";
    import {goto} from "$app/navigation";
    import {fade} from "svelte/transition";
    import {cubicIn} from "svelte/easing";
</script>

<div class="w-full h-screen lg:p-20 md:p-15 p-5 backdrop-blur-3xl text-white flex flex-col md:justify-center gap-5 fixed" transition:fade={{easing: cubicIn, duration: 50}}>
    <div class="-mb-5 font-bold font-sans">
        QuestionableSAT
    </div>
    <div class="text-6xl/20 font-bold max-w-4xl">
        Break free of the clutches of standardized exam prep.
    </div>
    <div class="text-2xl max-w-4xl">
        When it comes to standardised exams, don't let the system dictate your worth, don't let the prep centers take
        your money, and most importantly, don't allow the stress to consume your life. Practice and preparation is all
        you need to succeed. QuestionableSAT allows you to use CollegeBoard's own materials to exercise the best method
        of studying for the (P)SAT: practice.
    </div>
    <div class="flex flex-row gap-5">
        <Button onclick={() => goto("/topics")}>Get started</Button>
        <Button onclick={() => goto("/about")}>About</Button>
    </div>
</div>