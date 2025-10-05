<script lang="ts">
    import { page } from "$app/state";
</script>

<div class="w-screen h-screen flex items-center justify-center flex-col bg-neutral-800/50 text-white">
    <h1 class="text-5xl">oh nooooooooo</h1>
    <h1>Sorry, an error occured: {page.error.message}</h1>
</div>
