export const STAGE_NAMES = [
    "One", "Two", "Three", "Four", "Five",
    "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen",
    "Sixteen", "Seventeen", "Eighteen", "Nineteen", "Twenty"
];

export const LEVEL_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function formatStage(n: number): string {
    if (n < 1 || n > 20) return n.toString();
    return STAGE_NAMES[n - 1] || n.toString();
}

export function formatLevel(n: number): string {
    if (n < 1 || n > 26) return n.toString();
    return LEVEL_LETTERS[n - 1] || n.toString();
}
