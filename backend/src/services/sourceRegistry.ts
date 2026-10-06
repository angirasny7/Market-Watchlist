/**
 * Source Registry and Trust Tier Hierarchy
 *
 * Tiers:
 * - OFFICIAL_EXCHANGE: Regulatory and exchange disclosures (NSE, BSE, SEC, SEBI) - Trust Weight 1.0
 * - MAJOR_PUBLISHER: High-credibility established financial publications (Reuters, Bloomberg, Mint, ET, BS) - Trust Weight 0.85
 * - OTHER: Verified syndication, corporate PR newswires, and secondary financial aggregators - Trust Weight 0.60
 */

export type SourceTrustTier = 'OFFICIAL_EXCHANGE' | 'MAJOR_PUBLISHER' | 'OTHER';

export interface SourceDefinition {
  id: string;
  name: string;
  tier: SourceTrustTier;
  baseUrl: string;
  weight: number;
  description: string;
}

export const KNOWN_SOURCES: Record<string, SourceDefinition> = {
  NSE: {
    id: 'NSE',
    name: 'National Stock Exchange of India (NSE)',
    tier: 'OFFICIAL_EXCHANGE',
    baseUrl: 'https://www.nseindia.com',
    weight: 1.0,
    description: 'Official corporate filings and exchange announcements',
  },
  BSE: {
    id: 'BSE',
    name: 'Bombay Stock Exchange (BSE)',
    tier: 'OFFICIAL_EXCHANGE',
    baseUrl: 'https://www.bseindia.com',
    weight: 1.0,
    description: 'Official corporate filings and disclosure portal',
  },
  SEC_EDGAR: {
    id: 'SEC_EDGAR',
    name: 'US SEC EDGAR',
    tier: 'OFFICIAL_EXCHANGE',
    baseUrl: 'https://www.sec.gov',
    weight: 1.0,
    description: 'Official US regulatory filings (10-K, 10-Q, 8-K)',
  },
  REUTERS: {
    id: 'REUTERS',
    name: 'Reuters',
    tier: 'MAJOR_PUBLISHER',
    baseUrl: 'https://www.reuters.com',
    weight: 0.85,
    description: 'Global financial news and corporate reporting',
  },
  BLOOMBERG: {
    id: 'BLOOMBERG',
    name: 'Bloomberg',
    tier: 'MAJOR_PUBLISHER',
    baseUrl: 'https://www.bloomberg.com',
    weight: 0.85,
    description: 'Global market and financial coverage',
  },
  ECONOMIC_TIMES: {
    id: 'ECONOMIC_TIMES',
    name: 'The Economic Times',
    tier: 'MAJOR_PUBLISHER',
    baseUrl: 'https://economictimes.indiatimes.com',
    weight: 0.85,
    description: 'Premier Indian business daily',
  },
  MINT: {
    id: 'MINT',
    name: 'Mint',
    tier: 'MAJOR_PUBLISHER',
    baseUrl: 'https://www.livemint.com',
    weight: 0.85,
    description: 'Indian financial and markets daily',
  },
  BUSINESS_STANDARD: {
    id: 'BUSINESS_STANDARD',
    name: 'Business Standard',
    tier: 'MAJOR_PUBLISHER',
    baseUrl: 'https://www.business-standard.com',
    weight: 0.85,
    description: 'Indian business daily',
  },
  MONEYCONTROL: {
    id: 'MONEYCONTROL',
    name: 'Moneycontrol',
    tier: 'MAJOR_PUBLISHER',
    baseUrl: 'https://www.moneycontrol.com',
    weight: 0.85,
    description: 'Indian markets and company news portal',
  },
  CNBC_TV18: {
    id: 'CNBC_TV18',
    name: 'CNBC-TV18',
    tier: 'MAJOR_PUBLISHER',
    baseUrl: 'https://www.cnbctv18.com',
    weight: 0.85,
    description: 'Financial news broadcaster and digital portal',
  },
  FINANCIAL_EXPRESS: {
    id: 'FINANCIAL_EXPRESS',
    name: 'Financial Express',
    tier: 'MAJOR_PUBLISHER',
    baseUrl: 'https://www.financialexpress.com',
    weight: 0.85,
    description: 'Indian financial daily',
  },
  YAHOO_FINANCE: {
    id: 'YAHOO_FINANCE',
    name: 'Yahoo Finance',
    tier: 'MAJOR_PUBLISHER',
    baseUrl: 'https://finance.yahoo.com',
    weight: 0.80,
    description: 'Syndicated news and market quotes provider',
  },
  PR_NEWSWIRE: {
    id: 'PR_NEWSWIRE',
    name: 'PR Newswire',
    tier: 'OTHER',
    baseUrl: 'https://www.prnewswire.com',
    weight: 0.60,
    description: 'Direct corporate press release distributor',
  },
  BUSINESS_WIRE: {
    id: 'BUSINESS_WIRE',
    name: 'Business Wire',
    tier: 'OTHER',
    baseUrl: 'https://www.businesswire.com',
    weight: 0.60,
    description: 'Direct corporate press release distributor',
  },
};

export class SourceRegistry {
  /**
   * Resolves publisher and trust tier from publisher name or URL
   */
  public resolveSource(publisherName?: string | null, url?: string | null): {
    publisher: string;
    tier: SourceTrustTier;
    weight: number;
    baseUrl: string;
  } {
    const pub = (publisherName || '').trim();
    const cleanUrl = (url || '').trim().toLowerCase();

    // Check by known ID or name match
    for (const [, def] of Object.entries(KNOWN_SOURCES)) {
      if (
        pub.toLowerCase().includes(def.name.toLowerCase()) ||
        pub.toLowerCase().includes(def.id.toLowerCase()) ||
        cleanUrl.includes(def.baseUrl.replace('https://', '').replace('http://', '').toLowerCase())
      ) {
        return {
          publisher: def.name,
          tier: def.tier,
          weight: def.weight,
          baseUrl: def.baseUrl,
        };
      }
    }

    // Default heuristics based on domain keywords
    if (cleanUrl.includes('nseindia.com') || cleanUrl.includes('bseindia.com') || cleanUrl.includes('sec.gov')) {
      return {
        publisher: pub || 'Official Exchange',
        tier: 'OFFICIAL_EXCHANGE',
        weight: 1.0,
        baseUrl: url ? new URL(url).origin : 'https://www.nseindia.com',
      };
    }

    if (
      cleanUrl.includes('reuters.com') ||
      cleanUrl.includes('bloomberg.com') ||
      cleanUrl.includes('livemint.com') ||
      cleanUrl.includes('economictimes') ||
      cleanUrl.includes('business-standard') ||
      cleanUrl.includes('moneycontrol')
    ) {
      return {
        publisher: pub || 'Financial News',
        tier: 'MAJOR_PUBLISHER',
        weight: 0.85,
        baseUrl: url ? new URL(url).origin : '',
      };
    }

    return {
      publisher: pub || 'Market Wire',
      tier: 'OTHER',
      weight: 0.60,
      baseUrl: url ? (cleanUrl.startsWith('http') ? new URL(url).origin : '') : '',
    };
  }
}

export const sourceRegistry = new SourceRegistry();
