
function parseColour(colour: string): [number, number, number];
function parseColour(colour: [number, number, number]): [number, number, number];
function parseColour(colour: string | [number, number, number]): [number, number, number] {
    if (colour instanceof Array) return colour;
    let m, r, g, b;

    m = colour.match(/^#([0-9a-f]{3})$/i);
    if (m) {
        m = m[1];
        r = parseInt(m.charAt(0), 16) * 0x11;
        g = parseInt(m.charAt(1), 16) * 0x11;
        b = parseInt(m.charAt(2), 16) * 0x11;
    }
    m = colour.match(/^#([0-9a-f]{6})$/i);
    if (m) {
        m = m[1];
        r = parseInt(m.substring(0, 2), 16);
        g = parseInt(m.substring(2, 4), 16);
        b = parseInt(m.substring(4, 6), 16);
    }
    m = colour.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
    if (m) {
        [r, g, b] = [+m[1], +m[2], +m[3]];
    }
    return [r ?? 0, g ?? 0, b ?? 0];
}
