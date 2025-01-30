// import { AlertState } from "../ClientMonitor";

export interface Detector {
    readonly name: string;
    update(): void;
}