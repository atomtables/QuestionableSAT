<script lang="ts">
    import { onMount } from "svelte";
    import { lookup, onlineStatus, selectedDetails, setLookup } from "$lib/clientstate/states.svelte";
    import Dialog, { alert, confirm, wait } from "$lib/components/Dialog.svelte";
    import { isLookupData } from "$lib/types/types";
    import { goto } from "$app/navigation";
    import Button from "$lib/components/Button.svelte";
    import { page } from "$app/state";

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
        if (page.url.pathname !== "/questiongets/justone" && !(selectedDetails.test !== undefined && selectedDetails.section !== undefined && selectedDetails.topics !== undefined && selectedDetails.subtopics !== undefined)) {
            goto("/topics")
        }
    })

    let reading = $state(false);

    function onchange(event: Event) {
        reading = true;
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
                        alert("Offline mode", "Unable to load this archive. Ensure it is not corrupted and that it is valid.")
                    } finally {
                        reading = false;
                    }
                };
                reader.readAsText(file);
            }
        }
    }
</script>

{#if tryCatch(() => Object.entries(lookup?.lookupData).length) > 0}
    {@render children()}
    {#if !onlineStatus[0]}
    <Button 
        class="fixed z-50000 bottom-8 left-8 !bg-blue-200 hover:!bg-blue-300 active:!bg-blue-400 !font-normal rounded-full w-12 aspect-square flex items-center justify-center"
        onclick={() => {
            confirm("Offline mode", "You are currently offline. Would you like to attempt to come back online?").then(result => {
                if (result) {
                    fetch("https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/lookup", {
                        "credentials": "omit",
                        "headers": {
                            "Accept": "application/json, text/plain, */*",
                            "Accept-Language": "en-US,en;q=0.5",
                        },
                        cache: 'no-store',
                        "method": "GET"
                    }).then(res => {
                        if (!res.ok) throw new Error("Network response was not ok");
                        return res.json();
                    }).then(json => {
                        if (!isLookupData(json)) throw new Error("Invalid lookup data");
                        onlineStatus[0] = true;
                        onlineStatus[1] = null;
                        setLookup(json);
                    }).catch(err => {
                        alert("Offline mode", "An error occurred while attempting to fetch lookup data. You are still in offline mode.");
                    })
                }
            })
        }}>
        <span class="text-black text-xs">Off-line</span>
    </Button>
    {/if}
{:else if !onlineStatus[0] && !onlineStatus[1]}
    <Dialog 
        bind:loading={reading}
        open={true} 
        title="Offline" 
        description="You are currently offline. To use QuestionableSAT, you need an archive package. You can download this off the internet."
        actions={[{
            name: "Ignore",
            action: () => goto("/"),
            close: true
        }]}>
        <div>
            <input type="file" disabled={reading} webkitdirectory class="file:bg-blue-900 file:disabled:opacity-50 file:p-2 file:rounded-xl file:mr-2 cursor-pointer disabled:cursor-not-allowed" {onchange} />
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
