import { Application, Router } from "@oak/oak";
import Groq from "npm:groq-sdk";

const router = new Router();
const groq = new Groq({ apiKey: Deno.env.get("GROQ_API_KEY") });

router
  .options("/", (ctx) => {
    ctx.response.status = 200;
    ctx.response.statusText = "OK";
  })
  .post("/", async (ctx) => {
    try {
      const messages = await ctx.request.body.json();
      const data = await groq.chat.completions.create({
        temperature: 0.6,
        stream: false,
        n: 1,
        model: Deno.env.get("GROQ_MODEL"),
        messages,
      });

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
  ctx.response.headers.set("Access-Control-Allow-Methods", "OPTIONS,GET");
  ctx.response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type,Authorization"
  );
  return next();
});

app.use(router.routes());
app.use(router.allowedMethods());

app.listen({ port: 8000 });
