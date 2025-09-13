<script>
    import stylus from "$lib/assets/stylus.svg"
    import more from "$lib/assets/more.svg"
    import bookmarkable from "$lib/assets/bookmarkable.svg"

    let {
        question
    } = $props()
</script>

<div class="w-screen h-screen z-1000 flex flex-nowrap flex-col bg-white">
    <div class="header flex flex-row justify-between font-sans px-4 py-3 shrink-0">
        <div class="text-left flex flex-col gap-2">
            <div class="text-2xl font-bold">
                Questions and Answers
            </div>
            <div class="">
                Directions
            </div>
        </div>
        <div class="text-center absolute right-1/2 translate-x-1/2 gap-2 flex flex-col">
            <div class="text-2xl font-semibold">
                31:30
            </div>
            <div class="select-none cursor-pointer rounded-full px-3 font-bold text-sm border-1 border-black">
                Hide
            </div>
        </div>
        <div class="text-right flex flex-col items-right gap-1">
            <div class="text-xs font-bold">
                100%
            </div>
            <div class="flex-1 flex items-center justify-center flex-row gap-3">
                <button class="flex flex-col items-center justify-center text-sm">
                    <img src={stylus} alt="pencil" class="invert w-6 h-6" />
                    Annotate
                </button>
                <button class="flex flex-col items-center justify-center text-sm">
                    <img src={more} alt="pencil" class="invert w-6 h-6" />
                    More
                </button>
            </div>
        </div>
    </div>
    <hr>
    <div class="flex-1 p-15 overflow-y-auto">
        <div class="max-w-144 m-auto">
            <div class="flex flex-col flex-nowrap max-w-144">
                <div class="flex flex-row font-sans items-center justify-center border-b-2">
                    <div class="px-2 h-8 bg-black text-white flex items-center justify-center">
                        1
                    </div>
                    <div class="flex-1 bg-neutral-200 h-8 flex flex-row items-center justify-between pl-3 pr-1">
                        <div class="text-sm text-neutral-800 flex flex-row gap-1 items-center justify-center">
                            <img src={bookmarkable} alt="boomarkable"/>
                            <div>
                                Mark for Review
                            </div>
                        </div>
                        <button class="cursor-pointer p-0.5 text-xs line-through font-bold bg-white border-black border-2 rounded-md">
                            ABC
                        </button>
                    </div>
                </div>
                <div class="py-3">
                    How many letters are there in this question?
                </div>
                <div class="flex flex-col gap-4">
                    <div class="flex flex-row items-center w-full py-3 px-4 border-2 border-neutral-500 gap-5 rounded-lg">
                        <div class="font-sans flex items-center justify-center w-7 h-7 font-bold border-2 rounded-full grow-0 shrink-0">
                            A
                        </div>
                        <div>
                            36 letters
                        </div>
                    </div>
                    <div class="flex flex-row items-center w-full py-3 px-4 border-2 border-neutral-500 gap-5 rounded-lg">
                        <div class="font-sans flex items-center justify-center w-7 h-7 font-bold border-2 rounded-full grow-0 shrink-0">
                            B
                        </div>
                        <div>
                            26 letters
                        </div>
                    </div>
                    <div class="flex flex-row items-center w-full py-3 px-4 border-2 border-neutral-500 gap-5 rounded-lg">
                        <div class="font-sans flex items-center justify-center w-7 h-7 font-bold border-2 rounded-full grow-0 shrink-0">
                            C
                        </div>
                        <div>
                            12 letters
                        </div>
                    </div>
                    <div class="flex flex-row items-center w-full py-3 px-4 border-2 border-neutral-500 gap-5 rounded-lg">
                        <div class="font-sans flex items-center justify-center w-7 h-7 font-bold border-2 rounded-full grow-0 shrink-0">
                            D
                        </div>
                        <div>
                            I give up
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <hr>
    <div class="shrink-0 flex flex-row justify-between font-sans p-5">
        <div class="text-left flex flex-col gap-2 font-bold p-2">
            Smart kid
        </div>
        <div class="text-center absolute right-1/2 translate-x-1/2 gap-2 flex flex-col">
            <button class="bg-gray-950 text-white py-2 px-4 rounded-md font-bold">
                Question 1 of 27
            </button>
        </div>
        <div class="text-right flex flex-row gap-2 items-right">
            <button class="cursor-pointer bg-blue-700
            hover:bg-blue-600 active:bg-blue-500 transition-colors
            text-white font-bold px-6 rounded-full py-2">Previous</button>
            <button class="cursor-pointer bg-blue-700
            hover:bg-blue-600 active:bg-blue-500 transition-colors
            text-white font-bold px-6 rounded-full py-2">Next</button>
        </div>
    </div>
</div>