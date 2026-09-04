export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface Insight {
  id: string;                         // e.g. 'ins_tata_52w'
  relatedEventId: string;             // FK to Event (Event -> Insight): e.g. 'evt_tata_52w'
  stockSymbol: string;                // e.g. 'TATAMOTORS'
  title: string;                      // Causal headline
  explanation: string;                // "Why It Happened" / Possible Reason
  whyItMatters: string;               // "Why It Matters" / Market & Portfolio implication
  sourceName: string;                 // Trusted source: 'Economic Times', 'BSE Regulatory Filing', 'Reuters'
  sourceUrl: string;                  // Direct citation link
  confidenceScore: number;            // 0.00 to 1.00
  confidenceLevel: ConfidenceLevel;   // HIGH (>=0.80), MEDIUM (0.55-0.79), LOW (<0.55)
  publishedAt: string;                // Source article publication timestamp
  generatedAt: string;                // Engine synthesis timestamp
  keyMetrics?: Record<string, string>;// e.g. { "Sales Growth": "+15% YoY", "Subsidy Quota": "₹2,500 Cr" }
  inWatchlist?: boolean;
}
