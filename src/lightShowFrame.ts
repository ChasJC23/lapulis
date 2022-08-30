
class LightShowFrame extends Array<LightShowAction> {
    public duration: number;
    constructor(duration: number, ...items: LightShowAction[]) {
        super(...items);
        this.duration = duration;
    }

    public toJSON() {
        return [this.duration, ...this];
    }
}
