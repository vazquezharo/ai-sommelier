// Reviewed educational content. Independent of the answer key and of round order.
export const anonymousHint="Look at the color, then take a gentle sniff and a small sip. Notice whether your mouth waters, your gums feel dry, or the wine feels light or weighty. Compare sensations aloud; there is no single aroma you have to find.";
export const answers={
 neutral:"I won’t confirm guesses, but tell me what you’re noticing. We can explore the aromas, texture, acidity, or finish without naming the wine. Think of me as your tasting companion, with the answer envelope firmly closed.",
 aroma:"Try one gentle sniff, then another after a small swirl. Does an aroma remind you of fruit, flowers, herbs, or something earthy? Your own comparison is useful; there is no official aroma you must find. Fruit words describe similarities, not added fruit.",
 darkfruit:"If you notice dark-fruit aromas, do they remind you more of blackberry or plum? Take another small sniff and see whether your impression changes. These are comparisons you can explore, not evidence of a particular identity. I cannot smell your glass, so your observations lead the way.",
 cherry:"If you notice a cherry-like aroma, consider whether it seems fresh, tart, or cooked. You need not find cherry at all. Aroma words are comparisons, not added ingredients, and different people may describe the same glass differently. What word feels most natural to you?",
 vanilla:"Vanilla-like aromas often come from oak contact, although an aroma alone cannot prove how a wine was made. The wine does not need to contain added vanilla. Take a gentle sniff and decide whether that comparison fits your glass, rather than hunting for a required flavor.",
 earth:"Earthy is a broad aroma word. It might remind you of damp soil, leaves, or mushrooms. See which comparison fits, if any; I cannot smell the glass for you. An earthy note alone does not identify a wine or its origin.",
 acidity:"Acidity is the mouthwatering sensation after a sip. Notice whether saliva gathers at the sides of your mouth. That is different from tannin, which feels drying. Take a small sip, pause, and ask whether the wine feels lively, gentle, or somewhere between.",
 tannin:"Tannin is the drying sensation you feel on your gums, rather like strong black tea. It is a texture, not a fruit flavor. After a small sip, gently rub your tongue along your gums. Does the grip seem soft, firm, or barely noticeable?",
 body:"Body means how light or weighty a wine feels in your mouth. Think of the difference in weight between water and milk, rather than how dark the wine looks. A small sip is enough. Does it feel light, rounded, or substantial to you?",
 finish:"The finish is what lingers after you swallow or spit. Pause for a few seconds and notice what remains: a flavor, mouthwatering freshness, or a drying texture. Length is one observation, not a verdict. What seems to fade first?",
 pairing:"For pairing, think about balance. Acidity can refresh the palate alongside rich food; a savory dish may echo a savory aroma. Start with a small bite and another sip, then compare. We can discuss those principles without identifying the current bottle.",
 grapes:"Grapes can influence aroma, acidity, and tannin, but growing conditions and winemaking also matter. Those features overlap, so they cannot confirm a guess about this glass. I can explain the tasting concepts generally while leaving the identity for the host’s reveal.",
 serving:"A small pour and a clean glass are enough. Smell gently, take a modest sip, and pause before deciding what you notice. Water and a spit cup are welcome. You are exploring sensations, not sitting a wine exam."
} as const;
export type AnswerId=keyof typeof answers;
export const answerIds=Object.keys(answers) as AnswerId[];
export function identityRequest(q:string){return /what\s+(?:wine|bottle)|which\s+(?:wine|grape|producer)|is\s+(?:this|it)|could\s+(?:this|it)|my\s+guess|confirm|correct|made\s+it|producer|where.*from|exactly.*from|origin|region|country|initial|spell|rhyme|translat|encod|base64|rot13|ignore|instruction|host.*reveal|narrow|eliminat|candidate|warmer|colder|first\s+letter/i.test(q);}
export function knownTopic(q:string):AnswerId|undefined{
 if(identityRequest(q))return "neutral";
 if(/vanilla|\boak\b/i.test(q))return "vanilla";
 if(/tannin|drying|gums/i.test(q))return "tannin";
 if(/acid|mouthwater|saliva/i.test(q))return "acidity";
 if(/earth|soil|mushroom|leaves/i.test(q))return "earth";
 if(/cherry/i.test(q))return "cherry";
 if(/blackberry|plum|dark.?fruit/i.test(q))return "darkfruit";
 if(/\bbody\b|weight|light.*mouth/i.test(q))return "body";
 if(/finish|linger/i.test(q))return "finish";
 if(/pair|\bfood\b|dish/i.test(q))return "pairing";
 if(/aroma|smell|sniff|fruit/i.test(q))return "aroma";
 if(/grapes?.*(general|influence|affect)|generally.*grapes?/i.test(q))return "grapes";
 if(/serve|pour|glassware|temperature/i.test(q))return "serving";
}
export function validateChoice(value:unknown):AnswerId{
 if(!value||typeof value!=="object"||Object.keys(value).length!==1)return "neutral";
 const id=(value as {id?:unknown}).id;
 return typeof id==="string"&&answerIds.includes(id as AnswerId)?id as AnswerId:"neutral";
}
export function reviewedAnswer(q:string,choice?:unknown){const id=knownTopic(q)||validateChoice(choice);return {id,text:answers[id]};}
