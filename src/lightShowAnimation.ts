
class LightShowAnimation {

    private readonly frames: LightShowFrame[];

    constructor(...frames: LightShowFrame[]) {
        this.frames = frames;
    }

    public animationExists(): boolean {
        return this.frames.length > 0;
    }

    public get frameCount() {
        return this.frames.length;
    }

    public getFrameDuration(frame: number): number {
        let f = this.getFrameDelta(frame);
        return f.duration;
    }

    public setFrameDuration(frame: number, duration: number): void {
        let f = this.getFrameDelta(frame);
        f.duration = duration;
    }

    public getFrameDelta(frame: number): LightShowFrame;
    public getFrameDelta(start: number, stop: number): LightShowAction[];
    public getFrameDelta(start: number, stop?: number): LightShowAction[] {
        if (stop === undefined)
            return this.frames[start] ?? new LightShowFrame(0);
        let state: Tuple<Tuple<Optional<LightShowAction>, 9>, 9> = constructTuple(9, () => constructTuple(9));
        for (let frameIndex = start + 1; frameIndex <= stop; frameIndex++) {
            for (let action of this.frames[frameIndex]) {
                let x, y: number;
                switch (action.type) {
                    case "PALETTE":
                    case "SYSEX":
                    case "FLASH":
                    case "PULSE":
                        [x, y] = Launchpad.posFromSessionNote(action.note);
                        state[x - 1][y - 1] = {...action, transparent: frameIndex !== stop};
                        break;
                    case "COLUMN":
                        x = action.column;
                        for (y = 1; y <= 9; y++) {
                            state[x - 1][y - 1] = { type: "PALETTE", note: Launchpad.sessionNoteFromPos(x, y), colour: action.colour, transparent: frameIndex !== stop };
                        }
                        break;
                    case "ROW":
                        y = action.row;
                        for (x = 1; x <= 9; x++) {
                            state[x - 1][y - 1] = { type: "PALETTE", note: Launchpad.sessionNoteFromPos(x, y), colour: action.colour, transparent: frameIndex !== stop };
                        }
                        break;
                    case "FILL":
                        for (x = 1; x <= 9; x++) for (y = 1; y <= 9; y++) {
                            state[x - 1][y - 1] = { type: "PALETTE", note: Launchpad.sessionNoteFromPos(x, y), colour: action.colour, transparent: frameIndex !== stop };
                        }
                        break;
                }
            }
        }
        return state.flat().filter((value): value is LightShowAction => value !== undefined);
    }

    public getFrame(frame: number): LightShowAction[] {
        return [{ type: "FILL", colour: 0, transparent: true }, ...this.getFrameDelta(-1, frame)];
    }

    public getNoteDelta(note: number, frame: number): Optional<LightShowAction>;
    public getNoteDelta(note: number, start: number, stop: number): Optional<LightShowAction>;
    public getNoteDelta(note: number, start: number, stop?: number): Optional<LightShowAction> {
        if (stop === undefined) {
            let frame = this.frames[start];
            return this.resolvePadAtFrame(note, frame);
        }
        let result: Optional<LightShowAction> = undefined;
        for (let frameIndex = start + 1; frameIndex <= stop; frameIndex++) {
            const frame = this.frames[frameIndex];
            if (result)
                result.transparent = true;
            result = this.resolvePadAtFrame(note, frame) ?? result;
        }
        return result;
    }

    private resolvePadAtFrame(note: number, frame: LightShowFrame) {
        let result: Optional<LightShowAction>;
        for (const anim of frame) {
            switch (anim.type) {
                case "FILL":
                    result = { type: "PALETTE", note: note, colour: anim.colour, transparent: false };
                    break;
                case "COLUMN":
                    if (anim.column === Launchpad.posFromSessionNote(note)[0])
                        result = { type: "PALETTE", note: note, colour: anim.colour, transparent: false };
                    break;
                case "ROW":
                    if (anim.row === Launchpad.posFromSessionNote(note)[1])
                        result = { type: "PALETTE", note: note, colour: anim.colour, transparent: false };
                    break;
                case "PALETTE":
                case "SYSEX":
                case "FLASH":
                case "PULSE":
                    if (anim.note === note)
                        result = { ...anim, transparent: false };
            }
        }
        return result;
    }

    public getNote(note: number, frame: number): LightShowAction {
        let state: LightShowAction = { type: "PALETTE", colour: 0, note: note, transparent: true };
        return this.getNoteDelta(note, -1, frame) ?? state;
    }

    public putActionOnFrame(action: NoteAction, frame: number) {
        this.removeActionOnFrameAt(action.note, frame);
        this.frames[frame].push(action);
    }

    public removeActionOnFrameAt(note: number, frame: number) {
        this.frames[frame] = new LightShowFrame(this.frames[frame].duration, ...this.frames[frame].filter((v) => actionActsAtNote(v) && v.note !== note || !actionActsAtNote(v)));
    }

    public addFrame(frame: LightShowFrame): void;
    public addFrame(duration: number): void;
    public addFrame(frame: LightShowFrame | number): void {
        this.frames.push(typeof frame == "number" ? new LightShowFrame(frame) : frame);
    }

    public removeFrame() {
        this.frames.pop();
    }

    public toJSON() {
        return this.frames;
    }
}
