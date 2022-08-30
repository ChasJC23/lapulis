
enum LaunchpadMode {
    LAYOUT,
    EDITOR,
    PREVIEW,
    LOOPING_POINT,
    COLOUR_PICKER,
}

class Manager {

    private static selectedPopulatedPadColour: number = 14;
    private static arrowColour: number = 14;
    private static selectedEmptyPadColour: number = 73;
    private static selectedPageColour: number = 127;
    private static existingPadColour: number = 127;

    private launchpad: Launchpad;
    private layoutDisplay: Display;
    private previewDisplay: Display;
    private lightShowPages: Tuple<LightShowPage, 8> = constructTuple(8, () => new LightShowPage());
    private selectedPageNum: number = 1;
    private lpMode: LaunchpadMode = LaunchpadMode.LAYOUT;
    private holdingControl: number = 0;
    private selectedPadNum: number = 11;
    private selectedFrame: number = 0;
    private frameSlider: GenericHTMLInput<"range">;
    private framePicker: GenericHTMLInput<"number">;
    private colourPicker: GenericHTMLInput<"color">;
    private useSysexCheckbox: GenericHTMLInput<"checkbox">;
    private frameDelayPicker: GenericHTMLInput<"number">;
    private useSysex: boolean;
    private selectedPaletteColour: number = 0;
    private selectedSysexColour: [number, number, number] = [0, 0, 0];
    private usingColourRadio: GenericHTMLInput<"radio">;
    private transparentRadio: GenericHTMLInput<"radio">;
    private transparent: boolean;
    private controlStateChange: boolean = false;
    private padStateChange: boolean = false;
    private colourBias: number = 0;

    private get selectedPage(): LightShowPage {
        return this.lightShowPages[this.selectedPageNum - 1];
    }
    private get selectedAnimation(): LightShowAnimation {
        return this.selectedPage.getAnimation(this.selectedPadNum);
    }

    constructor(
        launchpad: Launchpad,
        layoutDisplay: Display,
        previewDisplay: Display,
        frameSlider: GenericHTMLInput<"range">,
        framePicker: GenericHTMLInput<"number">,
        colourPicker: GenericHTMLInput<"color">,
        useSysexCheckbox: GenericHTMLInput<"checkbox">,
        usingColourRadio: GenericHTMLInput<"radio">,
        transparentRadio: GenericHTMLInput<"radio">,
        frameDelayPicker: GenericHTMLInput<"number">,
    ) {
        this.launchpad = launchpad;
        this.layoutDisplay = layoutDisplay;
        this.previewDisplay = previewDisplay;
        this.frameSlider = frameSlider;
        this.framePicker = framePicker;
        this.colourPicker = colourPicker;
        this.useSysexCheckbox = useSysexCheckbox;
        this.useSysex = useSysexCheckbox.checked;
        this.usingColourRadio = usingColourRadio;
        this.transparentRadio = transparentRadio;
        this.transparent = transparentRadio.checked;
        this.usingColourRadio.checked = !this.transparent;
        this.frameDelayPicker = frameDelayPicker;
        this.frameDelayPicker.min = "0";
        this.colourPicker.value = this.useSysex ? Launchpad.sysExToWebCol(this.selectedSysexColour) : Launchpad.PALETTE[this.selectedPaletteColour];
        this.layoutDisplay.setSelectionInteractions({
            onclick: (element, note) => this.selectionLayoutOnClick(element, note),
        });
        this.layoutDisplay.setPadInteractions({
            onclick: (element, note) => this.padLayoutOnClick(element, note),
        });
        this.previewDisplay.setInteractions({
            onclick: (element, note) => this.previewOnClick(element, note),
        });
        this.framePicker.oninput = () => this.onFrameChange(+this.framePicker.value);
        this.frameSlider.oninput = () => this.onFrameChange(+this.frameSlider.value);
        this.colourPicker.oninput = () => this.updateColour(this.colourPicker.value);
        this.frameDelayPicker.oninput = () => this.updateFrameDelay(+this.frameDelayPicker.value);
        this.useSysexCheckbox.oninput = () => this.updateSysexCheckmark(this.useSysexCheckbox.checked);
        this.usingColourRadio.oninput = () => this.transparent = false;
        this.transparentRadio.oninput = () => this.transparent = true;
        this.applyLaunchpadEvents();
        this.updateFramePickers();
    }

    public async reconnect(): Promise<void> {
        this.launchpad = await Launchpad.connectToLaunchpad({ sysex: true });
        this.applyLaunchpadEvents();
    }
    private applyLaunchpadEvents(): void {
        this.launchpad.fillFromPalette(0);
        this.launchpad.addEventListener("controlPress", (e: CustomEvent<ControlRowNote>) => this.onLaunchpadControlPress(e.detail));
        this.launchpad.addEventListener("controlRelease", (e: CustomEvent<ControlRowNote>) => this.onLaunchpadControlRelease(e.detail));
        this.launchpad.addEventListener("selectorPress", (e: CustomEvent<SelectorColNote>) => this.onLaunchpadSelectorPress(e.detail));
        this.launchpad.addEventListener("selectorRelease", (e: CustomEvent<SelectorColNote>) => this.onLaunchpadSelectorRelease(e.detail));
        this.launchpad.addEventListener("padPress", (e: CustomEvent<number>) => this.onLaunchpadPadPress(e.detail));
        this.launchpad.addEventListener("padRelease", (e: CustomEvent<number>) => this.onLaunchpadPadRelease(e.detail));
        this.highlightSelectedPage();
        this.highlightSelectedPad();
        this.updateLaunchpadLayoutArrows();
        this.updateAnimationLayout();
    }

    private padLayoutOnClick(element: SVGElement, note: number): void {
        this.switchSelectedPad(note);
    }
    private highlightSelectedPad(): void {
        this.layoutDisplay.setBorderColour(this.selectedPadNum, "yellow");
        if (this.lpMode === LaunchpadMode.LAYOUT) {
            this.highlightLaunchpadSelectedPad();
        }
    }
    private highlightLaunchpadSelectedPad(): void {
        if (this.selectedPage.animationExistsAt(this.selectedPadNum))
            this.launchpad.colourFromPalette(this.selectedPadNum, Manager.selectedPopulatedPadColour);
        else
            this.launchpad.colourFromPalette(this.selectedPadNum, Manager.selectedEmptyPadColour);
    }
    private hideSelectedPad(): void {
        this.layoutDisplay.setBorderColour(this.selectedPadNum, "dimgrey");
        if (this.lpMode === LaunchpadMode.LAYOUT) {
            if (this.selectedPage.animationExistsAt(this.selectedPadNum))
                this.launchpad.colourFromPalette(this.selectedPadNum, Manager.existingPadColour);
            else
                this.launchpad.colourFromPalette(this.selectedPadNum, 0);
        }
    }
    private switchSelectedPad(note: number): void {
        this.hideSelectedPad();
        this.selectedPadNum = note;
        if (this.lpMode === LaunchpadMode.LAYOUT)
            this.updateLaunchpadLayoutArrows();
        this.highlightSelectedPad();
        this.updateFramePickers();
    }
    private updateFrame(): void {
        let frame = Math.min(this.selectedFrame, this.selectedAnimation.frameCount - 1);
        let actions = this.selectedAnimation.getFrame(frame);
        if (this.selectedFrame === this.selectedAnimation.frameCount) {
            for (const action of actions) {
                action.transparent = true;
            }
        }
        this.previewDisplay.performActions(actions);
        if (this.lpMode === LaunchpadMode.EDITOR) {
            this.launchpad.performActions(actions);
        }
        this.frameDelayPicker.value = this.selectedAnimation.getFrameDuration(frame).toString();
    }
    private updateFrameAtNote(note: number): void {
        let action = this.selectedAnimation.getNote(note, this.selectedFrame);
        this.previewDisplay.performAction(action);
        if (this.lpMode === LaunchpadMode.EDITOR) {
            this.launchpad.performAction(action);
        }
    }
    private updateFramePickers(frame: number = 0): void {
        this.frameSlider.min = "0";
        this.frameSlider.max = this.selectedAnimation.frameCount.toString();
        this.frameSlider.value = frame.toString();
        this.framePicker.min = this.frameSlider.min;
        this.framePicker.max = this.frameSlider.max;
        this.framePicker.value = this.frameSlider.value;
        this.selectedFrame = frame;
        this.updateFrame();
    }
    private onFrameChange(value: number): void {
        this.selectedFrame = value;
        this.frameSlider.value = value.toString();
        this.framePicker.value = value.toString();
        this.updateFrame();
    }
    private highlightSelectedPage(): void {
        this.layoutDisplay.setColour(Launchpad.sessionNoteFromPos(9, this.selectedPageNum), "orange");
        if (this.lpMode === LaunchpadMode.LAYOUT) {
            this.launchpad.colourFromPalette(Launchpad.sessionNoteFromPos(9, this.selectedPageNum), Manager.selectedPageColour);
        }
    }
    private hideSelectedPage(): void {
        this.layoutDisplay.setColour(Launchpad.sessionNoteFromPos(9, this.selectedPageNum), "black");
        if (this.lpMode === LaunchpadMode.LAYOUT) {
            this.launchpad.colourFromPalette(Launchpad.sessionNoteFromPos(9, this.selectedPageNum), 0);
        }
    }
    private switchSelectedPage(newPage: SelectorColNote): void {
        this.hideSelectedPage();
        this.selectedPageNum = newPage;
        this.highlightSelectedPage();
        if (this.lpMode === LaunchpadMode.LAYOUT)
            this.updateAnimationLayout();
        else
            this.updateDisplayAnimationLayout();
        this.updateFramePickers();
    }
    private selectionLayoutOnClick(element: SVGElement, note: SelectorColNote): void {
        this.switchSelectedPage((note - 9) / 10);
    }
    private previewOnClick(element: SVGElement, note: number): void {
        this.paintNote(note);
    }
    private paintNote(note: number): void {
        if (this.selectedFrame === this.selectedAnimation.frameCount) {
            this.selectedAnimation.addFrame(+this.frameDelayPicker.value);
            this.updateFramePickers(this.selectedFrame);
            if (this.selectedFrame === 0)
                this.updateDisplayAnimationLayout();
        }
        if (this.transparent) {
            if (this.selectedFrame === this.selectedAnimation.frameCount) {
                return;
            }
            this.selectedAnimation.removeActionOnFrameAt(note, this.selectedFrame);
            if (this.selectedFrame === this.selectedAnimation.frameCount - 1) {
                while (this.selectedAnimation.getFrameDelta(this.selectedFrame).length === 0) {
                    this.selectedAnimation.removeFrame();
                    this.selectedFrame--;
                    if (this.selectedFrame < 0) {
                        this.selectedFrame = 0;
                        this.updateDisplayAnimationLayout();
                        break;
                    }
                }
                this.updateFramePickers(this.selectedFrame);
            }
        } else {
            if (this.selectedFrame === this.selectedAnimation.frameCount) {
                this.selectedAnimation.addFrame(+this.frameDelayPicker.value);
                this.updateFramePickers(this.selectedFrame);
            }
            this.selectedAnimation.putActionOnFrame(
                this.useSysex ?
                    {
                        type: "SYSEX",
                        note: note,
                        r: this.selectedSysexColour[0],
                        g: this.selectedSysexColour[1],
                        b: this.selectedSysexColour[2],
                    } :
                    {
                        type: "PALETTE",
                        note: note,
                        colour: this.selectedPaletteColour,
                    },
                this.selectedFrame
            );
        }
        this.updateFrameAtNote(note);
    }
    private onLaunchpadControlPress(note: ControlRowNote): void {
        switch (note) {
            case ControlRowNote.MIXER:
                this.holdingControl |= 0b00000001;
                break;
            case ControlRowNote.USER_TWO:
                this.holdingControl |= 0b00000010;
                break;
            case ControlRowNote.USER_ONE:
                this.holdingControl |= 0b00000100;
                break;
            case ControlRowNote.SESSION:
                this.holdingControl |= 0b00001000;
                break;
            case ControlRowNote.RIGHT:
                this.holdingControl |= 0b00010000;
                break;
            case ControlRowNote.LEFT:
                this.holdingControl |= 0b00100000;
                break;
            case ControlRowNote.DOWN:
                this.holdingControl |= 0b01000000;
                break;
            case ControlRowNote.UP:
                this.holdingControl |= 0b10000000;
                break;
        }
        if (this.performControlAction()) return;
        if (this.lpMode === LaunchpadMode.LAYOUT) {
            this.defaultShiftAni(note);
        }
        if (this.lpMode === LaunchpadMode.COLOUR_PICKER) {
            this.shiftColourPageBias(note);
        }
    }
    private shiftColourPageBias(direction: ControlRowNote) {
        switch (direction) {
            case ControlRowNote.DOWN:
                this.colourBias = Math.max(0, this.colourBias - 8);
                break;
            case ControlRowNote.UP:
                this.colourBias = Math.min(64, this.colourBias + 8);
                break;
            case ControlRowNote.LEFT:
                this.colourBias = 0;
                break;
            case ControlRowNote.RIGHT:
                this.colourBias = 64;
                break;
        }
        this.updateLaunchpadDisplay();
    }
    private performControlAction(): boolean {
        switch (this.holdingControl) {
            case 0b00001010:
                this.lpMode = (this.lpMode + 1) % LaunchpadMode.LOOPING_POINT;
                this.updateLaunchpadDisplay();
                return this.controlStateChange = true;
            case 0b00001100:
                this.lpMode = (this.lpMode + LaunchpadMode.LOOPING_POINT - 1) % LaunchpadMode.LOOPING_POINT;
                this.updateLaunchpadDisplay();
                return this.controlStateChange = true;
            case 0b10001000:
                this.defaultShiftAni(ControlRowNote.UP);
                return this.controlStateChange = true;
            case 0b01001000:
                this.defaultShiftAni(ControlRowNote.DOWN);
                return this.controlStateChange = true;
            case 0b00101000:
                this.defaultShiftAni(ControlRowNote.LEFT);
                return this.controlStateChange = true;
            case 0b00011000:
                this.defaultShiftAni(ControlRowNote.RIGHT);
                return this.controlStateChange = true;
            case 0b00100001:
                this.updateFramePickers(Math.max(this.selectedFrame - 1, 0));
                return this.controlStateChange = true;
            case 0b00010001:
                this.updateFramePickers(Math.min(this.selectedFrame + 1, this.selectedAnimation.frameCount));
                return this.controlStateChange = true;
            case 0b00001001:
                this.lpMode = LaunchpadMode.COLOUR_PICKER;
                this.updateLaunchpadDisplay();
                return this.controlStateChange = true;
        }
        return false;
    }
    private defaultShiftAni(direction: ControlRowNote): void {
        switch (direction) {
            case ControlRowNote.UP:
                if (this.canShiftSelectedPad([0, 1]))
                    this.shiftSelectedPad([0, 1]);
                break;
            case ControlRowNote.DOWN:
                if (this.canShiftSelectedPad([0, -1]))
                    this.shiftSelectedPad([0, -1]);
                break;
            case ControlRowNote.LEFT:
                if (this.canShiftSelectedPad([-1, 0]))
                    this.shiftSelectedPad([-1, 0]);
                break;
            case ControlRowNote.RIGHT:
                if (this.canShiftSelectedPad([1, 0]))
                    this.shiftSelectedPad([1, 0]);
                break;
        }
    }
    private updateLaunchpadDisplay(): void {
        switch (this.lpMode) {
            case LaunchpadMode.LAYOUT:
                this.launchpad.fillFromPalette(0);
                this.updateLaunchpadLayoutArrows();
                this.updateLaunchpadAnimationLayout();
                this.launchpad.colourFromPalette(Launchpad.sessionNoteFromPos(9, this.selectedPageNum), Manager.selectedPageColour);
                break;
            case LaunchpadMode.EDITOR:
                this.updateFrame();
                break;
            case LaunchpadMode.PREVIEW:
                this.launchpad.fillFromPalette(0);
                break;
            case LaunchpadMode.COLOUR_PICKER:
                this.launchpad.fillFromPalette(0);
                for (let y = 1; y <= 8; y++) for (let x = 1; x <= 8; x++) {
                    this.launchpad.colourFromPalette(Launchpad.sessionNoteFromPos(x, y), (y - 1) * 8 + x - 1 + this.colourBias);
                }
                this.launchpad.colourFromPalette(89, 127);
                this.updateLaunchpadColourArrows();
                break;
        }
    }
    private updateAnimationLayout(): void {
        let animationLayout = this.selectedPage.existingAnimationLayout();
        for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) {
            if (animationLayout[x][y]) {
                this.launchpad.colourFromPalette(Launchpad.sessionNoteFromPos(x + 1, y + 1), Manager.existingPadColour);
                this.layoutDisplay.setColour(Launchpad.sessionNoteFromPos(x + 1, y + 1), "orange");
            }
            else {
                this.launchpad.colourFromPalette(Launchpad.sessionNoteFromPos(x + 1, y + 1), 0);
                this.layoutDisplay.setColour(Launchpad.sessionNoteFromPos(x + 1, y + 1), "black");
            }
            this.highlightLaunchpadSelectedPad();
        }
    }
    private updateLaunchpadAnimationLayout(): void {
        let animationLayout = this.selectedPage.existingAnimationLayout();
        for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) {
            if (animationLayout[x][y])
                this.launchpad.colourFromPalette(Launchpad.sessionNoteFromPos(x + 1, y + 1), Manager.existingPadColour);
            else
                this.launchpad.colourFromPalette(Launchpad.sessionNoteFromPos(x + 1, y + 1), 0);
            this.highlightLaunchpadSelectedPad();
        }
    }
    private updateDisplayAnimationLayout(): void {
        let animationLayout = this.selectedPage.existingAnimationLayout();
        for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) {
            if (animationLayout[x][y])
                this.layoutDisplay.setColour(Launchpad.sessionNoteFromPos(x + 1, y + 1), "orange");
            else
                this.layoutDisplay.setColour(Launchpad.sessionNoteFromPos(x + 1, y + 1), "black");
        }
    }
    private updateLaunchpadLayoutArrows(): void {
        if (this.canShiftSelectedPad([0, 1]))
            this.launchpad.colourFromPalette(ControlRowNote.UP, Manager.arrowColour);
        else
            this.launchpad.colourFromPalette(ControlRowNote.UP, 0);
        if (this.canShiftSelectedPad([0, -1]))
            this.launchpad.colourFromPalette(ControlRowNote.DOWN, Manager.arrowColour);
        else
            this.launchpad.colourFromPalette(ControlRowNote.DOWN, 0);
        if (this.canShiftSelectedPad([-1, 0]))
            this.launchpad.colourFromPalette(ControlRowNote.LEFT, Manager.arrowColour);
        else
            this.launchpad.colourFromPalette(ControlRowNote.LEFT, 0);
        if (this.canShiftSelectedPad([1, 0]))
            this.launchpad.colourFromPalette(ControlRowNote.RIGHT, Manager.arrowColour);
        else
            this.launchpad.colourFromPalette(ControlRowNote.RIGHT, 0);
    }
    private updateLaunchpadColourArrows(): void {
        if (this.colourBias > 0) {
            this.launchpad.colourFromPalette(ControlRowNote.LEFT, Manager.arrowColour);
            this.launchpad.colourFromPalette(ControlRowNote.DOWN, Manager.arrowColour);
        } else {
            this.launchpad.colourFromPalette(ControlRowNote.LEFT, 0);
            this.launchpad.colourFromPalette(ControlRowNote.DOWN, 0);
        }
        if (this.colourBias < 64) {
            this.launchpad.colourFromPalette(ControlRowNote.RIGHT, Manager.arrowColour);
            this.launchpad.colourFromPalette(ControlRowNote.UP, Manager.arrowColour);
        } else {
            this.launchpad.colourFromPalette(ControlRowNote.RIGHT, 0);
            this.launchpad.colourFromPalette(ControlRowNote.UP, 0);
        }
    }
    private onLaunchpadControlRelease(note: ControlRowNote): void {
        switch (note) {
            case ControlRowNote.MIXER:
                this.holdingControl &=~ 0b00000001;
                break;
            case ControlRowNote.USER_TWO:
                this.holdingControl &=~ 0b00000010;
                break;
            case ControlRowNote.USER_ONE:
                this.holdingControl &=~ 0b00000100;
                break;
            case ControlRowNote.SESSION:
                this.holdingControl &=~ 0b00001000;
                break;
            case ControlRowNote.RIGHT:
                this.holdingControl &=~ 0b00010000;
                break;
            case ControlRowNote.LEFT:
                this.holdingControl &=~ 0b00100000;
                break;
            case ControlRowNote.DOWN:
                this.holdingControl &=~ 0b01000000;
                break;
            case ControlRowNote.UP:
                this.holdingControl &=~ 0b10000000;
                break;
        }
        if (this.lpMode === LaunchpadMode.EDITOR && !this.controlStateChange) {
            this.paintNote(note);
        }
        if (this.holdingControl === 0) {
            this.controlStateChange = false;
        }
    }
    private onLaunchpadSelectorPress(note: SelectorColNote): void {
        if (this.lpMode === LaunchpadMode.LAYOUT || this.lpMode === LaunchpadMode.PREVIEW) {
            this.switchSelectedPage((note - 9) / 10);
        }
        if (this.lpMode === LaunchpadMode.COLOUR_PICKER && note === SelectorColNote.VOLUME) {
            this.transparent = true;
            this.transparentRadio.checked = true;
            this.lpMode = LaunchpadMode.EDITOR;
            this.updateLaunchpadDisplay();
        }
    }
    private onLaunchpadSelectorRelease(note: SelectorColNote): void {
        if (this.lpMode === LaunchpadMode.EDITOR) {
            this.paintNote(note);
        }
    }
    private onLaunchpadPadPress(note: number): void {
        if (this.lpMode === LaunchpadMode.LAYOUT) {
            if (note === this.selectedPadNum) {
                this.lpMode = LaunchpadMode.EDITOR;
                this.padStateChange = true;
                this.updateLaunchpadDisplay();
            } else
                this.switchSelectedPad(note);
        }
        if (this.lpMode === LaunchpadMode.PREVIEW) {
            this.playAnimation(note);
        }
        if (this.lpMode === LaunchpadMode.COLOUR_PICKER) {
            let colour = (Math.floor(note / 10) - 1) * 8 + (note - 1) % 10 + this.colourBias;
            this.updateColour(colour);
            this.transparent = false;
            this.usingColourRadio.checked = true;
            this.lpMode = LaunchpadMode.EDITOR;
            this.padStateChange = true;
            this.updateLaunchpadDisplay();
        }
    }
    private onLaunchpadPadRelease(note: number): void {
        if (this.lpMode === LaunchpadMode.EDITOR && !this.padStateChange) {
            this.paintNote(note);
        }
        this.padStateChange = false;
    }
    private playAnimation(note: number): void {
        let animation = this.selectedPage.getAnimation(...Launchpad.posFromSessionNote(note));
        let timestamp = 0;
        let now = window.performance.now();
        for (let f = 0; f < animation.frameCount; f++) {
            let frame = animation.getFrameDelta(f);
            timestamp += frame.duration;
            this.launchpad.performActions(frame, now + timestamp);
            console.log(...frame);
        }
    }
    private shiftSelectedPad(vector: [number, number]): void {
        const newSelectedPad = Launchpad.addVectorOnPad(this.selectedPadNum, vector);
        if (Launchpad.onPad(newSelectedPad))
            this.switchSelectedPad(newSelectedPad);
        else
            throw RangeError("Invalid Vector!");
    }
    private canShiftSelectedPad(vector: [number, number]): boolean {
        const newSelectedPad = Launchpad.addVectorOnPad(this.selectedPadNum, vector);
        return Launchpad.onPad(newSelectedPad);
    }

    private updateColour(colour: [number, number, number]): void;
    private updateColour(colour: number): void;
    private updateColour(colour: string): void;
    private updateColour(colour: string | number | [number, number, number]): void {
        if (typeof colour === "number") colour = Launchpad.PALETTE[colour];
        if (colour instanceof Array) colour = Launchpad.sysExToWebCol(colour);
        if (this.useSysex) {
            if (Launchpad.sysExToWebCol(this.selectedSysexColour) === colour) return;
            this.selectedSysexColour = Launchpad.sysExApprox(colour);
            this.colourPicker.value = Launchpad.sysExToWebCol(this.selectedSysexColour);
        } else {
            if (Launchpad.PALETTE[this.selectedPaletteColour] === colour) return;
            this.selectedPaletteColour = Launchpad.paletteApprox(colour)[0];
            this.colourPicker.value = Launchpad.PALETTE[this.selectedPaletteColour];
        }
    }

    private updateSysexCheckmark(value: boolean): void {
        this.useSysex = value;
        this.updateColour(this.colourPicker.value);
    }

    public loadFile(text: string): void {
        let data = JSON.parse(text);
        // page array
        if (data instanceof Array) {
            let pages: LightShowPage[] = [];
            for (const page of data) if (page instanceof Array) {
                let anipage: Tuple<LightShowAnimation, 8>[] = [];
                for (const col of page) if (col instanceof Array) {
                    let column: LightShowAnimation[] = [];
                    for (const anim of col) if (anim instanceof Array) {
                        let frames: LightShowFrame[] = [];
                        for (const frame of anim) if (frame instanceof Array && typeof frame[0] === "number") {
                            frames.push(new LightShowFrame(...(frame as [number, ...LightShowAction[]])));
                        }
                        column.push(new LightShowAnimation(...frames));
                    }
                    if (column.length == 8) {
                        anipage.push(column as Tuple<LightShowAnimation, 8>);
                    }
                }
                if (anipage.length == 8) {
                    pages.push(new LightShowPage(anipage as Tuple<Tuple<LightShowAnimation, 8>, 8>))
                }
            }
            if (pages.length === 8) {
                this.lightShowPages = pages as Tuple<LightShowPage, 8>;
                this.updateLaunchpadDisplay();
                this.updateDisplayAnimationLayout();
                this.updateFramePickers();
            }
        }
    }

    private updateFrameDelay(delay: number): void {
        if (this.selectedFrame < this.selectedAnimation.frameCount) {
            this.selectedAnimation.setFrameDuration(this.selectedFrame, delay);
        }
    }
}
