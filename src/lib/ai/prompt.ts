import type { AiRequest } from "@/lib/validation/schemas";

export function buildCardPrompt({ topic, count, level }: AiRequest): string {
    return [
        `You are a German (Deutsch) vocabulary teacher building flashcards for a CEFR ${level} learner.`,
        `Create exactly ${count} flashcards about: "${topic}".`,
        "",
        "Rules:",
        "- Use only German words or short phrases appropriate for the requested CEFR level.",
        "- For nouns include the definite article in `front` (der/die/das) and the plural in `plural`.",
        "- `meaningId` must be an Indonesian translation; `meaningEn` an English translation.",
        "- Add one short natural example sentence in German with Indonesian and English translations.",
        "- Keep example sentences under 90 characters.",
        "- `wordType` must be one of: noun, verb, adjective, adverb, phrase, number, other.",
        "- `gender` must be der, die, das or null (gender only applies to nouns).",
        "- `tags` should be 1-3 lowercase topic tags.",
        "- Never repeat the same front twice.",
        "",
        "Return ONLY a JSON object with this shape (no markdown, no comments):",
        '{"cards":[{"front":"der Apfel","meaningId":"apel","meaningEn":"apple","gender":"der","wordType":"noun","plural":"die Äpfel","exampleDe":"Ich esse einen Apfel.","exampleId":"Saya makan sebuah apel.","exampleEn":"I am eating an apple.","tags":["makanan"]}]}',
    ].join("\n");
}
