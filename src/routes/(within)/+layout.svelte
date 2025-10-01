<script lang="ts">
    import { onMount } from "svelte";
    import { lookup, onlineStatus, selectedDetails, setLookup } from "$lib/clientstate/states.svelte";
    import Dialog, { wait } from "$lib/components/Dialog.svelte";
    import { isLookupData } from "$lib/types/types";
    import { goto } from "$app/navigation";

    let { children } = $props();

    const tryCatch = (expression) => {
        try {
            return expression();
        } catch (e) {
            return null;
        }
    };

    const getDirectory = async () => {
        // const directoryHandle = await window.showDirectoryPicker();
    };

    let files = $state<FileList | null>(null);
    let parsed: Array<{ path: string, json?: any, error?: string }> = $state(
        [],
    );

    onMount(() => {
        if (!(selectedDetails.test !== undefined && selectedDetails.section !== undefined && selectedDetails.topics !== undefined && selectedDetails.subtopics !== undefined)) {
            goto("/topics")
        }
    })

    function onchange(event: Event) {
        const input = event.currentTarget;
        if (!(input instanceof HTMLInputElement)) return;

        files = input.files;
        onlineStatus[1] = files;
        parsed = [];

        if (!files) return;

        for (const file of files) {
            console.log("Found file:", file.webkitRelativePath);
            if (file.name.endsWith(".json") && (file.name === 'lookup.json')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const json = JSON.parse(e.target?.result as string);
                        console.log(json, isLookupData(json))
                        if (!isLookupData(json)) { throw new Error() }
                        setLookup(json);
                    } catch (err: any) {
                        alert("Unable to load this archive. Ensure it is not corrupted and that it is valid.")
                    }
                };
                reader.readAsText(file);
            }
        }
    }
</script>

{#if tryCatch(() => Object.entries(lookup?.lookupData).length) > 0}
    {@render children()}
{:else if !onlineStatus[0] && !onlineStatus[1]}
    <Dialog 
        open={true} 
        title="Offline" 
        description="You are currently offline. To use QuestionableSAT, you need an archive package. You can download this off the internet."
        actions={[{
            name: "Ignore",
            close: true
        }]}>
        <div>
            <input type="file" webkitdirectory multiple {onchange} />
        </div>
    </Dialog>
{:else}
    <Dialog
        open={true}
        title="Loading..."
        description="Getting the topics available from Collegeboard. This shouldn't take long..."
        loading
    />
{/if}
