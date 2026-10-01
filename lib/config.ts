// Resolve server configuration aliases. Call only from server routes or tests.
export function resolveConfiguration(env:Record<string,string|undefined>){
 const apiKey=env.OPENAI_API_KEY?.trim() || env.Open_AI_Key?.trim() || "";
 const hostAccessCode=env.HOST_ACCESS_CODE?.trim() || env.Host_Access_Code?.trim() || "";
 const sessionSecret=env.HOST_SESSION_SECRET?.trim() || "";
 const missing=[
  ...(!apiKey?["OPENAI_API_KEY or Open_AI_Key"]:[]),
  ...(!hostAccessCode?["HOST_ACCESS_CODE or Host_Access_Code"]:[]),
  ...(!sessionSecret?["HOST_SESSION_SECRET"]:[])
 ];
 return {apiKey,hostAccessCode,sessionSecret,missing};
}
