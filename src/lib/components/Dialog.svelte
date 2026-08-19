<script module lang="ts">
    import {createRawSnippet, mount, onMount, unmount} from "svelte";
    import Dialog from "./Dialog.svelte"
    import Input from "$lib/components/Input.svelte";

    const debugDialog = (...args: unknown[]) => console.debug("[Dialog]", ...args);
    const errorDialog = (...args: unknown[]) => console.error("[Dialog]", ...args);

    async function never(promise: Promise<any>) {
        let run = true;
        while (run) {
            promise.then(() => run = false);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    export const alert = async (title: string, description: string, children: any = null) => {
        debugDialog("alert() called", { title, descriptionLength: description?.length ?? 0, hasChildren: !!children });
        let state: (value: boolean) => void;
        const result = new Promise<boolean>(resolve => state = resolve);

        let element = document.createElement("div");
        document.body.appendChild(element);

        let props = $state({
            open: false,
            title,
            description,
            loading: false,
            actions: [{
                name: "OK",
                action: async () => {
                    state(true);
                },
                primary: true
            }],
            children: createRawSnippet(() => ({
                render: () => children ?? "<div></div>"
            }))
        })

        const dialog = mount(Dialog, {
            target: element,
            props
        })

        debugDialog("alert() mounted dialog", { title });

        props.open = true

        const value: [boolean] = [await result];
        props.open = false;
        debugDialog("alert() closing dialog", { title, value });
        setTimeout(async () => {
            await unmount(dialog);
            element.remove();
            debugDialog("alert() dialog removed", { title });
        }, 400)
        return value;
    }

    export const confirm = async (title: string, description: string, children: any = null, isSnippet: boolean = false, manualclose: boolean = false) => {
        debugDialog("confirm() called", { title, descriptionLength: description?.length ?? 0, isSnippet, manualclose, hasChildren: !!children });
        let state: (value: boolean) => void;
        const result = new Promise<boolean>(resolve => state = resolve);
        let close!: () => void;
        const manual = new Promise<void>(resolve => close = resolve);

        let element = document.createElement("div");
        document.body.appendChild(element);

        let props = $state({
            open: false,
            title,
            description,
            loading: false,
            actions: [{
                name: "Cancel",
                action: async () => {
                    state(false)
                    if (manualclose) await never(manual);
                },
                close: true
            }, {
                name: "Yes",
                action: async () => {
                    state(true)
                    if (manualclose) await never(manual);
                },
                primary: true,
                close: true
            }],
            children: isSnippet ? children : createRawSnippet(() => ({
                render: () => children ?? "<div></div>"
            }))
        })

        const dialog = mount(Dialog, {
            target: element,
            props
        })

        debugDialog("confirm() mounted dialog", { title });

        props.open = true

        const confirmed = await result;
        let value: [boolean] | [boolean, () => void] = [confirmed];
        if (manualclose) {
            manual.then(() => {
                props.open = false;
                setTimeout(async () => {
                    await unmount(dialog);
                    element.remove();
                }, 400)
            })
            value = [confirmed, close]
        } else {
            props.open = false;
            setTimeout(async () => {
                await unmount(dialog);
                element.remove();
            }, 400)
            value = [confirmed]
        }
        debugDialog("confirm() resolved", { title, value, manualclose });
        return value;
    }

    export const wait = async (promise: any, title: string, description: string = "", children: any = null, showFail: boolean = false) => {
        debugDialog("wait() called", { title, descriptionLength: description?.length ?? 0, showFail, hasCancel: !!promise?.cancel });
        let state: (value: boolean) => void;
        const result = new Promise<boolean>(resolve => state = resolve);
        let close!: () => void;
        const manual = new Promise<void>(resolve => close = resolve);

        let element = document.createElement("div");
        document.body.appendChild(element);

        let props = $state({
            open: false,
            title,
            description,
            loading: true,
            actions: [promise?.cancel && {
                name: "Cancel",
                action: async () => {
                    promise.cancel()
                    state(false)
                    if (manual) await never(manual);
                },
                close: true
            }].filter(n => n),
            children: createRawSnippet(() => ({
                render: () => children ?? "<div></div>"
            }))
        })

        const dialog = mount(Dialog, {
            target: element,
            props
        })

        debugDialog("wait() mounted dialog", { title });

        props.open = true

        promise.then(() => {
            debugDialog("wait() promise resolved", { title });
            props.open = false;
            setTimeout(async () => {
                await unmount(dialog);
                element.remove();
            }, 400)
        })

        promise.catch(() => {
            errorDialog("wait() promise rejected", { title });
            props.open = false;
            setTimeout(async () => {
                await unmount(dialog);
                element.remove();
            }, 400)
            alert("Error", "An error occured while waiting.");
        })

        promise.finally(() => state(true));

        debugDialog("wait() awaiting completion", { title });
        return [await result, close] as [boolean, () => void];
    }

    export const prompt = async (title: string, description: string, children: any, isSnippet: boolean, manualclose: boolean) => {
        debugDialog("prompt() called", { title, descriptionLength: description?.length ?? 0, isSnippet, manualclose, hasChildren: !!children });
        let state: (value: string | null) => void;
        const result = new Promise<string | null>(resolve => state = resolve);
        let close!: () => void;
        const manual = new Promise<void>(resolve => close = resolve);

        let element = document.createElement("div");
        document.body.appendChild(element);

        let inputProps = $state({
            name: "File name",
            value: ""
        })
        let props = $state({
            open: false,
            title,
            description,
            loading: false,
            actions: [{
                name: "Cancel",
                action: async () => {
                    state(null)
                    if (manualclose) await never(manual);
                },
                close: true
            }, {
                name: "OK",
                action: async () => {
                    state(inputProps.value)
                    if (manualclose) await never(manual);
                },
                primary: true,
                close: true
            }],
            children: isSnippet ? children : createRawSnippet(() => ({
                render: () => "<div class='w-full h-full'></div>",
                setup: (target) => {
                    const comp = mount(Input, {
                        target,
                        props: inputProps,
                    })
                    return () => {
                        void unmount(comp);
                    }
                }
            }))
        })

        const dialog = mount(Dialog, {
            target: element,
            props
        })

        debugDialog("prompt() mounted dialog", { title });

        props.open = true

        const promptValue = await result;
        let value: [string | null] | [string | null, () => void] = [promptValue];
        if (manualclose) {
            manual.then(() => {
                props.open = false;
                setTimeout(async () => {
                    await unmount(dialog);
                    element.remove();
                }, 400)
            })
            value = [promptValue, close]
        } else {
            props.open = false;
            setTimeout(async () => {
                await unmount(dialog);
                element.remove();
            }, 400)
        }
        debugDialog("prompt() resolved", { title, value, manualclose });
        return value;
    }

    let close = $state("");
</script>

<script lang="ts">
    import Button from "$lib/components/Button.svelte";
    import Spinner from "$lib/components/Spinner.svelte";
    import {fade} from "svelte/transition";
    import {quadInOut} from "svelte/easing";

    let {open, title, description = "", actions = [], children = null, loading = $bindable(false)} = $props();
    const closeF = () => open = false;

    let id = crypto.randomUUID();

    onMount(() => {
        console.debug("[Dialog] mounted component", { title, id, open, loading, actions: actions?.length ?? 0 });
        close = id;
    })

    $effect(() => {
        if (close !== id) {
            console.warn("[Dialog] close token mismatch; forcing dialog closed", { title, id, close, open });
            closeF();
        }
    })

    $effect(() => {
        console.debug("[Dialog] state snapshot", { title, id, open, loading, actions: actions?.length ?? 0 });
    })
</script>

{#if open}
    <div class="fixed inset-0 z-50000 flex items-center justify-center bg-neutral-950/50 backdrop-blur-sm text-white"
         transition:fade={{ delay: 50, duration: 150, easing: quadInOut }}>
        <div
                class="bg-neutral-800 shadow-xl w-full min-w-md max-w-2xl mx-4"
                role="dialog"
                aria-modal="true"
                transition:fade={{ duration: 150, easing: quadInOut }}
        >
            <div class="px-6 pt-5">
                <h2 class="text-2xl font-bold flex flex-row items-center gap-2">
                    {#if loading}
                        <Spinner class="p-1" />
                    {/if}
                    <span>{title}</span>
                </h2>
                <h5 class="pt-0 font-semibold max-w-full text-ellipsis overflow-none">{@html description}</h5>
            </div>

            <div class="px-6 py-2">
                {@render children?.()}
            </div>

            {#if actions}
                <div class="px-6 pb-4 pt-4 flex justify-end gap-2">
                    {#each actions as {name, action, primary, close}}
                        <Button transparent={!primary}
                                onclick={!close ? async () => {
                                    console.debug("[Dialog] action clicked", { title, id, name, close: !!close, primary: !!primary });
                                    await action();
                                } : async () => {
                                    console.debug("[Dialog] closing action clicked", { title, id, name, primary: !!primary });
                                    await action();
                                    closeF();
                                }}>
                            {name}
                        </Button>
                    {/each}
                </div>
            {/if}
        </div>
    </div>
{/if}

<style>
    @keyframes fade-in {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .animate-fade-in {
        animation: fade-in 0.2s ease-out;
    }
</style>