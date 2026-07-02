async function testGitHubAPI() {
    const topic = "AI Agents";
    
    // Test 1: Original query with created:>
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const dateStr = sixMonthsAgo.toISOString().split("T")[0];
    const query1 = encodeURIComponent(`${topic} created:>${dateStr}`);
    const url1 = `https://api.github.com/search/repositories?q=${query1}&sort=stars&order=desc&per_page=30`;
    
    console.log("Test 1 - Original query:", url1);
    const res1 = await fetch(url1);
    console.log("Test 1 status:", res1.status, res1.statusText);
    const data1 = await res1.json();
    console.log("Test 1 items count:", data1.items?.length || 0);
    
    // Test 2: Query without created:>
    const query2 = encodeURIComponent(topic);
    const url2 = `https://api.github.com/search/repositories?q=${query2}&sort=stars&order=desc&per_page=30`;
    
    console.log("\nTest 2 - Without created filter:", url2);
    const res2 = await fetch(url2);
    console.log("Test 2 status:", res2.status, res2.statusText);
    const data2 = await res2.json();
    console.log("Test 2 items count:", data2.items?.length || 0);
    if (data2.items) {
        console.log("Test 2 first 3 repos:", data2.items.slice(0,3).map((r: any) => ({
            name: r.name,
            stars: r.stargazers_count,
            created: r.created_at
        })));
    }
}

testGitHubAPI();
