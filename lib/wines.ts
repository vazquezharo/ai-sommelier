import data from "@/data/wines.json";
export type Wine = { id: string; producer: string; name: string; grape: string; vintage: null; exactBlend: null; region: string | null; verification: string; sources: {url:string; claim:string}[]; overview:string; hint:string };
export const wines: Wine[] = data;
export const anonymousHint = "Look at the color, then take a gentle sniff and a small sip. Notice whether your mouth waters, your gums feel dry, or the wine feels light or weighty. Compare sensations aloud; there is no single aroma you have to find.";
