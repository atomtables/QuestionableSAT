<script lang="ts">
    import "../app.css";
    import favicon from "$lib/assets/favicon.png";
    import Button from "$lib/components/Button.svelte";
    import { onNavigate } from "$app/navigation";
    import { onMount } from "svelte";
    import { lookup, onlineStatus, setLookup } from "$lib/clientstate/states.svelte";
    import { alert } from "$lib/components/Dialog.svelte";
    import { isLookupData } from "$lib/types/types";

    let { children, data } = $props();

    onNavigate((navigation) => {
        if (!document.startViewTransition) return;

        return new Promise((resolve) => {
            document.startViewTransition(async () => {
                resolve();
                await navigation.complete;
            });
        });
    });

    let mounted = $state(false)

    $effect(() => {
        if (onlineStatus[0] && mounted) {
            fetch("https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/lookup", {
                credentials: "omit",
                headers: {
                    Accept: "application/json, text/plain, */*",
                    "Accept-Language": "en-US,en;q=0.5",
                },
                cache: "no-store",
                method: "GET",
            }).then(res => res.json()).then(data => {
                if (!isLookupData(data)) {
                    throw new Error()
                } else {
                    setLookup(data);
                }
            }).catch(() => {
                onlineStatus[0] = false;
                alert("Offline mode", "The network request to CB failed, so you have been placed in offline mode.")
            });
        }
    })

    onMount(async () => {
        let lookupRes = {};
        try {
            lookupRes = await (
                await fetch("https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/lookup", {
                    credentials: "omit",
                    headers: {
                        Accept: "application/json, text/plain, */*",
                        "Accept-Language": "en-US,en;q=0.5",
                    },
                    cache: "no-store",
                    method: "GET",
                })
            ).json();
        } catch (e) {
            onlineStatus[0] = false;
        }

        window.addEventListener("offline", () => {
            alert("Offline usability", "You have gone offline. QuestionableSAT supports offline usage, but only with a compatible archive and a fresh reload. Your current state will be kept active, but new questions will fail to load and result in unrecoverable errors.");
        });

        setLookup(lookupRes);

        mounted = true;
    });
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
</svelte:head>

{@render children?.()}
