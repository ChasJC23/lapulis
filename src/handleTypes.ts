
type LaunchpadButtonHandle = (element: SVGElement, note: number) => void;
type PadButtonHandle = (element: SVGElement, note: number) => void;
type ControlButtonHandle = (element: SVGElement, note: ControlRowNote) => void;
type SelectorButtonHandle = (element: SVGElement, note: SelectorColNote) => void;
// https://stackoverflow.com/questions/56863875/typescript-how-do-you-filter-a-types-properties-to-those-of-a-certain-type
type KeysMatching<T extends Record<any, any>, V> = {
    [K in keyof T]-?: T[K] extends V ? K : never
}[keyof T];
type EventsContainer = Record<`on${KeysMatching<GlobalEventHandlersEventMap, MouseEvent>}`, LaunchpadButtonHandle>;