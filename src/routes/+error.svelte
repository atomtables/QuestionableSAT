<script lang="ts">
    import { page } from '$app/state';
</script>

<div class="w-screen h-screen flex items-center justify-center">
    <h1>Sorry, an error occured: {page.error.message}</h1>
</div>