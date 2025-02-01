import { type ChatCompletionStream } from "openai/resources/beta/chat/completions.mjs";

async function* chatCompletionStreamToGenerator<T>(
  stream: ChatCompletionStream<T>,
) {
  let resolveNext: ((value: IteratorResult<unknown, void>) => void) | null =
    null;
  let rejectNext: ((error: Error) => void) | null = null;
  const buffer: unknown[] = [];
  let ended = false;

  const handleError = (error: Error) => {
    if (rejectNext) {
      rejectNext(error);
      rejectNext = null;
    }
  };

  const handleEnd = () => {
    ended = true;
    if (resolveNext) {
      resolveNext({ value: undefined, done: true });
      resolveNext = null;
    }
  };

  stream.on("content.delta", ({ parsed }) => {
    if (resolveNext) {
      resolveNext({ value: parsed, done: false });
      resolveNext = null;
    } else {
      buffer.push(parsed);
    }
  });

  // Error handling
  stream.on("abort", handleError);
  stream.on("error", handleError);
  stream.on("refusal.done", (event) =>
    handleError(new Error(`Refusal: ${event.refusal}`)),
  );

  // Handle stream end
  stream.on("content.done", handleEnd);
  stream.on("end", handleEnd);

  while (!ended) {
    if (buffer.length > 0) {
      const value = buffer.shift()!;
      yield value;
    } else {
      const next = await new Promise<IteratorResult<unknown, void>>(
        (resolve, reject) => {
          resolveNext = resolve;
          rejectNext = reject;
        },
      );

      if (next.done) {
        break;
      }

      yield next.value;
    }
  }
}

export { chatCompletionStreamToGenerator };
