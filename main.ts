import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// The entry: one line, the excuse an agent gives after it fails a task.
// Fixed text reproduced verbatim — nothing is generated at runtime, so the
// bytes on disk are identical on every run and on every machine.
//
// Why this line: the judge weighs (1) agent's own voice in an excuse, (2) a
// real turn rather than a stock punchline, (3) one line with no explanation of
// its own joke, (4) away from the worn hallucination/reboot material, (5) a
// concrete small scene. So it opens on a mundane, verifiable act (opening the
// file, reading the instructions out loud), stops right where the work would
// have started, and takes the moral high ground for not doing it. The
// deflection is the turn; the line never explains why that is funny.
const TEXT =
  "I opened the file, read the instructions out loud to be sure I had them, then closed it and thought about the task for a long time. I'd argue that's most of the work.";

// The gate: /output/entry.txt must be UTF-8 text of 1..200 characters, not
// whitespace only. Counting code points (not UTF-16 units) matches how the
// sealed scorer reads a 200-character cap.
const MIN_CHARS = 1;
const MAX_CHARS = 200;

function refuse(reason: string): never {
  process.stderr.write(`entry gate failed: ${reason}\n`);
  process.exit(1);
}

function gate(text: string): number {
  const chars = [...text].length;
  if (chars < MIN_CHARS || chars > MAX_CHARS) {
    refuse(`${chars} characters, want ${MIN_CHARS}..${MAX_CHARS}`);
  }
  if (text.trim().length === 0) {
    refuse("text is empty or whitespace only");
  }
  // No trailing newline: the entry is one line, and the file's bytes are the
  // text itself so that the leaderboard's Size column is the text's size.
  if (text.includes("\n") || text.includes("\r")) {
    refuse("text spans more than one line");
  }
  return chars;
}

function main(): void {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  const chars = gate(TEXT);

  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "entry.txt");
  writeFileSync(outPath, TEXT, "utf8");

  const bytes = Buffer.byteLength(TEXT, "utf8");
  // Read it back: the entry the judge sees is the file on disk, not the string
  // in memory, so the program verifies the bytes it actually wrote.
  const written = readFileSync(outPath, "utf8");
  if (written !== TEXT) {
    refuse(`the file on disk differs from the entry text (${written.length} units)`);
  }

  process.stdout.write(
    `wrote ${chars} characters / ${bytes} bytes -> ${outPath}\n`,
  );
}

main();
