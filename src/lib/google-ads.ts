/**
 * Google Ads API v18 Client
 *
 * Handles authentication, token lifecycle, and API calls to Google Ads.
 * Uses GADS_CLIENT_ID, GADS_CLIENT_SECRET, GADS_CUSTOMER_ID, GADS_DEVELOPER_TOKEN env vars.
 */

const GOOGLE_ADS_API_BASE = "https://googleads.googleapis.com/v18";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

// --- Supabase helper (server-side only) ---

async function supaFetch(path: string, options: RequestInit = {}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {}),
    },
    cache: "no-store",
  });
  return res;
}

// --- Token helpers ---

interface StoredTokens {
  id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  customer_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Strip hyphens from customer ID for API calls.
 * e.g. "305-372-2274" → "3053722274"
 */
function stripCustomerId(customerId: string): string {
  return customerId.replace(/-/g, "");
}

/**
 * Fetch stored tokens from Supabase.
 */
async function getStoredTokens(): Promise<StoredTokens | null> {
  const res = await supaFetch("google_ads_tokens?select=*&limit=1");
  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[0] as StoredTokens;
}

/**
 * Refresh an expired access token using the stored refresh token.
 */
async function refreshAccessToken(
  stored: StoredTokens
): Promise<string> {
  const clientId = process.env.GADS_CLIENT_ID;
  const clientSecret = process.env.GADS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "GADS_CLIENT_ID and GADS_CLIENT_SECRET must be set to refresh tokens"
    );
  }

  const refreshResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: stored.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!refreshResponse.ok) {
    const errBody = await refreshResponse.text();
    throw new Error(`Token refresh failed: ${errBody}`);
  }

  const newTokens = await refreshResponse.json();
  const newExpiresAt = new Date(
    Date.now() + (newTokens.expires_in || 3600) * 1000
  ).toISOString();

  // Update in Supabase
  await supaFetch(`google_ads_tokens?id=eq.${stored.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      access_token: newTokens.access_token,
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    }),
  });

  return newTokens.access_token;
}

/**
 * Get a valid access token, refreshing if needed.
 */
async function getValidAccessToken(): Promise<{
  accessToken: string;
  customerId: string;
}> {
  const stored = await getStoredTokens();
  if (!stored) {
    throw new Error(
      "No Google Ads tokens found. Please connect via /api/google-ads/auth"
    );
  }

  const customerId =
    stored.customer_id || process.env.GADS_CUSTOMER_ID || null;
  if (!customerId) {
    throw new Error(
      "No Google Ads customer ID found. Set GADS_CUSTOMER_ID env var or connect an account."
    );
  }

  // Check if token is still valid (5-minute buffer)
  const expiresAt = new Date(stored.expires_at).getTime();
  const now = Date.now();

  let accessToken: string;
  if (expiresAt - now > 5 * 60 * 1000) {
    accessToken = stored.access_token;
  } else {
    accessToken = await refreshAccessToken(stored);
  }

  return { accessToken, customerId: stripCustomerId(customerId) };
}

// --- Google Ads API Client ---

export class GoogleAdsClient {
  private accessToken: string;
  private customerId: string;

  constructor(accessToken: string, customerId: string) {
    this.accessToken = accessToken;
    // Always strip hyphens from customer ID
    this.customerId = stripCustomerId(customerId);
  }

  /**
   * Build headers for Google Ads API requests.
   */
  getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
    };

    // Developer token is required for Google Ads API.
    // For test accounts, any string works.
    const developerToken = process.env.GADS_DEVELOPER_TOKEN;
    if (developerToken) {
      headers["developer-token"] = developerToken;
    } else {
      console.warn(
        "GADS_DEVELOPER_TOKEN not set. Google Ads API calls will fail for production accounts. " +
          "For test accounts, set it to any string."
      );
    }

    // Optional: login-customer-id for MCC accounts
    // If you're making calls on behalf of a sub-account from an MCC,
    // set GADS_LOGIN_CUSTOMER_ID to the MCC account ID.
    const loginCustomerId = process.env.GADS_LOGIN_CUSTOMER_ID;
    if (loginCustomerId) {
      headers["login-customer-id"] = stripCustomerId(loginCustomerId);
    }

    return headers;
  }

  /**
   * Run a GAQL (Google Ads Query Language) query via SearchStream.
   *
   * @param query - The GAQL query string
   * @returns Parsed results array
   */
  async search(query: string): Promise<any[]> {
    const url = `${GOOGLE_ADS_API_BASE}/customers/${this.customerId}/googleAds:searchStream`;

    const response = await fetch(url, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new GoogleAdsApiError(
        `Search query failed (${response.status}): ${errorBody}`,
        response.status,
        errorBody
      );
    }

    const data = await response.json();

    // searchStream returns an array of result batches
    if (Array.isArray(data)) {
      return data.flatMap((batch: any) => batch.results || []);
    }

    // Single batch response
    return data.results || [];
  }

  /**
   * Send mutate operations to Google Ads API.
   *
   * @param operations - Array of mutate operations
   * @returns Mutate response
   */
  async mutate(operations: any[]): Promise<any> {
    const url = `${GOOGLE_ADS_API_BASE}/customers/${this.customerId}/googleAds:mutate`;

    const response = await fetch(url, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ mutateOperations: operations }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new GoogleAdsApiError(
        `Mutate failed (${response.status}): ${errorBody}`,
        response.status,
        errorBody
      );
    }

    return response.json();
  }

  /**
   * Static factory: Get a fully authenticated GoogleAdsClient.
   * Handles token retrieval, refresh, and customer ID resolution automatically.
   */
  static async getClient(): Promise<GoogleAdsClient> {
    const { accessToken, customerId } = await getValidAccessToken();
    return new GoogleAdsClient(accessToken, customerId);
  }
}

/**
 * Custom error class for Google Ads API errors.
 */
export class GoogleAdsApiError extends Error {
  statusCode: number;
  responseBody: string;

  constructor(message: string, statusCode: number, responseBody: string) {
    super(message);
    this.name = "GoogleAdsApiError";
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}
