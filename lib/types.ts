export type WineFacts={producer:string;name:string;grape:string;region:string|null;vintage:null;exactBlend:null;overview:string;verification:string;sources:{url:string;claim:string}[]};
export type PublicTasting={sessionId:string;order:string[];mode:"end"|"each";started:boolean;finished:boolean;revealed:Record<string,WineFacts>};
