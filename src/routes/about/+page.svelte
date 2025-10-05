<script>
    import Button from "$lib/components/Button.svelte";
    import { goto } from "$app/navigation";
    import { fade } from "svelte/transition";
    import { cubicIn } from "svelte/easing";
</script>

<div class="w-full lg:p-20 md:p-15 p-5 backdrop-blur-3xl bg-neutral-800/50 text-white flex flex-col gap-5" transition:fade={{ easing: cubicIn, duration: 50 }}>
    <div class="-mb-5 font-bold font-sans">QuestionableSAT</div>
    <div class="text-5xl/16 font-bold max-w-4xl">What is QuestionableSAT?</div>
    <div class="text-xl max-w-4xl font-sans">
        QuestionableSAT just makes the questions that are in CollegeBoard's SAT Suite Educator Question Bank and puts them into a format that actual humans can understand.
        <br /><br />
        The CB's question bank makes a PDF of your selected questions with unnecessary information, ugly formatting, and most importantly, you can't just interact with it like a normal test. QuestionableSAT just takes these questions, allows you to filter what topics you want to choose, and presents them in a "Greenbook" (reverse-engineering Bluebook is against
        CB ToS) interface.
    </div>
    <div class="text-5xl/16 font-bold max-w-4xl">Some technical details</div>
    <div class="text-xl max-w-4xl font-sans">
        The most important endpoint for SAT Suite Question bank is the /lookup endpoint at <code>https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/lookup</code>. This endpoint has all the assessments, sections, and currently live questions (meaning questions in Bluebook) available to the user. Through this, we can get the IDs of
        each test (SAT, PSAT/NMSQT/10, PSAT 8/9), each section (R&W and Math), each topic within the sections and each skill.
        <br /><br />
        We can then use these IDs to query the question bank for question information. Using the endpoint at
        <code>https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-questions</code>, and a body of
        <code class="font-mono whitespace-pre-wrap"
            >JSON.stringify({`{
    asmtEventId: ("which test (sat, nmsqt, 8/9) you want"),
    test: ("which section"),
    domain: ("the topics you specifically want")
}`})</code
        >, we can request a list of questions, giving us the IDs and other information we need to load question data.
        <br /><br />
        Each question gives us its difficulty, topic, and other metadata, which we can use to filter and provide more custom experiences for, similar to how CollegeBoard has filtering available on their question bank. We can use a question's external_id to load it in, using another POST endpoint
        <code>https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-question</code>
        to retrieve the full question details. This gives us the complete question text, answer choices, and other relevant information.
        <br /><br />
        However, for some reason, the CollegeBoard has some question types, mainly in Math, that do not use the /get-question endpoint. They use a completely different JSON loader, which returns the same data in a different format. Fortunately, it doesn't take long to find the endpoint: <code>https://saic.collegeboard.org/disclosed/${`{ibn}`}.json</code>.
        <br /><br />
        You can find all of the required code to run this app available on my GitHub, which also has all the different types returned by CollegeBoard (though it is extremely likely they change around some things in the future.) Right now, the reason this works without a server is because all of the endpoints above have no CORS restrictions (meaning anyone anywhere
        anytime can access them, not just the people who created the website). It is very likely that this could change in the future, which is why I also plan to archive the questions found here for future's sake.
    </div>
    <div class="flex flex-row gap-5">
        <Button onclick={() => goto("/")}>Back</Button>
        <Button onclick={() => goto("/topics")}>Get started</Button>
    </div>
</div>
