import { llm } from "../../../lib/llm";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("messages" in body) ||
    !Array.isArray(body.messages)
  ) {
    return Response.json(
      { error: "Please provide a messages array." },
      { status: 400 }
    );
  }

  const contents = body.messages.map(
    (message: { role: string; text: string }) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [
        {
          text: message.text,
        },
      ],
    }),
  );

  const response = await llm.models.generateContent({
    model: process.env.LLM_MODEL!,
    contents,
  });

  return Response.json({
    answer: response.text,
  });
}