
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

    /**
     * selected display mode for the {@link launchpad}.
     * @private
     */
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
        this.frameDelayPicker.oninput = () => this.setFrameDuration(+this.frameDelayPicker.value);
        this.useSysexCheckbox.oninput = () => this.setUseSysex(this.useSysexCheckbox.checked);
        this.usingColourRadio.oninput = () => this.transparent = false;
        this.transparentRadio.oninput = () => this.transparent = true;
        this.applyLaunchpadEvents();
        this.updateFramePickers();
        this.highlightSelectedPage();
        this.highlightSelectedPad();
    }

    /**
     * Reconnects to the {@link launchpad} and {@link applyLaunchpadEvents reapplies events}.
     * @public
     */
    public async reconnect(): Promise<void> {
        this.launchpad = await Launchpad.connectToLaunchpad({ sysex: true });
        this.applyLaunchpadEvents();
    }

    /**
     * Adds the necessary event listeners to the {@link launchpad} and {@link updateLaunchpadDisplay updates its display}.
     * @private
     */
    private applyLaunchpadEvents(): void {
        this.launchpad.fillFromPalette(0);
        this.launchpad.addEventListener("controlPress", (e: CustomEvent<ControlRowNote>) => this.onLaunchpadControlPress(e.detail));
        this.launchpad.addEventListener("controlRelease", (e: CustomEvent<ControlRowNote>) => this.onLaunchpadControlRelease(e.detail));
        this.launchpad.addEventListener("selectorPress", (e: CustomEvent<SelectorColNote>) => this.onLaunchpadSelectorPress(e.detail));
        this.launchpad.addEventListener("selectorRelease", (e: CustomEvent<SelectorColNote>) => this.onLaunchpadSelectorRelease(e.detail));
        this.launchpad.addEventListener("padPress", (e: CustomEvent<number>) => this.onLaunchpadPadPress(e.detail));
        this.launchpad.addEventListener("padRelease", (e: CustomEvent<number>) => this.onLaunchpadPadRelease(e.detail));
        this.updateLaunchpadDisplay();
    }

    /**
     * Event listener run when a pad button on the layout display is clicked.
     * Calls {@link switchSelectedPad} to update the selected pad to the given value.
     * @param element - The element being clicked on (unused).
     * @param note - The note of the corresponding pad button on the {@link launchpad}.
     * @private
     */
    private padLayoutOnClick(element: SVGElement, note: number): void {
        this.switchSelectedPad(note);
    }

    /**
     * Highlights the selected pad in the layout display.
     * If the {@link lpMode display mode} is {@link LaunchpadMode.LAYOUT}, {@link highlightLaunchpadSelectedPad} is called.
     * @private
     */
    private highlightSelectedPad(): void {
        this.layoutDisplay.setBorderColour(this.selectedPadNum, "yellow");
        if (this.lpMode === LaunchpadMode.LAYOUT) {
            this.highlightLaunchpadSelectedPad();
        }
    }

    /**
     * Highlights the selected pad on the {@link launchpad}.
     * @private
     */
    private highlightLaunchpadSelectedPad(): void {
        if (this.selectedPage.animationExistsAt(this.selectedPadNum))
            this.launchpad.colourFromPalette(this.selectedPadNum, Manager.selectedPopulatedPadColour);
        else
            this.launchpad.colourFromPalette(this.selectedPadNum, Manager.selectedEmptyPadColour);
    }

    /**
     * Resets the selected pad to black on the {@link layoutDisplay layout display}
     * and on the {@link launchpad} if {@link lpMode} is set to {@link LaunchpadMode.LAYOUT}.
     * @private
     */
    private hideSelectedPad(): void {
        this.layoutDisplay.setBorderColour(this.selectedPadNum, "dimgrey");
        if (this.lpMode === LaunchpadMode.LAYOUT) {
            if (this.selectedPage.animationExistsAt(this.selectedPadNum))
                this.launchpad.colourFromPalette(this.selectedPadNum, Manager.existingPadColour);
            else
                this.launchpad.colourFromPalette(this.selectedPadNum, 0);
        }
    }

    /**
     * Sets {@link selectedPadNum} to the given value, and updates the corresponding displays; those being
     * {@link layoutDisplay} and the {@link launchpad} if {@link lpMode} is set to {@link LaunchpadMode.LAYOUT}.
     * @param note - the note value locating the pad to select.
     * @private
     */
    private switchSelectedPad(note: number): void {
        this.hideSelectedPad();
        this.selectedPadNum = note;
        if (this.lpMode === LaunchpadMode.LAYOUT)
            this.updateLaunchpadLayoutArrows();
        this.highlightSelectedPad();
        this.updateFramePickers();
    }

    /**
     * Displays the currently selected frame {@link selectedFrame} on the {@link previewDisplay}
     * and the {@link launchpad} if {@link lpMode} is set to {@link LaunchpadMode.EDITOR}.
     * Related UI elements like {@link frameDelayPicker} are also updated.
     * @private
     */
    private updateFrame(): void {
        let frame = Math.min(this.selectedFrame, this.selectedAnimation.frameCount - 1);
        let actions = this.selectedAnimation.getFrame(frame);
        if (this.selectedFrame === this.selectedAnimation.frameCount) {
            for (const action of actions) {
                action.transparent = true;
            }
        }
        else
            this.frameDelayPicker.value = this.selectedAnimation.getFrameDuration(frame).toString();
        this.previewDisplay.performActions(actions);
        if (this.lpMode === LaunchpadMode.EDITOR) {
            this.launchpad.performActions(actions);
        }
    }

    /**
     * Displays a single pad from the currently selected frame {@link selectedFrame} to the {@link previewDisplay}
     * and the {@link launchpad} if {@link lpMode} is set to {@link LaunchpadMode.EDITOR}.
     * @param note - the note value indicating the pad to update.
     * @private
     */
    private updateFrameAtNote(note: number): void {
        let action = this.selectedAnimation.getNote(note, this.selectedFrame);
        this.previewDisplay.performAction(action);
        if (this.lpMode === LaunchpadMode.EDITOR) {
            this.launchpad.performAction(action);
        }
    }

    /**
     * Sets {@link selectedFrame} to the given value, and updates the limits for the frame selection UI elements {@link frameSlider} and {@link framePicker}.
     * Used when the currently selected animation {@link selectedAnimation} is changed.
     * A call to {@link updateFrame} is also made to update the displayed frame.
     * @param frame - the updated value for the {@link selectedFrame}.
     * @private
     */
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

    /**
     * Sets {@link selectedFrame} to the given value, and updates the corresponding UI elements {@link frameSlider} and {@link framePicker}.
     * A call to {@link updateFrame} is also made to update the displayed frame.
     * @param frame - the updated value for the {@link selectedFrame}.
     * @private
     */
    private onFrameChange(frame: number): void {
        this.selectedFrame = frame;
        this.frameSlider.value = frame.toString();
        this.framePicker.value = frame.toString();
        this.updateFrame();
    }

    /**
     * Highlights the currently selected animation page indicator to the {@link layoutDisplay}
     * and the {@link launchpad} if {@link lpMode} is set to {@link LaunchpadMode.LAYOUT}.
     * The currently selected page populates the right side column of circular buttons.
     * @private
     */
    private highlightSelectedPage(): void {
        this.layoutDisplay.setColour(Launchpad.sessionNoteFromPos(9, this.selectedPageNum), "orange");
        if (this.lpMode === LaunchpadMode.LAYOUT) {
            this.launchpad.colourFromPalette(Launchpad.sessionNoteFromPos(9, this.selectedPageNum), Manager.selectedPageColour);
        }
    }

    /**
     * Hides the currently selected animation page indicator on the {@link layoutDisplay}
     * and the {@link launchpad} if {@link lpMode} is set to {@link LaunchpadMode.LAYOUT}.
     * The currently selected page indicator populates the right side column of circular buttons.
     * @private
     */
    private hideSelectedPage(): void {
        this.layoutDisplay.setColour(Launchpad.sessionNoteFromPos(9, this.selectedPageNum), "black");
        if (this.lpMode === LaunchpadMode.LAYOUT) {
            this.launchpad.colourFromPalette(Launchpad.sessionNoteFromPos(9, this.selectedPageNum), 0);
        }
    }

    /**
     * Sets {@link selectedPadNum} to the given page number and updates {@link layoutDisplay}.
     * If {@link lpMode} is set to {@link LaunchpadMode.LAYOUT} then the {@link launchpad} display is also updated.
     * @param newPage - The new page to focus on,
     * @private
     */
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

    /**
     * Event listener run when one of the circular buttons on the right side of {@link layoutDisplay} is clicked.
     * Calls {@link switchSelectedPage} to update the selected page to what corresponds to the given note.
     * @param element - The element being clicked on (unused).
     * @param note - The note of the corresponding pad button on the {@link launchpad}.
     * @private
     */
    private selectionLayoutOnClick(element: SVGElement, note: SelectorColNote): void {
        this.switchSelectedPage((note - 9) / 10);
    }

    /**
     * Event listener run when one of the buttons on {@link previewDisplay} is clicked.
     * Calls {@link paintNote} to make the relevant edit to the current animation.
     * @param element - The element being clicked on (unused).
     * @param note - The note of the corresponding pad button on the {@link launchpad}.
     * @private
     */
    private previewOnClick(element: SVGElement, note: number): void {
        this.paintNote(note);
    }

    /**
     * Changes the action performed at the pad corresponding to the given note on {@link selectedAnimation} at frame {@link selectedFrame}.
     * The chosen action is determined by instance attributes {@link transparent}, {@link useSysex}, {@link selectedSysexColour}, {@link selectedPaletteColour}.
     * @param note - The note corresponding to the pad to update.
     * @private
     */
    private paintNote(note: number): void {
        // removing actions at the given note
        if (this.transparent) {

            // if we're at the null frame, there's nothing to remove
            if (this.selectedFrame === this.selectedAnimation.frameCount)
                return;

            this.selectedAnimation.removeActionOnFrameAt(note, this.selectedFrame);

            // if we've removed an action from the final frame, we need to check whether to remove the frame entirely
            if (this.selectedFrame === this.selectedAnimation.frameCount - 1) {

                // remove all empty frames
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
        }
        // adding actions to the given note
        else {

            // if we're at the null frame, we need to create it first
            if (this.selectedFrame === this.selectedAnimation.frameCount) {
                this.selectedAnimation.addFrame(+this.frameDelayPicker.value);
                this.updateFramePickers(this.selectedFrame);
                if (this.selectedFrame === 0)
                    this.updateDisplayAnimationLayout();
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

    /**
     * Event listener run when one of the top row buttons on the {@link launchpad} is pressed.
     * Manages control sequences on the {@link launchpad} through {@link performControlAction},
     * otherwise calling {@link defaultShiftSelectedPad} or {@link shiftColourPageBias} if {@link lpMode} is
     * {@link LaunchpadMode.LAYOUT} or {@link LaunchpadMode.COLOUR_PICKER} respectively.
     * @param note - The note of the pressed button.
     * @private
     */
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
            this.defaultShiftSelectedPad(note);
        }
        if (this.lpMode === LaunchpadMode.COLOUR_PICKER) {
            this.shiftColourPageBias(note);
        }
    }

    /**
     * Shifts {@link colourBias} by a fixed amount determined by the notes of the directional buttons on the {@link launchpad}.
     * Calls {@link updateLaunchpadDisplay} under the assumption {@link lpMode} is {@link LaunchpadMode.COLOUR_PICKER}.
     * @param direction - The note of the directional button indicating the direction to shift in.
     * @private
     */
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

    /**
     * Attempts to perform a control sequence based on the value of {@link holdingControl}.
     * Returns whether an operation was successfully performed or not, updating {@link controlStateChange} if so.
     * @private
     */
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
                this.defaultShiftSelectedPad(ControlRowNote.UP);
                return this.controlStateChange = true;
            case 0b01001000:
                this.defaultShiftSelectedPad(ControlRowNote.DOWN);
                return this.controlStateChange = true;
            case 0b00101000:
                this.defaultShiftSelectedPad(ControlRowNote.LEFT);
                return this.controlStateChange = true;
            case 0b00011000:
                this.defaultShiftSelectedPad(ControlRowNote.RIGHT);
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

    /**
     * Uses {@link shiftSelectedPad} to shift {@link selectedPadNum} by a fixed vector
     * determined by the notes of the directional buttons on the {@link launchpad}.
     * @param direction - The note of the directional button indicating the direction to shift in.
     * @private
     */
    private defaultShiftSelectedPad(direction: ControlRowNote): void {
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

    /**
     * Updates the visuals displayed on the {@link launchpad} to correspond with the current value of {@link lpMode}.
     * @private
     */
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

    /**
     * Updates both the {@link launchpad} and {@link layoutDisplay} to preview the current animation layout.
     * Assumes {@link lpMode} is set to {@link LaunchpadMode.LAYOUT}.
     * @private
     */
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

    /**
     * Updates just the {@link launchpad} to preview the current animation layout.
     * Assumes {@link lpMode} is set to {@link LaunchpadMode.LAYOUT}.
     * @private
     */
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

    /**
     * Updates just the {@link layoutDisplay} to preview the current animation layout.
     * @private
     */
    private updateDisplayAnimationLayout(): void {
        let animationLayout = this.selectedPage.existingAnimationLayout();
        for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) {
            if (animationLayout[x][y])
                this.layoutDisplay.setColour(Launchpad.sessionNoteFromPos(x + 1, y + 1), "orange");
            else
                this.layoutDisplay.setColour(Launchpad.sessionNoteFromPos(x + 1, y + 1), "black");
        }
    }

    /**
     * Updates the arrows highlighted on the {@link launchpad} to indicate
     * whether {@link selectedPadNum} can be shifted in each direction.
     * Assumes {@link lpMode} is set to {@link LaunchpadMode.LAYOUT}.
     * @private
     */
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

    /**
     * Updates the arrows highlighted on the {@link launchpad} to indicate
     * whether {@link colourBias} can be shifted in each direction.
     * Assumes {@link lpMode} is set to {@link LaunchpadMode.COLOUR_PICKER}.
     * @private
     */
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

    /**
     * Event listener run when one of the top row buttons on the {@link launchpad} is released.
     * Updates {@link holdingControl} and consequently {@link controlStateChange} if 0.
     * If {@link lpMode} is set to {@link LaunchpadMode.EDITOR}, {@link paintNote} is called.
     * @param note - The note of the released button.
     * @private
     */
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

    /**
     * Event listener run when one of the right side buttons on the {@link launchpad} is pressed.
     * Behaviour heavily dependent on {@link lpMode}.
     * @param note - The note of the pressed button.
     * @private
     */
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

    /**
     * Event listener run when one of the right side buttons on the {@link launchpad} is released.
     * Calls {@link paintNote} if {@link lpMode} is set to {@link LaunchpadMode.EDITOR}.
     * @param note - The note of the pressed button.
     * @private
     */
    private onLaunchpadSelectorRelease(note: SelectorColNote): void {
        if (this.lpMode === LaunchpadMode.EDITOR) {
            this.paintNote(note);
        }
    }

    /**
     * Event listener run when one of the central pad buttons on the {@link launchpad} is pressed.
     * Behaviour heavily dependent {@link lpMode}.
     * @param note - The note of the pressed button.
     * @private
     */
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

    /**
     * Event listener run when one of the central pad buttons on the {@link launchpad} is released.
     * Calls {@link paintNote} if permitted and {@link lpMode} is set to {@link LaunchpadMode.EDITOR}.
     * Resets the value of {@link padStateChange}.
     * @param note - The note of the pressed button.
     * @private
     */
    private onLaunchpadPadRelease(note: number): void {
        if (this.lpMode === LaunchpadMode.EDITOR && !this.padStateChange) {
            this.paintNote(note);
        }
        this.padStateChange = false;
    }

    /**
     * Plays the animation corresponding to the given {@link note} value on the {@link selectedPage current page} to the {@link launchpad}.
     * Assumes {@link lpMode} is set to {@link LaunchpadMode.PREVIEW}.
     * @param note - The note of the animation to play.
     * @private
     */
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

    /**
     * Shifts the {@link selectedPadNum currently selected pad} by the {@link vector given vector}.
     * @param vector - The vector to shift by.
     * @throws {@link RangeError} - Thrown if the destination doesn't exist on the pad.
     * @private
     */
    private shiftSelectedPad(vector: [number, number]): void {
        const newSelectedPad = Launchpad.addVectorOnPad(this.selectedPadNum, vector);
        if (Launchpad.onPad(newSelectedPad))
            this.switchSelectedPad(newSelectedPad);
        else
            throw RangeError("Invalid Vector!");
    }

    /**
     * Confirms whether a shift of the {@link selectedPadNum selected pad} by {@link vector} is valid.
     * @param vector - The vector to shift by.
     * @private
     */
    private canShiftSelectedPad(vector: [number, number]): boolean {
        const newSelectedPad = Launchpad.addVectorOnPad(this.selectedPadNum, vector);
        return Launchpad.onPad(newSelectedPad);
    }

    /**
     * Updates the currently selected colour, {@link selectedPaletteColour} or {@link selectedSysexColour} dependent on {@link useSysex},
     * to the given value - formatted as a 6-bit triplet.
     * Also updates the colour previewed in {@link colourPicker}.
     * @param colour - The new colour to use.
     * @private
     */
    private updateColour(colour: [number, number, number]): void;

    /**
     * Updates the currently selected colour, {@link selectedPaletteColour} or {@link selectedSysexColour} dependent on {@link useSysex},
     * to the given value - formatted as an index into {@link Launchpad.PALETTE}.
     * Also updates the colour previewed in {@link colourPicker}.
     * @param colour - The new colour to use.
     * @private
     */
    private updateColour(colour: number): void;

    /**
     * Updates the currently selected colour, {@link selectedPaletteColour} or {@link selectedSysexColour} dependent on {@link useSysex},
     * to the given value - formatted as a standard colour string.
     * Also updates the colour previewed in {@link colourPicker}.
     * @param colour - The new colour to use.
     * @private
     */
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

    /**
     * Sets {@link useSysex} to the given value,
     * and uses {@link updateColour} to update the selected colour to the best approximate in the new colour mode.
     * @param value - The new value for {@link useSysex}.
     * @private
     */
    private setUseSysex(value: boolean): void {
        this.useSysex = value;
        this.updateColour(this.colourPicker.value);
    }

    /**
     * Loads a project formatted as a JSON string.
     * @param json - JSON string holding project data
     */
    public loadJSON(json: string): void {
        let data = JSON.parse(json);
        if (data instanceof Array) {
            let pages: LightShowPage[] = [];

            // iterate over the pages
            for (const page of data) if (page instanceof Array) {
                let generatedPage: Tuple<LightShowAnimation, 8>[] = [];

                // iterate over the columns of the page
                for (const col of page) if (col instanceof Array) {
                    let generatedColumn: LightShowAnimation[] = [];

                    // iterate over the individual animations of the page
                    for (const anim of col) if (anim instanceof Array) {
                        let generatedFrames: LightShowFrame[] = [];

                        // iterate over the frames of the animation
                        for (const frame of anim) if (frame instanceof Array && typeof frame[0] === "number") {
                            generatedFrames.push(new LightShowFrame(...(frame as [number, ...LightShowAction[]])));
                        }
                        generatedColumn.push(new LightShowAnimation(...generatedFrames));
                    }
                    if (generatedColumn.length == 8) {
                        generatedPage.push(generatedColumn as Tuple<LightShowAnimation, 8>);
                    }
                }
                if (generatedPage.length == 8) {
                    pages.push(new LightShowPage(generatedPage as Tuple<Tuple<LightShowAnimation, 8>, 8>))
                }
            }
            if (pages.length === 8) {
                this.lightShowPages = pages as Tuple<LightShowPage, 8>;
                // if loading was successful, we update the displays
                this.updateLaunchpadDisplay();
                this.updateDisplayAnimationLayout();
                this.updateFramePickers();
            }
        }
    }

    /**
     * Sets the duration of the currently selected frame to the given value.
     * @param duration - new frame duration in ms.
     * @private
     */
    private setFrameDuration(duration: number): void {
        if (this.selectedFrame < this.selectedAnimation.frameCount) {
            this.selectedAnimation.setFrameDuration(this.selectedFrame, duration);
        }
    }
}
