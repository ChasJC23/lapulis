
class LightShowPage {

    private readonly animations: Tuple<Tuple<LightShowAnimation, 8>, 8>;

    constructor(animations?: Tuple<Tuple<LightShowAnimation, 8>, 8>) {
        this.animations = animations ?? constructTuple(8, () => constructTuple(8, () => new LightShowAnimation()));
    }

    public animationExistsAt(note: number): boolean;
    public animationExistsAt(x: number, y: number): boolean;
    public animationExistsAt(x: number, y?: number): boolean {
        if (typeof y === "undefined") {
            [x, y] = Launchpad.posFromSessionNote(x);
        }
        return this.animations[x - 1][y - 1].animationExists();
    }

    public existingAnimationLayout(): Tuple<Tuple<boolean, 8>, 8> {
        return constructTuple(8, (x: number) => constructTuple(8, (y: number) => this.animationExistsAt(x + 1, y + 1)));
    }

    public getAnimation(note: number): LightShowAnimation;
    public getAnimation(x: number, y: number): LightShowAnimation;
    public getAnimation(x: number, y?: number): LightShowAnimation {
        if (typeof y === "undefined") {
            [x, y] = Launchpad.posFromSessionNote(x);
        }
        return this.animations[x - 1][y - 1];
    }

    public setAnimation(animation: LightShowAnimation, note: number): void;
    public setAnimation(animation: LightShowAnimation, x: number, y: number): void;
    public setAnimation(animation: LightShowAnimation, x: number, y?: number): void {
        if (typeof y === "undefined") {
            [x, y] = Launchpad.posFromSessionNote(x);
        }
        this.animations[x - 1][y - 1] = animation;
    }

    public toJSON() {
        return this.animations;
    }
}
