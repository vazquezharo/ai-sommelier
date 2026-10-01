export type BottleLabel={producer:string|null;name:string|null;grape:string|null;region:string|null;vintage:string|null};
export type BottleState={id:string;label:BottleLabel;confidence:"high"|"medium"|"low";note:string;revealed:boolean;overview:string|null;facts:{claim:string;url:string}[];sources:string[];researchNote:string;expires:number};
