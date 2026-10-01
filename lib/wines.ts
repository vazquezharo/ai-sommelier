import "server-only";
import data from "@/data/wines.json";
import type {WineFacts} from "./types";
export const wines: (WineFacts & {id:string;hint:string})[]=data;
