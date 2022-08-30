// https://www.midi.org/specifications-old/item/table-1-summary-of-midi-message

enum MessageType {
    NOTE_OFF = 0b1000,
    NOTE_ON,
    KEY_PRESSURE,
    CONTROL_CHANGE,
    PROGRAM_CHANGE,
    CHANNEL_PRESSURE,
    PITCH_BEND_CHANGE,
    SYSTEM
}

enum SystemMessageType {
    SYSEX = 0b11110000,
    MIDI_TIME_CODE,
    SONG_POSITION_POINTER,
    SONG_SELECTOR,
    TUNE_REQUEST = 0b11110110,
    TERMINATOR,
    TIMING_CLOCK,
    START = 0b11111010,
    CONTINUE,
    STOP,
    ACTIVE_SENSING = 0b11111110,
    RESET
}

function getMessageType(message: Uint8Array): MessageType {
    let type = message[0] >> 4;
    if (type in Object.keys(MessageType)) {
        return type;
    }
    throw RangeError("illegal message type");
}

function getSystemMessageType(message: Uint8Array): SystemMessageType {
    let type = message[0];
    if (type in Object.keys(SystemMessageType)) {
        return type;
    }
    throw RangeError("illegal or not system message type");
}

function extractMidiMessageData(noteMessage: Uint8Array): { channel: number, note: number, velocity: number } {
    return { channel: noteMessage[0] & 0b00001111, note: noteMessage[1], velocity: noteMessage[2] };
}
