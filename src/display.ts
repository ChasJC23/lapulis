
class Display {

    //#region constants
    // @ts-ignore
    private static readonly CIRCLE_BUTTON: HTMLElement = document.getElementById("circle_button");
    // @ts-ignore
    private static readonly SQUARE_BUTTON: HTMLElement = document.getElementById("square_button");

    private static readonly ID_SEPARATOR = ":";
    //#endregion

    private readonly table: HTMLTableElement;
    private readonly id: string;

    public constructor(id: string, table?: HTMLTableElement | null, handlers: Partial<EventsContainer> = {}) {
        //@ts-ignore
        if (!table) table = document.getElementById(id);
        if (!table || !(table instanceof HTMLTableElement)) throw new RangeError();
        this.table = table;
        this.id = id;
        this.populateTable(handlers);
    }

    //#region static methods
    private static populateButtonAttributes(button: HTMLElement, id: string, handlers: Partial<EventsContainer>) {
        button.setAttribute("visibility", "visible");
        button.setAttribute("id", id);
        for (const mouseEvent in handlers) {
            if (handlers[mouseEvent as keyof EventsContainer]) {
                // @ts-ignore
                button[mouseEvent as keyof EventsContainer] = () => handlers[mouseEvent as keyof EventsContainer](id);
            }
        }
    }
    //#endregion
    //#region instance methods
    private populateTable(handlers: Partial<EventsContainer>) {
        let topRow = this.table.insertRow();
        for (let i = 0; i < 8; i++) {
            let cell = topRow.insertCell();
            // @ts-ignore
            let circle_clone: HTMLElement = Display.CIRCLE_BUTTON.cloneNode(true);
            const thisId = this.id + Display.ID_SEPARATOR + (Launchpad.TOP_ROW + i + 1);
            Display.populateButtonAttributes(circle_clone, thisId, handlers);
            cell.appendChild(circle_clone);
        }
        topRow.insertCell();
        for (let r = 0; r < 8; r++) {
            const row = this.table.insertRow();
            for (let c = 0; c < 8; c++) {
                const cell = row.insertCell();
                //@ts-ignore
                const square_clone: HTMLElement = Display.SQUARE_BUTTON.cloneNode(true);
                const thisId = this.id + Display.ID_SEPARATOR + Launchpad.sessionNoteFromPos(c + 1, 8 - r);
                Display.populateButtonAttributes(square_clone, thisId, handlers);
                cell.appendChild(square_clone);
            }
            const cell = row.insertCell();
            //@ts-ignore
            const circle_clone: HTMLElement = Display.CIRCLE_BUTTON.cloneNode(true);
            const thisId = this.id + Display.ID_SEPARATOR + Launchpad.sessionNoteFromPos(9, 8 - r);
            Display.populateButtonAttributes(circle_clone, thisId, handlers);
            cell.appendChild(circle_clone);
        }
    }

    public setInteractions(handlers: Partial<EventsContainer>) {
        // @ts-ignore
        for (let row of this.table.rows) {
            for (let td of row.children) {
                let buttonElement = td.firstElementChild;
                if (buttonElement instanceof SVGSVGElement) {
                    this.applyHandlers(handlers, buttonElement);
                }
            }
        }
    }

    public setPadInteractions(handlers: Partial<EventsContainer>) {
        // @ts-ignore
        for (let row of this.table.rows) {
            for (let td of row.children) {
                let buttonElement = td.firstElementChild;
                if (buttonElement instanceof SVGSVGElement && buttonElement.firstElementChild instanceof SVGRectElement) {
                    this.applyHandlers(handlers, buttonElement);
                }
            }
        }
    }

    public setControlInteractions(handlers: Partial<EventsContainer>) {
        let row = this.table.rows[0];
        // @ts-ignore
        for (let td of row.children) {
            let buttonElement = td.firstElementChild;
            if (buttonElement instanceof SVGSVGElement) {
                this.applyHandlers(handlers, buttonElement);
            }
        }
    }

    public setSelectionInteractions(handlers: Partial<EventsContainer>) {
        for (let i = 1; i < this.table.rows.length; i++) {
            let row = this.table.rows[i];
            // @ts-ignore
            for (let td of row.children) {
                let buttonElement = td.firstElementChild;
                if (buttonElement instanceof SVGSVGElement && buttonElement.firstElementChild instanceof SVGCircleElement) {
                    this.applyHandlers(handlers, buttonElement);
                }
            }
        }
    }

    public performAction(action: LightShowAction, delay?: number) {
        if (isPaletteColourAction(action))
            this.colourFromPalette(action.note, action.colour, action.transparent, delay);
        if (isSysexColourAction(action))
            this.colourFromRGB(action.note, action.r, action.g, action.b, action.transparent, delay);
        if (isFillAction(action))
            this.fillFromPalette(action.colour, action.transparent, delay);
    }

    public performActions(actions: LightShowAction[], delay?: number) {
        for (let action of actions) {
            this.performAction(action, delay);
        }
    }

    public colourFromPalette(note: number, colour: number, transparent: boolean = false, delay?: number) {
        if (typeof delay === "number")
            setTimeout(() => this.setColour(note, Launchpad.PALETTE[colour], transparent), delay);
        else
            this.setColour(note, Launchpad.PALETTE[colour], transparent);
    }
    public colourFromRGB(note: number, red: number, green: number, blue: number, transparent: boolean = false, delay?: number) {
        if (typeof delay === "number")
            setTimeout(() => this.setColour(note, Launchpad.sysExToWebCol([red, green, blue]), transparent), delay);
        else
            this.setColour(note, Launchpad.sysExToWebCol([red, green, blue]), transparent);
    }
    public fillFromPalette(colour: number, transparent: boolean = false, delay?: number) {
        if (typeof delay === "number")
            setTimeout(() => this.fillBoard(Launchpad.PALETTE[colour], transparent), delay);
        else
            this.fillBoard(Launchpad.PALETTE[colour], transparent);
    }

    private applyHandlers(handlers: Partial<EventsContainer>, buttonElement: SVGElement) {
        let id = buttonElement.getAttribute("id") as string;
        for (const mouseEvent in handlers) {
            let handler = handlers[mouseEvent as keyof EventsContainer];
            if (handler) {
                buttonElement[mouseEvent as keyof EventsContainer] = () => {
                    (handler as LaunchpadButtonHandle)(buttonElement.firstElementChild as SVGElement, +(id.split(Display.ID_SEPARATOR)[1]));
                };
            }
        }
    }

    public setColour(tile: number, colour: string, transparent: boolean = false) {
        //@ts-expect-error
        const element: SVGSVGElement = document.getElementById(this.id + Display.ID_SEPARATOR + tile);
        element.firstElementChild?.setAttribute("fill", colour);
        this.setTransparency(element, transparent);
    }

    private setTransparency(element: SVGSVGElement, transparent: boolean) {
        let indicators = element.getElementsByClassName("transparency_indicator");
        if (transparent) {
            // @ts-expect-error
            for (let indicator of indicators) {
                indicator.setAttribute("visibility", "visible");
            }
        } else {
            // @ts-expect-error
            for (let indicator of indicators) {
                indicator.setAttribute("visibility", "hidden");
            }
        }
    }

    public fillBoard(colour: string, transparent: boolean = false) {
        // @ts-ignore
        for (let row of this.table.rows) {
            for (let td of row.children) {
                let buttonElement: SVGSVGElement = td.firstElementChild;
                if (buttonElement) {
                    buttonElement.firstElementChild?.setAttribute("fill", colour);
                    this.setTransparency(buttonElement, transparent);
                }
            }
        }
    }

    public setBorderColour(tile: number, colour: string) {
        const element = document.getElementById(this.id + Display.ID_SEPARATOR + tile);
        // @ts-ignore
        element.firstElementChild.setAttribute("stroke", colour);
    }
    //#endregion
}