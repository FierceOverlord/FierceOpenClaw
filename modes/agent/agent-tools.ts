import { tool } from "ai";
import {z} from "zod";
import type { ToolExecutor } from "./tool-executor";


export function createAgentTools(executor:ToolExecutor){
    return{
        read_file:tool({
            description: "Read a text from the workspace use the path related to the prokect root.",
            inputSchema: z.object({
                path:z.string().describe("Relative file path."),
            }),
            execute:async({path: p}) => executor.readFile(p),
        }),
    }
}