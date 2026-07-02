"use server";

import { Repo, SparkRepo, calculateSparkScore, calculateGrowth } from "./scoring";
import { getCachedRepos, cacheRepos, getStaleCachedRepos } from "./supabase";
import { memoryCache } from "./cache";
import { auth } from "@/auth";

export { type Repo, type SparkRepo, calculateSparkScore, calculateGrowth };

export async function searchRepos(topic: string, useStale = false): Promise<SparkRepo[]> {
    // 1. Check in-memory cache first (fastest)
    const memCached = memoryCache.get(topic);
    if (memCached) {
        console.log("Cache hit: memory");
        return memCached;
    }

    // 2. Check database cache (fast)
    try {
        const dbCached = await getCachedRepos(topic);
        if (dbCached) {
            console.log("Cache hit: database");
            // Store in memory for next time
            memoryCache.set(topic, dbCached);
            return dbCached;
        }

        // 3. If allowed, return stale cache while revalidating in background
        if (useStale) {
            const staleCache = await getStaleCachedRepos(topic);
            if (staleCache) {
                console.log("Cache hit: stale (revalidating in background)");
                // Revalidate in background (fire and forget)
                fetchAndCacheRepos(topic).catch(console.error);
                return staleCache;
            }
        }
    } catch (err) {
        console.error("Cache read error:", err);
    }

    // 4. Fetch fresh data
    return fetchAndCacheRepos(topic);
}

async function fetchAndCacheRepos(topic: string): Promise<SparkRepo[]> {
    console.log("=== fetchAndCacheRepos starting for topic:", topic);

    // Get session to use user's GitHub token if available
    const session = await auth();
    let tokenToUse: string | undefined;

    // First try the user's access token from the session
    if (session?.access_token) {
        tokenToUse = session.access_token as string;
        console.log("Using user's GitHub access token from session");
    } else if (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN !== "your-github-token") {
        tokenToUse = process.env.GITHUB_TOKEN;
        console.log("Using global GitHub token from environment variables");
    } else {
        console.log("No GitHub token found, using unauthenticated request");
    }

    const headers: HeadersInit = {
        Accept: "application/vnd.github+json",
    };
    if (tokenToUse) {
        headers.Authorization = `Bearer ${tokenToUse}`;
    }

    // PRD: Use topic + recency filters
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const dateStr = sixMonthsAgo.toISOString().split("T")[0];

    const query = encodeURIComponent(`${topic} created:>${dateStr}`);
    const url = `https://api.github.com/search/repositories?q=${query}&sort=stars&order=desc&per_page=30`;
    console.log("GitHub API URL:", url);

    let items: Repo[] = [];
    try {
        const res = await fetch(url, { headers, cache: "no-store" });
        console.log("GitHub API response status:", res.status, res.statusText);
        if (!res.ok) {
            const errorText = await res.text();
            console.error("GitHub API error response:", errorText);
            return []; // Return empty instead of throwing
        }
        const data = await res.json();
        items = data.items || [];
        console.log("Number of items from GitHub API:", items.length);
    } catch (err) {
        console.error("GitHub API fetch error:", err);
        return []; // Return empty instead of throwing
    }

    console.log("Number of items before filter (stars>50):", items.length);
    const results = items
        .filter((repo) => {
            const keep = repo.stargazers_count > 50;
            if (!keep) {
                console.log(`Filtering out repo ${repo.name} (only ${repo.stargazers_count} stars)`);
            }
            return keep;
        })
        .map((repo) => {
            const sparkScore = calculateSparkScore(repo);
            const growthPercentage = calculateGrowth(repo);
            console.log(`Repo ${repo.name}: stars=${repo.stargazers_count}, sparkScore=${sparkScore}, growth=${growthPercentage}%`);
            return { ...repo, sparkScore, growthPercentage };
        })
        .sort((a, b) => b.sparkScore - a.sparkScore);

    console.log("Final number of results to return:", results.length);

    // Cache results in both memory and database
    if (results.length > 0) {
        memoryCache.set(topic, results);
        cacheRepos(topic, results).catch(console.error);
    }

    return results;
}
