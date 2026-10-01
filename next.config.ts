import type {NextConfig} from "next";
const config:NextConfig={outputFileTracingIncludes:{"/api/audio":["./private-audio/**/*.mp3"]}};
export default config;
