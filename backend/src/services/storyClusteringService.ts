import { sourceRegistry, SourceTrustTier } from './sourceRegistry.js';

export interface StorySourceItem {
  publisher: string;
  publishedAt: string;
  url: string;
  title: string;
  tier: SourceTrustTier;
  snippet?: string;
}

export interface ClusteredStory {
  clusterKey: string;
  stockSymbol: string;
  headline: string;
  publishedAt: Date;
  receivedAt: Date;
  sources: StorySourceItem[];
  sourceCount: number;
  confirmedCount: number;
  primarySource: StorySourceItem;
  summary?: string;
  isRelevant: boolean;
}

export class StoryClusteringService {
  /**
   * Normalizes headline strings for token similarity matching
   */
  private normalizeTitle(title: string): string[] {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !['the', 'and', 'for', 'with', 'from', 'shares', 'stock', 'inc', 'ltd'].includes(w));
  }

  /**
   * Computes Jaccard word token similarity between two titles
   */
  public computeTitleSimilarity(t1: string, t2: string): number {
    const tokens1 = new Set(this.normalizeTitle(t1));
    const tokens2 = new Set(this.normalizeTitle(t2));
    if (tokens1.size === 0 || tokens2.size === 0) return 0;

    const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);
    return intersection.size / union.size;
  }

  /**
   * Checks if a story is primarily relevant to the stock (not just a 50-stock listicle)
   */
  public isStockSubjectRelevant(title: string, summary: string, symbol: string, companyName: string): boolean {
    const text = `${title} ${summary}`.toLowerCase();
    const sym = symbol.toLowerCase();
    const compParts = companyName
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2 && !['ltd', 'limited', 'inc', 'corp', 'corporation'].includes(w));

    // Must match symbol or key company word in the title or summary
    const matchesSymbol = text.includes(sym);
    const matchesCompany = compParts.some((part) => text.includes(part));

    return matchesSymbol || matchesCompany;
  }

  /**
   * Clusters a list of raw news/filing items for a stock into unified story cards
   */
  public clusterStories(
    stockSymbol: string,
    companyName: string,
    items: Array<{
      title: string;
      summary?: string;
      publishedAt: Date;
      url: string;
      sourceName?: string;
      receivedAt?: Date;
    }>
  ): ClusteredStory[] {
    const clusters: ClusteredStory[] = [];

    for (const item of items) {
      const isRelevant = this.isStockSubjectRelevant(item.title, item.summary || '', stockSymbol, companyName);
      if (!isRelevant) continue;

      const sourceInfo = sourceRegistry.resolveSource(item.sourceName, item.url);
      const sourceItem: StorySourceItem = {
        publisher: sourceInfo.publisher,
        publishedAt: item.publishedAt.toISOString(),
        url: item.url,
        title: item.title,
        tier: sourceInfo.tier,
        snippet: item.summary ? item.summary.slice(0, 180) : undefined,
      };

      // Check if matches an existing cluster
      let matchedCluster: ClusteredStory | null = null;
      for (const existing of clusters) {
        // Must be within 12 hours of each other
        const timeDiff = Math.abs(existing.publishedAt.getTime() - item.publishedAt.getTime());
        if (timeDiff <= 12 * 60 * 60 * 1000) {
          const sim = this.computeTitleSimilarity(existing.headline, item.title);
          if (sim >= 0.45) {
            matchedCluster = existing;
            break;
          }
        }
      }

      if (matchedCluster) {
        // Prevent duplicate URLs within the same cluster
        const exists = matchedCluster.sources.some((s) => s.url === item.url || s.publisher === sourceItem.publisher);
        if (!exists) {
          matchedCluster.sources.push(sourceItem);
          matchedCluster.sourceCount = matchedCluster.sources.length;
          // Count independent publishers
          const distinctPublishers = new Set(matchedCluster.sources.map((s) => s.publisher));
          matchedCluster.confirmedCount = distinctPublishers.size;

          // If new source is higher tier, promote headline/primarySource
          if (sourceInfo.tier === 'OFFICIAL_EXCHANGE' && matchedCluster.primarySource.tier !== 'OFFICIAL_EXCHANGE') {
            matchedCluster.primarySource = sourceItem;
            matchedCluster.headline = item.title;
          }
        }
      } else {
        clusters.push({
          clusterKey: `${stockSymbol}_${item.publishedAt.toISOString().split('T')[0]}_${item.title.slice(0, 20)}`,
          stockSymbol,
          headline: item.title,
          publishedAt: item.publishedAt,
          receivedAt: item.receivedAt || new Date(),
          sources: [sourceItem],
          sourceCount: 1,
          confirmedCount: 1,
          primarySource: sourceItem,
          summary: item.summary,
          isRelevant: true,
        });
      }
    }

    return clusters;
  }
}

export const storyClusteringService = new StoryClusteringService();
