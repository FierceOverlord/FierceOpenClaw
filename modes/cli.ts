import chalk from "chalk";
import { select, isCancel } from "@clack/prompts";
import { runAgentMode } from "./agent/orchestrator";
import { runAskMode } from "./ask/orchestrator";


export async function runCliMode(){
    while(true){
        const mode = await select({
            message: "Choose cli submode.",
            options: [
                {value:"agent", label: "Agent Mode"},
                {value: "plan", label: "Plan Mode"},
                {value: "ask", label: "Ask Mode"},
                {value:"back", label: "Back to Main Menu"},
            ]
        })

        if(isCancel(mode) || mode === "back") return;

        if(mode === "agent"){
            await runAgentMode();
        }
        if(mode === "ask"){
            await runAskMode();
        }
        if(mode === "plan"){
            console.log("plan");
        }

        if(mode != "agent" && mode != "ask" && mode != "plan"){
            console.log(chalk.yellow('\n This mode is not implemented yet. \n'))
        }
    }
}