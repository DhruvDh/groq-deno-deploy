import { Application, Router } from "@oak/oak";
import Groq from "npm:groq-sdk";

const router = new Router();
const groq = new Groq({ apiKey: Deno.env.get("GROQ_API_KEY") });

async function callClaudeAPI(messages) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY"),
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 2048,
      messages: messages,
    }),
  });

  if (!response.ok) {
    console.log(JSON.stringify(response));
    console.log(
      JSON.stringify({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 2048,
        messages: messages,
      })
    );

    throw new Error(
      `Claude API request failed with status ${response.status}.`
    );
  }

  return await response.json();
}

router
  .options("/", (ctx) => {
    ctx.response.status = 200;
    ctx.response.statusText = "OK";
  })
  .post("/", async (ctx) => {
    try {
      const messages = await ctx.request.body.json();
      let data;

      try {
        // First, try to use Claude API
        data = await callClaudeAPI(messages);
      } catch (claudeError) {
        console.error("Claude API Error:", claudeError);

        // If Claude fails, fall back to Groq (Llama 3)
        data = await groq.chat.completions.create({
          temperature: 0.6,
          stream: false,
          n: 1,
          model: Deno.env.get("GROQ_MODEL"),
          messages,
        });
      }

      ctx.response.type = "application/json";
      ctx.response.body = data;
    } catch (error) {
      console.error("Error:", error);
      ctx.response.status = error.status || 500;
      ctx.response.body = {
        error:
          error.message || "An error occurred while processing your request.",
      };
    }
  });

const app = new Application();

app.use((ctx, next) => {
  // TODO: Add domain to the Access-Control-Allow-Origin header once you deploy
  ctx.response.headers.set("Access-Control-Allow-Origin", "*");
  ctx.response.headers.set("Access-Control-Allow-Methods", "OPTIONS,GET,POST");
  ctx.response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type,Authorization"
  );
  return next();
});

app.use(router.routes());
app.use(router.allowedMethods());

app.listen({ port: 8000 });
