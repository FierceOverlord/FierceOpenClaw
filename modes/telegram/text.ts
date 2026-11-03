export const clip = (text: string, max = 4000) =>
  text.length <= max ? text : text.slice(0, max) + '\n…[truncated]';

export async function replyMd(
  ctx: { reply: (t: string, o?: object) => Promise<unknown> },
  text: string,
) {
  const body = clip(text);
  try {
    await ctx.reply(body, { parse_mode: 'Markdown' });
  } catch {
    // Model output often has unbalanced * or _ that Telegram rejects.
    await ctx.reply(body);
  }
}

export async function reportError(
  ctx: { reply: (t: string) => Promise<unknown> },
  err: unknown,
) {
  console.error(err);
  await ctx.reply('⚠️ Something went wrong while running that. Check the server logs.').catch(() => {});
}

/** Text after `/name …` */
export function commandArg(fullText: string, name: string): string {
  return fullText.replace(new RegExp(`^/${name}\\s*`, 'i'), '').trim();
}