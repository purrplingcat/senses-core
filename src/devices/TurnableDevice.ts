import Device from "./Device";

export default abstract class TurnableDevice<TState> extends Device<TState> {
    public abstract turnOn(): Promise<boolean> | boolean;
    public abstract turnOff(): Promise<boolean> | boolean;
}
