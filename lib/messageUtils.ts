export type MessageVariables = {
    dq: number;          // Overall Deviance Quotient (0.00 - 1.00)
    aq: number;          // Overall Awareness Quotient (Score)
    pointTotal: number;  // Overall Point Total
    lastDq: number;      // DQ of the most recent poll
    lastScore: number;   // Score of the most recent poll
};

/**
 * Replaces variables in a string with values from the metrics object.
 * Supported variables:
 * [[DQ]] - Overall Deviance Quotient
 * [[AQ]] - Overall Awareness Quotient
 * [[PointTotal]] - Overall Points
 * [[LastDQ]] - Last Poll DQ
 * [[LastScore]] - Last Poll Score
 */
export function replaceMessageVariables(text: string, metrics: MessageVariables): string {
    if (!text) return "";

    return text
        .replace(/\[\[DQ\]\]/gi, metrics.dq.toFixed(2))
        .replace(/\[\[AQ\]\]/gi, metrics.aq.toString())
        .replace(/\[\[PointTotal\]\]/gi, metrics.pointTotal.toString())
        .replace(/\[\[LastDQ\]\]/gi, metrics.lastDq.toFixed(2))
        .replace(/\[\[LastScore\]\]/gi, metrics.lastScore.toString());
}
