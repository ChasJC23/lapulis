
type LightShowAction = ColourColumnAction | ColourRowAction | FillAction | ColourFromPaletteAction | ColourFromSysexAction | FlashAction | PulseAction | TypeAction;
type SysexAction = ColourFromSysexAction | ColourColumnAction | ColourRowAction | FillAction | TypeAction;
type NoteAction = ColourFromSysexAction | ColourFromPaletteAction | FlashAction | PulseAction;

type ColourFromPaletteAction = { transparent?: boolean, type: "PALETTE", colour: number,                  note: number   };
type ColourFromSysexAction   = { transparent?: boolean, type: "SYSEX",   r: number, g: number, b: number, note: number   };
type FlashAction             = { transparent?: boolean, type: "FLASH",   colour: number,                  note: number   };
type PulseAction             = { transparent?: boolean, type: "PULSE",   colour: number,                  note: number   };
type ColourColumnAction      = { transparent?: boolean, type: "COLUMN",  colour: number,                  column: number };
type ColourRowAction         = { transparent?: boolean, type: "ROW",     colour: number,                  row: number    };
type FillAction              = { transparent?: boolean, type: "FILL",    colour: number                                  };
type TypeAction              = { transparent?: boolean, type: "TYPE",    colour: number, text: string, looping: boolean  };

function isPaletteColourAction(action: LightShowAction): action is ColourFromPaletteAction {
    return action.type === "PALETTE";
}
function isSysexColourAction(action: LightShowAction): action is ColourFromSysexAction {
    return action.type === "SYSEX";
}
function isFlashAction(action: LightShowAction): action is FlashAction {
    return action.type === "FLASH";
}
function isPulseAction(action: LightShowAction): action is PulseAction {
    return action.type === "PULSE";
}
function isColumnAction(action: LightShowAction): action is ColourColumnAction {
    return action.type === "COLUMN";
}
function isRowAction(action: LightShowAction): action is ColourRowAction {
    return action.type === "ROW";
}
function isFillAction(action: LightShowAction): action is FillAction {
    return action.type === "FILL";
}
function isTypeAction(action: LightShowAction): action is TypeAction {
    return action.type === "TYPE";
}
function actionUsesSysex(action: LightShowAction): action is SysexAction {
    return isSysexColourAction(action) || isColumnAction(action) || isRowAction(action) || isFillAction(action) || isTypeAction(action);
}
function actionActsAtNote(action: LightShowAction): action is NoteAction {
    return (action as Object).hasOwnProperty("note");
}

enum ControlRowNote {
    UP = 104,
    DOWN,
    LEFT,
    RIGHT,
    SESSION,
    USER_ONE,
    USER_TWO,
    MIXER
}

enum SelectorColNote {
    RECORD_ARM = 19,
    SOLO = 29,
    MUTE = 39,
    STOP = 49,
    SEND_B = 59,
    SEND_A = 69,
    PAN = 79,
    VOLUME = 89
}

interface LaunchpadEventMap {
    "padPress": CustomEvent<number>,
    "padRelease": CustomEvent<number>,
    "controlPress": CustomEvent<ControlRowNote>,
    "controlRelease": CustomEvent<ControlRowNote>,
    "selectorPress": CustomEvent<SelectorColNote>,
    "selectorRelease": CustomEvent<SelectorColNote>,
    "stateChange": CustomEvent<[MIDIPortDeviceState, MIDIPortDeviceState]>
}

// @ts-expect-error
interface _LaunchpadInterface extends EventTarget {
    addEventListener<K extends keyof LaunchpadEventMap>(type: K, listener: (this: Launchpad, ev: LaunchpadEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
    removeEventListener<K extends keyof LaunchpadEventMap>(type: K, listener: (this: Launchpad, ev: LaunchpadEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
}

class Launchpad extends EventTarget implements _LaunchpadInterface {

    //#region constants
    private static readonly SYSEX_HEADER = [240, 0, 32, 41, 2, 24];
    private static readonly SYSEX_FOOTER = 247;
    public static readonly TOP_ROW = 103;
    public static readonly PALETTE = [
        "#000000", "#1c1c1c", "#7c7c7c", "#fcfcfc", "#ff4d47", "#ff0a00", "#5a0100", "#190000",
        "#ffbd62", "#ff5600", "#5a1d00", "#241800", "#fdfd21", "#fdfd00", "#585800", "#181800",
        "#80fd2a", "#40fd00", "#165800", "#132800", "#34fd2b", "#00fd00", "#005800", "#001800",
        "#33fd46", "#00fd00", "#005800", "#001800", "#32fd7e", "#00fd3a", "#005814", "#001c0f",
        "#2ffcb0", "#00fc91", "#005831", "#00180f", "#39bfff", "#00a7ff", "#004051", "#001018",
        "#4186ff", "#0050ff", "#001a5a", "#000719", "#4647ff", "#0000ff", "#00005b", "#000019",
        "#8347ff", "#5000ff", "#160067", "#0b0032", "#ff49ff", "#ff00ff", "#5a005a", "#190019",
        "#ff4d84", "#ff0752", "#5a011b", "#210010", "#ff1900", "#9b3500", "#7a5100", "#3e6400",
        "#003800", "#005432", "#00537e", "#0000ff", "#00444d", "#1b00d2", "#7c7c7c", "#202020",
        "#ff0a00", "#bafd00", "#aaed00", "#56fd00", "#008800", "#00fc7a", "#00a7ff", "#001bff",
        "#3500ff", "#7700ff", "#b4177e", "#412000", "#ff4a00", "#83e100", "#65fd00", "#00fd00",
        "#00fd00", "#45fd61", "#00fcca", "#5086ff", "#274dc9", "#827aed", "#d30cff", "#ff065a",
        "#ff7d00", "#b9b100", "#8afd00", "#825d00", "#392800", "#0d4c05", "#005037", "#131329",
        "#101f5a", "#6a3c17", "#ac0400", "#e15135", "#dc6900", "#ffe100", "#99e100", "#5fb500",
        "#1b1b31", "#dcfd54", "#76fcb8", "#9697ff", "#8b61ff", "#404040", "#747474", "#defcfc",
        "#a40400", "#350000", "#00d100", "#004000", "#b9b100", "#3d3000", "#b45d00", "#4a1400",
    ];
    //#endregion

    private lpIn: MIDIInput;
    private lpOut: MIDIOutput;

    public constructor(inputPort: MIDIInput, outputPort: MIDIOutput) {
        super();
        this.lpIn = inputPort;
        this.lpOut = outputPort;
        this.lpIn.onmidimessage = (message) => this.onMidiMessage(message as MIDIMessageEvent);
    }

    //#region static methods
    public static async connectToLaunchpad(options?: MIDIOptions): Promise<Launchpad> {
        let access = await navigator.requestMIDIAccess(options);
        let lpInput: MIDIInput | undefined, lpOutput: MIDIOutput | undefined;
        access.inputs.forEach((inp) => {
            if (inp.name && inp.name.includes("Launchpad MK2")) {
                lpInput = inp;
            }
        });
        access.outputs.forEach((out) => {
            if (out.name && out.name.includes("Launchpad MK2")) {
                lpOutput = out;
            }
        });
        if (!lpInput || !lpOutput)
            throw Error();
        return new Launchpad(lpInput, lpOutput);
    }

    public static paletteApprox(colour: string): [number, number] {
        let [r, g, b] = parseColour(colour);
        let choice = -1;
        let error = Infinity;
        for (let i = 0; i < Launchpad.PALETTE.length; i++) {
            let paletteColour = (Launchpad.PALETTE)[i];
            let [pr, pg, pb] = parseColour(paletteColour);
            let thisError = Math.abs(r - pr) + Math.abs(g - pg) + Math.abs(b - pb);
            if (thisError < error) {
                error = thisError;
                choice = i;
            }
        }
        return [choice, error];
    }

    public static sysExApprox(colour: string): [number, number, number];
    public static sysExApprox(colour: [number, number, number]): [number, number, number];
    public static sysExApprox(colour: string | [number, number, number]): [number, number, number] {
        // @ts-ignore
        let [r, g, b] = parseColour(colour);
        return [r >> 2, g >> 2, b >> 2];
    }

    public static sysExToWebCol(colour: [number, number, number]): string {
        const [r, g, b] = colour;
        let rs = (r << 2).toString(16);
        if (rs.length === 1) rs = '0' + rs;
        let gs = (g << 2).toString(16);
        if (gs.length === 1) gs = '0' + gs;
        let bs = (b << 2).toString(16);
        if (bs.length === 1) bs = '0' + bs;
        return `#${rs}${gs}${bs}`;
    }

    public static sessionNoteFromPos(x: number, y: number): number {
        if (y < 9)
            return 10 * y + x;
        else
            return Launchpad.TOP_ROW + x;
    }

    public static userOneNoteFromPos(x: number, y: number): number {
        if (y < 9) {
            if (x <= 4) {
                return 31 + x + 4 * y;
            } else if (x <= 8) {
                return 59 + x + 4 * y;
            } else {
                return 108 - y;
            }
        } else {
            return Launchpad.TOP_ROW + x;
        }
    }

    public static posFromSessionNote(note: number): [number, number] {
        if (note >= Launchpad.TOP_ROW) {
            return [note - Launchpad.TOP_ROW, 9];
        } else {
            return [note % 10, Math.floor(note / 10)];
        }
    }

    public static onPad(note: number): boolean {
        return note >= 11 && note < 89 && note % 10 !== 9 && note % 10 !== 0;
    }

    public static addVectorOnPad(note: number, vector: [number, number]): number {
        return note + vector[0] + 10 * vector[1];
    }

    public static getHeader(channel: number, note: number): number {
        if (note > Launchpad.TOP_ROW) {
            return 176 + (channel - 1); // channel 1 has id 0
        }
        else {
            return 144 + (channel - 1); // channel 1 has id 0
        }
    }
    //#endregion
    //#region instance methods
    public performAction(action: LightShowAction, timestamp?: number) {
        if (isPaletteColourAction(action))
            this.colourFromPalette(action.note, action.colour, timestamp);
        if (isFlashAction(action))
            this.flashFromPalette(action.note, action.colour, undefined, timestamp);
        if (isPulseAction(action))
            this.pulseFromPalette(action.note, action.colour, timestamp);
        if (isColumnAction(action))
            this.columnFromPalette(action.column, action.colour, timestamp);
        if (isRowAction(action))
            this.rowFromPalette(action.row, action.colour, timestamp);
        if (isFillAction(action))
            this.fillFromPalette(action.colour, timestamp);
        if (isSysexColourAction(action))
            this.colourFromRGB(action.note, action.r, action.g, action.b, timestamp);
        if (isTypeAction(action))
            this.writeText(action.colour, action.looping, action.text, timestamp);
    }

    public performActions(actions: LightShowAction[], timestamp?: number) {
        for (let action of actions) {
            this.performAction(action, timestamp);
        }
    }

    public colourFromPalette(note: number, colour: number, timestamp?: number): void {
        this.lpOut.send([Launchpad.getHeader(1, note), note, colour], timestamp);
    }
    public flashFromPalette(note: number, colour1: number, colour2?: number, timestamp?: number) {
        if (typeof colour2 === "number") {
            this.colourFromPalette(note, colour1, timestamp);
            this.lpOut.send([Launchpad.getHeader(2, note), note, colour2], timestamp);
        } else {
            this.lpOut.send([Launchpad.getHeader(2, note), note, colour1], timestamp);
        }
    }
    public pulseFromPalette(note: number, colour: number, timestamp?: number) {
        this.lpOut.send([Launchpad.getHeader(3, note), note, colour], timestamp);
    }
    public columnFromPalette(column: number, colour: number, timestamp?: number) {
        this.lpOut.send([...Launchpad.SYSEX_HEADER, 12, column, colour, Launchpad.SYSEX_FOOTER], timestamp);
    }
    public rowFromPalette(row: number, colour: number, timestamp?: number) {
        this.lpOut.send([...Launchpad.SYSEX_HEADER, 13, row, colour, Launchpad.SYSEX_FOOTER], timestamp);
    }
    public fillFromPalette(colour: number, timestamp?: number) {
        this.lpOut.send([...Launchpad.SYSEX_HEADER, 14, colour, Launchpad.SYSEX_FOOTER], timestamp);
    }
    public colourFromRGB(note: number, red: number, green: number, blue: number, timestamp?: number) {
        this.lpOut.send([...Launchpad.SYSEX_HEADER, 11, note, red, green, blue, Launchpad.SYSEX_FOOTER], timestamp);
    }
    public writeText(colour: number, looping: boolean, text: string, timestamp?: number) {
        const result: number[] = [...Launchpad.SYSEX_HEADER, 20, colour, +looping];
        for (let i = 0; i < text.length; i++) {
            result.push(text.charCodeAt(i))
        }
        result.push(Launchpad.SYSEX_FOOTER);
        this.lpOut.send(result, timestamp);
    }
    public async writeTextAsync(colour: number, text: string) {
        this.writeText(colour, false, text);
        return new Promise<void>((resolve, reject) => {
            let loopListener: any;
            let disconnectListener: any;
            loopListener = (message: MIDIMessageEvent) => {
                const data = message.data;
                if (data === new Uint8Array([...Launchpad.SYSEX_HEADER, 21, Launchpad.SYSEX_FOOTER])) {
                    this.lpIn.removeEventListener("midimessage", loopListener);
                    this.lpIn.removeEventListener("midimessage", disconnectListener);
                    resolve();
                }
            }
            this.lpIn.addEventListener("midimessage", loopListener);
            disconnectListener = (message: MIDIMessageEvent) => {
                if (this.lpIn.state === "disconnected") {
                    this.lpIn.removeEventListener("midimessage", loopListener);
                    this.lpIn.removeEventListener("midimessage", disconnectListener);
                    reject();
                }
            }
            this.lpIn.addEventListener("statechange", disconnectListener);
        })
    }

    private onMidiMessage(message: MIDIMessageEvent) {
        let data: {channel: number, note: number, velocity: number};
        switch (getMessageType(message.data)) {
            case MessageType.NOTE_ON:
                data = extractMidiMessageData(message.data);
                if (data.velocity === 0) {
                    if (data.note % 10 === 9) {
                        let selectorReleaseEvent = new CustomEvent("selectorRelease", { detail: data.note });
                        this.dispatchEvent(selectorReleaseEvent);
                    } else {
                        let padReleaseEvent = new CustomEvent("padRelease", { detail: data.note });
                        this.dispatchEvent(padReleaseEvent);
                    }
                } else {
                    if (data.note % 10 === 9) {
                        let selectorPressEvent = new CustomEvent("selectorPress", { detail: data.note });
                        this.dispatchEvent(selectorPressEvent);
                    } else {
                        let padPressEvent = new CustomEvent("padPress", { detail: data.note });
                        this.dispatchEvent(padPressEvent);
                    }
                }
                break;
            case MessageType.CONTROL_CHANGE:
                data = extractMidiMessageData(message.data);
                if (data.velocity === 0) {
                    let controlReleaseEvent = new CustomEvent("controlRelease", { detail: data.note });
                    this.dispatchEvent(controlReleaseEvent);
                } else {
                    let controlPressEvent = new CustomEvent("controlPress", { detail: data.note });
                    this.dispatchEvent(controlPressEvent);
                }
                break;
            case MessageType.SYSTEM:
                break;
        }
    }

    // @ts-expect-error
    public addEventListener<K extends keyof LaunchpadEventMap>(type: K, listener: (this: Launchpad, ev: LaunchpadEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void {
        super.addEventListener(type, listener as EventListener, options);
    }

    // @ts-expect-error
    public removeEventListener<K extends keyof LaunchpadEventMap>(type: K, listener: (this: Launchpad, ev: LaunchpadEventMap[K]) => any, options?: boolean | EventListenerOptions): void {
        super.removeEventListener(type, listener as EventListener, options);
    }

    //#endregion
}
