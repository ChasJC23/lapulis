
type Optional<T> = T | undefined;

// https://stackoverflow.com/questions/52489261/typescript-can-i-define-an-n-length-tuple-type
type Tuple<T, N extends number> = N extends N ? number extends N ? T[] : _TupleOf<T, N, []> : never;
type _TupleOf<T, N extends number, R extends unknown[]> = R['length'] extends N ? R : _TupleOf<T, N, [T, ...R]>;

type InputTypes = "button" | "checkbox" | "color" | "date" | "datetime-local" | "email" | "file" | "hidden" | "image" | "month" | "number" | "password" | "radio" | "range" | "search" | "submit" | "tel" | "text" | "time" | "url" | "week";
type DatePickerTypes = "date" | "datetime-local" | "month" | "time" | "week";
type NumericInputTypes = "number" | "range" | "date" | "datetime-local" | "month" | "time" | "week";
type TextBasedInputTypes = "text" | "date" | "search" | "url" | "tel" | "email" | "password";
type MultipleInputTypes = "email" | "file";
type RequiredInputTypes = "text" | "search" | "url" | "tel" | "email" | "password" | DatePickerTypes | "number" | "checkbox" | "radio" | "file";
type AutocompleteInputTypes = "text" | "search" | "url" | "tel" | "email" | "password" | DatePickerTypes | "range" | "color";

type GenericHTMLInput<T extends InputTypes> = HTMLInputElement & {
    type: T,
    min: T extends NumericInputTypes ? string : never,
    max: T extends NumericInputTypes ? string : never,
    multiple: T extends MultipleInputTypes ? boolean : never,
    pattern: T extends TextBasedInputTypes ? string : never,
    placeholder: T extends TextBasedInputTypes ? string : never,
    required: T extends RequiredInputTypes ? boolean : never,
    step: T extends NumericInputTypes ? string : never,
    height: T extends "image" ? number : never,
    width: T extends "image" ? number : never,
    autocomplete: T extends AutocompleteInputTypes ? string : never,
}

function constructTuple<T, N extends number>(size: N, populateFtn: (i: number) => T): Tuple<T, N>;
function constructTuple<T, N extends number>(size: N): Tuple<Optional<T>, N>;
function constructTuple<T, N extends number>(size: N, populateFtn: (i: number) => Optional<T> = () => undefined): Tuple<Optional<T>, N> {
    let result = [];
    for (let i = 0; i < size; i++) {
        result.push(populateFtn(i))
    }
    return result as Tuple<Optional<T>, N>;
}

function randomAnimation(): LightShowAnimation {
    let frameCount = Math.floor(Math.random() * 10);
    let frames: LightShowFrame[] = [];
    for (let i = 0; i < frameCount; i++) {
        let actionCount = Math.floor(Math.random() * 10);
        let actions: LightShowAction[] = [];
        let duration = Math.floor(Math.random() * 1000);
        for (let i = 0; i < actionCount; i++) {
            actions.push(randomAction())
        }
        frames.push(new LightShowFrame(duration, ...actions));
    }
    return new LightShowAnimation(...frames);
}

function randomAction(): LightShowAction {
    // @ts-ignore
    let type: "PALETTE" | "SYSEX" = ["PALETTE", "SYSEX"][Math.floor(Math.random() * 2)];
    switch (type) {
        case "PALETTE":
            return {
                type,
                note: Launchpad.sessionNoteFromPos(Math.ceil(9 * Math.random()), Math.ceil(9 * Math.random())),
                colour: Math.floor(128 * Math.random())
            }
        case "SYSEX":
            return {
                type,
                note: Launchpad.sessionNoteFromPos(Math.ceil(8 * Math.random()), Math.ceil(8 * Math.random())),
                r: Math.floor(64 * Math.random()),
                g: Math.floor(64 * Math.random()),
                b: Math.floor(64 * Math.random()),
            }
    }
}
